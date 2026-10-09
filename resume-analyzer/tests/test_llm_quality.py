"""
Tests for the LLM quality layer, using a mock LLMClient so the prompt
construction / response parsing / grounding rules are verified without
requiring a real ANTHROPIC_API_KEY or network access.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.scoring.llm_quality import (
    rewrite_bullet,
    judge_leadership_signal,
    REWRITE_SYSTEM_PROMPT,
    LEADERSHIP_SYSTEM_PROMPT,
)


class MockLLMClient:
    """Records what it was called with and returns a canned response,
    simulating what a real model would plausibly return for the given
    grounded prompt rules."""

    def __init__(self, response: dict):
        self.response = response
        self.last_system_prompt = None
        self.last_user_prompt = None

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        self.last_system_prompt = system_prompt
        self.last_user_prompt = user_prompt
        return self.response


def test_rewrite_bullet_uses_placeholder_when_no_metric_given():
    mock = MockLLMClient(
        {
            "rewritten": "Led onboarding redesign to reduce new-hire ramp time [ADD METRIC]",
            "used_placeholder": True,
            "rationale": "No specific metric was provided in the original bullet.",
        }
    )
    result = rewrite_bullet(mock, "Worked on improving the onboarding process")

    assert result.used_placeholder is True
    assert "[ADD METRIC]" in result.rewritten
    assert mock.last_system_prompt == REWRITE_SYSTEM_PROMPT
    assert "Worked on improving the onboarding process" in mock.last_user_prompt


def test_rewrite_bullet_prompt_forbids_invented_numbers():
    """The grounding rule must be present in the system prompt sent to
    the model - this is the actual mechanism preventing hallucinated
    metrics, so it must never silently disappear from the prompt."""
    mock = MockLLMClient(
        {"rewritten": "x", "used_placeholder": False, "rationale": "x"}
    )
    rewrite_bullet(mock, "some bullet")

    assert "NEVER invent" in mock.last_system_prompt
    assert "[ADD METRIC]" in mock.last_system_prompt


def test_judge_leadership_signal_parses_response():
    mock = MockLLMClient(
        {
            "has_leadership_signal": True,
            "evidence_lines": ["Led a team of 5 engineers"],
            "confidence": 0.9,
            "rationale": "Explicit team management mentioned.",
        }
    )
    result = judge_leadership_signal(mock, ["Led a team of 5 engineers", "Wrote documentation"])

    assert result.has_leadership_signal is True
    assert result.confidence == 0.9
    assert mock.last_system_prompt == LEADERSHIP_SYSTEM_PROMPT


def test_judge_leadership_signal_prompt_requires_evidence_not_title_alone():
    mock = MockLLMClient(
        {
            "has_leadership_signal": False,
            "evidence_lines": [],
            "confidence": 0.7,
            "rationale": "No management or mentoring activity described.",
        }
    )
    result = judge_leadership_signal(mock, ["Wrote documentation", "Fixed bugs"])

    assert result.has_leadership_signal is False
    assert "Do not assume\nseniority from job title alone" in mock.last_system_prompt
