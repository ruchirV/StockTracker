env             = "prod"
aws_region      = "us-east-1"
vpc_cidr        = "10.1.0.0/16"

# RDS — Multi-AZ for production reliability
db_instance_class = "db.t3.small"
db_multi_az       = true

# ElastiCache
cache_node_type = "cache.t3.small"

# ECS — 1 vCPU / 2 GB
ecs_task_cpu    = 1024
ecs_task_memory = 2048

# Domains
frontend_domain = "stocktracker.dev"

# ACM certificate ARNs — fill in after `tofu apply` on the certs first
# acm_certificate_arn        = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/..."
# cloudfront_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/..."
