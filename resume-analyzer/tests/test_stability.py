"""
Stability and robustness tests: corrupted/malformed input files must
fail gracefully (ValueError -> caught by the API as 422), never as an
unhandled exception. Also covers the config module and SQLite
persistence layer added for production deployment.

Includes a regression test for a real bug found during live testing:
a corrupted PDF caused an unhandled pymupdf.mupdf.FzErrorFormat
exception instead of our own PDFExtractionError, which surfaced as an
uncaught 500 instead of a clean 422.
"""

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from app.extraction.pdf_extractor import has_text_layer, extract_spans, PDFExtractionError
from app.extraction.docx_extractor import extract_lines, DocxExtractionError
from app.pipeline import run_pipeline
from app.config import Settings, get_settings


# --- Corrupted file handling ---

def test_corrupted_pdf_raises_pdf_extraction_error_not_raw_mupdf_error():
    """Regression test: pymupdf raises its own exception type
    (FzErrorFormat) for malformed PDFs, which was propagating unhandled
    instead of being normalized to our PDFExtractionError."""
    garbage = b"this is not a real pdf file at all, just plain text"
    with pytest.raises(PDFExtractionError):
        has_text_layer(garbage)
    with pytest.raises(PDFExtractionError):
        extract_spans(garbage)


def test_corrupted_pdf_via_full_pipeline_raises_value_error_not_crash():
    """The pipeline's contract is: bad input -> ValueError (mapped to a
    422 by the API), never an unhandled exception."""
    garbage = b"this is not a real pdf file at all"
    with pytest.raises(ValueError):
        run_pipeline(garbage, "resume.pdf")


def test_corrupted_docx_raises_docx_extraction_error():
    garbage = b"this is not a real docx/zip file"
    with pytest.raises(DocxExtractionError):
        extract_lines(garbage)


def test_corrupted_docx_via_full_pipeline_raises_value_error_not_crash():
    garbage = b"this is not a real docx file"
    with pytest.raises(ValueError):
        run_pipeline(garbage, "resume.docx")


def test_empty_bytes_pdf_raises_value_error():
    with pytest.raises(ValueError):
        run_pipeline(b"", "resume.pdf")


def test_unsupported_extension_raises_value_error():
    with pytest.raises(ValueError):
        run_pipeline(b"some bytes", "resume.txt")


# --- Config module ---

def test_settings_load_defaults():
    s = Settings()
    assert s.max_file_size_bytes == 5 * 1024 * 1024
    assert ".pdf" in s.allowed_extensions
    assert ".docx" in s.allowed_extensions


def test_settings_respect_env_override(monkeypatch):
    monkeypatch.setenv("MAX_FILE_SIZE_BYTES", "1000")
    s = Settings()
    assert s.max_file_size_bytes == 1000


def test_get_settings_is_cached():
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2


# --- Persistence layer ---

@pytest.fixture
def temp_db(monkeypatch):
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setenv("DATABASE_PATH", path)
    get_settings.cache_clear()
    yield path
    get_settings.cache_clear()
    os.unlink(path)


def test_save_and_retrieve_report(temp_db):
    from app.storage import db

    db.init_db()
    report_id = db.save_report("resume.pdf", '{"foo": "bar"}', 82.5, "1.1.0")
    fetched = db.get_report(report_id)

    assert fetched is not None
    assert fetched["filename"] == "resume.pdf"
    assert fetched["overall_score"] == 82.5
    assert fetched["report"] == {"foo": "bar"}


def test_get_nonexistent_report_returns_none(temp_db):
    from app.storage import db

    db.init_db()
    assert db.get_report("does-not-exist") is None


def test_list_reports_orders_most_recent_first(temp_db):
    from app.storage import db

    db.init_db()
    id1 = db.save_report("first.pdf", "{}", 50.0, "1.1.0")
    id2 = db.save_report("second.pdf", "{}", 60.0, "1.1.0")

    reports = db.list_reports()
    assert reports[0].filename == "second.pdf"
    assert reports[1].filename == "first.pdf"


def test_benchmark_agreement_rate_average(temp_db):
    from app.storage import db

    db.init_db()
    report_id = db.save_report("resume.pdf", "{}", 80.0, "1.1.0")
    db.save_benchmark_run(report_id, "MockVendor", 0.9, "{}")
    db.save_benchmark_run(report_id, "MockVendor", 0.7, "{}")

    avg = db.get_average_agreement_rate("MockVendor")
    assert avg == 0.8


def test_agreement_rate_returns_none_when_no_data(temp_db):
    from app.storage import db

    db.init_db()
    assert db.get_average_agreement_rate("NoSuchVendor") is None
