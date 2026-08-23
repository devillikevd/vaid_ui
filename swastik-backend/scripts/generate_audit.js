const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'swastik-backend', 'database', 'production');
const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

let report = `# Phase 24.31 — Complete Database Migration Audit

## Complete Migration Inventory (Recent & Required)

| Migration | Filename | Purpose | Dependency | Applied? | Universal Referral Required? |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

const knownApplied = [
    '081_organization_partnerships.sql',
    '083_hospital_referrals.sql',
    '090_prescription_medicine_identity.sql',
    '096_universal_referrals.sql',
    '097_universal_referrals_rls.sql'
];

files.forEach(file => {
    const num = parseInt(file.substring(0, 3));
    if (num < 81 && num !== 37) return; // Skip old ones except 037 (patient_consents)

    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    let isApplied = 'UNKNOWN';
    if (knownApplied.includes(file) || (num === 90 && file.startsWith('090'))) {
        isApplied = 'YES';
    }

    let isRequired = 'NO';
    if (file.includes('referral') || file.includes('partnership') || file.includes('consent') || num >= 96) {
        isRequired = 'YES';
    }

    let purpose = file.replace(/^\d+_/, '').replace('.sql', '').replace(/_/g, ' ');
    purpose = purpose.charAt(0).toUpperCase() + purpose.slice(1);

    let dep = 'Base';
    if (num > 81) dep = 'Previous schema';
    if (file.includes('referrals')) dep = 'patients, providers';
    if (file === '097_universal_referrals_rls.sql') dep = '096_universal_referrals.sql';
    if (file === '096_universal_referrals.sql') dep = '037 (consents), 081 (partnerships)';

    report += `| ${num.toString().padStart(3, '0')} | \`${file}\` | ${purpose} | ${dep} | ${isApplied} | ${isRequired} |\n`;
});

report += `
## Already Applied
- \`081_organization_partnerships.sql\`
- \`083_hospital_referrals.sql\`
- \`090_prescription_medicine_identity.sql\`
- \`096_universal_referrals.sql\`
- \`097_universal_referrals_rls.sql\`

## Missing
- \`037_patient_consents.sql\` (Prerequisite, status unknown, but required)
- *All other required dependencies must be verified before proceeding.*

## Unknown
All migrations not explicitly stated as applied by the prompt are considered UNKNOWN because live database introspection was aborted for safety.

## Universal Referral Dependency Chain
1. \`001_users_and_auth.sql\` (Core Auth)
2. \`002_patients.sql\` (Patient records)
3. \`003_hospitals_and_clinics.sql\`, \`005_pharmacy_and_medicines.sql\`, \`006_diagnostic_centers.sql\` (Provider entities)
4. \`037_patient_consents.sql\` (Consent Schema)
5. \`081_organization_partnerships.sql\` (Inter-org networking)
6. \`096_universal_referrals.sql\` (Core table & triggers)
7. \`097_universal_referrals_rls.sql\` (RLS and Security Definer functions)

## Diagnostic Dependencies
- \`006_diagnostic_centers.sql\`
- \`082_diagnostic_clinic_context.sql\`
- \`092_diagnostic_booking_source.sql\`
- \`094_diagnostic_members.sql\`
- \`095_normalize_diagnostic_tests.sql\`

## Pharmacy Dependencies
- \`005_pharmacy_and_medicines.sql\`
- \`085_pharmacy_inventory_reservations.sql\`
- \`086_clinic_pharmacy_routing.sql\`
- \`087_hospital_pharmacy_routing.sql\`
- \`088_pharmacy_orders_source.sql\`
- \`089_pharmacy_members.sql\`
- \`091_pharmacy_advanced_analytics.sql\`

## Dangerous-to-Rerun Migrations
The following migrations contain non-idempotent \`CREATE POLICY\` or \`CREATE TRIGGER\` statements without \`DROP ... IF EXISTS\` guards. Rerunning them on an already-applied database will throw errors (e.g., ERROR 42710: policy already exists):
- \`081_organization_partnerships.sql\`
- \`083_hospital_referrals.sql\`
- \`089_pharmacy_members.sql\`
- \`094_diagnostic_members.sql\`
- \`096_universal_referrals.sql\`
- \`097_universal_referrals_rls.sql\`

## Recommended Execution Order
For a completely blank staging database, migrations must be executed sequentially starting from \`000_run_all.sql\` (if it acts as a bootstrap) or from \`001\` through \`097\` sequentially. Do not cherry-pick \`096\` without its upstream dependents.

## Production Safety
No additional migrations were executed and no existing policies/tables were deleted or modified.

## Final Verdict
🟡 MIGRATION DEPENDENCIES REQUIRE REVIEW
`;

fs.writeFileSync('C:\\Users\\Divyanshu\\.gemini\\antigravity-ide\\brain\\6fbbf342-8e8f-4bff-b572-1266da46309d\\p24_31_migration_audit_report.md', report);
console.log('Report generated.');
