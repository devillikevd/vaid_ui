#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SWASTIK — Scale Up (Bring everything back online)
# Takes ~2-3 minutes for services to become healthy
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

REGION="ap-south-1"
CLUSTER="swastik-prod-cluster"
SERVICE="swastik-prod-app"
ASG_NAME="swastik-prod-ecs-asg"

echo "🔼 Scaling up Swastik AWS infrastructure..."

# 1. Scale ASG back (EC2 instance launch hoga)
echo "  → ASG min/desired → 1"
aws autoscaling update-auto-scaling-group \
  --region "$REGION" \
  --auto-scaling-group-name "$ASG_NAME" \
  --min-size 1 \
  --desired-capacity 1

# 2. Start TURN server
TURN_ID=$(aws ec2 describe-instances \
  --region "$REGION" \
  --filters "Name=tag:Name,Values=swastik-prod-turn" "Name=instance-state-name,Values=stopped" \
  --query "Reservations[].Instances[].InstanceId" \
  --output text)

if [ -n "$TURN_ID" ]; then
  echo "  → Starting TURN server: $TURN_ID"
  aws ec2 start-instances --region "$REGION" --instance-ids "$TURN_ID" --no-cli-pager
else
  echo "  → TURN server already running or not found"
fi

# 3. Wait for EC2 to register with ECS
echo "  → Waiting for EC2 instance to join ECS cluster..."
echo "    (This takes ~60-90 seconds)"
sleep 90

# 4. Scale ECS service back
echo "  → ECS service desired count → 1"
aws ecs update-service \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --desired-count 1 \
  --no-cli-pager

echo ""
echo "✅ Scale up initiated!"
echo "   - EC2 instance: launching"
echo "   - ECS tasks: 1 (deploying)"
echo "   - TURN server: starting"
echo ""
echo "⏱️  Services will be healthy in ~2-3 minutes"
echo "   Check status: aws ecs describe-services --region $REGION --cluster $CLUSTER --services $SERVICE --query 'services[0].{desired:desiredCount,running:runningCount,status:status}'"
