#!/usr/bin/env bash
#
# L019: Enable MFA Delete on the Swastik S3 upload bucket.
#
# MFA Delete protects against permanent destruction of all object versions by
# requiring a second factor for deletes. Terraform cannot enable it because the
# S3 API requires the operator's MFA token on the enabling call.
#
# NOTE: enabling MFA Delete makes the app's programmatic object deletes fail
# (every delete requires MFA), so only run this if you have reworked the delete
# path to use privileged, MFA-authorized operations.
#
# Usage:
#   1. Set an MFA token on your AWS CLI profile (aws configure sso --sso-session)
#   2. Run:  ./scripts/enable_s3_mfa_delete.sh <bucket-name>
#
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <bucket-name>" >&2
  exit 1
fi

BUCKET="$1"

echo "Enabling MFA Delete on s3://${BUCKET}"
echo "You will be prompted to enter the 6-digit code from your MFA device."
read -rp "AWS ARN of your MFA device (e.g. arn:aws:iam::ACCOUNT:mfa/USER): " MFA_ARN
read -rp "Current 6-digit MFA code: " MFA_CODE

# The serial + token are supplied as positional args: PUT versioning with
# x-amz-mfa: '<mfa_arn> <code>'
aws s3api put-bucket-versioning \
  --bucket "${BUCKET}" \
  --versioning-configuration '{"Status":"Enabled","MFADelete":"Enabled"}' \
  --mfa "${MFA_ARN} ${MFA_CODE}"

echo "MFA Delete enabled. Verify with:"
echo "  aws s3api get-bucket-versioning --bucket ${BUCKET}"
