"""
Seniority progression check. Maps job titles to a numeric seniority
level via keyword matching (a small, disclosed, versioned ladder - not
an LLM judgment call), then checks whether levels are non-decreasing
across a candidate's chronological job history. A regression (e.g.
"Director" followed later by "Coordinator") is flagged as informational,
not penalized - career changes, industry switches, and voluntary
step-downs are all legitimate and this module doesn't try to judge intent.
"""

import re
from typing import List, Optional
from pydantic import BaseModel

# Ordered low -> high. Keys are matched as whole-word substrings,
# case-insensitive, longest-key-first so "senior manager" matches before
# "manager" alone.
SENIORITY_LADDER = [
    ("intern", 0),
    ("junior", 1),
    ("associate", 1),
    ("coordinator", 1),
    ("analyst", 2),
    ("specialist", 2),
    ("engineer", 2),
    ("consultant", 2),
    ("senior", 3),
    ("lead", 4),
    ("principal", 4),
    ("staff", 4),
    ("manager", 5),
    ("head", 6),
    ("director", 7),
    ("vp", 8),
    ("vice president", 8),
    ("svp", 9),
    ("chief", 10),
    ("cxo", 10),
    ("ceo", 10),
    ("cto", 10),
    ("coo", 10),
    ("cfo", 10),
]
# sort longest-first so multi-word keys match before their substrings
_SORTED_LADDER = sorted(SENIORITY_LADDER, key=lambda kv: -len(kv[0]))


class TitleLevel(BaseModel):
    title: str
    level: Optional[int]
    matched_keyword: Optional[str]


class SeniorityProgressionResult(BaseModel):
    title_levels: List[TitleLevel]  # in resume order (most recent first)
    has_regression: bool
    regression_detail: Optional[str] = None
    is_monotonic_non_decreasing_over_time: bool


def infer_seniority_level(title: str) -> TitleLevel:
    """
    Scans the title for EVERY matching seniority keyword and returns the
    HIGHEST level found - not just the first match. A title like "Senior
    Software Engineer" contains both "senior" (level 3) and "engineer"
    (level 2); the correct read is level 3, since "senior" is the
    modifier that actually elevates the base role.
    """
    lowered = title.lower()
    best: Optional[TitleLevel] = None
    for keyword, level in _SORTED_LADDER:
        pattern = r"(?<![a-z])" + re.escape(keyword) + r"(?![a-z])"
        if re.search(pattern, lowered):
            if best is None or level > best.level:
                best = TitleLevel(title=title, level=level, matched_keyword=keyword)
    if best is not None:
        return best
    return TitleLevel(title=title, level=None, matched_keyword=None)


def check_seniority_progression(titles_most_recent_first: List[str]) -> SeniorityProgressionResult:
    """
    `titles_most_recent_first` should be job titles in the order they
    appear on the resume (most recent role first, as is conventional).
    We reverse to chronological order (oldest first) to check whether
    seniority is non-decreasing over time.
    """
    title_levels = [infer_seniority_level(t) for t in titles_most_recent_first]

    chronological = list(reversed(title_levels))
    known_levels = [tl for tl in chronological if tl.level is not None]

    has_regression = False
    regression_detail = None
    for i in range(1, len(known_levels)):
        if known_levels[i].level < known_levels[i - 1].level:
            has_regression = True
            regression_detail = (
                f"'{known_levels[i].title}' (level {known_levels[i].level}) "
                f"comes after '{known_levels[i-1].title}' (level "
                f"{known_levels[i-1].level}) chronologically. This may be "
                f"intentional (career change, relocation, etc.) - just "
                f"flagging in case it's worth a one-line explanation in "
                f"your summary."
            )
            break

    is_monotonic = not has_regression

    return SeniorityProgressionResult(
        title_levels=title_levels,
        has_regression=has_regression,
        regression_detail=regression_detail,
        is_monotonic_non_decreasing_over_time=is_monotonic,
    )
