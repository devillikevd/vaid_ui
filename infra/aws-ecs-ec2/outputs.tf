output "backend_ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ai_service_ecr_repository_url" {
  value = aws_ecr_repository.ai_service.repository_url
}

output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "api_base_url" {
  value = "http://${aws_lb.app.dns_name}/api"
}

output "socket_url" {
  value = "http://${aws_lb.app.dns_name}"
}

output "ai_ws_base_url" {
  value = "ws://${aws_lb.app.dns_name}"
}

output "s3_bucket_name" {
  value = local.s3_bucket_name
}

output "ssm_parameter_prefix" {
  value = local.ssm_prefix
}

output "github_actions_role_arn" {
  value = var.github_oidc_enabled ? aws_iam_role.github_deploy[0].arn : null
}

output "turn_public_ip" {
  value = var.turn_enabled ? local.turn_public_ip : null
}

output "turn_url" {
  value = var.turn_enabled ? local.turn_url : null
}

output "turn_username" {
  value = var.turn_enabled ? var.turn_username : null
}

output "turn_password" {
  value     = var.turn_enabled ? var.turn_password : null
  sensitive = true
}
