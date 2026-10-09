"""
Pipeline orchestrator. Runs every stage in order:

  0. Ingestion (file type detection)
  1. Extraction (pdf_extractor / docx_extractor / ocr_extractor fallback)
  2. Reading-order reconstruction (column_detector, PDF only)
  3. Section segmentation (section_segmenter)
  4. Field extraction (contact_extractor, experience_parser)
  5. Parse-completeness scoring (scoring/parse_completeness)
  6. Content quality scoring (content_quality, repetition_detector, spelling_checker)
  7. Structural checks (section_order, ats_essentials)
  8. Gap detection (gap_detector)
  9. Bias flagging (age_bias_detector)
  10. Seniority progression (seniority_progression)
  11. Job/title tailoring, if a JD was supplied (skill_matcher, title_tailoring)
  12. Composite scoring (composite_score) - published weights, 7 categories
  13. Aggregate report assembly

Each stage's output is attached to the result so the full report is
auditable end-to-end, not just a final number.
"""

from typing import Optional
from pydantic import BaseModel

from app.extraction.pdf_extractor import extract_spans, page_dimensions, has_text_layer, count_embedded_images, PDFExtractionError
from app.extraction.column_detector import reconstruct_reading_order, spans_to_lines, max_column_count
from app.extraction.docx_extractor import extract_lines as extract_docx_lines, count_embedded_images as count_docx_images, DocxExtractionError
from app.extraction.ocr_extractor import ocr_extract_lines, ocr_lines_to_text_lines, overall_ocr_confidence, OCRExtractionError

from app.structuring.section_segmenter import segment
from app.structuring.contact_extractor import extract_contact_info
from app.structuring.experience_parser import parse_experience_entries, entries_to_date_ranges
from app.structuring.schema import ParsedResume, ExperienceEntry

from app.scoring.parse_completeness import score_parse_completeness, ParseCompletenessResult
from app.scoring.content_quality import analyze_bullets, ContentQualityResult
from app.scoring.gap_detector import detect_gaps, EmploymentGap
from app.scoring.age_bias_detector import scan_for_age_bias, AgeBiasFinding
from app.scoring.ats_essentials import run_ats_essentials, ATSEssentialsResult
from app.scoring.repetition_detector import analyze_repetition, RepetitionResult
from app.scoring.spelling_checker import check_spelling, SpellingResult
from app.scoring.section_order import check_section_order, SectionOrderResult
from app.scoring.seniority_progression import check_seniority_progression, SeniorityProgressionResult
from app.scoring.format_risk import run_format_risk_checks, FormatRiskResult
from app.scoring.length_check import check_resume_length, LengthCheckResult
from app.scoring.overlap_detector import detect_overlaps, EmploymentOverlap
from app.scoring.buzzword_detector import detect_buzzwords, BuzzwordResult
from app.scoring.composite_score import compute_composite_score, CompositeScoreResult

from app.matching.skill_matcher import tailor_to_job_description, TailoringResult
from app.matching.title_tailoring import suggest_tailored_title, TitleTailoringResult


class AnalysisReport(BaseModel):
    parsed_resume: ParsedResume
    parse_completeness: ParseCompletenessResult
    content_quality: Optional[ContentQualityResult] = None
    repetition: Optional[RepetitionResult] = None
    spelling: Optional[SpellingResult] = None
    ats_essentials: ATSEssentialsResult
    section_order: SectionOrderResult
    format_risk: FormatRiskResult
    length_check: LengthCheckResult
    employment_gaps: list[EmploymentGap] = []
    employment_overlaps: list[EmploymentOverlap] = []
    age_bias_findings: list[AgeBiasFinding] = []
    buzzwords: BuzzwordResult
    seniority_progression: Optional[SeniorityProgressionResult] = None
    tailoring: Optional[TailoringResult] = None
    title_tailoring: Optional[TitleTailoringResult] = None
    composite_score: CompositeScoreResult
    overall_score: float
    warnings: list[str] = []
    report_id: Optional[str] = None


def _lines_from_pdf(file_bytes: bytes):
    """Returns (lines, warnings, column_count, image_count). Routes
    through OCR automatically when no text layer is present, instead of
    hard-failing (column/image detection isn't meaningful for OCR'd
    scans, so those default to None/0 in that branch)."""
    if not has_text_layer(file_bytes):
        try:
            ocr_lines = ocr_extract_lines(file_bytes)
        except OCRExtractionError as e:
            raise ValueError(str(e))
        confidence = overall_ocr_confidence(ocr_lines)
        warning = (
            f"This PDF has no extractable text layer (likely a scanned "
            f"image) and was processed with OCR instead - mean OCR "
            f"confidence: {confidence}/100. OCR-derived text may contain "
            f"recognition errors; consider uploading a native (non-scanned) "
            f"PDF or DOCX for more reliable parsing."
        )
        return ocr_lines_to_text_lines(ocr_lines), [warning], None, 0

    spans = extract_spans(file_bytes)
    dims = page_dimensions(file_bytes)
    ordered_spans = reconstruct_reading_order(spans, dims)
    lines = spans_to_lines(ordered_spans)
    column_count = max_column_count(spans, dims)
    image_count = count_embedded_images(file_bytes)
    return lines, [], column_count, image_count


def _lines_from_docx(file_bytes: bytes):
    docx_lines = extract_docx_lines(file_bytes)
    warnings = []
    body_lines = [l.text for l in docx_lines if l.source == "body"]
    table_lines = [l for l in docx_lines if l.source == "table"]
    header_footer_lines = [l for l in docx_lines if l.source in ("header", "footer")]

    if table_lines:
        warnings.append(
            f"{len(table_lines)} line(s) found inside Word tables - "
            "some ATS parsers skip table content entirely. Consider moving "
            "this into the main document body."
        )
    if header_footer_lines:
        warnings.append(
            f"{len(header_footer_lines)} line(s) found in the document header/footer - "
            "many ATS parsers never read headers/footers. If this includes "
            "contact info, duplicate it into the main body."
        )

    all_lines = body_lines + [l.text for l in table_lines] + [l.text for l in header_footer_lines]
    image_count = count_docx_images(file_bytes)
    return all_lines, warnings, len(table_lines), image_count


def run_pipeline(
    file_bytes: bytes, filename: str, job_description: Optional[str] = None
) -> AnalysisReport:
    warnings: list[str] = []

    # --- Stages 0-2: ingestion + extraction + reading-order ---
    column_count = None
    table_line_count = 0
    image_count = 0

    if filename.lower().endswith(".pdf"):
        try:
            lines, pdf_warnings, column_count, image_count = _lines_from_pdf(file_bytes)
            warnings.extend(pdf_warnings)
        except PDFExtractionError as e:
            raise ValueError(str(e))
    elif filename.lower().endswith(".docx"):
        try:
            lines, docx_warnings, table_line_count, image_count = _lines_from_docx(file_bytes)
            warnings.extend(docx_warnings)
        except DocxExtractionError as e:
            raise ValueError(str(e))
    else:
        raise ValueError("Unsupported file type. Only PDF and DOCX are accepted.")

    # --- Stage 3: section segmentation ---
    raw_sections = segment(lines)

    # --- Stage 4: field extraction ---
    contact = extract_contact_info(lines)

    summary_text = None
    skills: list = []
    experience_entries: list[ExperienceEntry] = []
    all_bullets: list = []
    education_lines: list = []

    for section in raw_sections:
        if section.canonical_name == "summary" and section.lines:
            summary_text = " ".join(section.lines)
        elif section.canonical_name == "skills":
            for line in section.lines:
                parts = [p.strip() for p in line.replace(";", ",").split(",") if p.strip()]
                skills.extend(parts)
        elif section.canonical_name == "education":
            education_lines.extend(section.lines)
        elif section.canonical_name == "experience":
            job_entries = parse_experience_entries(section.lines)
            for job in job_entries:
                all_bullets.extend(job.bullets)
                experience_entries.append(
                    ExperienceEntry(
                        title=job.title,
                        company=job.company,
                        location=job.location,
                        start_date_raw=job.start_date_raw,
                        end_date_raw=job.end_date_raw,
                        is_current=job.is_current,
                        bullets=job.bullets,
                        source_lines=[job.header_line] + job.bullets,
                    )
                )
                if job.header_parse_confidence < 0.5 and job.header_line:
                    warnings.append(
                        f"Could not confidently split title/company on: "
                        f"\"{job.header_line}\" - consider using a clearer "
                        f"delimiter like a comma or pipe between them."
                    )

    parsed = ParsedResume(
        contact=contact,
        summary=summary_text,
        experience=experience_entries,
        skills=skills,
        raw_sections=raw_sections,
        parse_warnings=warnings,
    )

    # --- Stage 5: parse-completeness scoring ---
    completeness = score_parse_completeness(parsed, total_lines_seen=len(lines))

    # --- Stage 6: content quality ---
    content_quality = analyze_bullets(all_bullets) if all_bullets else None
    if not content_quality:
        warnings.append("No experience bullets detected - content quality score not computed.")

    repetition = analyze_repetition(all_bullets) if all_bullets else None
    if repetition and repetition.repeated_words:
        top = ", ".join(f"'{w.word}' ({w.count}x)" for w in repetition.repeated_words[:3])
        warnings.append(f"Some words are repeated often across your bullets: {top}. Consider varying word choice.")

    spelling = check_spelling(lines)
    if spelling.issues:
        warnings.append(
            f"{len(spelling.issues)} possible spelling issue(s) detected "
            f"(e.g. '{spelling.issues[0].word}' -> '{spelling.issues[0].suggestion}')."
        )

    # --- Stage 7: structural checks ---
    section_names_in_order = [s.canonical_name for s in raw_sections]
    section_order_result = check_section_order(section_names_in_order)
    if not section_order_result.in_conventional_order:
        warnings.append(
            f"{len(section_order_result.issues)} section(s) are in a non-conventional order."
        )

    ats_essentials_result = run_ats_essentials(filename, contact.email, lines)
    for check in ats_essentials_result.checks:
        if not check.passed and check.severity in ("blocker", "warning"):
            warnings.append(check.detail)

    format_risk_result = run_format_risk_checks(
        lines, column_count=column_count, table_line_count=table_line_count, image_count=image_count
    )
    for check in format_risk_result.checks:
        if not check.passed and check.severity == "warning":
            warnings.append(check.detail)

    length_result = check_resume_length(lines)
    if length_result.assessment in ("too_short", "too_long"):
        warnings.append(length_result.detail)

    buzzword_scan_lines = list(all_bullets)
    if summary_text:
        buzzword_scan_lines.append(summary_text)
    buzzword_result = detect_buzzwords(buzzword_scan_lines) if buzzword_scan_lines else BuzzwordResult(findings=[], unsupported_count=0)
    if buzzword_result.unsupported_count:
        unsupported_examples = ", ".join(
            f"'{f.buzzword}'" for f in buzzword_result.findings if not f.has_nearby_evidence
        )
        warnings.append(
            f"{buzzword_result.unsupported_count} buzzword(s) used without nearby "
            f"supporting evidence (e.g. {unsupported_examples[:100]}). Consider "
            f"replacing with a specific, quantified example instead."
        )

    # --- Stage 8: gap detection ---
    date_ranges = entries_to_date_ranges(experience_entries)
    employment_gaps = detect_gaps(date_ranges) if len(date_ranges) >= 2 else []
    if employment_gaps:
        warnings.append(
            f"{len(employment_gaps)} employment gap(s) of 3+ months detected. "
            "This isn't necessarily a problem, but consider addressing gaps "
            "briefly in your summary if they might raise questions."
        )

    # --- Stage 8.5: overlapping employment detection ---
    overlap_ranges = [
        (f"{e.title or 'Role'} at {e.company or 'Unknown'}", e.start_date_raw, e.end_date_raw)
        for e in experience_entries
        if e.start_date_raw and e.end_date_raw
    ]
    employment_overlaps = detect_overlaps(overlap_ranges) if len(overlap_ranges) >= 2 else []
    if employment_overlaps:
        warnings.append(
            f"{len(employment_overlaps)} overlapping employment period(s) detected "
            f"(e.g. {employment_overlaps[0].role_a} overlaps {employment_overlaps[0].role_b} "
            f"by {employment_overlaps[0].overlap_months} months). If this was "
            f"freelance/part-time/consulting work alongside a full-time role, "
            f"consider labeling it as such to avoid recruiter confusion."
        )

    # --- Stage 9: age-bias pattern flagging ---
    age_bias_findings = scan_for_age_bias(lines, education_lines)

    # --- Stage 10: seniority progression ---
    titles_most_recent_first = [e.title for e in experience_entries if e.title]
    seniority_result = (
        check_seniority_progression(titles_most_recent_first) if titles_most_recent_first else None
    )
    if seniority_result and seniority_result.has_regression:
        warnings.append(seniority_result.regression_detail)

    # --- Stage 11: job/title tailoring (only if JD supplied) ---
    tailoring_result = None
    title_tailoring_result = None
    if job_description:
        resume_text = "\n".join(lines)
        tailoring_result = tailor_to_job_description(resume_text, job_description)
        current_title = titles_most_recent_first[0] if titles_most_recent_first else None
        title_tailoring_result = suggest_tailored_title(current_title, job_description)
        if title_tailoring_result.suggestion:
            warnings.append(title_tailoring_result.suggestion)

    # --- Stage 12: composite scoring (published weights, 7 categories) ---
    composite = compute_composite_score(
        ats_essentials_result=ats_essentials_result,
        parse_completeness_result=completeness,
        section_order_result=section_order_result,
        content_quality_result=content_quality,
        repetition_result=repetition,
        spelling_result=spelling,
        tailoring_result=tailoring_result,
        title_tailoring_result=title_tailoring_result,
        age_bias_findings=age_bias_findings,
        seniority_result=seniority_result,
        leadership_result=None,  # requires the LLM layer - wire in when ANTHROPIC_API_KEY is set
        format_risk_result=format_risk_result,
        length_result=length_result,
        overlaps=employment_overlaps,
        buzzword_result=buzzword_result,
    )

    return AnalysisReport(
        parsed_resume=parsed,
        parse_completeness=completeness,
        content_quality=content_quality,
        repetition=repetition,
        spelling=spelling,
        ats_essentials=ats_essentials_result,
        section_order=section_order_result,
        format_risk=format_risk_result,
        length_check=length_result,
        employment_gaps=employment_gaps,
        employment_overlaps=employment_overlaps,
        age_bias_findings=age_bias_findings,
        buzzwords=buzzword_result,
        seniority_progression=seniority_result,
        tailoring=tailoring_result,
        title_tailoring=title_tailoring_result,
        composite_score=composite,
        overall_score=composite.overall_score,
        warnings=warnings,
    )
