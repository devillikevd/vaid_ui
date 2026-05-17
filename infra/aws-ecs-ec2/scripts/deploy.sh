#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

source "${SCRIPT_DIR}/aws-env.sh"

cd "${INFRA_DIR}"

if [[ ! -f terraform.tfvars ]]; then
  echo "Missing terraform.tfvars"
  echo "Copy terraform.tfvars.example to terraform.tfvars and edit it first."
  exit 1
fi

if [[ ! -f env.production ]]; then
  echo "Missing env.production"
  echo "Copy env.production.example to env.production and fill real secrets first."
  exit 1
fi

terraform init

echo "Step 1/4: creating ECR repositories..."
terraform apply \
  -target=aws_ecr_repository.backend \
  -target=aws_ecr_repository.ai_service

echo "Step 2/4: uploading secrets to SSM Parameter Store..."
"${SCRIPT_DIR}/put-ssm-params.sh" "${INFRA_DIR}/env.production"

echo "Step 3/4: building and pushing Docker images..."
"${SCRIPT_DIR}/push-images.sh"

echo "Step 4/4: applying full ECS-on-EC2 infrastructure..."
terraform apply

echo
echo "Deployment outputs:"
terraform output
