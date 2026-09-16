import contextvars
from typing import Optional
from fastapi import Request, Header

_tenant_context: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_tenant_id", default=None)

DEFAULT_TENANT_ID = "default-civic-tenant"
DEFAULT_TENANT_SLUG = "global-civic"


def set_current_tenant_id(tenant_id: Optional[str]) -> None:
    """Sets the active tenant ID for the current async execution context."""
    _tenant_context.set(tenant_id)


def get_current_tenant_id() -> str:
    """Retrieves the active tenant ID, defaulting to DEFAULT_TENANT_ID."""
    tid = _tenant_context.get()
    return tid or DEFAULT_TENANT_ID


def resolve_tenant_from_request(
    request: Request,
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
) -> str:
    """
    FastAPI dependency that extracts and validates the tenant ID from request headers,
    host subdomain, or query parameters.
    """
    if x_tenant_id:
        set_current_tenant_id(x_tenant_id)
        return x_tenant_id

    # Fallback to query param
    query_tenant = request.query_params.get("tenant_id")
    if query_tenant:
        set_current_tenant_id(query_tenant)
        return query_tenant

    # Fallback to Host Subdomain (e.g. ghmc.wastecare.gov -> ghmc)
    host = request.headers.get("host", "")
    parts = host.split(".")
    if len(parts) >= 3 and parts[0] not in ("www", "api", "localhost", "127"):
        subdomain_tenant = parts[0]
        set_current_tenant_id(subdomain_tenant)
        return subdomain_tenant

    set_current_tenant_id(DEFAULT_TENANT_ID)
    return DEFAULT_TENANT_ID
