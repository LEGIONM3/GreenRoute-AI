# WasteCare Enterprise API Reference (v1)

Base URL: `https://api.wastecare.gov/api/v1` (Production) / `http://localhost:8000/api/v1` (Local)

All authenticated endpoints require the HTTP header:
`Authorization: Bearer <access_token>`
Multi-tenant requests accept:
`X-Tenant-ID: <tenant_id_or_slug>`

---

## 1. Authentication & Identity (`/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register citizen account | None |
| `POST` | `/auth/login` | Exchange credentials for access and refresh JWT | None |
| `POST` | `/auth/refresh` | Rotate access token using valid refresh token | None |
| `GET` | `/auth/me` | Fetch active user profile, permissions, and score | Bearer |
| `POST` | `/auth/mfa/enable` | Initialize TOTP authenticator setup & QR code | Bearer |
| `POST` | `/auth/mfa/verify` | Confirm 6-digit TOTP code and activate MFA | Bearer |

---

## 2. Facilities & Geospatial Intelligence (`/locations`)

| Method | Endpoint | Description | Cache Profile |
|---|---|---|---|
| `GET` | `/locations` | Query facilities by radius, city, or waste type | L1/L2 TTL: 300s |
| `GET` | `/locations/categories` | List disposal facility categories | L1/L2 TTL: 1800s |
| `GET` | `/locations/{id}` | Retrieve individual facility details | L1/L2 TTL: 300s |
| `POST` | `/locations` | Register new municipal facility | Invalidate `locations:*` |
| `PUT` | `/locations/{id}` | Update facility details | Invalidate `locations:*` |

---

## 3. Civic Complaints & Dispatch (`/reports`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/reports` | File waste dumping report with photo & coordinates | Bearer (Citizen) |
| `GET` | `/reports` | List user reports or all reports for officer | Bearer |
| `PATCH` | `/reports/{id}/status` | Update incident status (In Progress, Resolved) | Bearer (Officer/Admin) |

---

## 4. AI Policy Guidance & RAG (`/chat`)

| Method | Endpoint | Description | SLA |
|---|---|---|---|
| `POST` | `/chat/query` | Send natural language question to Groq RAG | < 2.0s |
| `GET` | `/chat/sessions` | Retrieve citizen conversation threads | < 100ms |

---

## 5. Municipal Control Plane (`/admin`)

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/admin/metrics` | Fetch aggregated municipal KPIs | `audit.read` |
| `GET` | `/admin/tenants` | List available municipal tenants | `system.config` |
| `GET` | `/admin/regions` | List regional districts under active tenant | `system.config` |
| `GET` | `/admin/wards` | Fetch ward collection metrics & open complaints | `system.config` |
| `GET` | `/admin/smart-bins` | Stream ultrasonic fill levels and tilt alerts | `system.config` |
| `GET` | `/admin/heatmaps` | Retrieve GIS density points and weights | `system.config` |
| `GET` | `/admin/audit-logs` | Query immutable security and compliance logs | `audit.read` |
