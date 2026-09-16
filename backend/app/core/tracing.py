import time
import secrets
import contextvars
from typing import Optional
from contextlib import contextmanager

_current_trace_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("trace_id", default=None)
_current_span_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("span_id", default=None)


def generate_trace_id() -> str:
    """Generates a standard 128-bit W3C TraceContext compliant trace ID (32 hex chars)."""
    return secrets.token_hex(16)


def generate_span_id() -> str:
    """Generates a standard 64-bit W3C TraceContext compliant span ID (16 hex chars)."""
    return secrets.token_hex(8)


def get_current_trace_id() -> str:
    tid = _current_trace_id.get()
    if not tid:
        tid = generate_trace_id()
        _current_trace_id.set(tid)
    return tid


def set_trace_context(trace_id: str, span_id: Optional[str] = None):
    _current_trace_id.set(trace_id)
    if span_id:
        _current_span_id.set(span_id)


@contextmanager
def trace_span(name: str):
    """Context manager for tracing operational sub-tasks."""
    span_id = generate_span_id()
    prev_span = _current_span_id.get()
    _current_span_id.set(span_id)
    start = time.time()
    try:
        yield {"trace_id": get_current_trace_id(), "span_id": span_id, "name": name}
    finally:
        duration_ms = (time.time() - start) * 1000
        _current_span_id.set(prev_span)
