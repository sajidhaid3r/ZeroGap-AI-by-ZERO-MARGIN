"""
Per-job experience entry parsing.

Takes the flat line list inside an "experience" section and splits it into
individual job entries (title, company, location, dates, bullets).

Strategy: a "job header" line is identified by the presence of a date
range pattern (the strongest, least ambiguous signal available without an
LLM). Everything between two header lines belongs to the entry started by
the first header. This is deliberately conservative - if no date pattern
is found on a line, it's never treated as a header, even if it's short and
bold, because title-only or company-only header lines vary too much
between templates to detect reliably with regex alone.
"""

import re
from typing import List, Optional
from pydantic import BaseModel

from app.scoring.gap_detector import parse_date_string, ParsedDate

# Matches a date RANGE within a line, e.g.:
#   "Jan 2022 - Present", "2018 - 2021", "01/2020 – 03/2022"
# Accepts hyphen, en-dash, em-dash, or "to" as the separator.
DATE_RANGE_RE = re.compile(
    r"(?P<start>(?:[A-Za-z]+\.?\s+\d{4})|(?:\d{1,2}/\d{4})|(?:\d{4}))"
    r"\s*(?:-|–|—|to)\s*"
    r"(?P<end>(?:[A-Za-z]+\.?\s+\d{4})|(?:\d{1,2}/\d{4})|(?:\d{4})|Present|Current|Now)",
    re.IGNORECASE,
)

BULLET_PREFIX_RE = re.compile(r"^[\s\-\u2022\*\u25CF\u25AA]+")


class JobEntry(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date_raw: Optional[str] = None
    end_date_raw: Optional[str] = None
    is_current: bool = False
    bullets: List[str] = []
    header_line: str = ""
    header_parse_confidence: float = 0.0  # 0-1, how confident title/company split is


def _find_date_range(line: str):
    match = DATE_RANGE_RE.search(line)
    if not match:
        return None
    return match


def _split_header_text(text_before_dates: str) -> tuple:
    """
    Splits the non-date portion of a header line into (title, company,
    location) using common delimiters. Returns a confidence score based
    on how unambiguous the split was.

    Common patterns handled:
      "Senior Engineer, Acme Corp"              -> title, company
      "Senior Engineer, Acme Corp, San Francisco" -> title, company, location
      "Senior Engineer | Acme Corp"              -> title, company
      "Senior Engineer - Acme Corp"              -> title, company
      "Acme Corp"                                 -> company only (low confidence on which)
    """
    text = text_before_dates.strip().strip(",").strip("|").strip("-").strip()
    if not text:
        return None, None, None, 0.0

    # Try pipe delimiter first - least ambiguous
    if "|" in text:
        parts = [p.strip() for p in text.split("|") if p.strip()]
        if len(parts) >= 2:
            return parts[0], parts[1], (parts[2] if len(parts) > 2 else None), 0.9

    # Try comma delimiter
    if "," in text:
        parts = [p.strip() for p in text.split(",") if p.strip()]
        if len(parts) == 2:
            return parts[0], parts[1], None, 0.75
        if len(parts) >= 3:
            return parts[0], parts[1], parts[2], 0.75

    # Try " - " or " – " delimiter (already stripped leading/trailing dash
    # above, so this catches an internal separator like "Title - Company")
    for sep in (" - ", " – ", " — "):
        if sep in text:
            parts = [p.strip() for p in text.split(sep) if p.strip()]
            if len(parts) == 2:
                return parts[0], parts[1], None, 0.6

    # No clear delimiter - can't confidently split title vs company.
    # Return the whole string as title with low confidence rather than
    # guessing which field it belongs to.
    return text, None, None, 0.2


def _is_bullet_line(line: str) -> bool:
    return bool(BULLET_PREFIX_RE.match(line)) and BULLET_PREFIX_RE.match(line).group(0).strip(" ") != ""


def parse_experience_entries(lines: List[str]) -> List[JobEntry]:
    entries: List[JobEntry] = []
    current: Optional[JobEntry] = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        date_match = _find_date_range(stripped)

        # A line is treated as a NEW job header only if it contains a date
        # range AND is not itself formatted as a bullet (bullets sometimes
        # mention dates too, e.g. "Grew revenue from 2020 to 2022 levels").
        if date_match and not _is_bullet_line(stripped):
            # flush handled implicitly by starting a new `current`
            before = stripped[: date_match.start()].strip()
            title, company, location, confidence = _split_header_text(before)

            start_raw = date_match.group("start")
            end_raw = date_match.group("end")
            is_current = bool(re.match(r"present|current|now", end_raw, re.IGNORECASE))

            current = JobEntry(
                title=title,
                company=company,
                location=location,
                start_date_raw=start_raw,
                end_date_raw=end_raw,
                is_current=is_current,
                bullets=[],
                header_line=stripped,
                header_parse_confidence=confidence,
            )
            entries.append(current)
            continue

        # Not a header line - it's a bullet/detail belonging to the most
        # recently opened entry. If no entry has been opened yet (e.g. a
        # role description with no date on the header line), start an
        # "unparsed" bucket rather than silently dropping content.
        if current is None:
            current = JobEntry(
                title=None,
                company=None,
                bullets=[],
                header_line="",
                header_parse_confidence=0.0,
            )
            entries.append(current)

        current.bullets.append(stripped)

    return entries


def entries_to_date_ranges(entries: List[JobEntry]) -> List[tuple]:
    """Adapter for gap_detector.detect_gaps(), which expects
    (start_raw, end_raw) tuples in resume order (most recent first)."""
    return [
        (e.start_date_raw, e.end_date_raw)
        for e in entries
        if e.start_date_raw and e.end_date_raw
    ]
