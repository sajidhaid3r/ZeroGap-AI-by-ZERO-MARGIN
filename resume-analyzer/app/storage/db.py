"""
SQLite persistence layer.

Stores each analysis report (as JSON, keyed by a UUID) so results can be
retrieved later via GET /reports/{id}, and stores benchmark comparisons
over time so a real agreement-rate dashboard can eventually be built on
top of them (see architecture doc: "publish a running agreement-rate
dashboard" - this is the storage foundation for that).

SQLite (stdlib, zero extra dependencies) rather than Postgres, since this
is meant to run standalone without requiring an external DB service -
swap the connection logic for a Postgres client in a real multi-instance
deployment; the schema and queries below are simple enough to port
directly.
"""

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

from app.config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    created_at TEXT NOT NULL,
    overall_score REAL NOT NULL,
    composite_score_version TEXT NOT NULL,
    report_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS benchmark_runs (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    external_parser_name TEXT NOT NULL,
    overall_agreement_rate REAL NOT NULL,
    result_json TEXT NOT NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_report_id ON benchmark_runs(report_id);
"""


@contextmanager
def _connect():
    settings = get_settings()
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with _connect() as conn:
        conn.executescript(SCHEMA)


class StoredReportSummary(BaseModel):
    id: str
    filename: str
    created_at: str
    overall_score: float
    composite_score_version: str


def save_report(filename: str, report_json: str, overall_score: float, composite_score_version: str) -> str:
    report_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO reports (id, filename, created_at, overall_score, composite_score_version, report_json) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (report_id, filename, created_at, overall_score, composite_score_version, report_json),
        )
    return report_id


def get_report(report_id: str) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "filename": row["filename"],
        "created_at": row["created_at"],
        "overall_score": row["overall_score"],
        "composite_score_version": row["composite_score_version"],
        "report": json.loads(row["report_json"]),
    }


def list_reports(limit: int = 50) -> list:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, filename, created_at, overall_score, composite_score_version "
            "FROM reports ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [
        StoredReportSummary(
            id=r["id"],
            filename=r["filename"],
            created_at=r["created_at"],
            overall_score=r["overall_score"],
            composite_score_version=r["composite_score_version"],
        )
        for r in rows
    ]


def save_benchmark_run(
    report_id: str, external_parser_name: str, overall_agreement_rate: float, result_json: str
) -> str:
    run_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO benchmark_runs (id, report_id, created_at, external_parser_name, "
            "overall_agreement_rate, result_json) VALUES (?, ?, ?, ?, ?, ?)",
            (run_id, report_id, created_at, external_parser_name, overall_agreement_rate, result_json),
        )
    return run_id


def get_average_agreement_rate(external_parser_name: Optional[str] = None) -> Optional[float]:
    """Powers the 'running agreement-rate dashboard' the architecture doc
    calls out as the biggest trust differentiator - once real benchmark
    runs are being saved, this returns the running average."""
    with _connect() as conn:
        if external_parser_name:
            row = conn.execute(
                "SELECT AVG(overall_agreement_rate) as avg_rate, COUNT(*) as n "
                "FROM benchmark_runs WHERE external_parser_name = ?",
                (external_parser_name,),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT AVG(overall_agreement_rate) as avg_rate, COUNT(*) as n FROM benchmark_runs"
            ).fetchone()
    if row is None or row["n"] == 0:
        return None
    return round(row["avg_rate"], 3)
