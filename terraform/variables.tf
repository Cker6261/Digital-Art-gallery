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

variable "ec2_ami_id" {
  description = "AMI ID for the EC2 instance (Ubuntu Server 20.04 LTS)"
  type        = string
  default     = "ami-0989fb15ce71ba39e" # Ubuntu Server 20.04 LTS for eu-north-1
}

variable "key_name" {
  description = "SSH key name for EC2 access"
  type        = string
  default     = ""
}

variable "aws_access_key" {
  description = "AWS access key for the EC2 instance"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret key for the EC2 instance"
  type        = string
  default     = ""
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
}
