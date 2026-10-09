"""
Age-bias pattern flagging.

Fully rule-based (regex/date-math), deliberately not an LLM judgment call
- these are objective, testable patterns, and the module only FLAGS them
as suggestions for the candidate to consider; it never auto-removes
anything or makes a judgment about whether age discrimination would
actually occur.

Legal grounding (disclosed to the user, not just implied):
  - US: the Age Discrimination in Employment Act (ADEA) protects
    applicants/employees 40 and older from age-based discrimination.
  - EU: broader age-discrimination protections exist under the Employment
    Equality Framework Directive (2000/78/EC) and member-state law, with
    no age floor like the US's "40+".
This module does not give legal advice; it flags patterns some
recruiters and career coaches commonly recommend reviewing, so the
citation above is informational context, not a legal claim about any
individual situation.
"""

import re
from datetime import date
from typing import List, Optional
from pydantic import BaseModel

CURRENT_YEAR = date.today().year

# Graduation years older than this are flagged as a potential unnecessary
# age signal - purely a heuristic threshold, disclosed and tunable.
OLD_GRADUATION_THRESHOLD_YEARS = 20

BIRTHDATE_PATTERNS = [
    re.compile(r"\bdate of birth\b", re.IGNORECASE),
    re.compile(r"\bDOB\b"),
    re.compile(r"\bborn\s+(on\s+)?\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", re.IGNORECASE),
    re.compile(r"\bage[:\s]+\d{1,3}\b", re.IGNORECASE),
]

# "20+ years of experience" style phrasing - not inherently bad, but a
# commonly-cited pattern career coaches suggest reviewing since it can
# function as an implicit age signal.
LONG_TENURE_PHRASE_RE = re.compile(
    r"\b(\d{2,})\+?\s*years?\s+of\s+experience\b", re.IGNORECASE
)
LONG_TENURE_THRESHOLD_YEARS = 15

GRADUATION_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


class AgeBiasFinding(BaseModel):
    pattern: str
    line: str
    detail: str
    severity: str  # "info" | "suggestion"


def _scan_birthdate_mentions(lines: List[str]) -> List[AgeBiasFinding]:
    findings = []
    for line in lines:
        for pattern in BIRTHDATE_PATTERNS:
            if pattern.search(line):
                findings.append(
                    AgeBiasFinding(
                        pattern="explicit_age_or_birthdate",
                        line=line,
                        detail=(
                            "This line appears to state an age or date of birth. "
                            "Most resume guidance recommends omitting this, since "
                            "it isn't job-relevant and can introduce unnecessary "
                            "age bias into screening."
                        ),
                        severity="suggestion",
                    )
                )
                break
    return findings


def _scan_old_graduation_years(education_lines: List[str]) -> List[AgeBiasFinding]:
    findings = []
    for line in education_lines:
        for match in GRADUATION_YEAR_RE.finditer(line):
            year = int(match.group(0))
            years_ago = CURRENT_YEAR - year
            if years_ago >= OLD_GRADUATION_THRESHOLD_YEARS:
                findings.append(
                    AgeBiasFinding(
                        pattern="old_graduation_year",
                        line=line,
                        detail=(
                            f"Graduation year {year} is {years_ago} years ago. "
                            "Some candidates choose to omit graduation years "
                            "for degrees earned 15-20+ years in the past to "
                            "keep the focus on recent, relevant experience - "
                            "this is a personal choice, not a requirement."
                        ),
                        severity="info",
                    )
                )
    return findings


def _scan_long_tenure_phrasing(lines: List[str]) -> List[AgeBiasFinding]:
    findings = []
    for line in lines:
        match = LONG_TENURE_PHRASE_RE.search(line)
        if match:
            years = int(match.group(1))
            if years >= LONG_TENURE_THRESHOLD_YEARS:
                findings.append(
                    AgeBiasFinding(
                        pattern="long_tenure_phrasing",
                        line=line,
                        detail=(
                            f"\"{years}+ years of experience\" is a common, "
                            "legitimate phrase, but some career coaches note "
                            "it can function as an implicit age signal. "
                            "Consider whether stating specific recent "
                            "achievements would serve you better than the "
                            "total year count."
                        ),
                        severity="info",
                    )
                )
    return findings


def scan_for_age_bias(
    all_lines: List[str], education_lines: Optional[List[str]] = None
) -> List[AgeBiasFinding]:
    findings: List[AgeBiasFinding] = []
    findings.extend(_scan_birthdate_mentions(all_lines))
    findings.extend(_scan_long_tenure_phrasing(all_lines))
    if education_lines:
        findings.extend(_scan_old_graduation_years(education_lines))
    return findings
