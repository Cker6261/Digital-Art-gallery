# Art Gallery Application with DevOps Integration

## Features

- Image upload and gallery viewing
- Prometheus monitoring
- SonarCloud code quality analysis
- Free tier AWS S3 hosting
- Docker containerization

## Prerequisites

1. Node.js 18 or higher
2. AWS Account (Free Tier)
3. GitHub Account (for SonarCloud)
4. Docker (optional)

## Setup Instructions

### 1. Local Development

```bash
# Install dependencies
npm install

# Start the application
npm start
```

### 2. Monitoring Setup

The application includes Prometheus metrics at `/metrics` endpoint. Key metrics:

- Image upload counts
- Image view counts
- HTTP request metrics

### 3. AWS S3 Setup

1. Create an AWS account (free tier)
2. Create AWS access keys
3. Add the following secrets to your GitHub repository:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - SONAR_TOKEN (from SonarCloud)

### 4. Infrastructure Deployment

```bash
cd terraform
terraform init
terraform apply
```

### 5. Docker (Optional)

```bash
docker build -t art-gallery-app .
docker run -p 5000:5000 art-gallery-app
```

## Project Structure

- `/` - Main application files
- `/terraform` - Infrastructure as Code
- `/uploads` - Local development image storage
- `/.github/workflows` - CI/CD pipeline

## Monitoring

- `/metrics` - Prometheus metrics endpoint
- Key metrics available:
  - image_uploads_total
  - image_views_total
  - HTTP request metrics

## Notes

- All images are stored using index-based identification
- Free tier S3 hosting is used for cost optimization
- SonarCloud provides free analysis for public repositories
