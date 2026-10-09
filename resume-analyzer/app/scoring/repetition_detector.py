"""
Whole-content repetition detection. content_quality.py already flags
repeated *opening* words per bullet; this module scans full bullet text
for any word (4+ letters, excluding common stopwords) used excessively
across the whole experience section - a common recruiter complaint
distinct from just repeated openers (e.g. "managed" appearing as the verb
in one bullet and buried mid-sentence in three others).
"""

import re
from collections import Counter
from typing import List
from pydantic import BaseModel

STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "over",
    "across", "which", "were", "have", "has", "had", "was", "are", "will",
    "such", "their", "them", "they", "while", "when", "where", "these",
    "those", "than", "then", "also", "each", "more", "most", "some",
    "using", "used", "including", "within", "through", "about",
}

WORD_RE = re.compile(r"[a-zA-Z]{4,}")

# A word appearing this many times or more across all bullets is flagged.
REPETITION_THRESHOLD = 4


class RepeatedWord(BaseModel):
    word: str
    count: int


class RepetitionResult(BaseModel):
    repeated_words: List[RepeatedWord]
    total_words_analyzed: int
    unique_word_ratio: float  # vocabulary diversity signal


def analyze_repetition(bullets: List[str]) -> RepetitionResult:
    all_words = []
    for bullet in bullets:
        words = [w.lower() for w in WORD_RE.findall(bullet)]
        words = [w for w in words if w not in STOPWORDS]
        all_words.extend(words)

    counts = Counter(all_words)
    repeated = [
        RepeatedWord(word=w, count=c)
        for w, c in counts.most_common()
        if c >= REPETITION_THRESHOLD
    ]

    total = len(all_words)
    unique_ratio = round(len(counts) / total, 2) if total else 1.0

    return RepetitionResult(
        repeated_words=repeated,
        total_words_analyzed=total,
        unique_word_ratio=unique_ratio,
    )
