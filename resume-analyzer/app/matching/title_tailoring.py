"""
Tailored-title suggestion. Compares the candidate's most recent resume
title against the title implied by a job description, using the same
seniority ladder as seniority_progression.py plus simple keyword overlap
- deliberately not an LLM call, since "does this JD's title roughly match
this resume's title" is answerable with rule-based string comparison.
"""

import re
from typing import List, Optional
from pydantic import BaseModel

from app.scoring.seniority_progression import infer_seniority_level

# Common patterns for where a JD states its own title.
JD_TITLE_PATTERNS = [
    re.compile(r"^(?:job title|position|role)\s*[:\-]\s*(.+)$", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^we(?:'re| are) (?:looking for|hiring)\s+an?\s+(.+?)(?:\.|,|\bwho\b|\bto\b)", re.IGNORECASE),
    re.compile(r"^(.+?)\s*\n", re.MULTILINE),  # fallback: first line of the JD
]


class TitleTailoringResult(BaseModel):
    resume_title: Optional[str]
    jd_title_guess: Optional[str]
    titles_match_closely: bool
    suggestion: Optional[str] = None


def _extract_jd_title(jd_text: str) -> Optional[str]:
    for pattern in JD_TITLE_PATTERNS[:-1]:
        match = pattern.search(jd_text)
        if match:
            candidate = match.group(1).strip()
            if 2 <= len(candidate.split()) <= 8:
                return candidate
    # fallback: first non-empty line, if short enough to plausibly be a title
    for line in jd_text.strip().split("\n"):
        line = line.strip()
        if line and len(line.split()) <= 8:
            return line
    return None


def _word_overlap_ratio(a: str, b: str) -> float:
    words_a = set(re.findall(r"[a-z]+", a.lower()))
    words_b = set(re.findall(r"[a-z]+", b.lower()))
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)


def suggest_tailored_title(resume_title: Optional[str], jd_text: str) -> TitleTailoringResult:
    jd_title = _extract_jd_title(jd_text)

    if not resume_title or not jd_title:
        return TitleTailoringResult(
            resume_title=resume_title,
            jd_title_guess=jd_title,
            titles_match_closely=False,
            suggestion=None,
        )

    resume_level = infer_seniority_level(resume_title)
    jd_level = infer_seniority_level(jd_title)
    overlap = _word_overlap_ratio(resume_title, jd_title)

    same_level = (
        resume_level.level is not None
        and jd_level.level is not None
        and resume_level.level == jd_level.level
    )
    matches_closely = overlap >= 0.5 and same_level

    suggestion = None
    if not matches_closely:
        suggestion = (
            f"Your most recent title is \"{resume_title}\"; the role you're "
            f"targeting reads as \"{jd_title}\". Consider aligning your "
            f"resume's headline/title line with the target role's title "
            f"(if accurate to your actual scope of work) so keyword "
            f"matching picks it up more easily."
        )

    return TitleTailoringResult(
        resume_title=resume_title,
        jd_title_guess=jd_title,
        titles_match_closely=matches_closely,
        suggestion=suggestion,
    )
