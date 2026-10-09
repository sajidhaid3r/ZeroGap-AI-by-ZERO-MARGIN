"""
Design/format compatibility risk check.

Multi-column layouts, embedded images/graphics, and tables are the
classic "looks great, parses terribly" resume design mistakes - visually
appealing but a real risk for ATS text extraction. This module
consolidates those signals (already partially surfaced elsewhere in the
pipeline - column_detector, docx_extractor table warnings) into one
formal, scored check category rather than leaving them as scattered
warnings.
"""

import re
from typing import List, Optional
from pydantic import BaseModel

UNUSUAL_BULLET_RE = re.compile(r"^[\u2600-\u27BF\u1F300-\u1FAFF]")  # emoji/dingbat ranges


class FormatCheck(BaseModel):
    name: str
    passed: bool
    detail: str
    severity: str  # "blocker" | "warning" | "info"


class FormatRiskResult(BaseModel):
    checks: List[FormatCheck]
    score: float  # 0-100


SEVERITY_WEIGHT = {"blocker": 1.0, "warning": 0.5, "info": 0.2}


def check_column_count(column_count: Optional[int]) -> FormatCheck:
    if column_count is not None and column_count >= 2:
        return FormatCheck(
            name="multi_column_layout",
            passed=False,
            detail=(
                f"This resume appears to use a {column_count}-column layout. "
                f"Many ATS parsers read strictly top-to-bottom and will "
                f"scramble multi-column content into the wrong order, even "
                f"though our own column-aware extractor handled it correctly "
                f"here. A single-column layout is the safest choice for "
                f"maximum ATS compatibility."
            ),
            severity="warning",
        )
    return FormatCheck(
        name="multi_column_layout", passed=True, detail="Single-column layout detected.", severity="info"
    )


def check_tables_used(table_line_count: int) -> FormatCheck:
    if table_line_count > 0:
        return FormatCheck(
            name="tables_used_for_layout",
            passed=False,
            detail=(
                f"{table_line_count} line(s) of content were found inside "
                f"document tables. Many ATS parsers skip table content "
                f"entirely or read it in the wrong order. Move this content "
                f"into the main document flow instead."
            ),
            severity="warning",
        )
    return FormatCheck(name="tables_used_for_layout", passed=True, detail="No tables used for layout.", severity="info")


def check_embedded_images(image_count: int) -> FormatCheck:
    if image_count > 0:
        return FormatCheck(
            name="embedded_images",
            passed=False,
            detail=(
                f"{image_count} embedded image(s) detected (e.g. a photo, "
                f"logo, or icon set). Text inside images is invisible to "
                f"virtually all ATS parsers. If any of your content lives "
                f"inside an image, it won't be read at all."
            ),
            severity="info",
        )
    return FormatCheck(name="embedded_images", passed=True, detail="No embedded images detected.", severity="info")


def check_unusual_bullet_glyphs(lines: List[str]) -> FormatCheck:
    offending = [l for l in lines if UNUSUAL_BULLET_RE.match(l.strip())]
    if offending:
        return FormatCheck(
            name="unusual_bullet_glyphs",
            passed=False,
            detail=(
                f"{len(offending)} line(s) use emoji/dingbat characters as "
                f"bullet markers. Some ATS parsers render these as garbled "
                f"text or skip the line. Stick to standard bullet "
                f"characters (-, *, or a plain round bullet)."
            ),
            severity="info",
        )
    return FormatCheck(
        name="unusual_bullet_glyphs", passed=True, detail="Bullet formatting looks standard.", severity="info"
    )


def run_format_risk_checks(
    lines: List[str],
    column_count: Optional[int] = None,
    table_line_count: int = 0,
    image_count: int = 0,
) -> FormatRiskResult:
    checks = [
        check_column_count(column_count),
        check_tables_used(table_line_count),
        check_embedded_images(image_count),
        check_unusual_bullet_glyphs(lines),
    ]

    total_weight = sum(SEVERITY_WEIGHT[c.severity] for c in checks)
    earned_weight = sum(SEVERITY_WEIGHT[c.severity] for c in checks if c.passed)
    score = round((earned_weight / total_weight) * 100, 1) if total_weight else 100.0

    return FormatRiskResult(checks=checks, score=score)
