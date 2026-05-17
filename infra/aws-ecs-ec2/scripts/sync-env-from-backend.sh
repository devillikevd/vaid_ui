#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="$(cd "${INFRA_DIR}/../.." && pwd)"
BACKEND_ENV="${1:-${APP_DIR}/swastik-backend/.env}"
OUTPUT_ENV="${2:-${INFRA_DIR}/env.production}"

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

firebase_service_account_base64() {
  local existing raw resolved
  existing="$(get_value FIREBASE_SERVICE_ACCOUNT_BASE64)"
  if [[ -n "${existing}" ]]; then
    printf '%s' "${existing}"
    return
  fi

  raw="$(get_value FIREBASE_SERVICE_ACCOUNT)"
  if [[ -z "${raw}" ]]; then
    return
  fi

  if [[ "${raw}" == \{* ]]; then
    printf '%s' "${raw}" | base64 | tr -d '\n'
    return
  fi

  if [[ "${raw}" = /* ]]; then
    resolved="${raw}"
  else
    resolved="$(cd "$(dirname "${BACKEND_ENV}")" && pwd)/${raw}"
  fi

  if [[ -f "${resolved}" ]]; then
    base64 -i "${resolved}" | tr -d '\n'
  fi
}

JWT_SECRET_VALUE="$(get_value JWT_SECRET)"
JWT_ACCESS_SECRET_VALUE="$(get_value JWT_ACCESS_SECRET "${JWT_SECRET_VALUE}")"
JWT_REFRESH_SECRET_VALUE="$(get_value JWT_REFRESH_SECRET "${JWT_SECRET_VALUE}")"
FIREBASE_B64="$(firebase_service_account_base64)"

cat > "${OUTPUT_ENV}" <<EOF
SUPABASE_ANON_KEY=$(get_value SUPABASE_ANON_KEY "$(get_value SUPABASE_PUBLISHABLE_KEY)")
SUPABASE_SERVICE_ROLE_KEY=$(get_value SUPABASE_SERVICE_ROLE_KEY)

JWT_SECRET=${JWT_SECRET_VALUE}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET_VALUE}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET_VALUE}

REDIS_URL=$(get_value REDIS_URL)
UPSTASH_REDIS_REST_URL=$(get_value UPSTASH_REDIS_REST_URL)
UPSTASH_REDIS_REST_TOKEN=$(get_value UPSTASH_REDIS_REST_TOKEN)

MONGODB_URI=$(get_value MONGODB_URI)

GROQ_API_KEY=$(get_value GROQ_API_KEY)
HUGGINGFACE_API_KEY=$(get_value HUGGINGFACE_API_KEY)

GMAIL_USER=$(get_value GMAIL_USER)
GMAIL_APP_PASSWORD=$(get_value GMAIL_APP_PASSWORD)
EMAIL_FROM_ADDRESS=$(get_value EMAIL_FROM_ADDRESS)

FIREBASE_SERVICE_ACCOUNT_BASE64=${FIREBASE_B64}
EOF

chmod 600 "${OUTPUT_ENV}"
echo "Wrote ${OUTPUT_ENV} from ${BACKEND_ENV} without printing secret values."
