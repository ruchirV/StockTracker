output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cdn.cloudfront_domain
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = module.cdn.distribution_id
}

output "frontend_bucket_name" {
  description = "S3 bucket name for the frontend"
  value       = module.cdn.bucket_name
}

output "ecr_backend_url" {
  description = "ECR repository URL for the backend image"
  value       = module.ecr.backend_repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "migrate_task_definition_arn" {
  description = "ECS task definition ARN for the migration one-off task"
  value       = module.ecs.migrate_task_definition_arn
}

output "private_subnet_ids" {
  description = "Private subnet IDs (comma-separated, for ECS run-task)"
  value       = join(",", module.vpc.private_subnet_ids)
}

output "ecs_security_group_id" {
  description = "ECS task security group ID"
  value       = module.ecs.ecs_security_group_id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}
