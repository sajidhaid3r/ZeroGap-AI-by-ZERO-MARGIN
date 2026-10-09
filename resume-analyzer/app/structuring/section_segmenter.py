"""
Section segmentation: takes a flat list of text lines (already in correct
reading order from the extraction layer) and classifies them into
canonical resume sections.

Matching strategy, in priority order:
  1. Dictionary match  - exact/near-exact match against section_dictionary.yaml
  2. Positional heuristic - a short, standalone, bold/heading-styled line
     that doesn't match the dictionary is still treated as a probable
     section header, just flagged with lower confidence.
  3. (LLM fallback - not implemented in this scaffold; see README for
     where to plug it in for nonstandard headers like "Where I've Made
     an Impact" instead of "Experience".)

Every section produced records *how* it was identified (`matched_via`),
so parser confidence is auditable per-section instead of a single
opaque score.
"""

import re
from pathlib import Path
from typing import List, Optional

import yaml

from app.structuring.schema import Section

_DICT_PATH = Path(__file__).parent / "section_dictionary.yaml"


def _load_dictionary() -> dict:
    with open(_DICT_PATH, "r") as f:
        data = yaml.safe_load(f)
    return data


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s&]", "", text)  # strip punctuation except '&'
    text = re.sub(r"\s+", " ", text)
    return text


def _build_lookup(dictionary: dict) -> dict:
    """Flattens {canonical: [variants]} into {normalized_variant: canonical}."""
    lookup = {}
    for canonical, variants in dictionary["sections"].items():
        for variant in variants:
            lookup[_normalize(variant)] = canonical
        lookup[_normalize(canonical)] = canonical
    return lookup


# Heuristic thresholds for treating an unmatched line as a probable header
MAX_HEADER_WORD_COUNT = 5


def _looks_like_header(line: str) -> bool:
    words = line.strip().split()
    if not words or len(words) > MAX_HEADER_WORD_COUNT:
        return False
    # All-caps or Title Case short lines are the classic header pattern
    stripped = line.strip()
    if stripped.isupper():
        return True
    if stripped.istitle():
        return True
    return False


def segment(lines: List[str]) -> List[Section]:
    dictionary = _load_dictionary()
    lookup = _build_lookup(dictionary)
    dict_version = dictionary.get("version", "unknown")

    sections: List[Section] = []
    current_canonical: Optional[str] = None
    current_raw_heading: Optional[str] = None
    current_lines: List[str] = []
    current_matched_via: str = "dictionary"

    def flush():
        if current_canonical is not None and current_lines:
            sections.append(
                Section(
                    canonical_name=current_canonical,
                    raw_heading_text=current_raw_heading or "",
                    lines=list(current_lines),
                    matched_via=current_matched_via,
                )
            )

    for line in lines:
        normalized = _normalize(line)

        if normalized in lookup:
            flush()
            current_canonical = lookup[normalized]
            current_raw_heading = line
            current_lines = []
            current_matched_via = "dictionary"
            continue

        if current_canonical is None and _looks_like_header(line):
            # Unmatched but header-shaped line before any known section -
            # start a provisional "other" bucket rather than silently
            # dropping content.
            flush()
            current_canonical = "other"
            current_raw_heading = line
            current_lines = []
            current_matched_via = "positional_heuristic"
            continue

        if current_canonical is not None:
            current_lines.append(line)
        else:
            # Content before any recognized header at all - likely the
            # contact block / name at the top of the resume.
            flush()
            current_canonical = "header_block"
            current_raw_heading = ""
            current_lines = [line]
            current_matched_via = "positional_heuristic"

    flush()

    for s in sections:
        s.matched_via = s.matched_via  # already set; kept explicit for clarity

    return sections
