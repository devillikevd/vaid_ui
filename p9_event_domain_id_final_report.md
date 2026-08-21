# Phase P9: Event, Notification & Domain-ID Consistency Hardening

## 1. Issues Found
During the P8 audit, a minor payload mismatch was identified in the diagnostic booking event pipeline. The `eventEmitter.emitDiagnosticBookingCreated()` method in `swastik-backend/routes/diagnosticCenter.js` was passing the authenticated user's ID (`req.user.id`) to the `patient_id` field in the event payload. This created a discrepancy where frontend socket consumers expecting a strictly-typed domain `patients.id` were instead receiving an Auth `users.id`. 

## 2. Files Modified
- `swastik-backend/routes/diagnosticCenter.js`
- `swastik-backend/services/eventEmitter.js`

## 3. Event Contract Before/After

### Before
```javascript
// diagnosticCenter.js
eventEmitter.emitDiagnosticBookingCreated({
    ...booking,
    patient_id: req.user.id, // INCORRECT: Exposed Auth ID as Domain ID
    center_id: centerId,
});

// eventEmitter.js
emitDiagnosticBookingCreated(booking) {
    this.notifyUser(patient_id, 'notification:new', patientNotif); // Depended on patient_id being an Auth ID
}
```

### After
```javascript
// diagnosticCenter.js
eventEmitter.emitDiagnosticBookingCreated({
    ...booking,
    patient_id: patientId, // CORRECT: Strictly resolves to canonical patients.id
    center_id: centerId,
}, req.user.id); // Passed explicitly for routing

// eventEmitter.js
emitDiagnosticBookingCreated(booking, patientUserId) {
    if (patientUserId) this.notifyUser(patientUserId, 'notification:new', patientNotif); // Routes safely
}
```

## 4. Domain-ID Mapping Matrix
All major domain identifiers emitted through WebSockets were audited repository-wide:
- `patient_id`: Confirmed mapped to `patients.id`.
- `doctor_id`: Confirmed mapped to `doctors.id`.
- `clinic_id`: Confirmed mapped to `clinics.id`.
- `diagnostic_center_id` / `center_id`: Confirmed mapped to `diagnostic_centers.id`.
- `pharmacy_id`: Confirmed mapped to `pharmacies.id`.

## 5. Notification Security
Because `notifyUser` strictly targets Socket.IO rooms formatted as `user:${userId}`, the decoupling of the event payload (`booking.patient_id`) from the routing key (`patientUserId`) ensures that:
1. The notification reaches the correct authenticated session.
2. The payload delivered to the client contains the structurally correct domain entity ID.
No cross-user leakage was detected across the event emitters.

## 6. Tenant Isolation
The diagnostic payload correctly infers `center_id` and `center_owner_id` directly from backend context queries (`getCenterOwnerId()`), preventing any frontend manipulation or tenant bypass.

## 7. Frontend Compatibility
The frontend generic socket listeners (e.g. `useSocket.ts`) have been unaffected functionally by this fix since they previously relied on the backend routing them the message via `user.id`. Now, however, the typing of `DiagnosticBookingUpdate` accurately reflects a real `patient_id`. 

## 8. Verification Results
- **Backend Lint (`npm run lint`):** PASS (0 errors)
- **Frontend Typecheck (`npx tsc --noEmit`):** PASS (0 errors)
- **Frontend Lint (`npm run lint`):** PASS (0 errors)

## 9. Remaining P3/P4 Technical Debt
- **Legacy Dependencies:** The backend still runs `.select('diagnostic_tests(name, category)')` and heavily relies on duplicated catalog values instead of strict `master_diagnostic_tests` or `master_medicines` joins in some legacy routes. This does not block functionality but requires a cleanup phase (Phase P10 recommended).

## 10. FINAL VERDICT
**A. PRODUCTION READY**

The P9 Technical Debt phase has successfully patched the final domain mismatch without violating database schema integrity. The event payload contracts are now strictly typed and safely decouple internal socket routing from domain payload representation.
