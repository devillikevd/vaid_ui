#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="$(cd "${INFRA_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/aws-env.sh"

AWS_REGION="${AWS_REGION:-ap-south-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PLATFORM="${PLATFORM:-linux/arm64}"

cd "${INFRA_DIR}"

BACKEND_REPO="$(terraform output -raw backend_ecr_repository_url)"
AI_REPO="$(terraform output -raw ai_service_ecr_repository_url)"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "Building and pushing backend image: ${BACKEND_REPO}:${IMAGE_TAG}"
docker buildx build \
  --platform "${PLATFORM}" \
  -t "${BACKEND_REPO}:${IMAGE_TAG}" \
  "${APP_DIR}/swastik-backend" \
  --push

echo "Building and pushing AI service image: ${AI_REPO}:${IMAGE_TAG}"
docker buildx build \
  --platform "${PLATFORM}" \
  -t "${AI_REPO}:${IMAGE_TAG}" \
  "${APP_DIR}/swastik-ai-service" \
  --push

echo "Images pushed."
