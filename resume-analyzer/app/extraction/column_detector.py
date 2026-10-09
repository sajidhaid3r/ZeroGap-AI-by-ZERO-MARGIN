"""
Column detection & reading-order reconstruction.

This is the single most important module in the whole pipeline. A naive
extractor reads a page purely top-to-bottom, which weaves two side-by-side
columns into one scrambled stream (e.g. "Experience" header text gets
interrupted mid-sentence by "Skills" column content). This module clusters
text spans by x-position to detect column boundaries, then emits spans in
correct per-column reading order.

Approach: x0-position histogram clustering. Simple, explainable, and
testable - deliberately NOT a black box. Every threshold below is a named
constant so behavior is auditable and tunable, unlike opaque heuristics
buried in end-to-end ML pipelines.
"""

from dataclasses import dataclass
from typing import List

from app.extraction.pdf_extractor import TextSpan

# Minimum horizontal gap (in points) between two clusters of text to treat
# them as separate columns rather than the same column with ragged edges.
MIN_COLUMN_GAP_PT = 40.0

# Minimum fraction of spans that must fall into a would-be second column
# before we trust it's a real column and not just an indented sub-bullet.
MIN_COLUMN_POPULATION_RATIO = 0.15


@dataclass
class Column:
    x_start: float
    x_end: float
    spans: List[TextSpan]


def _cluster_x_positions(spans: List[TextSpan]) -> List[float]:
    """Returns sorted unique-ish x0 start positions, used to find gaps."""
    return sorted(s.x0 for s in spans)


def detect_columns(spans: List[TextSpan], page_width: float) -> List[Column]:
    """
    Detects column boundaries on a single page's spans using x0 gap
    analysis, then buckets every span into its column.

    Returns columns left-to-right. A single-column resume returns a
    list of length 1.
    """
    if not spans:
        return []

    xs = _cluster_x_positions(spans)

    # Find the largest gap(s) in x0 starting positions, above threshold.
    gaps = []
    for i in range(1, len(xs)):
        gap = xs[i] - xs[i - 1]
        if gap >= MIN_COLUMN_GAP_PT:
            gaps.append((gap, xs[i - 1], xs[i]))

    if not gaps:
        return [Column(x_start=0, x_end=page_width, spans=spans)]

    # Take the single largest gap as the primary column split.
    # (Multi-column resumes with 3+ columns are rare; extend this to
    # take top-N gaps if you need to support them.)
    gaps.sort(key=lambda g: -g[0])
    split_gap = gaps[0]
    split_x = (split_gap[1] + split_gap[2]) / 2

    left_spans = [s for s in spans if s.x0 < split_x]
    right_spans = [s for s in spans if s.x0 >= split_x]

    total = len(spans)
    right_ratio = len(right_spans) / total if total else 0

    if right_ratio < MIN_COLUMN_POPULATION_RATIO:
        # Not a real second column - likely just an indented line
        # (sub-bullet, nested item). Treat as single column.
        return [Column(x_start=0, x_end=page_width, spans=spans)]

    return [
        Column(x_start=0, x_end=split_x, spans=left_spans),
        Column(x_start=split_x, x_end=page_width, spans=right_spans),
    ]


def reconstruct_reading_order(
    spans: List[TextSpan], page_dims: List[tuple]
) -> List[TextSpan]:
    """
    Full pipeline: group spans by page, detect columns per page, and
    emit spans in correct reading order (column by column, left to
    right within the column set, top to bottom within each column).
    """
    ordered: List[TextSpan] = []

    pages = sorted(set(s.page for s in spans))
    for page_num in pages:
        page_spans = [s for s in spans if s.page == page_num]
        width = page_dims[page_num][0] if page_num < len(page_dims) else 612.0

        columns = detect_columns(page_spans, width)

        for col in columns:
            col_spans_sorted = sorted(col.spans, key=lambda s: (round(s.y0, 0), s.x0))
            ordered.extend(col_spans_sorted)

    return ordered


def spans_to_lines(spans: List[TextSpan]) -> List[str]:
    """
    Groups reading-order spans into lines based on y-proximity, producing
    the flat text-line list that section segmentation consumes next.
    """
    if not spans:
        return []

    lines: List[List[TextSpan]] = []
    current_line: List[TextSpan] = [spans[0]]
    current_y = spans[0].y0

    Y_TOLERANCE = 3.0

    for span in spans[1:]:
        if abs(span.y0 - current_y) <= Y_TOLERANCE:
            current_line.append(span)
        else:
            lines.append(current_line)
            current_line = [span]
            current_y = span.y0
    lines.append(current_line)

    text_lines = []
    for line_spans in lines:
        line_spans_sorted = sorted(line_spans, key=lambda s: s.x0)
        text_lines.append(" ".join(s.text for s in line_spans_sorted))

    return text_lines


def max_column_count(spans: List[TextSpan], page_dims: List[tuple]) -> int:
    """Returns the highest column count detected on any single page -
    used by the format-risk check to flag multi-column layouts."""
    max_count = 1
    pages = sorted(set(s.page for s in spans))
    for page_num in pages:
        page_spans = [s for s in spans if s.page == page_num]
        width = page_dims[page_num][0] if page_num < len(page_dims) else 612.0
        columns = detect_columns(page_spans, width)
        max_count = max(max_count, len(columns))
    return max_count
