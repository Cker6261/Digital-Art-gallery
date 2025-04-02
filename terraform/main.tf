terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.aws_region
}

# S3 bucket for image storage
resource "aws_s3_bucket" "art_gallery" {
  bucket = var.bucket_name
}

# Enable versioning
resource "aws_s3_bucket_versioning" "art_gallery" {
  bucket = aws_s3_bucket.art_gallery.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "art_gallery" {
  bucket = aws_s3_bucket.art_gallery.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 bucket policy
resource "aws_s3_bucket_policy" "art_gallery" {
  bucket = aws_s3_bucket.art_gallery.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.art_gallery.arn}/*"
      },
    ]
  })
}

# ECR Repository for Docker images
resource "aws_ecr_repository" "art_gallery" {
  name = var.ecr_repository_name
}

# ECS Cluster
resource "aws_ecs_cluster" "art_gallery" {
  name = "art-gallery-cluster"
}