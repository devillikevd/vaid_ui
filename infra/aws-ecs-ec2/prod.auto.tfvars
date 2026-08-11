project_name    = "swastik"
environment     = "prod"
aws_region      = "ap-south-1"
certificate_arn = "arn:aws:acm:ap-south-1:324081754250:certificate/96f05022-359b-4f2e-a586-64272997efc5"
# Cost-effective defaults. Increase only after monitoring.
instance_type        = "t4g.small"
ec2_min_size         = 1
ec2_desired_capacity = 1
ec2_max_size         = 2
app_min_tasks        = 1
app_desired_tasks    = 1
app_max_tasks        = 2
ai_service_workers   = 1
log_retention_days   = 14

frontend_web_url        = "https://vaididea.in"
frontend_doctor_web_url = "https://vaididea.in"
frontend_app_url        = "exp://localhost:8081"
supabase_url            = "https://fzbdticlmxbxeektckst.supabase.co"

# Low-cost coturn server for video consultation fallback.
# TURN relay bandwidth can become expensive, so keep it as fallback only.
turn_enabled       = true
turn_instance_type = "t4g.small"
turn_realm         = "vaididea.in"
# Set turn_username and turn_password in terraform.tfvars which is gitignored
turn_total_quota   = 500

# Enable after the first infra deploy when you are ready for GitHub Actions CI/CD.
github_oidc_enabled = true
github_repository   = "nayanpr620/SWASTIK-TELEMEDICINE"
github_branch       = "main"
