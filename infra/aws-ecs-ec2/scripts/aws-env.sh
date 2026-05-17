#!/usr/bin/env bash
# Load AWS CLI credentials from the existing backend .env without printing values.

if [[ "${SWASTIK_AWS_ENV_LOADED:-}" == "1" ]]; then
  return 0 2>/dev/null || exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="$(cd "${INFRA_DIR}/../.." && pwd)"
BACKEND_ENV="${SWASTIK_BACKEND_ENV:-${APP_DIR}/swastik-backend/.env}"

read_env_value() {
  local key="$1"

  [[ -f "${BACKEND_ENV}" ]] || return 0

  awk -v key="${key}" '
    index($0, key "=") == 1 {
      value = substr($0, length(key) + 2)
    }
    END {
      gsub(/^"|"$/, "", value)
      gsub(/^'\''|'\''$/, "", value)
      print value
    }
  ' "${BACKEND_ENV}"
}

aws_access_key_id="${AWS_ACCESS_KEY_ID:-$(read_env_value AWS_ACCESS_KEY_ID)}"
aws_secret_access_key="${AWS_SECRET_ACCESS_KEY:-$(read_env_value AWS_SECRET_ACCESS_KEY)}"
aws_session_token="${AWS_SESSION_TOKEN:-$(read_env_value AWS_SESSION_TOKEN)}"
aws_region="${AWS_REGION:-${AWS_DEFAULT_REGION:-$(read_env_value AWS_REGION)}}"

if [[ -z "${aws_access_key_id}" ]]; then
  aws_access_key_id="$(read_env_value AWS_ACCESS_KEY)"
fi

if [[ -z "${aws_secret_access_key}" ]]; then
  aws_secret_access_key="$(read_env_value AWS_SECRET_KEY)"
fi

if [[ -z "${aws_region}" ]]; then
  aws_region="ap-south-1"
fi

export AWS_ACCESS_KEY_ID="${aws_access_key_id}"
export AWS_SECRET_ACCESS_KEY="${aws_secret_access_key}"
export AWS_REGION="${aws_region}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-${aws_region}}"

if [[ -n "${aws_session_token}" ]]; then
  export AWS_SESSION_TOKEN="${aws_session_token}"
fi

export SWASTIK_AWS_ENV_LOADED=1

if [[ -f "${BACKEND_ENV}" && -n "${AWS_ACCESS_KEY_ID}" && -n "${AWS_SECRET_ACCESS_KEY}" ]]; then
  echo "Loaded AWS CLI credentials from ${BACKEND_ENV} (values hidden)."
fi
