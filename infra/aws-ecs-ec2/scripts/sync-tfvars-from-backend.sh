#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="$(cd "${INFRA_DIR}/../.." && pwd)"
BACKEND_ENV="${1:-${APP_DIR}/swastik-backend/.env}"
OUTPUT_TFVARS="${2:-${INFRA_DIR}/terraform.tfvars}"

if [[ ! -f "${BACKEND_ENV}" ]]; then
  echo "Missing backend env file: ${BACKEND_ENV}"
  exit 1
fi

get_value() {
  local key="$1"
  local fallback="${2:-}"
  local value
  value="$(awk -v key="${key}" '
    index($0, key "=") == 1 { value = substr($0, length(key) + 2) }
    END { print value }
  ' "${BACKEND_ENV}")"

  if [[ -n "${value}" ]]; then
    printf '%s' "${value}"
  else
    printf '%s' "${fallback}"
  fi
}

tf_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

turn_password() {
  if [[ -f "${OUTPUT_TFVARS}" ]]; then
    awk -F= '
      /^[[:space:]]*turn_password[[:space:]]*=/ {
        value = $0
        sub(/^[^=]*=[[:space:]]*/, "", value)
        gsub(/^"|"$/, "", value)
        print value
      }
    ' "${OUTPUT_TFVARS}" | tail -n 1
    return
  fi

  openssl rand -base64 32 | tr -d '\n'
}

AWS_REGION_VALUE="$(get_value AWS_REGION ap-south-1)"
FRONTEND_WEB_URL_VALUE="$(get_value FRONTEND_WEB_URL https://vaididea.in)"
FRONTEND_DOCTOR_WEB_URL_VALUE="$(get_value FRONTEND_DOCTOR_WEB_URL "${FRONTEND_WEB_URL_VALUE}")"
FRONTEND_APP_URL_VALUE="$(get_value FRONTEND_APP_URL exp://localhost:8081)"
SUPABASE_URL_VALUE="$(get_value SUPABASE_URL)"
TURN_PASSWORD_VALUE="$(turn_password)"

cat > "${OUTPUT_TFVARS}" <<EOF
project_name = "swastik"
environment  = "prod"
aws_region   = "$(tf_string "${AWS_REGION_VALUE}")"

# Cost-effective defaults. Increase only after monitoring.
instance_type         = "t4g.medium"
ec2_min_size          = 1
ec2_desired_capacity  = 1
ec2_max_size          = 4
app_min_tasks         = 1
app_desired_tasks     = 1
app_max_tasks         = 6
ai_service_workers    = 1
log_retention_days    = 14

frontend_web_url        = "$(tf_string "${FRONTEND_WEB_URL_VALUE}")"
frontend_doctor_web_url = "$(tf_string "${FRONTEND_DOCTOR_WEB_URL_VALUE}")"
frontend_app_url        = "$(tf_string "${FRONTEND_APP_URL_VALUE}")"
supabase_url            = "$(tf_string "${SUPABASE_URL_VALUE}")"

# Low-cost coturn server for video consultation fallback.
# TURN relay bandwidth can become expensive, so keep it as fallback only.
turn_enabled       = true
turn_instance_type = "t4g.nano"
turn_realm         = "vaididea.in"
turn_username      = "vaididea-turn"
turn_password      = "$(tf_string "${TURN_PASSWORD_VALUE}")"
turn_total_quota   = 500

# Enable after the first infra deploy when you are ready for GitHub Actions CI/CD.
github_oidc_enabled = false
github_repository   = "nayanpr620/SWASTIK-TELEMEDICINE"
github_branch       = "main"
EOF

chmod 600 "${OUTPUT_TFVARS}"
echo "Wrote ${OUTPUT_TFVARS} from ${BACKEND_ENV} without printing secret values."
