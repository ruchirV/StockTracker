output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "db_name" {
  value = aws_db_instance.main.db_name
}

output "db_username" {
  value = aws_db_instance.main.username
}

output "db_password_secret_arn" {
  value = aws_secretsmanager_secret.db_password.arn
}

output "database_url_secret_arn" {
  value = aws_secretsmanager_secret.database_url.arn
}
