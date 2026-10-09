"""
Centralized configuration.

Every tunable threshold in the pipeline was previously a module-level
constant scattered across a dozen files (MIN_COLUMN_GAP_PT,
GAP_THRESHOLD_MONTHS, FUZZY_MATCH_THRESHOLD, etc). Those constants still
exist and still work standalone - this module doesn't replace them - but
it also exposes them through a single `Settings` object driven by
environment variables, so a production deployment can tune behavior
without editing source files.

IMPORTANT: every field uses `Field(default_factory=lambda: os.environ.get(...))`
rather than a plain `os.environ.get(...)` default expression. A plain
default expression is evaluated exactly ONCE, when the class body first
executes at import time - meaning environment variables set afterward
(e.g. by a test using monkeypatch, or a container's env file loaded after
import) would be silently ignored. default_factory defers evaluation to
each Settings() instantiation instead. This was a real bug found and
fixed during testing - see test_stability.py::test_settings_respect_env_override.

Usage:
    from app.config import get_settings
    settings = get_settings()
    settings.max_file_size_bytes
"""

import os
from functools import lru_cache
from pydantic import BaseModel, Field


def _env_int(key: str, default: int) -> int:
    return int(os.environ.get(key, default))


def _env_str(key: str, default: str) -> str:
    return os.environ.get(key, default)


def _env_bool_from_key_presence(key: str) -> bool:
    return bool(os.environ.get(key, ""))


class Settings(BaseModel):
    # --- File handling ---
    max_file_size_bytes: int = Field(default_factory=lambda: _env_int("MAX_FILE_SIZE_BYTES", 5 * 1024 * 1024))
    allowed_extensions: tuple = (".pdf", ".docx")

    # --- OCR ---
    ocr_dpi: int = Field(default_factory=lambda: _env_int("OCR_DPI", 300))

    # --- Matching ---
    fuzzy_match_threshold: int = Field(default_factory=lambda: _env_int("FUZZY_MATCH_THRESHOLD", 85))

    # --- Gap / overlap detection ---
    gap_threshold_months: int = Field(default_factory=lambda: _env_int("GAP_THRESHOLD_MONTHS", 3))

    # --- Length check ---
    min_word_count: int = Field(default_factory=lambda: _env_int("MIN_WORD_COUNT", 150))
    ideal_max_word_count: int = Field(default_factory=lambda: _env_int("IDEAL_MAX_WORD_COUNT", 700))
    stretch_max_word_count: int = Field(default_factory=lambda: _env_int("STRETCH_MAX_WORD_COUNT", 1100))

    # --- Age bias ---
    old_graduation_threshold_years: int = Field(
        default_factory=lambda: _env_int("OLD_GRADUATION_THRESHOLD_YEARS", 20)
    )
    long_tenure_threshold_years: int = Field(default_factory=lambda: _env_int("LONG_TENURE_THRESHOLD_YEARS", 15))

    # --- LLM layer ---
    anthropic_api_key: str = Field(default_factory=lambda: _env_str("ANTHROPIC_API_KEY", ""))
    anthropic_model: str = Field(default_factory=lambda: _env_str("ANTHROPIC_MODEL", "claude-sonnet-4-6"))
    llm_quality_enabled: bool = Field(default_factory=lambda: _env_bool_from_key_presence("ANTHROPIC_API_KEY"))

    # --- Persistence ---
    database_path: str = Field(default_factory=lambda: _env_str("DATABASE_PATH", "resume_analyzer.db"))

    # --- CORS ---
    cors_allowed_origins: str = Field(default_factory=lambda: _env_str("CORS_ALLOWED_ORIGINS", "*"))

    # --- Logging ---
    log_level: str = Field(default_factory=lambda: _env_str("LOG_LEVEL", "INFO"))


@lru_cache()
def get_settings() -> Settings:
    return Settings()
