# Role-Based Access Control (RBAC) & Access Control List (ACL) Guide

## 1. Core Principles
- **Least Privilege Principle**: Users receive only the minimum permissions required for their civic role.
- **Granular Permissions**: Operations require specific permissions (`resource:action`), not just high-level role names.
- **Dynamic Role Matrix**: Permissions are bound to roles dynamically in `role_permissions` table, allowing custom roles per municipality without code modifications.

---

## 2. Standard System Roles

| Role Name | Scope | Typical Users | Key Permissions |
|---|---|---|---|
| **superadmin** | Global System | Platform DevOps, Chief Architect | All permissions (`*`) |
| **admin** | Tenant-Wide | Municipal Commissioners, IT Directors | `user.*`, `policy.*`, `location.*`, `report.*`, `audit.read` |
| **municipaloperator**| Regional / Ward | Sanitation Officers, Dispatchers | `report.read`, `report.update_status`, `report.dispatch`, `location.read` |
| **citizen** | Personal | General Public, Business Owners | `report.create`, `report.read_own`, `location.read`, `policy.read` |

---

## 3. Granular Permission Catalog

| Code | Resource | Action | Description |
|---|---|---|---|
| `location.read` | Locations | View | Browse facilities and map markers |
| `location.write` | Locations | Create/Update | Add or modify disposal facilities |
| `location.delete`| Locations | Soft-Delete | Deactivate disposal facility |
| `report.create` | Reports | Submit | File illegal dumping incident |
| `report.dispatch`| Reports | Dispatch | Assign cleanup truck to incident |
| `report.update_status` | Reports | Status | Mark report In-Progress or Resolved |
| `policy.write` | Policies | Ingest | Upload regulatory environmental notifications |
| `audit.read` | Audit Logs | Inspect | View immutable activity telemetry |
| `system.config` | Settings | Configure | Update AI thresholds, MFA rules, cache TTLs |

---

## 4. Enforcement Code Pattern

```python
from app.core.deps import require_permission

@router.patch("/reports/{report_id}/dispatch")
def dispatch_report(
    report_id: str,
    current_user: User = Depends(require_permission("report.dispatch")),
    db: Session = Depends(get_db)
):
    # Execution is guaranteed to have 'report.dispatch' permission
    ...
```
