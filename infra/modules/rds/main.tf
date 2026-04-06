resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "stocktracker/${var.env}/db-password"
  recovery_window_in_days = 0

  tags = {
    Env = var.env
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# Full DATABASE_URL secret — injected directly into ECS task as DATABASE_URL env var
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "stocktracker/${var.env}/database-url"
  recovery_window_in_days = 0
  tags = { Env = var.env }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}?sslmode=require"

  # Depend on the DB being created first so the endpoint is available
  depends_on = [aws_db_instance.main]
}

resource "aws_db_subnet_group" "main" {
  name       = "stocktracker-${var.env}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "stocktracker-${var.env}-db-subnet-group"
    Env  = var.env
  }
}

resource "aws_security_group" "rds" {
  name        = "stocktracker-${var.env}-rds"
  description = "Allow PostgreSQL from ECS tasks only"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "stocktracker-${var.env}-rds-sg"
    Env  = var.env
  }
}

resource "aws_db_instance" "main" {
  identifier        = "stocktracker-${var.env}"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az               = var.multi_az
  publicly_accessible    = false
  deletion_protection    = var.env == "prod"
  skip_final_snapshot    = var.env != "prod"
  final_snapshot_identifier = var.env == "prod" ? "stocktracker-prod-final-snapshot" : null

  backup_retention_period = var.env == "prod" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  tags = {
    Name = "stocktracker-${var.env}"
    Env  = var.env
  }
}
