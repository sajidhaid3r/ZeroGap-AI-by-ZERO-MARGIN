"""
Employment gap detection. Pure date arithmetic - deliberately has zero
LLM involvement, since this is exactly the kind of check that should be
100% deterministic and unit-testable (see architecture doc section 2.2,
"Bias/Fairness Layer").
"""

import re
from datetime import date
from typing import List, Optional, Tuple
from pydantic import BaseModel

MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

DATE_PATTERNS = [
    re.compile(r"(?P<month>[A-Za-z]+)\.?\s+(?P<year>\d{4})"),  # "Jan 2021" / "January 2021"
    re.compile(r"(?P<year>\d{4})-(?P<month_num>\d{1,2})"),      # "2021-01"
    re.compile(r"(?P<month_num>\d{1,2})/(?P<year>\d{4})"),      # "01/2021"
    re.compile(r"(?P<year>\d{4})"),                              # bare "2021"
]

GAP_THRESHOLD_MONTHS = 3


class ParsedDate(BaseModel):
    raw: str
    year: Optional[int] = None
    month: Optional[int] = None  # defaults to 1 (Jan) if only year known
    is_current: bool = False


class EmploymentGap(BaseModel):
    after_role_end: str
    before_role_start: str
    gap_months: int


def parse_date_string(raw: str) -> ParsedDate:
    raw_stripped = raw.strip()
    if re.search(r"present|current|now", raw_stripped, re.IGNORECASE):
        return ParsedDate(raw=raw, is_current=True)

    for pattern in DATE_PATTERNS:
        match = pattern.search(raw_stripped)
        if match:
            groups = match.groupdict()
            year = int(groups["year"]) if groups.get("year") else None
            month = 1
            if groups.get("month"):
                month = MONTHS.get(groups["month"].lower()[:3], 1) or MONTHS.get(
                    groups["month"].lower(), 1
                )
            elif groups.get("month_num"):
                month = int(groups["month_num"])
            return ParsedDate(raw=raw, year=year, month=month)

    return ParsedDate(raw=raw)


def _months_between(d1: ParsedDate, d2: ParsedDate) -> Optional[int]:
    if d1.year is None or d2.year is None:
        return None
    return (d2.year - d1.year) * 12 + (d2.month - d1.month)


def detect_gaps(
    role_date_ranges: List[Tuple[str, str]]
) -> List[EmploymentGap]:
    """
    role_date_ranges: list of (start_raw, end_raw) strings, in
    reverse-chronological order (most recent first), as they typically
    appear on a resume.
    """
    parsed = []
    for start_raw, end_raw in role_date_ranges:
        start = parse_date_string(start_raw)
        end = parse_date_string(end_raw)
        parsed.append((start, end))

    gaps: List[EmploymentGap] = []

    for i in range(len(parsed) - 1):
        # `parsed` is in resume order (most recent role first). We compare
        # the start date of the more-recently-listed role (parsed[i])
        # against the end date of the role immediately before it
        # chronologically (parsed[i + 1]) to find gaps between jobs.
        # Whether the MOST RECENT role (parsed[0]) is still "Present" is
        # irrelevant here - that only means ITS OWN forward gap doesn't
        # exist yet, not that gaps further back in the history don't.
        earlier_role_start, _ = parsed[i]
        later_role_start, later_role_end = parsed[i + 1]

        gap_months = _months_between(later_role_end, earlier_role_start)
        if gap_months is not None and gap_months >= GAP_THRESHOLD_MONTHS:
            gaps.append(
                EmploymentGap(
                    after_role_end=later_role_end.raw,
                    before_role_start=earlier_role_start.raw,
                    gap_months=gap_months,
                )
            )

    return gaps
