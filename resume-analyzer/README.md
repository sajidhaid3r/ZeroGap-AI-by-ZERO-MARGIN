# Resume Analysis Engine

A transparent, explainable resume parsing and scoring API — every score comes
with a published weight breakdown, every match records *how* it was found,
every deterministic check is kept separate from anything needing an LLM, and
the final score is assembled from **7 disclosed, versioned categories**
instead of one opaque number.

Now includes a working frontend, persistence, config management, structured
logging, and Docker deployment — this is a runnable system, not just a
library.

## Quickstart

```bash
# System dependencies (Ubuntu/Debian) - only needed for OCR fallback
sudo apt-get install tesseract-ocr poppler-utils

python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt

uvicorn app.main:app --reload
```

Then open `frontend/index.html` directly in a browser (or serve it with
`python -m http.server 9000` from the `frontend/` directory) — it talks to
the API at `http://127.0.0.1:8000` by default, editable in the UI itself.

Or skip the frontend and hit the API directly:
```bash
curl -X POST http://127.0.0.1:8000/analyze -F "file=@your_resume.pdf"
```

## Composite scoring — the core design choice

`app/scoring/composite_score.py` combines every check into **7 published,
weighted categories**, each independently inspectable:

| Category | Weight | What it measures |
|---|---|---|
| ATS essentials | 12% | filename cleanliness, professional email, URL length, date-format consistency |
| Resume sections | 13% | parse-completeness + section ordering |
| Content quality | 20% | quantification, strong verbs, bullet variance, spelling, repetition |
| Job tailoring | 15% | hard/soft skill match to a JD, title alignment (neutral if no JD supplied) |
| Recruiter red flags | 15% | format/design risk, resume length, overlapping employment, unsupported buzzwords |
| Bias & discrimination | 5% | age-bias pattern flags (informational, small penalty) |
| Seniority & impact | 20% | title-progression regression check, leadership signal (if LLM layer wired in) |

Change a weight in one place (`CATEGORY_WEIGHTS`), bump
`COMPOSITE_SCORE_VERSION`, done.

## What's implemented (all working, tested, verified end-to-end and live over HTTP)

### Extraction
PDF extraction with column-aware reading-order reconstruction, DOCX
(body/table/header/footer), OCR fallback for scanned PDFs, image/column
counting for format-risk detection.

### Structuring
Section segmentation off a versioned YAML dictionary, contact info
extraction, per-job experience parsing (title/company/dates/bullets).

### Matching
Versioned skills taxonomy (ESCO/O*NET-style) with exact/synonym/fuzzy
matching, JD tailoring, title-alignment comparison.

### Scoring (every module independently unit-tested, 100% rule-based unless noted)
Parse-completeness, content quality, repetition detection, spelling check,
ATS essentials, section order, format/design risk, resume length,
employment gap detection, overlapping-employment detection,
buzzword-without-evidence detection, seniority progression, age-bias
flagging, and an LLM quality layer (bullet rewriting + leadership-signal
judgment) kept in its own module, strictly grounded against inventing
facts.

### Benchmarking
Pluggable parser-agreement comparison framework against real vendor APIs
(Affinda, RChilli, Sovren), tested via a mock since no vendor domain is
reachable from this sandbox.

### Production infrastructure (new this round)
- **Config module** (`app/config.py`) — every threshold (file size limits,
  fuzzy-match sensitivity, word-count bounds, age-bias thresholds, etc.) is
  environment-variable-driven via a single `Settings` object, instead of
  scattered hardcoded constants. See `.env.example` for the full list.
- **SQLite persistence** (`app/storage/db.py`) — every analysis is saved
  with a UUID; `GET /reports/{id}` retrieves it, `GET /reports` lists
  recent history, `GET /stats/agreement-rate` powers a running
  parser-agreement dashboard once real benchmark runs are recorded.
- **Structured logging + request IDs** (`app/logging_config.py`) — every
  request gets a short ID included in logs and returned as an
  `X-Request-ID` response header, so a failure can be traced without
  digging through concurrent unrelated requests. Unhandled exceptions are
  caught centrally, logged with a full traceback, and returned to the
  client as a clean generic error + request ID (no internal details or
  stack traces leaked to the caller).
- **Docker deployment** (`Dockerfile`, `docker-compose.yml`, `.dockerignore`)
  — includes the `tesseract-ocr`/`poppler-utils` system dependencies, a
  healthcheck, and a persistent volume for the SQLite database.
  **Honesty note: no Docker daemon is available in this development
  sandbox, so the image itself was not built/run here** — it follows
  standard, well-tested patterns, but you should verify `docker build .`
  and `docker compose up` on your own machine before relying on it.
- **CI workflow** (`.github/workflows/tests.yml`) — runs the full test
  suite (plus an API-startup smoke check) on every push/PR to `main`.
- **Frontend** (`frontend/index.html`) — a single self-contained HTML file
  (no build step, no framework) that uploads a resume, shows the 7-category
  score breakdown as bars, lists warnings/findings, and includes a raw-JSON
  toggle. Verified against the live API: the exact JSON shape it expects
  was checked field-by-field against a real `/analyze` response, and CORS
  preflight/actual-request headers were verified via curl.

### Test suite
**73 passing tests** across 7 test files, verified to pass in a genuinely
clean, isolated virtual environment (not just this dev sandbox) — confirming
`requirements.txt` is complete and accurate. Includes regression tests for
**eight real bugs found and fixed during development**:

1. Bullet-marker stripping treated `"-"` as the first word, breaking action-verb detection.
2. Gap detection silently skipped a candidate's whole history when their most recent role was "Present."
3. Seniority-level inference picked whichever keyword matched first by string length instead of the highest level present.
4. Filename-cleanliness regex missed `"final_final"` (underscore-separated).
5. The spelling checker flagged `"gmail"` as a typo because it was extracted from inside an email address.
6. Buzzword detection only scanned experience bullets, silently missing the summary/objective section.
7. **A corrupted PDF caused an unhandled `pymupdf.mupdf.FzErrorFormat` exception** (raw 500 with a stack trace) instead of a clean 422 — found via deliberate stability testing with garbage input files, fixed by wrapping every `fitz.open()` call.
8. **The config module's environment-variable defaults were evaluated once at import time**, not per-instantiation — meaning env var overrides silently didn't work. Fixed by switching from plain default expressions to `Field(default_factory=...)`.

## API reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check |
| `/config` | GET | Non-secret tunable thresholds currently in effect |
| `/analyze` | POST | Upload a PDF/DOCX (+ optional `job_description`, `save`) → full report |
| `/reports` | GET | List recent saved reports |
| `/reports/{id}` | GET | Retrieve a specific saved report |
| `/stats/agreement-rate` | GET | Running parser-agreement average (once benchmark runs are recorded) |

Interactive Swagger docs: `http://127.0.0.1:8000/docs`

## What's still a next step

1. **Embedding-based semantic skill matching** — exact/synonym + fuzzy only
   today; a third tier via `sentence-transformers` needs a model download
   this sandbox's network allowlist doesn't reach.
2. **Wiring a real external parser** into the benchmarking harness for
   genuine agreement-rate numbers instead of the mock.
3. **Full ESCO/O*NET taxonomy** — loader is ready, just needs the CSV pointed at it.
4. **Wiring the LLM leadership-signal result into the composite score** —
   currently `leadership_result=None` in the pipeline; call
   `judge_leadership_signal()` with a real `AnthropicClient` and pass the
   result through once `ANTHROPIC_API_KEY` is set.
5. **Verify the Docker image on a machine with a Docker daemon** — written
   to standard patterns but genuinely untested in this sandbox.
6. **Page-count cross-check for the length check** — currently word-count
   only; wire `fitz`'s `doc.page_count` through for PDFs.
7. **Auth** — there's currently no authentication on any endpoint; fine for
   local/personal use, but add an API key or proper auth layer before
   exposing this publicly, especially given `/reports` currently lists
   *all* saved reports with no per-user scoping.

## Setup

```bash
# System dependencies (Ubuntu/Debian) - only needed for OCR fallback
sudo apt-get install tesseract-ocr poppler-utils

python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt

cp .env.example .env   # optional - defaults work out of the box
```

For the LLM quality layer:
```bash
export ANTHROPIC_API_KEY=your_key_here
```

## Run with Docker

```bash
docker compose up --build
```
(Untested in this sandbox — see honesty note above. Verify on your machine.)

## Run the tests

```bash
pytest tests/ -v
```

## Project structure

```
app/
  extraction/       # PDF/DOCX/OCR extraction, column & image detection
  structuring/       # section segmentation, contact/experience parsing, schema
  matching/            # skills taxonomy, skill matching, title tailoring
  scoring/               # every individual check module + composite scoring
  benchmarking/            # pluggable parser-agreement comparison
  storage/                   # SQLite persistence (reports, benchmark runs)
  config.py                    # environment-driven settings
  logging_config.py             # structured logging + request IDs
  pipeline.py                    # orchestrates every stage in order
  main.py                          # FastAPI app / API surface
frontend/
  index.html                        # single-file upload + report UI
tests/                                # 73 tests across 7 files
Dockerfile
docker-compose.yml
.dockerignore
.env.example
.github/workflows/tests.yml
requirements.txt
```

## Design principles baked into this code

- **Every score is a weighted breakdown, never a bare number.**
- **Every match records its own confidence source** — parser confidence is
  auditable, not a single opaque number.
- **Deterministic and LLM-based checks live in separate modules on purpose.**
  Everything in `app/scoring/` except `llm_quality.py` is 100% rule-based and
  needs no API key or network access to run or test.
- **All thresholds are named constants, environment-tunable via `app/config.py`.**
- **Nothing is asserted without being tested** — including a genuinely clean
  venv install and live HTTP requests against a running server, not just
  unit tests against library functions.
- **Bugs are documented, not hidden.** Eight real ones were found and fixed
  during development; all eight are listed above with the regression test
  that now guards against each one.
