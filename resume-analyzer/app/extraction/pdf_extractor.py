"""
PDF text extraction with positional data.

Unlike naive `page.get_text()` calls (which silently interleave columns
on multi-column resumes), this module pulls text at the *span* level with
bounding boxes, so downstream code (column_detector.py) can reconstruct
correct reading order before anything gets tokenized.
"""

from dataclasses import dataclass
from typing import List

import fitz  # PyMuPDF


@dataclass
class TextSpan:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    page: int
    font_size: float
    is_bold: bool


class PDFExtractionError(Exception):
    pass


def _safe_open(pdf_bytes: bytes):
    """Wraps fitz.open() so any malformed-PDF failure (PyMuPDF raises its
    own exception types, e.g. pymupdf.mupdf.FzErrorFormat, not something
    generic) is normalized into our own PDFExtractionError - otherwise it
    propagates as an unhandled 500 instead of a clean, user-facing 422."""
    try:
        return fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise PDFExtractionError(f"Could not open this file as a PDF - it may be corrupted or not a valid PDF: {e}")


def has_text_layer(pdf_bytes: bytes) -> bool:
    """
    Detects flattened / scanned PDFs (no extractable text layer).
    This is the #1 hard failure mode for ATS parsing - if this returns
    False, the resume should be routed to OCR or rejected with a clear
    warning, not silently parsed into an empty result.
    """
    doc = _safe_open(pdf_bytes)
    total_chars = 0
    for page in doc:
        total_chars += len(page.get_text("text").strip())
        if total_chars > 20:
            doc.close()
            return True
    doc.close()
    return False


def extract_spans(pdf_bytes: bytes) -> List[TextSpan]:
    """
    Extracts every text span in the document with its bounding box,
    font size, and boldness. This is the raw material the column
    detector uses to reconstruct correct left-to-right / top-to-bottom
    (or column-aware) reading order.
    """
    if not pdf_bytes:
        raise PDFExtractionError("Empty file")

    doc = _safe_open(pdf_bytes)
    if doc.page_count == 0:
        doc.close()
        raise PDFExtractionError("PDF has no pages")

    if not has_text_layer(pdf_bytes):
        doc.close()
        raise PDFExtractionError(
            "No extractable text layer found. This PDF is likely a "
            "flattened image/scan and needs OCR before parsing."
        )

    spans: List[TextSpan] = []
    for page_index, page in enumerate(doc):
        raw = page.get_text("dict")
        for block in raw.get("blocks", []):
            if block.get("type") != 0:  # 0 = text block, 1 = image block
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue
                    x0, y0, x1, y1 = span["bbox"]
                    flags = span.get("flags", 0)
                    is_bold = bool(flags & 2 ** 4)  # bit 4 = bold flag
                    spans.append(
                        TextSpan(
                            text=text,
                            x0=x0,
                            y0=y0,
                            x1=x1,
                            y1=y1,
                            page=page_index,
                            font_size=round(span.get("size", 0), 1),
                            is_bold=is_bold,
                        )
                    )
    doc.close()

    if not spans:
        raise PDFExtractionError(
            "Text layer present but no spans extracted - file may be corrupt."
        )

    return spans


def page_dimensions(pdf_bytes: bytes) -> List[tuple]:
    """Returns (width, height) per page, used by the column detector to
    decide reasonable column split thresholds relative to page width."""
    doc = _safe_open(pdf_bytes)
    dims = [(p.rect.width, p.rect.height) for p in doc]
    doc.close()
    return dims


def count_embedded_images(pdf_bytes: bytes) -> int:
    """Counts embedded raster images across all pages - used by the
    format-risk check, since text inside images is invisible to ATS
    parsers."""
    doc = _safe_open(pdf_bytes)
    total = sum(len(page.get_images(full=True)) for page in doc)
    doc.close()
    return total
