# Multi-Tenant Architecture & Regional Partitioning Model

## 1. Tenancy Hierarchy

WasteCare models municipal governance through a 4-tier organizational tree:

```
Tenant (e.g. Greater Bengaluru Municipal Corporation - BBMP)
└── Region (e.g. East District)
    └── Zone (e.g. Whitefield Zone)
        └── Ward (e.g. Ward 103 - ITPL Area)
            ├── Smart Bins (IoT Ultrasonic sensors)
            ├── Disposal Facilities (Recycling, Compost, Hazardous)
            └── Citizen Complaints & Dispatch Routes
```

---

## 2. Isolation Strategy

1. **Shared Database, Shared Schema with Row-Level Security (RLS)**:
   - Eliminates database sprawl and reduces infrastructure cost for civic bodies.
   - All tenant-owned tables implement `TenantMixin` (`tenant_id: UUID FK`).
   - Repository queries automatically apply `.filter(Model.tenant_id == current_tenant.id)`.

2. **Tenant Resolution Mechanism**:
   The active tenant is resolved in the following priority:
   - `X-Tenant-ID` HTTP Header (Passed by API clients / frontend store).
   - Domain / Subdomain matching (e.g., `bbmp.wastecare.gov`).
   - Authenticated user's default `user.tenant_id`.

3. **Cross-Tenant Data Leakage Defenses**:
   - Automated integration tests assert that querying without tenant membership raises HTTP 403.
   - Cache keys strictly prefix the tenant ID: `{tenant_id}:{resource}:{params_hash}`.
