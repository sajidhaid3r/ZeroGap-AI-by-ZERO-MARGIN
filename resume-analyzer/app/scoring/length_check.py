"""
Resume length check. Standard recruiter/career-coach guidance: 1 page for
early-career, 1-2 pages for most roles, up to 3 for very senior/academic
CVs. Thresholds here are word-count based (works for both PDF and DOCX
uniformly) with an optional page-count cross-check for PDFs.

These are guidance thresholds, not hard rules - flagged as informational,
never a blocker, since legitimate exceptions (academic CVs, extensive
publication lists) are common.
"""

from typing import List, Optional
from pydantic import BaseModel

# Disclosed, tunable thresholds.
MIN_WORD_COUNT = 150  # below this, resume likely lacks sufficient detail
IDEAL_MAX_WORD_COUNT = 700  # ~1-1.5 pages for most roles
STRETCH_MAX_WORD_COUNT = 1100  # ~2 pages, acceptable for senior candidates


class LengthCheckResult(BaseModel):
    word_count: int
    page_count: Optional[int]
    assessment: str  # "too_short" | "ideal" | "long_but_acceptable" | "too_long"
    detail: str


def check_resume_length(lines: List[str], page_count: Optional[int] = None) -> LengthCheckResult:
    word_count = sum(len(line.split()) for line in lines)

    if word_count < MIN_WORD_COUNT:
        assessment = "too_short"
        detail = (
            f"~{word_count} words is quite short for a resume. Consider "
            f"whether there's more relevant detail (specific achievements, "
            f"quantified outcomes) that could be added."
        )
    elif word_count <= IDEAL_MAX_WORD_COUNT:
        assessment = "ideal"
        detail = f"~{word_count} words is within the typical ideal range for most roles."
    elif word_count <= STRETCH_MAX_WORD_COUNT:
        assessment = "long_but_acceptable"
        detail = (
            f"~{word_count} words runs a bit long. This is often fine for "
            f"senior/extensive-experience candidates, but consider trimming "
            f"older or less-relevant content if you're earlier career."
        )
    else:
        assessment = "too_long"
        detail = (
            f"~{word_count} words is quite long for a resume (likely 3+ "
            f"pages). Recruiters typically spend seconds per resume on "
            f"first pass - consider cutting to the most relevant, recent, "
            f"and impactful content."
        )

    if page_count is not None and page_count > 2 and assessment in ("ideal",):
        # word count looked fine but page count is high - likely large
        # fonts/whitespace, worth a lighter note rather than overriding
        detail += f" (Note: detected {page_count} pages - check for excess whitespace/font size if that seems high for the content.)"

    return LengthCheckResult(
        word_count=word_count, page_count=page_count, assessment=assessment, detail=detail
    )
