variable "project_name" {
  description = "Short project name used in AWS resource names."
  type        = string
  default     = "swastik"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "ap-south-1"
}

variable "image_tag" {
  description = "Docker image tag deployed by ECS."
  type        = string
  default     = "latest"
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN. If empty, only HTTP listener is created."
  type        = string
  default     = ""
}

variable "ai_domain_names" {
  description = "Optional hostnames that should route all traffic to the AI container, for example ai.example.com."
  type        = list(string)
  default     = []
}

variable "allowed_http_cidr_blocks" {
  description = "CIDR blocks allowed to reach the public load balancer."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "vpc_cidr" {
  description = "CIDR for the deployment VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs. Keep at least two for ALB availability."
  type        = list(string)
  default     = ["10.42.1.0/24", "10.42.2.0/24"]
}

variable "instance_type" {
  description = "EC2 instance type for ECS capacity. t4g.* is cheap ARM/Graviton."
  type        = string
  default     = "t4g.medium"
}

variable "ecs_ami_id" {
  description = "Optional ECS optimized AMI ID. Leave empty to use latest Amazon Linux 2023 ECS ARM64 AMI from SSM."
  type        = string
  default     = ""
}

variable "ec2_min_size" {
  type    = number
  default = 1
}

variable "ec2_desired_capacity" {
  type    = number
  default = 1
}

variable "ec2_max_size" {
  type    = number
  default = 4
}

variable "app_min_tasks" {
  description = "Minimum ECS app tasks. Start at 1 for cost; use 2 for production HA."
  type        = number
  default     = 1
}

variable "app_desired_tasks" {
  description = "Initial ECS app tasks."
  type        = number
  default     = 1
}

variable "app_max_tasks" {
  description = "Maximum ECS app tasks for autoscaling."
  type        = number
  default     = 8
}

variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory_reservation" {
  type    = number
  default = 768
}

variable "ai_cpu" {
  type    = number
  default = 768
}

variable "ai_memory_reservation" {
  type    = number
  default = 1024
}

variable "ai_service_workers" {
  description = "Uvicorn workers per AI container. Keep 1 on small instances."
  type        = number
  default     = 1
}

variable "s3_bucket_name" {
  description = "Optional existing bucket name. If empty, Terraform creates a private upload bucket."
  type        = string
  default     = ""
}

variable "create_s3_bucket" {
  description = "Create the private S3 upload bucket."
  type        = bool
  default     = true
}

variable "frontend_web_url" {
  type    = string
  default = "http://localhost:3000"
}

variable "frontend_doctor_web_url" {
  type    = string
  default = "http://localhost:3001"
}

variable "frontend_app_url" {
  type    = string
  default = "exp://localhost:8081"
}

variable "supabase_url" {
  description = "Supabase project URL."
  type        = string
  default     = ""
}

variable "mongodb_db_name" {
  type    = string
  default = "swastik_healthcare"
}

variable "rate_limit_max_requests" {
  type    = number
  default = 300
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "github_oidc_enabled" {
  description = "Create an IAM role that GitHub Actions can assume for CI/CD deploys."
  type        = bool
  default     = false
}

variable "github_oidc_create_provider" {
  description = "Create the GitHub OIDC provider. Set false if the AWS account already has one."
  type        = bool
  default     = true
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN when github_oidc_create_provider=false."
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy, in owner/repo format."
  type        = string
  default     = "nayanpr620/SWASTIK-TELEMEDICINE"
}

variable "github_branch" {
  description = "GitHub branch allowed to deploy."
  type        = string
  default     = "main"
}

variable "turn_enabled" {
  description = "Create a low-cost coturn server for WebRTC fallback relay."
  type        = bool
  default     = true
}

variable "turn_instance_type" {
  description = "EC2 instance type for coturn. Keep small for cost."
  type        = string
  default     = "t4g.nano"
}

variable "turn_allocate_eip" {
  description = "Allocate a stable public IP for coturn. Recommended for DNS stability."
  type        = bool
  default     = true
}

variable "turn_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access TURN. Usually public internet for mobile clients."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "turn_realm" {
  description = "Coturn realm/server-name."
  type        = string
  default     = "vaididea.in"
}

variable "turn_username" {
  description = "Static TURN username. Use a non-obvious value in production."
  type        = string
  default     = "vaididea-turn"
}

variable "turn_password" {
  description = "Static TURN credential. Set a strong value in terraform.tfvars."
  type        = string
  sensitive   = true
  default     = "change-this-turn-password"
}

variable "turn_min_port" {
  description = "Start of UDP relay port range. Smaller ranges control exposure/cost for MVP."
  type        = number
  default     = 49152
}

variable "turn_max_port" {
  description = "End of UDP relay port range."
  type        = number
  default     = 49200
}

variable "turn_total_quota" {
  description = "Maximum concurrent coturn allocations."
  type        = number
  default     = 500
}
