#!/bin/bash
# Test all web pages against a running dev server
BASE="http://localhost:3000"
PASS=0
FAIL=0
ERRORS=""

pages=(
  "/"
  "/login/doctor"
  "/login/hospital"
  "/login/pharmacy"
  "/login/admin"
  "/login/clinic"
  "/login/diagnostic-center"
  "/register/doctor"
  "/register/hospital"
  "/verify-email"
  "/reset-password"
  "/forgot-password/doctor"
  "/admin"
  "/admin/analytics"
  "/admin/approvals"
  "/admin/audit"
  "/admin/compliance"
  "/admin/emergencies"
  "/admin/providers"
  "/admin/settings"
  "/doctor"
  "/doctor/appointments"
  "/doctor/consultations"
  "/doctor/dashboard"
  "/doctor/patients"
  "/doctor/prescriptions"
  "/doctor/prescriptions/new"
  "/doctor/scan-patient"
  "/doctor/schedule"
  "/doctor/settings"
  "/doctor/vitals"
  "/hospital"
  "/hospital/appointments"
  "/hospital/consultations"
  "/hospital/departments"
  "/hospital/doctors"
  "/hospital/emergency"
  "/hospital/managers"
  "/hospital/reports"
  "/hospital/settings"
  "/pharmacy"
  "/pharmacy/inventory"
  "/pharmacy/orders"
  "/pharmacy/prescriptions"
  "/pharmacy/reports"
  "/pharmacy/settings"
  "/clinic"
  "/clinic/appointments"
  "/clinic/consultations"
  "/clinic/schedule"
  "/clinic/settings"
  "/clinic/staff"
  "/diagnostic-center"
  "/diagnostic-center/bookings"
  "/diagnostic-center/reports"
  "/diagnostic-center/results"
  "/diagnostic-center/settings"
  "/diagnostic-center/tests"
  "/health-card/test-token-123"
  "/consultation/test-id-123"
)

echo "Testing ${#pages[@]} pages against $BASE ..."
echo ""

for page in "${pages[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -L "${BASE}${page}" 2>/dev/null)
  if [[ "$status" == "200" || "$status" == "307" || "$status" == "302" || "$status" == "308" ]]; then
    PASS=$((PASS+1))
    echo "  ✅ $page → $status"
  else
    FAIL=$((FAIL+1))
    ERRORS="${ERRORS}  ❌ ${page} → HTTP ${status}\n"
    echo "  ❌ $page → $status"
  fi
done

echo ""
echo "================================"
echo "✅ Passed: $PASS pages"
echo "❌ Failed: $FAIL pages"
if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "Failed pages:"
  printf "$ERRORS"
fi
