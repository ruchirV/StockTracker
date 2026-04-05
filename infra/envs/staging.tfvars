env             = "staging"
aws_region      = "us-east-1"
vpc_cidr        = "10.0.0.0/16"

# RDS — free tier eligible (single-AZ)
db_instance_class = "db.t3.micro"
db_multi_az       = false

# ElastiCache
cache_node_type = "cache.t3.micro"

# ECS — 0.5 vCPU / 1 GB
ecs_task_cpu    = 512
ecs_task_memory = 1024

# Domains — update once ACM certs are issued
frontend_domain = "stocktracker.ruchirv.dev"

acm_certificate_arn = "arn:aws:acm:us-east-1:640053196968:certificate/74e34be6-6124-45ad-ab3d-e5808911672f"
cloudfront_certificate_arn = "arn:aws:acm:us-east-1:640053196968:certificate/791109d0-f2dc-4cec-a460-4589bf2bc54b"
