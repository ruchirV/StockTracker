output "secrets_arn_prefix" {
  description = "ARN prefix for all app secrets (arn:aws:secretsmanager:REGION:ACCOUNT:secret:stocktracker/ENV)"
  value       = "arn:aws:secretsmanager:*:*:secret:stocktracker/${var.env}/*"
}

output "secret_arns" {
  value = { for k, v in aws_secretsmanager_secret.app_secrets : k => v.arn }
}
