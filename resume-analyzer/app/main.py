"""
FastAPI entrypoint.

Run locally with:
    uvicorn app.main:app --reload

Then POST a PDF/DOCX to /analyze to get the full structured report.
"""

import json
import time
import traceback

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional

from app.config import get_settings
from app.logging_config import configure_logging, new_request_id, logger
from app.pipeline import run_pipeline, AnalysisReport
from app.storage import db

configure_logging()
settings = get_settings()
db.init_db()

app = FastAPI(
    title="Resume Analysis Engine",
    description="Transparent, explainable resume parsing and scoring API.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_allowed_origins] if settings.cors_allowed_origins != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Attaches a short request ID to every request/response pair and
    logs a single structured line per request (method, path, status,
    duration) - the minimum needed to trace a failure in production
    without a full APM setup."""
    request_id = new_request_id()
    start = time.monotonic()
    request.state.request_id = request_id

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.monotonic() - start) * 1000, 1)
        logger.error(
            f"request_id={request_id} method={request.method} path={request.url.path} "
            f"status=500 duration_ms={duration_ms} UNHANDLED_EXCEPTION\n{traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error.", "request_id": request_id},
        )

    duration_ms = round((time.monotonic() - start) * 1000, 1)
    logger.info(
        f"request_id={request_id} method={request.method} path={request.url.path} "
        f"status={response.status_code} duration_ms={duration_ms}"
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/config")
def get_config():
    """Exposes the non-secret tunable thresholds currently in effect -
    useful for confirming what a deployed instance is actually running
    with, without needing shell access to check environment variables."""
    return {
        "max_file_size_bytes": settings.max_file_size_bytes,
        "allowed_extensions": settings.allowed_extensions,
        "fuzzy_match_threshold": settings.fuzzy_match_threshold,
        "gap_threshold_months": settings.gap_threshold_months,
        "min_word_count": settings.min_word_count,
        "ideal_max_word_count": settings.ideal_max_word_count,
        "stretch_max_word_count": settings.stretch_max_word_count,
        "old_graduation_threshold_years": settings.old_graduation_threshold_years,
        "long_tenure_threshold_years": settings.long_tenure_threshold_years,
        "llm_quality_enabled": settings.llm_quality_enabled,
    }


@app.post("/analyze", response_model=AnalysisReport)
async def analyze_resume(
    request: Request,
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
    save: bool = Form(True),
):
    request_id = getattr(request.state, "request_id", "unknown")
    filename = file.filename or ""

    if not filename.lower().endswith(settings.allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Accepted: {settings.allowed_extensions}",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.max_file_size_bytes // (1024*1024)}MB limit.",
        )

    try:
        report = run_pipeline(file_bytes, filename, job_description=job_description)
    except ValueError as e:
        # Expected, user-facing parsing failures (bad file, unsupported
        # format, corrupted content) - 422, with the specific reason.
        logger.warning(f"request_id={request_id} parse_error filename={filename!r} detail={e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        # Unexpected internal failure - full traceback goes to the log,
        # but the client only gets a request ID to reference, not
        # internal error details (avoids leaking stack traces).
        logger.error(
            f"request_id={request_id} unexpected_pipeline_error filename={filename!r}\n{traceback.format_exc()}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Internal parsing error. Reference request_id={request_id} when reporting this.",
        )

    if save:
        try:
            report_id = db.save_report(
                filename=filename,
                report_json=report.model_dump_json(),
                overall_score=report.overall_score,
                composite_score_version=report.composite_score.version,
            )
            report.report_id = report_id
        except Exception:
            # Persistence failure should never break the actual analysis
            # response - log and continue without a report_id.
            logger.error(f"request_id={request_id} failed_to_persist_report\n{traceback.format_exc()}")

    return report


@app.get("/reports")
def list_reports(limit: int = 50):
    return db.list_reports(limit=limit)


@app.get("/reports/{report_id}")
def get_report(report_id: str):
    result = db.get_report(report_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return result


@app.get("/stats/agreement-rate")
def agreement_rate(external_parser_name: Optional[str] = None):
    """Powers the running parser-agreement dashboard described in the
    architecture doc, once real benchmark runs are being recorded via
    app.benchmarking.benchmark + db.save_benchmark_run."""
    rate = db.get_average_agreement_rate(external_parser_name)
    return {"external_parser_name": external_parser_name, "average_agreement_rate": rate}
