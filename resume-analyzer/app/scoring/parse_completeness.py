"""
Parse-completeness scoring (Layer 1).

Deliberately transparent: every field has a published weight, and the
result includes a per-field breakdown, not just a final number - this is
the "publish your weights" principle from the architecture doc.
"""

from typing import Dict
from pydantic import BaseModel

from app.structuring.schema import ParsedResume

# Published, versioned weights. Change these in one place; bump
# WEIGHTS_VERSION whenever you do, so historical scores stay explainable.
WEIGHTS_VERSION = "1.0.0"

FIELD_WEIGHTS: Dict[str, float] = {
    "contact.full_name": 0.10,
    "contact.email": 0.15,
    "contact.phone": 0.10,
    "summary": 0.05,
    "experience": 0.30,
    "education": 0.10,
    "skills": 0.15,
    "sections_recognized_ratio": 0.05,
}

assert abs(sum(FIELD_WEIGHTS.values()) - 1.0) < 1e-6, "Weights must sum to 1.0"


class FieldResult(BaseModel):
    field: str
    weight: float
    found: bool
    score_contribution: float


class ParseCompletenessResult(BaseModel):
    total_score: float  # 0-100
    weights_version: str
    breakdown: list[FieldResult]


def score_parse_completeness(resume: ParsedResume, total_lines_seen: int = 0) -> ParseCompletenessResult:
    breakdown = []
    total = 0.0

    def add(field: str, found: bool):
        nonlocal total
        weight = FIELD_WEIGHTS[field]
        contribution = weight if found else 0.0
        total += contribution
        breakdown.append(
            FieldResult(field=field, weight=weight, found=found, score_contribution=contribution)
        )

    add("contact.full_name", bool(resume.contact.full_name))
    add("contact.email", bool(resume.contact.email))
    add("contact.phone", bool(resume.contact.phone))
    add("summary", bool(resume.summary))
    add("experience", len(resume.experience) > 0)
    add("education", len(resume.education) > 0)
    add("skills", len(resume.skills) > 0)

    dict_matched = sum(1 for s in resume.raw_sections if s.matched_via == "dictionary")
    total_sections = max(len(resume.raw_sections), 1)
    ratio = dict_matched / total_sections
    weight = FIELD_WEIGHTS["sections_recognized_ratio"]
    contribution = weight * ratio
    total += contribution
    breakdown.append(
        FieldResult(
            field="sections_recognized_ratio",
            weight=weight,
            found=ratio >= 0.8,
            score_contribution=round(contribution, 4),
        )
    )

    return ParseCompletenessResult(
        total_score=round(total * 100, 1),
        weights_version=WEIGHTS_VERSION,
        breakdown=breakdown,
    )
