data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ssm_parameter" "ecs_ami" {
  count = var.ecs_ami_id == "" ? 1 : 0
  name  = "/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id"
}

locals {
  name       = "${var.project_name}-${var.environment}"
  account_id = data.aws_caller_identity.current.account_id
  partition  = data.aws_partition.current.partition
  ssm_prefix = "/${var.project_name}/${var.environment}"

  ecs_ami_id = var.ecs_ami_id != "" ? var.ecs_ami_id : data.aws_ssm_parameter.ecs_ami[0].value

  s3_bucket_name = var.s3_bucket_name != "" ? var.s3_bucket_name : "${var.project_name}-${var.environment}-${local.account_id}-${var.aws_region}-uploads"
  turn_public_ip = var.turn_enabled ? (var.turn_allocate_eip ? aws_eip.turn[0].public_ip : aws_instance.turn[0].public_ip) : ""
  turn_url       = var.turn_enabled ? "turn:${local.turn_public_ip}:3478?transport=udp" : ""
  turn_tcp_url   = var.turn_enabled ? "turn:${local.turn_public_ip}:3478?transport=tcp" : ""
  turns_url      = var.turn_enabled && var.turn_domain_name != "" ? "turns:${var.turn_domain_name}:5349?transport=tcp" : ""
  redis_url      = "redis://redis:6379"

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  secret_names = toset([
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "MONGODB_URI",
    "GROQ_API_KEY",
    "HUGGINGFACE_API_KEY",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "EMAIL_FROM_ADDRESS",
    "FIREBASE_SERVICE_ACCOUNT_BASE64"
  ])

  ssm_secret_arns = {
    for name in local.secret_names :
    name => "arn:${local.partition}:ssm:${var.aws_region}:${local.account_id}:parameter${local.ssm_prefix}/${name}"
  }

  backend_environment = concat([
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "5001" },
    { name = "AI_SERVICE_URL", value = "http://ai-service:8000" },
    { name = "SUPABASE_URL", value = var.supabase_url },
    { name = "MONGODB_DB_NAME", value = var.mongodb_db_name },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "S3_REGION", value = var.aws_region },
    { name = "STORAGE_PROVIDER", value = "s3" },
    { name = "STORAGE_AUTO_CREATE_BUCKET", value = "false" },
    { name = "STORAGE_FORCE_PATH_STYLE", value = "false" },
    { name = "S3_BUCKET_NAME", value = local.s3_bucket_name },
    { name = "BUCKET_NAME", value = local.s3_bucket_name },
    { name = "S3_PUBLIC_URL", value = "https://${local.s3_bucket_name}.s3.${var.aws_region}.amazonaws.com" },
    { name = "REDIS_URL", value = local.redis_url },
    { name = "FRONTEND_WEB_URL", value = var.frontend_web_url },
    { name = "FRONTEND_DOCTOR_WEB_URL", value = var.frontend_doctor_web_url },
    { name = "FRONTEND_APP_URL", value = var.frontend_app_url },
    { name = "RATE_LIMIT_WINDOW_MS", value = "900000" },
    { name = "RATE_LIMIT_MAX_REQUESTS", value = tostring(var.rate_limit_max_requests) },
    { name = "BACKGROUND_JOBS_ENABLED", value = "true" },
    { name = "REMINDER_CRON_ENABLED", value = "true" },
    { name = "OUTBREAK_CRON_ENABLED", value = "true" }
    ],
    var.turn_enabled ? [
      { name = "WEBRTC_TURN_SERVER", value = local.turn_url },
      { name = "WEBRTC_TURN_TCP_SERVER", value = local.turn_tcp_url },
      { name = "WEBRTC_TURNS_SERVER", value = local.turns_url },
      { name = "WEBRTC_TURN_USERNAME", value = var.turn_username },
      { name = "WEBRTC_TURN_CREDENTIAL", value = var.turn_password }
    ] : []
  )

  ai_environment = [
    { name = "AI_SERVICE_PORT", value = "8000" },
    { name = "AI_SERVICE_WORKERS", value = tostring(var.ai_service_workers) },
    { name = "AI_SERVICE_RELOAD", value = "false" },
    { name = "BACKEND_URL", value = "http://127.0.0.1:5001" },
    { name = "REDIS_URL", value = local.redis_url },
    { name = "MONGODB_DB_NAME", value = var.mongodb_db_name },
    { name = "PYTHONUNBUFFERED", value = "1" },
    { name = "PYTHONDONTWRITEBYTECODE", value = "1" }
  ]

  backend_secrets = [
    for name in local.secret_names :
    { name = name, valueFrom = local.ssm_secret_arns[name] }
  ]

  ai_secret_names = toset([
    "JWT_SECRET",
    "JWT_ACCESS_SECRET",
    "MONGODB_URI",
    "GROQ_API_KEY",
    "HUGGINGFACE_API_KEY"
  ])

  ai_secrets = [
    for name in local.ai_secret_names :
    { name = name, valueFrom = local.ssm_secret_arns[name] }
  ]
}
