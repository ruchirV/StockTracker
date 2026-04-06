data "aws_caller_identity" "current" {}

# ── Security group for ECS tasks ──────────────────────────────────────────────
resource "aws_security_group" "ecs" {
  name        = "stocktracker-${var.env}-ecs"
  description = "Allow inbound from ALB only; all outbound"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "stocktracker-${var.env}-ecs-sg"
    Env  = var.env
  }
}

# ── ECS cluster ───────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "stocktracker-${var.env}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "stocktracker-${var.env}"
    Env  = var.env
  }
}

# ── IAM: task execution role (pulls images, reads secrets, writes logs) ───────
resource "aws_iam_role" "task_execution" {
  name = "stocktracker-${var.env}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Env = var.env }
}

resource "aws_iam_role_policy_attachment" "execution_policy" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "secrets_read" {
  name = "stocktracker-${var.env}-read-secrets"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/*",
        ]
      }
    ]
  })
}

# ── IAM: task role (what the running container can do) ────────────────────────
resource "aws_iam_role" "task" {
  name = "stocktracker-${var.env}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Env = var.env }
}

# ── CloudWatch log group ──────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/stocktracker-${var.env}-backend"
  retention_in_days = 30

  tags = { Env = var.env }
}

resource "aws_cloudwatch_log_group" "migrate" {
  name              = "/ecs/stocktracker-${var.env}-migrate"
  retention_in_days = 14

  tags = { Env = var.env }
}

# ── ECS task definition (backend service) ────────────────────────────────────
resource "aws_ecs_task_definition" "backend" {
  family                   = "stocktracker-${var.env}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${var.ecr_backend_url}:${var.backend_image_tag}"

    portMappings = [{
      containerPort = 3001
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV",               value = "production" },
      { name = "PORT",                   value = "3001" },
      { name = "LLM_PROVIDER",           value = "groq" },
      { name = "FRONTEND_URL",           value = "https://${var.env == "prod" ? "stocktracker.dev" : "staging.stocktracker.dev"}" },
    ]

    secrets = [
      { name = "DATABASE_URL",           valueFrom = var.db_secret_arn },
      { name = "JWT_ACCESS_SECRET",      valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/jwt-access-secret" },
      { name = "JWT_REFRESH_SECRET",     valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/jwt-refresh-secret" },
      { name = "GOOGLE_CLIENT_ID",       valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/google-client-id" },
      { name = "GOOGLE_CLIENT_SECRET",   valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/google-client-secret" },
      { name = "GITHUB_CLIENT_ID",       valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/github-client-id" },
      { name = "GITHUB_CLIENT_SECRET",   valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/github-client-secret" },
      { name = "FINNHUB_API_KEY",        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/finnhub-api-key" },
      { name = "GROQ_API_KEY",           valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/groq-api-key" },
      { name = "SMTP_HOST",              valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/smtp-host" },
      { name = "SMTP_USER",              valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/smtp-user" },
      { name = "SMTP_PASS",              valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:stocktracker/${var.env}/smtp-pass" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backend"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:3001/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 15
    }
  }])

  tags = { Env = var.env }
}

# ── ECS task definition (migration one-off task) ──────────────────────────────
resource "aws_ecs_task_definition" "migrate" {
  family                   = "stocktracker-${var.env}-migrate"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name  = "migrate"
    image = "${var.ecr_backend_url}:${var.backend_image_tag}"

    command = ["node", "-e", "require('child_process').execSync('npx prisma migrate deploy', {stdio:'inherit'})"]

    environment = [
      { name = "NODE_ENV", value = "production" },
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = var.db_secret_arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.migrate.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "migrate"
      }
    }
  }])

  tags = { Env = var.env }
}

# ── ECS service ───────────────────────────────────────────────────────────────
resource "aws_ecs_service" "backend" {
  name            = "stocktracker-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "backend"
    container_port   = 3001
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  lifecycle {
    # Prevent redeployment on every tofu apply — image updates handled by CI
    ignore_changes = [task_definition]
  }

  tags = { Env = var.env }
}
