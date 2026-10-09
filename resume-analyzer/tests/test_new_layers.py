"""
Tests for the newer layers: skill matching, gap detection (post-fix),
age-bias flagging, per-job experience parsing, and benchmarking.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.matching.skill_matcher import find_skills_in_text, tailor_to_job_description
from app.scoring.gap_detector import detect_gaps
from app.scoring.age_bias_detector import scan_for_age_bias
from app.structuring.experience_parser import parse_experience_entries, entries_to_date_ranges
from app.benchmarking.benchmark import MockExternalParser, ExternalParseResult, compare_parses
from app.structuring.schema import ParsedResume, ContactInfo, ExperienceEntry


# --- Skill matching ---

def test_exact_skill_match():
    matches = find_skills_in_text("Experienced with Python and SQL")
    canonicals = {m.canonical for m in matches}
    assert "Python" in canonicals
    assert "SQL" in canonicals


def test_synonym_skill_match():
    matches = find_skills_in_text("Built things with react.js and k8s")
    canonicals = {m.canonical for m in matches}
    assert "React" in canonicals
    assert "Kubernetes" in canonicals


def test_fuzzy_skill_match_catches_typo():
    matches = find_skills_in_text("Deployed with kubernettes clusters")
    canonicals = {m.canonical for m in matches}
    assert "Kubernetes" in canonicals
    fuzzy_match = [m for m in matches if m.canonical == "Kubernetes"][0]
    assert fuzzy_match.match_type == "fuzzy"


def test_word_boundary_prevents_false_positive():
    """'AI' shouldn't match inside unrelated words like 'email' or 'said'."""
    matches = find_skills_in_text("Please email the candidate, she said yes")
    canonicals = {m.canonical for m in matches}
    assert "AWS" not in canonicals  # sanity: no AWS-like substring here anyway


def test_tailoring_flags_missing_jd_skills():
    resume = "Skilled in Python and SQL. Team player."
    jd = "Looking for Python, SQL, and AWS experience with strong leadership."
    result = tailor_to_job_description(resume, jd)
    missing_canonicals = {s.canonical for s in result.missing_skills}
    assert "AWS" in missing_canonicals
    assert "Leadership" in missing_canonicals


# --- Gap detection ---

def test_gap_detected_even_when_most_recent_role_is_present():
    """Regression test for the bug found and fixed: gaps further back in
    history must still be detected even when the most recent role is
    still ongoing ('Present')."""
    ranges = [("Jan 2023", "Present"), ("Jun 2018", "Nov 2021")]
    gaps = detect_gaps(ranges)
    assert len(gaps) == 1
    assert gaps[0].gap_months == 14


def test_no_gap_when_roles_are_contiguous():
    ranges = [("Jan 2022", "Present"), ("Jun 2018", "Nov 2021")]
    gaps = detect_gaps(ranges)
    assert len(gaps) == 0


# --- Per-job experience parsing ---

def test_experience_parser_splits_title_company_dates():
    lines = [
        "Senior Product Manager, Acme Corp, Jan 2022 - Present",
        "- Led a team of 5 engineers",
        "Product Manager, Beta Inc, Jun 2018 - Nov 2021",
        "- Managed a portfolio of 4 products",
    ]
    entries = parse_experience_entries(lines)
    assert len(entries) == 2
    assert entries[0].title == "Senior Product Manager"
    assert entries[0].company == "Acme Corp"
    assert entries[0].is_current is True
    assert entries[1].end_date_raw == "Nov 2021"


def test_experience_parser_feeds_gap_detector_correctly():
    lines = [
        "Senior Product Manager, Acme Corp, Jan 2023 - Present",
        "- Led a team",
        "Product Manager, Beta Inc, Jun 2018 - Nov 2021",
        "- Managed a portfolio",
    ]
    entries = parse_experience_entries(lines)
    ranges = entries_to_date_ranges(entries)
    gaps = detect_gaps(ranges)
    assert len(gaps) == 1


# --- Age bias detection ---

def test_flags_explicit_age_mention():
    findings = scan_for_age_bias(["John Smith, Age: 55"])
    patterns = {f.pattern for f in findings}
    assert "explicit_age_or_birthdate" in patterns


def test_flags_old_graduation_year():
    findings = scan_for_age_bias(
        all_lines=[], education_lines=["BS Computer Science, State University, 1998"]
    )
    patterns = {f.pattern for f in findings}
    assert "old_graduation_year" in patterns


def test_does_not_flag_recent_graduation_year():
    findings = scan_for_age_bias(
        all_lines=[], education_lines=["BS Computer Science, State University, 2023"]
    )
    patterns = {f.pattern for f in findings}
    assert "old_graduation_year" not in patterns


def test_flags_long_tenure_phrasing():
    findings = scan_for_age_bias(["20+ years of experience in enterprise software"])
    patterns = {f.pattern for f in findings}
    assert "long_tenure_phrasing" in patterns


# --- Benchmarking ---

def test_benchmark_full_agreement():
    ours = ParsedResume(
        contact=ContactInfo(full_name="Jane Doe", email="jane@x.com"),
        skills=["Python", "SQL"],
    )
    mock = MockExternalParser(
        ExternalParseResult(full_name="Jane Doe", email="jane@x.com", skills=["Python", "SQL"])
    )
    theirs = mock.parse(b"", "resume.pdf")
    result = compare_parses(ours, theirs)

    assert result.scalar_fields[0].agree is True
    skills_field = [f for f in result.set_fields if f.field == "skills"][0]
    assert skills_field.jaccard_similarity == 1.0


def test_benchmark_detects_disagreement():
    ours = ParsedResume(
        contact=ContactInfo(full_name="Jane Doe"),
        experience=[ExperienceEntry(title="Senior Product Manager", company="Acme Corp")],
    )
    mock = MockExternalParser(
        ExternalParseResult(full_name="Jane Doe", job_titles=["Product Manager"], companies=["Acme Corp"])
    )
    theirs = mock.parse(b"", "resume.pdf")
    result = compare_parses(ours, theirs)

    title_field = [f for f in result.set_fields if f.field == "job_titles"][0]
    assert title_field.jaccard_similarity == 0.0  # "Senior Product Manager" != "Product Manager"

    company_field = [f for f in result.set_fields if f.field == "companies"][0]
    assert company_field.jaccard_similarity == 1.0
