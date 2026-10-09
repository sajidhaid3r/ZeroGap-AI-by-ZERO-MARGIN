"""
Rule-based content quality checks - the deterministic half of "content
quality" scoring. No LLM calls in this module on purpose: quantification
detection, repetition, and bullet-length variance are all fully solvable
with regex/statistics, so they belong here, not behind an API call.

(LLM-based checks - rewrite suggestions, tone/clarity judgment,
leadership-signal inference - belong in a separate `llm_quality.py`
module, kept deliberately apart so it's visible in the codebase which
checks are deterministic fact vs. which are model judgment.)
"""

import re
from collections import Counter
from typing import List
from pydantic import BaseModel

QUANTIFICATION_RE = re.compile(r"(\$\s?\d|[\d,]+%|\b\d+[kKmMbB]?\b\+?)")

WEAK_OPENERS = {
    "responsible for", "duties included", "worked on", "helped with",
    "involved in", "tasked with", "in charge of",
}

STRONG_ACTION_VERBS = {
    "led", "built", "launched", "reduced", "increased", "designed",
    "implemented", "drove", "delivered", "scaled", "architected",
    "negotiated", "spearheaded", "optimized", "automated", "managed",
    "created", "improved", "generated", "streamlined", "orchestrated",
}


class BulletCheck(BaseModel):
    text: str
    has_quantification: bool
    starts_with_weak_opener: bool
    starts_with_strong_verb: bool
    word_count: int


class ContentQualityResult(BaseModel):
    bullets_analyzed: int
    quantified_ratio: float
    weak_opener_count: int
    strong_verb_start_count: int
    repeated_opening_words: dict
    bullet_length_variance: float
    bullet_checks: List[BulletCheck]


BULLET_PREFIX_RE = re.compile(r"^[\s\-\u2022\*\u25CF\u25AA]+")


def _strip_bullet_marker(text: str) -> str:
    """Strips leading bullet symbols (-, bullet dot, *, etc.) before analysis,
    so detection isn't fooled by the marker into treating '-' as the first word."""
    return BULLET_PREFIX_RE.sub("", text).strip()


def _first_word(text: str) -> str:
    clean = _strip_bullet_marker(text)
    words = clean.split()
    return words[0].lower().strip(".,;:") if words else ""


def _starts_with_weak_opener(text: str) -> bool:
    lowered = _strip_bullet_marker(text).lower()
    return any(lowered.startswith(opener) for opener in WEAK_OPENERS)


def _starts_with_strong_verb(text: str) -> bool:
    first = _first_word(text)
    return first in STRONG_ACTION_VERBS


def analyze_bullets(bullets: List[str]) -> ContentQualityResult:
    checks = []
    opening_words = []

    for bullet in bullets:
        has_quant = bool(QUANTIFICATION_RE.search(bullet))
        weak = _starts_with_weak_opener(bullet)
        strong = _starts_with_strong_verb(bullet)
        wc = len(bullet.split())

        checks.append(
            BulletCheck(
                text=bullet,
                has_quantification=has_quant,
                starts_with_weak_opener=weak,
                starts_with_strong_verb=strong,
                word_count=wc,
            )
        )
        opening_words.append(_first_word(bullet))

    n = len(checks) or 1
    quantified = sum(1 for c in checks if c.has_quantification)
    weak_count = sum(1 for c in checks if c.starts_with_weak_opener)
    strong_count = sum(1 for c in checks if c.starts_with_strong_verb)

    word_counts = [c.word_count for c in checks]
    mean_len = sum(word_counts) / n if word_counts else 0
    variance = (
        sum((wc - mean_len) ** 2 for wc in word_counts) / n if word_counts else 0
    )

    opener_freq = Counter(w for w in opening_words if w)
    repeated = {w: c for w, c in opener_freq.items() if c > 1}

    return ContentQualityResult(
        bullets_analyzed=len(checks),
        quantified_ratio=round(quantified / n, 2),
        weak_opener_count=weak_count,
        strong_verb_start_count=strong_count,
        repeated_opening_words=repeated,
        bullet_length_variance=round(variance, 1),
        bullet_checks=checks,
    )
