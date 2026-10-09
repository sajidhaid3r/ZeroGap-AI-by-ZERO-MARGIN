"""
Section order check. Recruiters and most ATS-optimization guidance
converge on a conventional top-to-bottom order (contact/header first,
then summary, then experience, then education, then skills). This is a
soft convention, not a hard rule, so violations are flagged as
informational suggestions, never a blocker.
"""

from typing import List, Optional
from pydantic import BaseModel

# Published, versioned expected order. Sections not in this list (e.g.
# "other", "header_block") are ignored for ordering purposes.
EXPECTED_ORDER = ["header_block", "summary", "experience", "education", "skills"]


class OrderIssue(BaseModel):
    section: str
    expected_after: Optional[str]
    detail: str


class SectionOrderResult(BaseModel):
    actual_order: List[str]
    issues: List[OrderIssue]
    in_conventional_order: bool


def check_section_order(section_names_in_order: List[str]) -> SectionOrderResult:
    relevant = [s for s in section_names_in_order if s in EXPECTED_ORDER]
    # dedupe while preserving first occurrence
    seen = []
    for s in relevant:
        if s not in seen:
            seen.append(s)

    expected_positions = {name: i for i, name in enumerate(EXPECTED_ORDER)}
    issues: List[OrderIssue] = []

    for i in range(1, len(seen)):
        prev_section = seen[i - 1]
        curr_section = seen[i]
        if expected_positions[curr_section] < expected_positions[prev_section]:
            issues.append(
                OrderIssue(
                    section=curr_section,
                    expected_after=None,
                    detail=(
                        f"'{curr_section}' appears after '{prev_section}', but "
                        f"the conventional order places it earlier "
                        f"({' -> '.join(EXPECTED_ORDER)}). This is a stylistic "
                        f"convention, not a hard requirement."
                    ),
                )
            )

    return SectionOrderResult(
        actual_order=seen,
        issues=issues,
        in_conventional_order=len(issues) == 0,
    )
