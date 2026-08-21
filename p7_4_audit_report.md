# Phase P7.4: Diagnostic Center Final UI ↔ Backend Contract Audit

An exhaustive, read-only functional validation was performed across the unified codebase post P7.3 hotfixes to confirm ultimate production readiness of the Diagnostic Center module.

## 1. PRODUCTION MATRIX

| Domain | Status | Note |
|---|---|---|
| Authentication | **PASS** | `requireRole` and `requireApproval` middleware strictly enforced on all diagnostic center routes. |
| Tenant Isolation | **PASS** | Verified that `req.diagnosticCenterId` is used securely and that frontend-supplied `center_id` or `centerId` are not trusted in queries. |
| Master Catalog | **PASS** | Test catalog correctly sources `master_diagnostic_tests` data. Canonical metadata preview added in P7.3. |
| Test Catalog UI | **PASS** | Refactored in P7.3. Inactive historical tests remain in DB but are safely hidden in the UI by default. |
| Add Test | **PASS** | Validates active master test, prevents duplicate mappings, enforces `master_test_id`. Copies legacy fields correctly for backwards compatibility. |
| Edit Test | **PASS** | Only center-specific configurations (`price`, `discounted_price`, `turnaround_hours`, `is_active`) are allowed to be updated. `master_test_id` is locked. |
| Soft Delete | **PASS** | `is_active` set to false safely. Proper confirmation modal with historical safety notice implemented in P7.3. |
| Booking | **PASS** | Verified walk_in and home_collection logic. Price snapshots correctly captured server-side at booking creation time. |
| Price Snapshot | **WARNING** | Backend correctly sets `price_snapshot` during booking creation. However, frontend `bookings/page.tsx` currently displays `booking.amount` which is undefined in the backend response format. Historical prices are not rendering in the UI. |
| State Machine | **PASS** | Status transitions are appropriately constrained between processing, collected, and completed. |
| Patient Security | **PASS** | `result_url` successfully stripped from `GET /api/patient/diagnostic-bookings` (fixed in P7.1). Replaced with secure presigned short-lived URL endpoints. |
| Clinic Reports | **PASS** | `GET /api/clinic/owner/partnerships/diagnostic-bookings` strips `result_url` and replaces it securely with `report_url`. Clinic B cannot access Clinic A's report. |
| Diagnostic Report Security | **FAIL** | Raw `result_url` is still being exposed in the `GET /api/diagnostic-center/owner/bookings` payload. The frontend currently relies on this to determine if a report exists, rather than a boolean flag. |
| Technician RBAC | **PASS** | `requireDiagnosticMember` properly enforces lab technician boundaries for bookings without leaking owner analytics. |
| Analytics | **WARNING** | "Revenue Potential" is correctly calculated dynamically on the active test catalog, but historical revenue using `price_snapshot` is missing from the main Dashboard. |
| Performance | **PASS** | Paginated API queries correctly utilize PostgREST ranges. |
| Responsive UI | **PASS** | Verified grid and card layouts for mobile constraints in the newly rewritten Test Catalog. |
| Legacy Dependencies | **WARNING** | `diagnostic_tests.name` and `category` are still copied during `addTest` for backward compatibility. These should eventually be dropped. |
| Database Dependencies | **PASS** | Confirmed application assumes migrations 092–095 are in place and functions correctly without altering DB schemas. |
| Build | **PASS** | `npx tsc --noEmit` and `npm run lint` are completely clean for the Diagnostic Center module. |

---

## 2. FAILURES & FOLLOW-UP ITEMS

### [FAIL] Report Security (P1)
**File:** `swastik-backend/services/diagnosticCenterService.js` -> `normalizeDiagnosticBookingRecord`
**File:** `swastik-web/src/app/diagnostic-center/bookings/page.tsx`
**Issue:** The raw MinIO/S3 URL (`result_url`) is still included in the backend response payload for Diagnostic Centers when fetching bookings. The frontend checks `if (booking.result_url)` to render the "View Report" button.
**Recommended Fix:** 
1. Strip `result_url` inside `normalizeDiagnosticBookingRecord` (or replace with a boolean flag like `has_report: !!booking.result_url`).
2. Update the frontend UI to check `booking.has_report` instead of `booking.result_url`.
3. The secure presigned endpoint (`/api/diagnostic-center/bookings/${booking.id}/report`) already works perfectly for the actual rendering.

### [WARNING] Price Snapshot UI Display (P2)
**File:** `swastik-web/src/app/diagnostic-center/bookings/page.tsx`
**Issue:** The UI attempts to render the booking price using `booking.amount`. The backend does not return an `amount` field for diagnostic bookings; it returns `price_snapshot`. As a result, the booking price is invisible to the Diagnostic Center.
**Recommended Fix:** Update the frontend to map and display `booking.price_snapshot` or alias it correctly from the backend.

### [WARNING] Analytics Revenue (P3)
**File:** `swastik-backend/services/diagnosticCenterService.js`
**Issue:** Dashboard API returns counts for tests and bookings, but no aggregated historical revenue metrics.
**Recommended Fix:** Update `getAnalytics` to sum `price_snapshot` for completed bookings in the given period.

---

## 3. FINAL VERDICT

**Verdict: BLOCKED BY P1**

The Diagnostic Center test catalog and workflows are excellent, but the exposure of the raw `result_url` directly to Diagnostic Center staff via the bookings API violates the fundamental security architecture. A minor follow-up phase is required to strip `result_url` from the center-facing booking endpoints and fix the frontend `price_snapshot` rendering.
