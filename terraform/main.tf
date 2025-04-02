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
  
  lifecycle {
    ignore_changes = all
    prevent_destroy = true
  }
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

# S3 website configuration
resource "aws_s3_bucket_website_configuration" "art_gallery" {
  bucket = aws_s3_bucket.art_gallery.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    Name = "art-gallery-vpc"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "art-gallery-public"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "art-gallery-igw"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "art-gallery-public-rt"
  }
}

# Route Table Association
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group for EC2
resource "aws_security_group" "ec2" {
  name        = "art-gallery-ec2-sg"
  description = "Security group for art gallery EC2 instance"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# IAM Role for EC2 with S3 access
resource "aws_iam_role" "ec2_role" {
  name = "art-gallery-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Attach S3 access policy to EC2 role
resource "aws_iam_role_policy" "s3_access" {
  name = "s3-access-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.art_gallery.arn,
          "${aws_s3_bucket.art_gallery.arn}/*"
        ]
      }
    ]
  })
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "art-gallery-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# Free tier EC2 instance (t2.micro)
resource "aws_instance" "app" {
  ami                    = var.ec2_ami_id
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  key_name               = var.key_name
  associate_public_ip_address = true

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io nginx
              systemctl enable docker
              systemctl start docker
              systemctl enable nginx
              systemctl start nginx

              # Set up credentials
              mkdir -p /root/.aws
              cat > /root/.aws/credentials << 'EOT'
              [default]
              aws_access_key_id=${var.aws_access_key}
              aws_secret_access_key=${var.aws_secret_key}
              region=${var.aws_region}
              EOT

              # Pull and run app container
              aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.art_gallery.repository_url}
              docker pull ${aws_ecr_repository.art_gallery.repository_url}:latest
              docker run -d -p 5000:5000 -e AWS_BUCKET_NAME=${aws_s3_bucket.art_gallery.id} -e AWS_REGION=${var.aws_region} ${aws_ecr_repository.art_gallery.repository_url}:latest

              # Configure nginx to proxy to the app
              cat > /etc/nginx/sites-available/default << 'EOT'
              server {
                  listen 80 default_server;
                  listen [::]:80 default_server;

                  location / {
                      proxy_pass http://localhost:5000;
                      proxy_set_header Host $host;
                      proxy_set_header X-Real-IP $remote_addr;
                  }
              }
              EOT

              # Reload nginx
              systemctl reload nginx
              EOF

  tags = {
    Name = "art-gallery-app-server"
  }
}

# ECR Repository for Docker images (still needed for EC2 to pull from)
resource "aws_ecr_repository" "art_gallery" {
  name = var.ecr_repository_name
  
  lifecycle {
    ignore_changes = all
    prevent_destroy = true
  }
}

# Output the EC2 public IP
output "ec2_public_ip" {
  value = aws_instance.app.public_ip
  description = "The public IP address of the EC2 instance"
}

# Output S3 website endpoint
output "s3_website_endpoint" {
  value = aws_s3_bucket_website_configuration.art_gallery.website_endpoint
  description = "The S3 static website endpoint"
}