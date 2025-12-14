# Major Dashboard and UI Improvements

## Summary

This PR delivers a complete overhaul of the InFoundry dashboard with new architecture building capabilities and streamlined UI across the site.

## Changes

### 🏠 Homepage
- Removed text prompt input box from hero section
- Retained use case pills and Pipeline CTA button for clear navigation

### 📍 Header & Footer
- Removed placeholder navigation links (Solutions, Use Cases, Developers)
- Simplified footer with only essential links: Pipeline, Dashboard, GitHub
- Fixed GitHub link to correct username

### 🏗️ Dashboard - Architecture Builder

**New Component Palette** with 21 AWS services in 6 categories:

| Category | Services |
|----------|----------|
| Compute | EC2, ECS, Lambda, Fargate |
| Database | RDS, DynamoDB, ElastiCache, Aurora |
| Network | Load Balancer, API Gateway, CloudFront, VPC |
| Storage | S3, EFS, ECR |
| Messaging | SQS, SNS, Kinesis |
| Security | IAM, Cognito, CloudWatch |

**Features:**
- Click-to-place workflow for building architectures manually
- Full AWS service name mapping (e.g., `Rds` → `Amazon RDS`)
- AWS brand colors for service categories
- Header with InFoundry logo and palette toggle
- Import/Export graph.json functionality
- Load graph from localStorage when coming from pipeline

### 📊 GraphViewer (Pipeline)
- Full service name expansion in nodes
- "Download" button to save graph.json
- "Open in Dashboard" button that transfers graph via localStorage
- Updated styling to match dashboard theme

### 🔧 Layout
- Added `suppressHydrationWarning` to prevent browser extension errors

## Screenshots

The dashboard now features a component palette sidebar and improved graph visualization with full AWS service names.

## Testing

1. Navigate to `/dashboard` and use the component palette to build an architecture
2. Run a pipeline at `/pipeline` and click "Open in Dashboard" on the graph output
3. Verify graph transfers correctly with all nodes and metadata

## Related Issues

- Improves dashboard usability
- Enhances architecture visualization
