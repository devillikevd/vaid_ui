terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "swastik-terraform-state-324081754250"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    use_lockfile   = true
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}
