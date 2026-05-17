#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

source "${SCRIPT_DIR}/aws-env.sh"

ENV_FILE="${1:-${INFRA_DIR}/env.production}"
PROJECT_NAME="${PROJECT_NAME:-swastik}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
SSM_PREFIX="/${PROJECT_NAME}/${ENVIRONMENT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  echo "Copy env.production.example to env.production and fill real values first."
  exit 1
fi

put_secret() {
  local key="$1"
  local value="$2"

  if [[ -z "${value}" ]]; then
    value="unused"
    echo "Warning: ${key} is empty; writing placeholder so ECS can start."
  elif [[ "${value}" == "change-me"* ]]; then
    echo "Warning: ${key} still has a placeholder value."
  fi

  aws ssm put-parameter \
    --region "${AWS_REGION}" \
    --name "${SSM_PREFIX}/${key}" \
    --type "SecureString" \
    --value "${value}" \
    --overwrite >/dev/null

  echo "Uploaded ${SSM_PREFIX}/${key}"
}

while IFS= read -r line || [[ -n "${line}" ]]; do
  [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
  key="${line%%=*}"
  value="${line#*=}"

  case "${key}" in
    SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|JWT_SECRET|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|REDIS_URL|UPSTASH_REDIS_REST_URL|UPSTASH_REDIS_REST_TOKEN|MONGODB_URI|GROQ_API_KEY|HUGGINGFACE_API_KEY|GMAIL_USER|GMAIL_APP_PASSWORD|EMAIL_FROM_ADDRESS|FIREBASE_SERVICE_ACCOUNT_BASE64)
      put_secret "${key}" "${value}"
      ;;
    *)
      echo "Ignoring ${key}"
      ;;
  esac
done < "${ENV_FILE}"

echo "Done. SSM prefix: ${SSM_PREFIX}"
