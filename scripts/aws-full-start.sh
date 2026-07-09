#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SWASTIK — Full Start (Recreate ALL AWS infra from Terraform)
# Takes ~10-15 minutes
# 
# ⚠️  After this:
#   - ALB DNS will be NEW → update your domain DNS records
#   - TURN EIP will be NEW → update TURN domain DNS
#   - Push latest Docker images to ECR before or after
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

INFRA_DIR="$(cd "$(dirname "$0")/../infra/aws-ecs-ec2" && pwd)"

echo "🚀 FULL START — Recreating ALL AWS infrastructure"
echo ""
echo "This will create:"
echo "   - VPC + Subnets + NAT"
echo "   - ALB + Target Groups"
echo "   - ECS Cluster + Service"
echo "   - EC2 instances"
echo "   - TURN server"
echo "   - S3 bucket"
echo ""
echo "⏱️  Estimated time: 10-15 minutes"
echo ""

read -p "Proceed? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "❌ Cancelled."
  exit 1
fi

cd "$INFRA_DIR"

echo "🔄 Running terraform apply..."
terraform apply -auto-approve

echo ""
echo "✅ Infrastructure created!"
echo ""

# Print important outputs
echo "📋 Important outputs:"
terraform output

echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Update DNS records with new ALB DNS name"
echo "   2. Update TURN domain DNS with new EIP"
echo "   3. Push Docker images to ECR (if not already):"
echo "      - cd swastik-backend && docker build -t backend ."
echo "      - cd swastik-ai-service && docker build -t ai-service ."
echo "   4. Force new ECS deployment:"
echo "      aws ecs update-service --region ap-south-1 --cluster swastik-prod-cluster --service swastik-prod-app --force-new-deployment"
echo ""
echo "🎉 Done! Services should be healthy in ~3-5 minutes after image deploy."
