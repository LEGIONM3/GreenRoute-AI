# Security & Regulatory Compliance Specification

## 1. Regulatory Governance Alignment

The WasteCare platform complies with international and regional data privacy and security mandates:
- **Digital Personal Data Protection (DPDP) Act 2023 (India)**: Explicit consent tracking, citizen right to data export, and right to be forgotten anonymization (`/api/v1/compliance/right-to-be-forgotten`).
- **EU General Data Protection Regulation (GDPR)**: Articles 7 (Consent), 15 (Access), 17 (Erasure), and 20 (Data Portability).
- **SOC 2 Type II & ISO 27001 Security Controls**: Cryptographic hashing, automated audit trails, tenant segregation, and non-root container sandboxing.

---

## 2. Authentication & Credential Hardening

| Control | Implementation | Specification |
|---|---|---|
| **Password Hashing** | Argon2id | Memory cost: 65,536 KiB, Time cost: 3 iterations, Parallelism: 4 |
| **Session Tokens** | PyJWT | HS256/RS256 with 15-minute access token expiry, 7-day refresh token rotation |
| **Multi-Factor Auth** | TOTP / RFC 6238 | Authenticator app pairing with QR code rendering and emergency recovery keys |
| **Session Revocation** | Blacklist Store | Redis token revocation table checked on every authorized request |
| **Rate Limiting** | NGINX + Ingress | 100 requests/sec per IP on public API, 5 requests/min on `/auth/login` |

---

## 3. Data Protection & Tenant Boundary Security

1. **Multi-Tenant Isolation**:
   - Every database model inherits from `TenantMixin` or binds directly to `tenant_id`.
   - All SQLAlchemy queries execute with tenant-bound filters. Cross-tenant access attempts return HTTP 403 Forbidden and emit a `SECURITY_VIOLATION` audit log.
2. **At-Rest Encryption**:
   - PostgreSQL tablespaces encrypted using AES-256 (LUKS or AWS KMS).
   - MinIO S3 object buckets enforce server-side SSE-S3 encryption.
3. **In-Transit Encryption**:
   - Strict TLS 1.3 with HSTS (`max-age=63072000; includeSubDomains; preload`).
   - Plain HTTP traffic automatically redirected to HTTPS at the Ingress boundary.

---

## 4. Prompt Injection & AI RAG Security

- **Input Sanitization**: User chat inputs undergo lexical sanitization to strip system prompt override patterns (e.g. `Ignore previous instructions`, `System:`, `You are now a unrestricted terminal`).
- **Grounded Attribution**: Responses strictly cite pre-indexed municipal policy IDs. Unverified claims trigger confidence degradation.
- **Data Boundary**: User chat queries are never used to fine-tune upstream models.
