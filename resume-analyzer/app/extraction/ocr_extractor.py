"""
OCR fallback for scanned/flattened PDFs.

pdf_extractor.has_text_layer() detects when a PDF has no extractable text
(image-only scan). This module rasterizes each page and runs Tesseract
OCR to recover text, so those resumes get a degraded-but-real result
instead of a hard failure.

OCR output quality is inherently lower than a native text layer (no
reliable font-size/bold metadata, occasional character misreads), so
results are tagged with a lower base confidence and a warning is always
surfaced to the caller - this should never be silently treated as
equivalent to native text extraction.
"""

from dataclasses import dataclass
from typing import List

import pytesseract
from pdf2image import convert_from_bytes


OCR_DPI = 300  # higher DPI improves accuracy at the cost of speed


@dataclass
class OCRLine:
    text: str
    page: int
    mean_confidence: float  # 0-100, Tesseract's own per-word confidence, averaged


class OCRExtractionError(Exception):
    pass


def ocr_extract_lines(pdf_bytes: bytes) -> List[OCRLine]:
    try:
        images = convert_from_bytes(pdf_bytes, dpi=OCR_DPI)
    except Exception as e:
        raise OCRExtractionError(f"Could not rasterize PDF for OCR: {e}")

    if not images:
        raise OCRExtractionError("PDF produced no pages to OCR.")

    all_lines: List[OCRLine] = []

    for page_index, image in enumerate(images):
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

        # Group words back into lines using Tesseract's own line index,
        # rather than re-deriving y-proximity ourselves - Tesseract already
        # does this segmentation as part of OCR.
        lines_map = {}
        for i in range(len(data["text"])):
            word = data["text"][i].strip()
            if not word:
                continue
            key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
            conf = data["conf"][i]
            conf = float(conf) if conf not in ("-1", -1) else 0.0
            lines_map.setdefault(key, {"words": [], "confs": []})
            lines_map[key]["words"].append(word)
            lines_map[key]["confs"].append(conf)

        for key in sorted(lines_map.keys()):
            entry = lines_map[key]
            text = " ".join(entry["words"])
            mean_conf = sum(entry["confs"]) / len(entry["confs"]) if entry["confs"] else 0.0
            all_lines.append(OCRLine(text=text, page=page_index, mean_confidence=round(mean_conf, 1)))

    if not all_lines:
        raise OCRExtractionError(
            "OCR produced no readable text - the scan may be too low quality."
        )

    return all_lines


def ocr_lines_to_text_lines(ocr_lines: List[OCRLine]) -> List[str]:
    return [l.text for l in ocr_lines]


def overall_ocr_confidence(ocr_lines: List[OCRLine]) -> float:
    if not ocr_lines:
        return 0.0
    return round(sum(l.mean_confidence for l in ocr_lines) / len(ocr_lines), 1)
