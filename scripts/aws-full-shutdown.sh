#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SWASTIK — Full Shutdown (Destroy ALL AWS infra)
# Saves: EVERYTHING (~$80-95/mo → $0/mo)
# 
# ⚠️  WARNING:
#   - ALB DNS will change on recreate
#   - EIPs will change (TURN IP changes)
#   - Takes ~5-10 min to destroy, ~10-15 min to recreate
#   - ECR images preserved (not managed by this Terraform)
#   - MongoDB Atlas data safe (external service)
#   - S3 bucket data safe if bucket is not empty (AWS won't delete non-empty buckets)
#
# To bring back: ./scripts/aws-full-start.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

INFRA_DIR="$(cd "$(dirname "$0")/../infra/aws-ecs-ec2" && pwd)"

echo "🛑 FULL SHUTDOWN — Destroying ALL AWS infrastructure"
echo ""
echo "⚠️  This will destroy:"
echo "   - ECS Cluster + Tasks"
echo "   - EC2 instances (ECS + TURN)"
echo "   - ALB (Load Balancer)"
echo "   - NAT Gateway"
echo "   - VPC + Subnets"
echo "   - Security Groups"
echo "   - S3 bucket (if empty)"
echo ""
echo "✅ These are SAFE (not destroyed):"
echo "   - MongoDB Atlas data"
echo "   - ECR Docker images"
echo "   - SSM Parameter Store secrets"
echo "   - ACM Certificate"
echo ""

read -p "Are you sure? Type 'destroy' to confirm: " confirm
if [ "$confirm" != "destroy" ]; then
  echo "❌ Cancelled."
  exit 1
fi

echo ""
echo "🔄 Running terraform destroy..."
cd "$INFRA_DIR"
terraform destroy -auto-approve

echo ""
echo "✅ Full shutdown complete! Monthly AWS bill → ~$0"
echo ""
echo "💡 To bring everything back:"
echo "   ./scripts/aws-full-start.sh"
