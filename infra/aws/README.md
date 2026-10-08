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
