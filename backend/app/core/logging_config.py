import json
import logging
import time
from datetime import datetime
from typing import Any, Dict


class StructuredJSONFormatter(logging.Formatter):
    """
    Standard Cloud-Native JSON Structured Formatter.
    Produces logs indexed easily by Datadog, Elasticsearch, Loki, and CloudWatch.
    """

    def __init__(self, service_name: str = "wastecare-backend"):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": self.service_name,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Contextual metadata
        if hasattr(record, "correlation_id"):
            log_obj["correlation_id"] = getattr(record, "correlation_id")
        if hasattr(record, "tenant_id"):
            log_obj["tenant_id"] = getattr(record, "tenant_id")
        if hasattr(record, "duration_ms"):
            log_obj["duration_ms"] = getattr(record, "duration_ms")
        if hasattr(record, "http_status"):
            log_obj["http_status"] = getattr(record, "http_status")
        if hasattr(record, "path"):
            log_obj["path"] = getattr(record, "path")

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)


def setup_structured_logging(log_level: str = "INFO") -> logging.Logger:
    """Configures the root logger with the structured JSON formatter."""
    logger = logging.getLogger("app")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Console handler
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJSONFormatter())
    
    # Avoid duplicate handlers
    if not logger.handlers:
        logger.addHandler(handler)
        logger.propagate = False

    return logger


logger = setup_structured_logging()
