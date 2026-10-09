"""
Buzzword-without-evidence detection.

A classic recruiter complaint: claims like "results-driven" or "team
player" carry no information unless backed by a concrete example nearby.
This module flags buzzword usage that has no quantification (number, %,
$) and no strong action verb in the same line - i.e. the buzzword is
standing alone as an unsupported claim rather than summarizing evidence
already given. Purely rule-based (regex + the same quantification/verb
detection already used in content_quality.py) - no LLM judgment call
needed for this one.
"""

import re
from typing import List
from pydantic import BaseModel

from app.scoring.content_quality import QUANTIFICATION_RE, STRONG_ACTION_VERBS

BUZZWORDS = [
    "results-driven", "results driven", "team player", "hard worker",
    "hardworking", "detail-oriented", "detail oriented", "self-starter",
    "self starter", "go-getter", "think outside the box", "synergy",
    "synergies", "dynamic", "passionate", "motivated individual",
    "excellent communication skills", "proven track record",
    "fast-paced environment", "wear many hats", "value add",
    "hit the ground running", "strategic thinker",
]

BUZZWORD_RE = re.compile(
    r"\b(" + "|".join(re.escape(b) for b in BUZZWORDS) + r")\b", re.IGNORECASE
)


class BuzzwordFinding(BaseModel):
    buzzword: str
    line: str
    has_nearby_evidence: bool


class BuzzwordResult(BaseModel):
    findings: List[BuzzwordFinding]
    unsupported_count: int


def _line_has_evidence(line: str) -> bool:
    if QUANTIFICATION_RE.search(line):
        return True
    lowered = line.lower()
    return any(verb in lowered for verb in STRONG_ACTION_VERBS)


def detect_buzzwords(lines: List[str]) -> BuzzwordResult:
    findings: List[BuzzwordFinding] = []
    for line in lines:
        for match in BUZZWORD_RE.finditer(line):
            buzzword = match.group(0)
            has_evidence = _line_has_evidence(line)
            findings.append(
                BuzzwordFinding(buzzword=buzzword, line=line, has_nearby_evidence=has_evidence)
            )

    unsupported = sum(1 for f in findings if not f.has_nearby_evidence)
    return BuzzwordResult(findings=findings, unsupported_count=unsupported)
