terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    # Values supplied via -backend-config flags in CI / `tofu init`
    # bucket         = var.tf_state_bucket   ← can't use vars in backend block
    # key            = "stocktracker/<env>/terraform.tfstate"
    # region         = "us-east-1"
    # dynamodb_table = var.tf_state_lock_table
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ── VPC ───────────────────────────────────────────────────────────────────────
module "vpc" {
  source      = "./modules/vpc"
  env         = var.env
  aws_region  = var.aws_region
  vpc_cidr    = var.vpc_cidr
}

# ── ECR ───────────────────────────────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"
  env    = var.env
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
module "rds" {
  source               = "./modules/rds"
  env                  = var.env
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  db_instance_class    = var.db_instance_class
  multi_az             = var.db_multi_az
  db_name              = "stocktracker"
  db_username          = "stocktracker"
  ecs_security_group_id = module.ecs.ecs_security_group_id
}

# ── ElastiCache Redis ─────────────────────────────────────────────────────────
module "elasticache" {
  source                = "./modules/elasticache"
  env                   = var.env
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  cache_node_type       = var.cache_node_type
  ecs_security_group_id = module.ecs.ecs_security_group_id
}

# ── Secrets Manager ───────────────────────────────────────────────────────────
module "secrets" {
  source = "./modules/secrets"
  env    = var.env
}

# ── ALB ───────────────────────────────────────────────────────────────────────
module "alb" {
  source             = "./modules/alb"
  env                = var.env
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  certificate_arn    = var.acm_certificate_arn
}

# ── ECS Fargate ───────────────────────────────────────────────────────────────
module "ecs" {
  source               = "./modules/ecs"
  env                  = var.env
  aws_region           = var.aws_region
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  alb_security_group_id = module.alb.alb_security_group_id
  alb_target_group_arn  = module.alb.target_group_arn
  ecr_backend_url       = module.ecr.backend_repository_url
  backend_image_tag     = var.backend_image_tag
  task_cpu              = var.ecs_task_cpu
  task_memory           = var.ecs_task_memory
  secrets_arn_prefix    = module.secrets.secrets_arn_prefix
  db_secret_arn         = module.rds.database_url_secret_arn
  redis_url             = module.elasticache.redis_endpoint
}

# ── CloudFront + S3 (frontend) ────────────────────────────────────────────────
module "cdn" {
  source          = "./modules/cdn"
  env             = var.env
  domain_name     = var.frontend_domain
  certificate_arn = var.cloudfront_certificate_arn
}
