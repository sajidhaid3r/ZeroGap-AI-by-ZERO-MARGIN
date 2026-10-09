"""
Overlapping-employment detection. Distinct from gap_detector.py: this
flags the OPPOSITE problem - two roles whose date ranges overlap, which
can read as a credibility red flag to recruiters unless it's clearly
explained (e.g. freelance/consulting work alongside a full-time role,
or a board/advisory position). Purely rule-based date-math, no judgment
about whether the overlap is legitimate - that's left to the candidate.
"""

from typing import List, Tuple
from pydantic import BaseModel

from app.scoring.gap_detector import parse_date_string


class EmploymentOverlap(BaseModel):
    role_a: str
    role_b: str
    overlap_months: int


def _resolve_end_month(parsed_date, is_most_recent: bool) -> int:
    """Present-ended roles resolve to 'now' only if they're the most
    recent role in the list; treat other malformed/missing dates as
    unknown (skip)."""
    if parsed_date.is_current:
        return 9999 * 12  # effectively "now" - always the latest month
    if parsed_date.year is None:
        return None
    return parsed_date.year * 12 + parsed_date.month


def detect_overlaps(
    role_date_ranges: List[Tuple[str, str, str]]
) -> List[EmploymentOverlap]:
    """
    role_date_ranges: list of (role_label, start_raw, end_raw), in any
    order. role_label should be something identifying, e.g. "Senior PM
    at Acme Corp".
    """
    parsed = []
    for label, start_raw, end_raw in role_date_ranges:
        start = parse_date_string(start_raw)
        end = parse_date_string(end_raw)
        start_month = _resolve_end_month(start, False)
        end_month = _resolve_end_month(end, True)
        if start_month is None or end_month is None:
            continue
        parsed.append((label, start_month, end_month))

    overlaps: List[EmploymentOverlap] = []
    for i in range(len(parsed)):
        for j in range(i + 1, len(parsed)):
            label_a, start_a, end_a = parsed[i]
            label_b, start_b, end_b = parsed[j]

            overlap_start = max(start_a, start_b)
            overlap_end = min(end_a, end_b)
            overlap_months = overlap_end - overlap_start

            if overlap_months > 0:
                overlaps.append(
                    EmploymentOverlap(role_a=label_a, role_b=label_b, overlap_months=overlap_months)
                )

    return overlaps
