"""
Tests for the standard-process layers added in this round: ATS
essentials, repetition detection, spelling, section order, seniority
progression, title tailoring, and composite scoring - including
regression tests for two real bugs found and fixed during development.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.scoring.ats_essentials import run_ats_essentials, check_filename
from app.scoring.repetition_detector import analyze_repetition
from app.scoring.spelling_checker import check_spelling
from app.scoring.section_order import check_section_order
from app.scoring.seniority_progression import check_seniority_progression, infer_seniority_level
from app.matching.title_tailoring import suggest_tailored_title
from app.scoring.composite_score import compute_composite_score, CATEGORY_WEIGHTS
from app.pipeline import run_pipeline

import io
from docx import Document


# --- ATS essentials ---

def test_messy_filename_with_underscore_separator_is_flagged():
    """Regression test: the filename regex originally required literal
    'finalfinal' with no separator and missed the far more common
    'final_final' pattern."""
    check = check_filename("resume_final_final_v2.docx")
    assert check.passed is False


def test_clean_filename_passes():
    check = check_filename("Jane_Doe_Resume.pdf")
    assert check.passed is True


def test_unprofessional_email_flagged_in_ats_essentials():
    result = run_ats_essentials("resume.pdf", "coolguy420@gmail.com", [])
    email_check = [c for c in result.checks if c.name == "professional_email"][0]
    assert email_check.passed is False


def test_missing_email_is_a_blocker():
    result = run_ats_essentials("resume.pdf", None, [])
    email_check = [c for c in result.checks if c.name == "professional_email"][0]
    assert email_check.passed is False
    assert email_check.severity == "blocker"


def test_mixed_date_formats_flagged():
    lines = ["Jan 2022 - Present", "01/2018 - 03/2020"]
    result = run_ats_essentials("resume.pdf", "a@b.com", lines)
    date_check = [c for c in result.checks if c.name == "date_format_consistency"][0]
    assert date_check.passed is False


# --- Repetition ---

def test_repetition_detector_flags_overused_word():
    bullets = [
        "Managed a team of engineers",
        "Managed vendor relationships",
        "Managed budget planning",
        "Managed cross-functional projects",
    ]
    result = analyze_repetition(bullets)
    repeated_words = {r.word for r in result.repeated_words}
    assert "managed" in repeated_words


def test_repetition_detector_ignores_stopwords():
    bullets = ["Worked with the team", "Worked with the client", "Worked with the vendor", "Worked with the board"]
    result = analyze_repetition(bullets)
    repeated_words = {r.word for r in result.repeated_words}
    assert "with" not in repeated_words  # stopword-adjacent, but "with" itself is a stopword


# --- Spelling ---

def test_spelling_catches_real_typo():
    result = check_spelling(["Responsible for delievring key initiatives"])
    words = {i.word for i in result.issues}
    assert "delievring" in words


def test_spelling_does_not_flag_taxonomy_tech_terms():
    result = check_spelling(["Experienced with kubernetes and typescript"])
    words = {i.word for i in result.issues}
    assert "kubernetes" not in words
    assert "typescript" not in words


def test_spelling_does_not_flag_email_fragments():
    """Regression test: 'gmail' inside an email address was being
    extracted as a standalone word and flagged as a typo."""
    result = check_spelling(["Contact: jane.doe123@gmail.com"])
    words = {i.word for i in result.issues}
    assert "gmail" not in words


# --- Section order ---

def test_conventional_order_passes():
    result = check_section_order(["header_block", "summary", "experience", "education", "skills"])
    assert result.in_conventional_order is True


def test_out_of_order_sections_flagged():
    result = check_section_order(["header_block", "skills", "experience"])
    assert result.in_conventional_order is False
    assert len(result.issues) >= 1


# --- Seniority progression ---

def test_infer_seniority_level_takes_highest_matching_keyword():
    """Regression test for a real bug found and fixed: 'Senior Software
    Engineer' contains both 'senior' (level 3) and 'engineer' (level 2).
    The correct read is the HIGHEST level found in the title (3), not
    whichever keyword happened to match first by string length."""
    result = infer_seniority_level("Senior Software Engineer")
    assert result.level == 3
    assert result.matched_keyword == "senior"


def test_progression_growth_is_not_flagged_as_regression():
    # Resume order: most recent first. Coordinator -> Senior PM chronologically = growth
    result = check_seniority_progression(["Senior Product Manager", "Product Coordinator"])
    assert result.has_regression is False


def test_progression_regression_is_flagged():
    # Resume order: most recent first = Coordinator, older = Director => regression
    result = check_seniority_progression(["Coordinator", "Director of Operations"])
    assert result.has_regression is True


# --- Title tailoring ---

def test_title_tailoring_detects_close_match():
    jd = "We are looking for a Senior Product Manager to own the roadmap."
    result = suggest_tailored_title("Senior Product Manager", jd)
    assert result.titles_match_closely is True


def test_title_tailoring_suggests_alignment_on_mismatch():
    jd = "We are looking for a Senior Product Manager to own the roadmap."
    result = suggest_tailored_title("Product Coordinator", jd)
    assert result.titles_match_closely is False
    assert result.suggestion is not None


# --- Composite scoring ---

def test_category_weights_sum_to_one():
    assert abs(sum(CATEGORY_WEIGHTS.values()) - 1.0) < 1e-6


def test_composite_score_end_to_end_via_pipeline():
    doc = Document()
    doc.add_paragraph("Jane Doe")
    doc.add_paragraph("jane.doe@proton.me | (555) 123-4567")
    doc.add_paragraph("Experience")
    doc.add_paragraph("Senior Product Manager, Acme Corp, Jan 2022 - Present")
    doc.add_paragraph("- Led a team of 5 engineers to launch a billing platform, increasing revenue by 20%")
    doc.add_paragraph("Education")
    doc.add_paragraph("BS Computer Science, State University, 2020")
    doc.add_paragraph("Skills")
    doc.add_paragraph("Product Management, SQL, Agile")

    buf = io.BytesIO()
    doc.save(buf)

    report = run_pipeline(buf.getvalue(), "resume.docx")

    assert report.composite_score is not None
    assert 0 <= report.composite_score.overall_score <= 100
    assert len(report.composite_score.categories) == len(CATEGORY_WEIGHTS)
    assert report.overall_score == report.composite_score.overall_score


def test_pipeline_with_job_description_populates_tailoring_and_title():
    doc = Document()
    doc.add_paragraph("Jane Doe")
    doc.add_paragraph("jane.doe@proton.me")
    doc.add_paragraph("Experience")
    doc.add_paragraph("Product Coordinator, Acme Corp, Jan 2022 - Present")
    doc.add_paragraph("- Supported roadmap planning")
    doc.add_paragraph("Skills")
    doc.add_paragraph("SQL")

    buf = io.BytesIO()
    doc.save(buf)

    jd = "We are looking for a Senior Product Manager with Python and SQL skills."
    report = run_pipeline(buf.getvalue(), "resume.docx", job_description=jd)

    assert report.tailoring is not None
    assert report.title_tailoring is not None
    assert report.title_tailoring.titles_match_closely is False
