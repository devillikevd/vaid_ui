# Security Policy

This documents Swastik's security posture and the mitigations tracked by the
security audit (findings L001–L031).

## Security contacts

- **Security email**: `security@vaididea.in` (monitored by the platform team).
- **security.txt**: Served at `/.well-known/security.txt` on the web app:
  - Contact: `mailto:security@vaididea.in`
  - `Expires`, `Canonical`, `Policy`, `Preferred-Languages: en`.
- **Bug reports**: Prefer email. Encrypt sensitive attachments to the PGP key
  published with the security.txt / keybase profile.

## Audit findings resolution

### L0xx (Low — technical)

| ID | Issue | Status |
|----|-------|--------|
| L001 | Stack traces leaked in 500 responses | Fixed — `errorHandler.js` only emits `err.stack` when `NODE_ENV === 'development'` and never includes it in the JSON body in production. |
| L002 | Cookie missing Secure flag in non-prod | Fixed — `api.ts:syncCookie` sets `Secure` on HTTPS; override via `NEXT_PUBLIC_COOKIE_SECURE`. |
| L003 | No CSP on HTML responses | Fixed — backend `server.js` sets an explicit helmet CSP; AI service sets its own (L007). |
| L004 | X-Forwarded-For trusted without validating proxy | Fixed — `server.js` `trust proxy` now consults `TRUSTED_PROXY_IPS` (IPs/CIDRs) and fails closed. |
| L005 | OTP hash uses JWT secret as salt | Fixed — OTPs are bcrypt-hashed (cost 12) with a per-hash random salt. |
| L006 | `randomUUID()` predictable (v1) | No fix needed — `crypto.randomUUID` is RFC 4122 v4 (crypto-random). |
| L007 | No CSP on AI service | Fixed — `main.py` security-headers middleware sets a strict CSP. |
| L008 | Debug console.log printing sensitive data | Fixed — `authService.js` no longer emits debug logs of sensitive data. |
| L009 | Hardcoded 30s timeout in `fetchWithAuth` | Fixed — timeout is configurable via `NEXT_PUBLIC_API_TIMEOUT_MS`. |
| L010 | Duplicate `medical_conditions` field in schema | Fixed — canonical `medical_conditions` kept; reads tolerate legacy shape. |
| L011 | `signStorageUrlsInPayload` mutates input | No fix needed — already returns shallow clones (`{ ...value }`). |
| L012 | No `X-Content-Type-Options` on uploads | Fixed — helmet sets `nosniff` globally; `routes/uploads.js` sets it explicitly too. |
| L013 | BroadcastChannel auth sync has no origin check | Fixed — `authStore.ts` ignores messages whose `event.origin` differs. |
| L014 | Socket.IO `reconnectionAttempts: Infinity` | Fixed — capped at 30 with exponential backoff. |
| L015 | No MFA enforcement on admin dashboard | Fixed — `rbac.requireMfa` gates enhancedAdmin routes when `ADMIN_MFA_REQUIRED=true`. |
| L016 | Prescription PDF generation not sanitized | Fixed — all PDF inputs pass through `sanitizeText`/`sanitizeMultiline` (CVE-2021-30490). |
| L017 | Ambulance location ping not rate-limited | No fix needed — already Redis rate-limited to 1 update/sec/driver. |
| L018 | Invite token in URL | Fixed — token moved to request body; URL is stripped after read. |
| L019 | No MFA-delete on S3 bucket | Partial — versioning enabled in Terraform; MFA Delete needs the operator's MFA token (see `scripts/enable_s3_mfa_delete.sh`). |

### L020–L031 (Low — process / infrastructure)

| ID | Issue | Status |
|----|-------|--------|
| L020 | Missing security.txt | Fixed — served from `public/.well-known/security.txt`. |
| L021 | No CAA DNS records | **Action required (operator)** — add CAA records permitting only `letsencrypt.org` and `amazon.com` (if DNS validated) at your DNS provider / Route53 (see infra note). |
| L022 | GitHub Actions not pinned | Fixed — all actions pinned to full commit SHAs in `.github/workflows/*.` |
| L023 | Dependency scanning not automated | Fixed — `security.yml` runs `npm audit` + `pip-audit` weekly & on PRs. |
| L024 | No SAST in CI/CD | Fixed — `security.yml` runs Semgrep (`p/security-audit`) on PRs & pushes. |
| L025 | Secrets scanning not in pre-commit | Fixed — `security.yml` runs gitleaks; `.pre-commit-config.yaml` + `.gitleaks.toml`. |
| L026 | No runtime protection (WAF/RASP) | **Recommendation** — put AWS WAF (managed rule groups: SQLi, XSS, bot) in front of the ALB + CloudFront; enable AWS Shield Advanced. This is infra, not app code. |
| L027 | Incident response plan not documented | See [Incident response](#incident-response). |
| L028 | No security training program | See [Secure coding guidance](#secure-coding-guidance). |
| L029 | Third-party risk assessment missing | Vendors listed under [Third-party services](#third-party-services) and reviewed annually. |
| L030 | Backup encryption not verified | Uploads bucket SSE-AWS-managed (AES256); Terraform state in an SSE-KMS S3 backend. Backups versioned. Review at least annually. |
| L031 | Disaster recovery not tested | See [Disaster recovery](#disaster-recovery). |

## Incident response

1. **Detect** — CloudWatch alarms, Sentry error monitoring, ECS task restarts, ECR scan gate.
2. **Triage (within 30 min, on-call)** — severity P1 if user data exposed or service down.
3. **Contain** — revoke affected JWTs (`token_version` bump), rotate the offending secret, disable ALB target.
4. **Eradicate** — deploy patch via ECS (force new deployment).
5. **Recover** — restore DB from Supabase daily backups if needed; re-enable traffic.
6. **Post-mortem** — within 48 h; update this doc and add a regression test.

Runbook triggers: any `MFA_REQUIRED` 403 storm (possible token replay), repeated `403 consent.denied` (authorization bypass attempt), or `RATE_LIMITED` floods (DoS).

## Secure coding guidance (training)

- Treat all client input as hostile; validate with `express-validator` + `mongoSanitize`.
- Store secrets in env only (`/secrets/*`, never commit `.env`); rotate JWT/RPC secrets quarterly.
- Use parameterized Supabase queries (no `.rpc` with interpolated SQL; `.from().select()` with `.eq()`).
- Strip PHI and blind-index writes together (see `utils/supabaseProxy.js`).
- Never log PII; error handlers log message+path only.
- Pin all actions in CI (L022) and dependencies (`package-lock.json`).

## Third-party services

| Service | Use | Review cadence |
|---------|-----|----------------|
| Supabase | Postgres + auth | Annual |
| AWS S3/ALB/ECS | storage, hosting | Annual |
| Google Cloud (Gemini) | AI reasoning | Annual |
| Google Fonts (now self-hosted via next/font) | typography | — |

## Notes for operators

- `TRUSTED_PROXY_IPS` must list the ALB subnet CIDR(s) for correct client IP / XFF handling (L004).
- `ADMIN_MFA_REQUIRED=true` once TOTP enrollment ships; tokens must carry `mfa: true`.
- `NEXT_PUBLIC_COOKIE_SECURE` controls cookie `Secure` in non-prod (defaults HTTPS on).
