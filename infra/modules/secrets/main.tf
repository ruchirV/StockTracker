# Placeholder secrets — values must be set manually in AWS console or via CLI
# after `tofu apply`. CI reads these via ECS task definition secrets injection.

locals {
  secret_names = [
    "jwt-access-secret",
    "jwt-refresh-secret",
    "google-client-id",
    "google-client-secret",
    "github-client-id",
    "github-client-secret",
    "finnhub-api-key",
    "groq-api-key",
    "smtp-host",
    "smtp-user",
    "smtp-pass",
    "admin-email",
    "admin-initial-password",
  ]
}

resource "aws_secretsmanager_secret" "app_secrets" {
  for_each = toset(local.secret_names)

  name                    = "stocktracker/${var.env}/${each.key}"
  recovery_window_in_days = 0

  tags = {
    Env = var.env
  }

  lifecycle {
    # Don't overwrite values that have already been set manually
    ignore_changes = [tags]
  }
}
