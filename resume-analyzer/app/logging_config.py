"""
Structured logging setup. Every request gets a short request ID that's
included in every log line for that request and returned in the response
header, so a failure can be traced end-to-end without grepping through
unrelated concurrent requests.
"""

import logging
import sys
import uuid

from app.config import get_settings


def configure_logging():
    settings = get_settings()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level)


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]


logger = logging.getLogger("resume_analyzer")
