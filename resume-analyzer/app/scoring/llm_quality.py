"""
LLM-based quality layer.

Kept deliberately separate from app/scoring/content_quality.py (which is
100% rule-based) so it's visually obvious in the codebase which checks
are deterministic fact vs. model judgment - see architecture doc
principle: "separate deterministic checks from LLM-judgment checks."

Design rules enforced in every prompt below:
  - The model is told explicitly: never invent a number, company, or
    fact not present in the input. If a rewrite would benefit from a
    metric the input doesn't provide, insert a bracketed placeholder
    like [ADD METRIC] instead of guessing.
  - Every call uses structured JSON output so responses are parseable
    without fragile text-scraping.
  - The client is injected (not hardcoded to a global), so this module
    is fully unit-testable with a mock client and doesn't require a live
    API key to test the wiring/prompt construction/response parsing.

Requires the `anthropic` package and an ANTHROPIC_API_KEY environment
variable to actually call the API. See tests/test_llm_quality.py for how
this is tested without a real key, via a mock client.
"""

import json
import os
from typing import List, Optional, Protocol
from pydantic import BaseModel


class BulletRewrite(BaseModel):
    original: str
    rewritten: str
    used_placeholder: bool
    rationale: str


class LeadershipSignalResult(BaseModel):
    has_leadership_signal: bool
    evidence_lines: List[str]
    confidence: float  # 0-1, model's self-reported confidence
    rationale: str


class LLMClient(Protocol):
    """Minimal interface so any LLM provider (or a test mock) can be
    injected without this module depending on a specific SDK shape."""

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        ...


class AnthropicClient:
    """Thin wrapper around the anthropic SDK implementing LLMClient."""

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-sonnet-4-6"):
        import anthropic

        self.client = anthropic.Anthropic(api_key=api_key or os.environ.get("ANTHROPIC_API_KEY"))
        self.model = model

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = "".join(block.text for block in response.content if block.type == "text")
        text = text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())


REWRITE_SYSTEM_PROMPT = """You are a resume-editing assistant. You rewrite resume bullet points to be
clearer and more results-oriented, using ONLY facts present in the input.

Strict rules:
- NEVER invent a number, percentage, dollar amount, team size, or outcome
  that is not stated in the original bullet.
- If the rewrite would be stronger with a metric the input doesn't
  provide, insert the literal placeholder text "[ADD METRIC]" instead of
  guessing a number.
- Do not invent company names, job titles, or technologies not mentioned.
- Prefer strong action verbs and remove passive/weak openers like
  "Responsible for" or "Worked on".
- Keep the rewrite to one sentence.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"rewritten": "...", "used_placeholder": true or false, "rationale": "one short sentence explaining the change"}
"""

LEADERSHIP_SYSTEM_PROMPT = """You are a resume analyst. Given a block of resume experience bullets,
determine whether there is genuine evidence of leadership (managing
people, leading initiatives, mentoring, driving cross-functional work) -
as opposed to just claiming a "leadership" buzzword without evidence.

Base your judgment ONLY on what's stated in the text. Do not assume
seniority from job title alone if the bullets don't back it up.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"has_leadership_signal": true or false, "evidence_lines": ["...", "..."], "confidence": 0.0 to 1.0, "rationale": "one short sentence"}
"""


def rewrite_bullet(client: LLMClient, bullet: str) -> BulletRewrite:
    result = client.complete_json(REWRITE_SYSTEM_PROMPT, f"Original bullet: {bullet}")
    return BulletRewrite(
        original=bullet,
        rewritten=result["rewritten"],
        used_placeholder=result["used_placeholder"],
        rationale=result["rationale"],
    )


def judge_leadership_signal(client: LLMClient, bullets: List[str]) -> LeadershipSignalResult:
    joined = "\n".join(f"- {b}" for b in bullets)
    result = client.complete_json(LEADERSHIP_SYSTEM_PROMPT, f"Resume bullets:\n{joined}")
    return LeadershipSignalResult(
        has_leadership_signal=result["has_leadership_signal"],
        evidence_lines=result["evidence_lines"],
        confidence=result["confidence"],
        rationale=result["rationale"],
    )
