"""
Spelling check. Uses pyspellchecker (a local, offline dictionary-based
checker - no network/model download required) rather than an LLM, since
misspelling detection is a solved, deterministic problem that doesn't
need model judgment.

False-positive mitigation: the skills taxonomy's canonical names and
synonyms are added to the dictionary's known-word set, so legitimate
tech terms ("Kubernetes", "TypeScript") aren't flagged. Capitalized
words (likely proper nouns - company names, product names) are also
skipped, since a general dictionary can't know a company's name is
correctly spelled.
"""

import re
from typing import List
from pydantic import BaseModel
from spellchecker import SpellChecker

from app.matching.skill_matcher import load_taxonomy

WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
URL_RE = re.compile(r"(https?://\S+|www\.\S+)")

_spell = SpellChecker()


def _extend_dictionary_with_taxonomy():
    taxonomy, _ = load_taxonomy()
    extra_words = set()
    for skill in taxonomy:
        for token in re.findall(r"[A-Za-z]+", skill.canonical):
            extra_words.add(token.lower())
        for syn in skill.synonyms:
            for token in re.findall(r"[A-Za-z]+", syn):
                extra_words.add(token.lower())
    _spell.word_frequency.load_words(extra_words)


_extend_dictionary_with_taxonomy()


class SpellingIssue(BaseModel):
    word: str
    line: str
    suggestion: str = ""


class SpellingResult(BaseModel):
    issues: List[SpellingIssue]
    words_checked: int


def check_spelling(lines: List[str]) -> SpellingResult:
    issues: List[SpellingIssue] = []
    total_checked = 0

    for line in lines:
        cleaned_line = EMAIL_RE.sub("", line)
        cleaned_line = URL_RE.sub("", cleaned_line)

        words = WORD_RE.findall(cleaned_line)
        for word in words:
            # Skip likely proper nouns (capitalized mid-sentence or
            # ALL-CAPS acronyms) and very short words (too many false
            # positives from a general dictionary on 1-2 letter tokens).
            if len(word) <= 2:
                continue
            if word[0].isupper():
                continue
            total_checked += 1

        lowered_words = [w.lower() for w in words if len(w) > 2 and not w[0].isupper()]
        unknown = _spell.unknown(lowered_words)
        for word in unknown:
            suggestion = _spell.correction(word) or ""
            if suggestion and suggestion != word:
                issues.append(SpellingIssue(word=word, line=line, suggestion=suggestion))

    return SpellingResult(issues=issues, words_checked=total_checked)
