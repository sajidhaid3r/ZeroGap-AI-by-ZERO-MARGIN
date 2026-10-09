"""
Skill matching engine.

Two-tier matching, both fully explainable (no opaque embedding black box):

  1. Exact/synonym match against the taxonomy - a resume mentioning any
     known synonym of a canonical skill counts as a match.
  2. Fuzzy match (rapidfuzz) for near-misses not in the taxonomy at all -
     catches typos and unlisted phrasing variants, with a disclosed
     similarity threshold rather than a hidden one.

Note on semantic/embedding matching: a production system would likely add
a third tier using sentence-transformers or an embeddings API to catch
skills phrased completely differently but meaning the same thing (e.g.
"led cross-functional teams" implying "Leadership" without the word
appearing). That tier is deliberately NOT implemented here because it
requires downloading a model from a host this environment can't reach -
see README for how to add it in a normal deployment.
"""

import re
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel

import yaml
from rapidfuzz import fuzz

_TAXONOMY_PATH = Path(__file__).parent / "skills_taxonomy.yaml"

FUZZY_MATCH_THRESHOLD = 85  # 0-100, rapidfuzz token_sort_ratio - disclosed, tunable


class Skill(BaseModel):
    canonical: str
    category: str  # "hard" | "soft"
    synonyms: List[str] = []


class SkillMatch(BaseModel):
    canonical: str
    category: str
    matched_text: str
    match_type: str  # "exact" | "synonym" | "fuzzy"
    confidence: float  # 0-1


class TailoringResult(BaseModel):
    jd_skills_found: List[Skill]
    matched_skills: List[SkillMatch]
    missing_skills: List[Skill]
    hard_skill_match_ratio: float
    soft_skill_match_ratio: float
    taxonomy_version: str


def load_taxonomy() -> List[Skill]:
    with open(_TAXONOMY_PATH, "r") as f:
        data = yaml.safe_load(f)
    return [Skill(**s) for s in data["skills"]], data.get("version", "unknown")


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def _build_lookup(taxonomy: List[Skill]) -> dict:
    lookup = {}
    for skill in taxonomy:
        lookup[_normalize(skill.canonical)] = (skill, "exact")
        for syn in skill.synonyms:
            lookup[_normalize(syn)] = (skill, "synonym")
    return lookup


def find_skills_in_text(text: str, taxonomy: Optional[List[Skill]] = None) -> List[SkillMatch]:
    """
    Scans free text (a resume section or a job description) for any
    taxonomy skill, via exact/synonym match first, then fuzzy match on
    remaining n-grams for near-misses.
    """
    if taxonomy is None:
        taxonomy, _ = load_taxonomy()

    lookup = _build_lookup(taxonomy)
    normalized_text = _normalize(text)

    matches: List[SkillMatch] = []
    matched_canonicals = set()

    # Tier 1: exact/synonym substring match
    for variant, (skill, match_type) in lookup.items():
        # word-boundary match so "AI" doesn't match inside "email"
        pattern = r"(?<![a-z0-9])" + re.escape(variant) + r"(?![a-z0-9])"
        if re.search(pattern, normalized_text):
            if skill.canonical not in matched_canonicals:
                matches.append(
                    SkillMatch(
                        canonical=skill.canonical,
                        category=skill.category,
                        matched_text=variant,
                        match_type=match_type,
                        confidence=1.0,
                    )
                )
                matched_canonicals.add(skill.canonical)

    # Tier 2: fuzzy match for skills not already found - checks each
    # taxonomy canonical name against sliding n-grams of the text to
    # catch typos / slightly different phrasing not in the synonym list.
    words = normalized_text.split()
    candidates = set(words)
    for n in (2, 3):
        for i in range(len(words) - n + 1):
            candidates.add(" ".join(words[i : i + n]))

    for skill in taxonomy:
        if skill.canonical in matched_canonicals:
            continue
        best_score = 0
        best_candidate = None
        for candidate in candidates:
            score = fuzz.token_sort_ratio(candidate, _normalize(skill.canonical))
            if score > best_score:
                best_score = score
                best_candidate = candidate
        if best_score >= FUZZY_MATCH_THRESHOLD:
            matches.append(
                SkillMatch(
                    canonical=skill.canonical,
                    category=skill.category,
                    matched_text=best_candidate or "",
                    match_type="fuzzy",
                    confidence=round(best_score / 100, 2),
                )
            )
            matched_canonicals.add(skill.canonical)

    return matches


def tailor_to_job_description(resume_text: str, jd_text: str) -> TailoringResult:
    taxonomy, version = load_taxonomy()

    jd_matches = find_skills_in_text(jd_text, taxonomy)
    jd_skills = [Skill(canonical=m.canonical, category=m.category) for m in jd_matches]

    resume_matches = find_skills_in_text(resume_text, taxonomy)
    resume_canonicals = {m.canonical for m in resume_matches}

    matched = [m for m in jd_matches if m.canonical in resume_canonicals]
    missing = [s for s in jd_skills if s.canonical not in resume_canonicals]

    jd_hard = [s for s in jd_skills if s.category == "hard"]
    jd_soft = [s for s in jd_skills if s.category == "soft"]
    matched_hard = [m for m in matched if m.category == "hard"]
    matched_soft = [m for m in matched if m.category == "soft"]

    hard_ratio = round(len(matched_hard) / len(jd_hard), 2) if jd_hard else 1.0
    soft_ratio = round(len(matched_soft) / len(jd_soft), 2) if jd_soft else 1.0

    return TailoringResult(
        jd_skills_found=jd_skills,
        matched_skills=matched,
        missing_skills=missing,
        hard_skill_match_ratio=hard_ratio,
        soft_skill_match_ratio=soft_ratio,
        taxonomy_version=version,
    )
