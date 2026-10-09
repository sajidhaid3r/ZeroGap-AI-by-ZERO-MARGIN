"""
Composite scoring engine.

Consolidates every check in the pipeline into the same 7-category
structure identified in the original Enhancv research (ATS essentials,
Resume sections, Content, Job tailoring, Recruiter red flags, Bias &
discrimination, Seniority & impact) - but with every weight PUBLISHED
and every category score independently inspectable, instead of one
opaque blended number.

This is the single biggest differentiator called out in the architecture
doc: "publish your weights." Change CATEGORY_WEIGHTS in one place and
bump COMPOSITE_SCORE_VERSION whenever you do, so historical scores stay
explainable across versions.
"""

from typing import List, Optional
from pydantic import BaseModel

COMPOSITE_SCORE_VERSION = "1.1.0"

# Published, disclosed category weights. Must sum to 1.0.
CATEGORY_WEIGHTS = {
    "ats_essentials": 0.12,
    "resume_sections": 0.13,
    "content_quality": 0.20,
    "job_tailoring": 0.15,
    "recruiter_red_flags": 0.15,
    "bias_and_discrimination": 0.05,
    "seniority_and_impact": 0.20,
}
assert abs(sum(CATEGORY_WEIGHTS.values()) - 1.0) < 1e-6, "Category weights must sum to 1.0"


class CategoryScore(BaseModel):
    category: str
    weight: float
    score_0_to_100: float
    weighted_contribution: float  # score_0_to_100 * weight, on a 0-100 scale


class CompositeScoreResult(BaseModel):
    version: str
    categories: List[CategoryScore]
    overall_score: float


def _content_quality_score(content_quality, repetition, spelling) -> float:
    if content_quality is None:
        return 0.0
    quant_component = content_quality.quantified_ratio * 40
    verb_component = (
        content_quality.strong_verb_start_count / max(content_quality.bullets_analyzed, 1)
    ) * 30
    variance_penalty = min(content_quality.bullet_length_variance / 50, 1.0) * 10
    variance_component = 10 - variance_penalty

    spelling_penalty = min(len(spelling.issues) * 3, 10) if spelling else 0
    spelling_component = 10 - spelling_penalty

    repetition_penalty = min(len(repetition.repeated_words) * 3, 10) if repetition else 0
    repetition_component = 10 - repetition_penalty

    return round(
        max(0.0, quant_component + verb_component + variance_component
            + spelling_component + repetition_component),
        1,
    )


def _job_tailoring_score(tailoring, title_tailoring) -> float:
    if tailoring is None:
        return 100.0  # no JD supplied - don't penalize, this category is N/A
    hard = tailoring.hard_skill_match_ratio * 70
    soft = tailoring.soft_skill_match_ratio * 20
    title_bonus = 10 if (title_tailoring and title_tailoring.titles_match_closely) else 0
    return round(hard + soft + title_bonus, 1)


def _bias_score(age_bias_findings) -> float:
    # Each finding is informational, not a hard penalty - small deduction
    # per finding, floor at a still-decent score since these are
    # suggestions, not failures.
    penalty = min(len(age_bias_findings) * 8, 40)
    return round(100 - penalty, 1)


def _recruiter_red_flags_score(format_risk_result, length_result, overlaps, buzzword_result) -> float:
    score = 100.0

    if format_risk_result is not None:
        # blend in format risk (already 0-100) at half weight within this category
        score = (score + format_risk_result.score) / 2

    if length_result is not None:
        if length_result.assessment == "too_short":
            score -= 15
        elif length_result.assessment == "too_long":
            score -= 15
        elif length_result.assessment == "long_but_acceptable":
            score -= 5

    if overlaps:
        score -= min(len(overlaps) * 10, 30)

    if buzzword_result is not None and buzzword_result.unsupported_count:
        score -= min(buzzword_result.unsupported_count * 5, 20)

    return round(max(0.0, score), 1)


def _seniority_score(seniority_result, leadership_result) -> float:
    score = 100.0
    if seniority_result and seniority_result.has_regression:
        score -= 20
    if leadership_result is not None and not leadership_result.has_leadership_signal:
        score -= 10
    return round(max(0.0, score), 1)


def compute_composite_score(
    ats_essentials_result,
    parse_completeness_result,
    section_order_result,
    content_quality_result,
    repetition_result,
    spelling_result,
    tailoring_result,
    title_tailoring_result,
    age_bias_findings,
    seniority_result,
    leadership_result=None,
    format_risk_result=None,
    length_result=None,
    overlaps=None,
    buzzword_result=None,
) -> CompositeScoreResult:
    ats_score = ats_essentials_result.score if ats_essentials_result else 100.0

    sections_score = parse_completeness_result.total_score
    if section_order_result and not section_order_result.in_conventional_order:
        sections_score = max(0.0, sections_score - 10)

    content_score = _content_quality_score(content_quality_result, repetition_result, spelling_result)
    tailoring_score = _job_tailoring_score(tailoring_result, title_tailoring_result)
    red_flags_score = _recruiter_red_flags_score(format_risk_result, length_result, overlaps, buzzword_result)
    bias_score = _bias_score(age_bias_findings)
    seniority_score = _seniority_score(seniority_result, leadership_result)

    raw_scores = {
        "ats_essentials": ats_score,
        "resume_sections": sections_score,
        "content_quality": content_score,
        "job_tailoring": tailoring_score,
        "recruiter_red_flags": red_flags_score,
        "bias_and_discrimination": bias_score,
        "seniority_and_impact": seniority_score,
    }

    categories = []
    overall = 0.0
    for category, weight in CATEGORY_WEIGHTS.items():
        score = raw_scores[category]
        contribution = round(score * weight, 1)
        overall += contribution
        categories.append(
            CategoryScore(
                category=category, weight=weight, score_0_to_100=score, weighted_contribution=contribution
            )
        )

    return CompositeScoreResult(
        version=COMPOSITE_SCORE_VERSION,
        categories=categories,
        overall_score=round(overall, 1),
    )
