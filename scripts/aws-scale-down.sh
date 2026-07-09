#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SWASTIK — Scale Down (Stop Compute, Keep Infra)
# Saves: EC2 + TURN costs (~$18-25/mo)
# Still pays: ALB + NAT + EIPs (~$55/mo)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

REGION="ap-south-1"
CLUSTER="swastik-prod-cluster"
SERVICE="swastik-prod-app"
ASG_NAME="swastik-prod-ecs-asg"

echo "🔽 Scaling down Swastik AWS infrastructure..."

# 1. Stop ECS tasks (containers band)
echo "  → ECS service desired count → 0"
aws ecs update-service \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --desired-count 0 \
  --no-cli-pager

# 2. Scale ASG to 0 (EC2 instance terminate hoga)
echo "  → ASG min/desired → 0"
aws autoscaling update-auto-scaling-group \
  --region "$REGION" \
  --auto-scaling-group-name "$ASG_NAME" \
  --min-size 0 \
  --desired-capacity 0

# 3. Stop TURN server (instance stop, EBS preserved)
TURN_ID=$(aws ec2 describe-instances \
  --region "$REGION" \
  --filters "Name=tag:Name,Values=swastik-prod-turn" "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].InstanceId" \
  --output text)

if [ -n "$TURN_ID" ]; then
  echo "  → Stopping TURN server: $TURN_ID"
  aws ec2 stop-instances --region "$REGION" --instance-ids "$TURN_ID" --no-cli-pager
else
  echo "  → TURN server already stopped or not found"
fi

echo ""
echo "✅ Scale down complete!"
echo "   - ECS tasks: 0"
echo "   - EC2 instances: 0"  
echo "   - TURN server: stopped"
echo ""
echo "💡 To bring back: ./scripts/aws-scale-up.sh"
