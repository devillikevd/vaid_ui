# VAIDIDEA AWS ECS-on-EC2 Deployment

This deploys the cost-conscious scalable path:

- 1 public ALB
- 1 ECS cluster backed by an EC2 Auto Scaling Group
- 1 ECS service containing both containers:
  - `backend` on port `5001`
  - `ai-service` on port `8000`
- ECR repositories for both images
- private S3 upload bucket
- SSM Parameter Store secrets
- ECS service autoscaling by CPU and memory

The first version keeps backend and AI in the same ECS task so the backend can call AI at `http://127.0.0.1:8000`. This is simpler and cheaper to operate. Split them into separate ECS services later when AI load is proven to be the bottleneck.

## Prerequisites

Install and configure:

- AWS CLI
- Terraform `>= 1.6`
- Docker with Buildx

Login locally:

```bash
aws configure
aws sts get-caller-identity
```

If `swastik-backend/.env` already contains `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`, the deploy scripts load those values
automatically without printing them.

Your AWS IAM user/role needs permissions for EC2, ECS, ECR, ALB, IAM, S3, SSM, CloudWatch Logs, and Auto Scaling.

## Configure

From this folder:

```bash
cp terraform.tfvars.example terraform.tfvars
cp env.production.example env.production
```

Edit both files:

- `terraform.tfvars`: region, frontend URLs, Supabase URL, optional domain/cert settings
- `env.production`: real secrets/API keys/Redis/MongoDB values

Or generate both files from your existing backend `.env` without printing secret values:

```bash
./scripts/sync-env-from-backend.sh
./scripts/sync-tfvars-from-backend.sh
```

Redis is important. Without external Redis, Socket.IO scaling and cron locks will not work correctly across multiple ECS tasks.

## AWS Login

Do not paste AWS keys into chat. Configure them on your machine:

```bash
aws configure
aws sts get-caller-identity
```

Use:

```text
Default region name: ap-south-1
Default output format: json
```

After `aws sts get-caller-identity` returns your AWS account ID, the deploy scripts can use your local AWS session.

## Deploy

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

The script does this:

1. Creates ECR repos.
2. Uploads secrets to SSM Parameter Store.
3. Builds and pushes Docker images.
4. Applies the full ECS/EC2/ALB infrastructure.

When it finishes, Terraform prints:

- `api_base_url`
- `socket_url`
- `ai_ws_base_url`
- `alb_dns_name`
- `turn_url`
- `turn_username`
- `turn_password` is sensitive; read it with `terraform output -raw turn_password`

Use these in frontend/mobile env config first. Later, point Cloudflare DNS to the ALB DNS name.

## TURN Server

This stack can create a low-cost coturn server for video consultation fallback:

```hcl
turn_enabled       = true
turn_instance_type = "t4g.nano"
turn_username      = "vaididea-turn"
turn_password      = "replace-with-a-strong-turn-password"
turn_total_quota   = 500
```

Use the outputs:

```bash
terraform output -raw turn_url
terraform output -raw turn_username
terraform output -raw turn_password
```

For the Next.js web client:

```text
NEXT_PUBLIC_TURN_URL=<turn_url>
NEXT_PUBLIC_TURN_USERNAME=<turn_username>
NEXT_PUBLIC_TURN_CREDENTIAL=<turn_password>
```

Keep TURN as fallback only. Normal WebRTC should stay peer-to-peer through STUN. If many calls are relayed through TURN, AWS bandwidth cost can grow quickly.

## Cost Controls

Defaults are intentionally cheap:

- `t4g.medium`
- `ec2_min_size = 1`
- `app_min_tasks = 1`
- CloudWatch retention: 14 days
- container insights disabled

For production high availability, change:

```hcl
ec2_min_size         = 2
ec2_desired_capacity = 2
app_min_tasks        = 2
app_desired_tasks    = 2
```

Use AWS Budgets from day one. Set alerts at the rupee equivalents of:

- `$50`
- `$100`
- `$250`

## Routing

Default single-domain routing:

- `/api/*` -> backend
- `/socket.io/*` -> backend
- `/ws/vitals/*` -> AI service
- `/api/ai/*` -> AI service

If you set `ai_domain_names = ["ai.example.com"]`, all traffic for that hostname routes to the AI service.

## Updating App Code

There are two options.

### Option A: CI/CD With GitHub Actions

The repo includes:

```text
.github/workflows/deploy-aws-ecs-ec2.yml
```

After the one-time AWS infrastructure deploy, enable the GitHub deploy role in `terraform.tfvars`:

```hcl
github_oidc_enabled = true
github_repository   = "nayanpr620/SWASTIK-TELEMEDICINE"
github_branch       = "main"
```

Run:

```bash
terraform apply
terraform output -raw github_actions_role_arn
```

In GitHub, add this repository variable or secret:

```text
AWS_ROLE_TO_ASSUME=<terraform output github_actions_role_arn>
```

Optional GitHub repository variables:

```text
AWS_REGION=ap-south-1
PROJECT_NAME=swastik
ENVIRONMENT=prod
```

Now every push to `main` that changes `swastik-backend/**`, `swastik-ai-service/**`, or the workflow will:

1. Run backend tests.
2. Run AI Python syntax check.
3. Build ARM64 Docker images.
4. Push images to ECR using the commit SHA and `latest`.
5. Register a new ECS task definition revision.
6. Update the ECS service and wait until stable.

No long-lived AWS access keys are needed. GitHub uses OIDC to assume the AWS role.

### Option B: Manual Deploy

After code changes:

```bash
./scripts/push-images.sh
aws ecs update-service \
  --region ap-south-1 \
  --cluster swastik-prod-cluster \
  --service swastik-prod-app \
  --force-new-deployment
```

If you use a unique `IMAGE_TAG`, set it in `terraform.tfvars`, push with the same tag, then `terraform apply`.

## Delete

```bash
terraform destroy
```

ECR repos use `force_delete = false`, so delete images first if Terraform refuses to destroy them.
