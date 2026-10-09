"""
ATS-essentials checks. These are the objective, "will a real parser choke
on this file" category - deliberately separate from writing-quality
judgment. Every check here is deterministic and independently testable.
"""

import re
from typing import List, Optional
from pydantic import BaseModel

from app.structuring.contact_extractor import is_unprofessional_email

# Filenames that signal messy version history rather than a final,
# submission-ready document.
MESSY_FILENAME_RE = re.compile(
    r"final[\s_\-]*final|v\d+.*final|copy\s*of|_new_new|resume\d*\(\d+\)|untitled",
    re.IGNORECASE,
)

RAW_URL_RE = re.compile(r"https?://\S+")


class ATSCheck(BaseModel):
    name: str
    passed: bool
    detail: str
    severity: str  # "blocker" | "warning" | "info"


class ATSEssentialsResult(BaseModel):
    checks: List[ATSCheck]
    score: float  # 0-100, simple pass-rate weighted by severity


SEVERITY_WEIGHT = {"blocker": 1.0, "warning": 0.5, "info": 0.2}


def check_filename(filename: str) -> ATSCheck:
    if MESSY_FILENAME_RE.search(filename):
        return ATSCheck(
            name="filename_cleanliness",
            passed=False,
            detail=(
                f"Filename '{filename}' looks like a working draft "
                f"(e.g. contains 'final final', 'copy of', version-in-parens). "
                f"Rename to something like 'FirstName_LastName_Resume.pdf' "
                f"before submitting."
            ),
            severity="info",
        )
    return ATSCheck(
        name="filename_cleanliness",
        passed=True,
        detail="Filename looks clean.",
        severity="info",
    )


def check_professional_email(email: Optional[str]) -> ATSCheck:
    if not email:
        return ATSCheck(
            name="professional_email",
            passed=False,
            detail="No email address was found on the resume at all.",
            severity="blocker",
        )
    if is_unprofessional_email(email):
        return ATSCheck(
            name="professional_email",
            passed=False,
            detail=(
                f"'{email}' contains patterns (numbers, slang) that can read "
                f"as unprofessional. Consider a firstname.lastname@ format."
            ),
            severity="warning",
        )
    return ATSCheck(name="professional_email", passed=True, detail="Email looks professional.", severity="info")


def check_raw_urls_in_body(lines: List[str]) -> ATSCheck:
    """
    Bare, un-shortened URLs (especially long tracking-parameter LinkedIn
    URLs) can break line wrapping in some ATS text renderers. Flag as
    informational, not a blocker.
    """
    offending = [l for l in lines if RAW_URL_RE.search(l) and len(l) > 80]
    if offending:
        return ATSCheck(
            name="url_length",
            passed=False,
            detail=(
                f"{len(offending)} line(s) contain long raw URLs, which can "
                f"wrap awkwardly in some ATS renderers. Consider shortening "
                f"or hyperlinking display text instead of a raw URL."
            ),
            severity="info",
        )
    return ATSCheck(name="url_length", passed=True, detail="No problematic long URLs found.", severity="info")


DATE_FORMAT_PATTERNS = {
    "month_year": re.compile(r"\b[A-Za-z]{3,9}\.?\s+\d{4}\b"),
    "numeric_slash": re.compile(r"\b\d{1,2}/\d{4}\b"),
    "iso": re.compile(r"\b\d{4}-\d{1,2}\b"),
    "year_only": re.compile(r"(?<!\d)\d{4}(?!\d)"),
}


def check_date_format_consistency(lines: List[str]) -> ATSCheck:
    """
    A resume mixing 'Jan 2022', '01/2022', and '2022-01' in different
    places reads as inconsistent/careless to both parsers and recruiters.
    Flags when 2+ distinct formats are used, ignoring bare years (which
    commonly co-occur legitimately, e.g. graduation year vs. role dates).
    """
    formats_found = set()
    for line in lines:
        for fmt_name, pattern in DATE_FORMAT_PATTERNS.items():
            if fmt_name == "year_only":
                continue
            if pattern.search(line):
                formats_found.add(fmt_name)

    if len(formats_found) >= 2:
        return ATSCheck(
            name="date_format_consistency",
            passed=False,
            detail=(
                f"Multiple date formats detected ({', '.join(sorted(formats_found))}). "
                f"Pick one format (e.g. 'Jan 2022') and use it everywhere."
            ),
            severity="warning",
        )
    return ATSCheck(
        name="date_format_consistency", passed=True, detail="Date formatting is consistent.", severity="info"
    )


def run_ats_essentials(
    filename: str, email: Optional[str], all_lines: List[str]
) -> ATSEssentialsResult:
    checks = [
        check_filename(filename),
        check_professional_email(email),
        check_raw_urls_in_body(all_lines),
        check_date_format_consistency(all_lines),
    ]

    total_weight = sum(SEVERITY_WEIGHT[c.severity] for c in checks)
    earned_weight = sum(SEVERITY_WEIGHT[c.severity] for c in checks if c.passed)
    score = round((earned_weight / total_weight) * 100, 1) if total_weight else 100.0

    return ATSEssentialsResult(checks=checks, score=score)
