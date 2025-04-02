variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-north-1"
}

variable "bucket_name" {
  description = "Name of the S3 bucket for storing images"
  type        = string
  default     = "art-gallery-images-bucket"
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository"
  type        = string
  default     = "art-gallery-app"
}

variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
}