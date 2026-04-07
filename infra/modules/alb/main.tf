resource "aws_security_group" "alb" {
  name        = "stocktracker-${var.env}-alb"
  description = "Allow HTTPS from internet, HTTP for redirect"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "stocktracker-${var.env}-alb-sg"
    Env  = var.env
  }
}

resource "aws_lb" "main" {
  name               = "stocktracker-${var.env}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.env == "prod"

  tags = {
    Name = "stocktracker-${var.env}"
    Env  = var.env
  }
}

resource "aws_lb_target_group" "backend" {
  name        = "stocktracker-${var.env}-backend"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = {
    Name = "stocktracker-${var.env}-backend-tg"
    Env  = var.env
  }
}

moved {
  from = aws_lb_listener.http_redirect
  to   = aws_lb_listener.http
}

# HTTP listener — forwards to backend (used by CloudFront which connects via HTTP internally)
# Direct browser HTTP access is blocked at the CloudFront layer (redirect-to-https viewer policy)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
