variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-north-1"  # Stockholm region - generally cheaper
}

variable "bucket_name" {
  description = "Base name for S3 buckets"
  type        = string
  default     = "art-gallery-cp500"  # Change this to something unique for your account
}

variable "environment" {
  description = "Environment (e.g., Production, Development)"
  type        = string
  default     = "Production"
}
