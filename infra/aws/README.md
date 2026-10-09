# AWS deployment structure

This repository separates the web build from model inference so each can be deployed and scaled independently.

## Web dashboard — Amplify Hosting

The root [`amplify.yml`](../../amplify.yml) is configured for the Next.js application in `frontend/` and publishes its `.next` SSR build. In the Amplify app settings:

1. Select the repository root as the monorepo and set `AMPLIFY_MONOREPO_APP_ROOT` to `frontend`.
2. Set `AUTOINSPECT_API_URL` in the Amplify build environment to the HTTPS origin of the deployed inference API (scheme and host only, no `/api` suffix). Next.js captures rewrite configuration during its build.
3. Keep credentials and signing keys out of frontend `NEXT_PUBLIC_*` variables. The API origin is used by the Next.js server rewrite.

The backend origin must be reachable from Amplify's server runtime. The dashboard calls same-origin `/api/py/*` paths; Next.js rewrites those requests to `${AUTOINSPECT_API_URL}/api/*`.

## Inference API — container service

The API image is built from `backend/backend/Dockerfile` with `backend/backend/` as its build context. It listens on port `8000`, and its health endpoint is `/api/health`. An AWS container service such as ECS can run this image behind HTTPS ingress; configure health checks, restricted network access, logs, autoscaling, and secrets in the chosen service.

The current Dockerfile copies model weights into the image. For production, use a versioned, access-controlled model artifact and pin the image/model versions together. Confirm the model's CPU, memory, inference latency, and accelerator needs before choosing Fargate or GPU-backed ECS capacity. Do not expose the API publicly without TLS and appropriate access controls.

## Configuration and ownership

- Local settings belong in ignored `.env.local` / `.env` files; tracked `.env.example` files contain placeholders only.
- Inference settings belong in the API service's environment or AWS-managed secret/config store.
- This repository contains deployment build configuration and Docker packaging, not an AWS account-specific CloudFormation/Terraform stack. VPCs, IAM roles, certificates, DNS, and service sizing are supplied by the deployment environment.

## Inspection history and image artifacts

The backend uses SQLite when `DATABASE_URL` is absent. Set `DATABASE_URL` on the
backend service to a PostgreSQL URL to persist inspections, defect coordinates,
and S3 object keys in RDS. For RDS, use TLS (`sslmode=require`), allow inbound
PostgreSQL only from the backend's security group, and keep the URL in AWS
Secrets Manager or the service's secret environment configuration. URL-encode
reserved characters in the password.

Set `AWS_REGION` and `AWS_S3_BUCKET_NAME` on the backend service. The bucket
must remain private. Give the backend's ECS task role (or EC2 instance role)
`s3:PutObject` and `s3:GetObject` access scoped to that bucket; the backend
generates one-hour presigned URLs. In local development, boto3 can use a local
AWS profile, but production should use an IAM role and never browser-side AWS
credentials. When S3 is not configured or temporarily unavailable, inspections
continue to return their existing inline overlays; history still records data
in the configured database.

The SQLAlchemy history manager creates the required tables and applies additive
columns for existing SQLite/PostgreSQL databases on startup. Before production
rollout, provision the RDS database and bucket, configure the backend secrets
and IAM role, then verify an inspection writes a row and three private objects.
