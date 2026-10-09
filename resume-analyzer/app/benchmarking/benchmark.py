"""
Parser-agreement benchmarking.

The single biggest trust differentiator identified in the architecture
doc: instead of asserting our parser is accurate, periodically run the
same resumes through a real third-party parsing API and publish the
field-level agreement rate.

This module defines a pluggable `ExternalParser` interface so any vendor
(Affinda, RChilli, Sovren/Textkernel, HireAbility) can be wired in via a
thin adapter, plus a `MockExternalParser` used for testing the comparison
logic itself without needing a live API key or network access to a
vendor's endpoint (this sandbox's network allowlist doesn't include any
resume-parsing vendor domains - see README for how to wire a real one in
your own deployment).

Field-level agreement, not a single blended score, is the point: it's
far more useful to know "we agree with Affinda 95% of the time on email
extraction but only 60% of the time on job titles" than a single vague
number.
"""

from typing import List, Optional, Protocol
from pydantic import BaseModel

from app.structuring.schema import ParsedResume


class ExternalParseResult(BaseModel):
    """Normalized shape any vendor adapter should map its response into,
    so comparison logic doesn't need to know about vendor-specific schemas."""

    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    job_titles: List[str] = []
    companies: List[str] = []


class ExternalParser(Protocol):
    def parse(self, file_bytes: bytes, filename: str) -> ExternalParseResult:
        ...


class MockExternalParser:
    """
    Stand-in for a real vendor API, used to test the benchmarking harness
    itself. Returns a fixed, injectable result rather than actually
    parsing anything - swap for a real adapter (see README) to run
    genuine agreement benchmarks.
    """

    def __init__(self, canned_result: ExternalParseResult):
        self.canned_result = canned_result

    def parse(self, file_bytes: bytes, filename: str) -> ExternalParseResult:
        return self.canned_result


class FieldAgreement(BaseModel):
    field: str
    our_value: Optional[str] = None
    external_value: Optional[str] = None
    agree: bool


class SetFieldAgreement(BaseModel):
    field: str
    our_values: List[str]
    external_values: List[str]
    overlap_count: int
    union_count: int
    jaccard_similarity: float


class BenchmarkResult(BaseModel):
    scalar_fields: List[FieldAgreement]
    set_fields: List[SetFieldAgreement]
    overall_agreement_rate: float  # simple average across all comparisons


def _normalize(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return value.strip().lower()


def _compare_scalar(field: str, ours: Optional[str], theirs: Optional[str]) -> FieldAgreement:
    return FieldAgreement(
        field=field,
        our_value=ours,
        external_value=theirs,
        agree=_normalize(ours) == _normalize(theirs) and ours is not None,
    )


def _compare_set(field: str, ours: List[str], theirs: List[str]) -> SetFieldAgreement:
    ours_norm = {_normalize(v) for v in ours if v}
    theirs_norm = {_normalize(v) for v in theirs if v}
    overlap = ours_norm & theirs_norm
    union = ours_norm | theirs_norm
    jaccard = round(len(overlap) / len(union), 2) if union else 1.0
    return SetFieldAgreement(
        field=field,
        our_values=ours,
        external_values=theirs,
        overlap_count=len(overlap),
        union_count=len(union),
        jaccard_similarity=jaccard,
    )


def compare_parses(ours: ParsedResume, theirs: ExternalParseResult) -> BenchmarkResult:
    our_job_titles = [e.title for e in ours.experience if e.title]
    our_companies = [e.company for e in ours.experience if e.company]

    scalar_fields = [
        _compare_scalar("full_name", ours.contact.full_name, theirs.full_name),
        _compare_scalar("email", ours.contact.email, theirs.email),
        _compare_scalar("phone", ours.contact.phone, theirs.phone),
    ]

    set_fields = [
        _compare_set("skills", ours.skills, theirs.skills),
        _compare_set("job_titles", our_job_titles, theirs.job_titles),
        _compare_set("companies", our_companies, theirs.companies),
    ]

    scalar_scores = [1.0 if f.agree else 0.0 for f in scalar_fields]
    set_scores = [f.jaccard_similarity for f in set_fields]
    all_scores = scalar_scores + set_scores
    overall = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0

    return BenchmarkResult(
        scalar_fields=scalar_fields,
        set_fields=set_fields,
        overall_agreement_rate=overall,
    )


def run_benchmark(
    ours: ParsedResume, external_parser: ExternalParser, file_bytes: bytes, filename: str
) -> BenchmarkResult:
    external_result = external_parser.parse(file_bytes, filename)
    return compare_parses(ours, external_result)
