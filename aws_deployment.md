# AutoAudit AWS Deployment Guide

This guide builds and pushes the AutoInspect FastAPI backend image to a **private Amazon ECR repository**. It does not create or deploy an App Runner service, ECS service, RDS database, or S3 bucket. Those are separate infrastructure steps.

## Current project layout

- Backend Dockerfile and build context: `backend/backend/`
- Backend image copies `app/` and `weights/` into the image.
- Compose file: `backend/docker-compose.yml`; its backend build context resolves to `backend/backend/`.
- Compose mounts `backend/backend/weights/` over `/app/weights` for local development. Do not carry that host bind mount into ECS/App Runner; production should use the weights baked into the image.
- The model file `backend/backend/weights/best.pt` is intentionally excluded from Git by the repository `.gitignore`, but is included in the Docker build context and image.
- `.dockerignore` files are present at the repository root and backend build-context root. Docker applies the ignore file from the **build context**, so `backend/backend/.dockerignore` is the one that protects the backend build. It excludes `.env`, virtual environments, tests, caches, and local databases while keeping `weights/` available.

## Before building

1. Install and configure Docker and AWS CLI v2. Confirm Docker is running and the AWS identity is the intended deployment account:

   ```bash
   aws sts get-caller-identity
   aws configure list
   ```

2. Choose a region. The examples use `ap-south-1`; use the region where the service and related resources will run. Keep ECR, compute, RDS, and S3 in a compatible region to reduce cross-region latency and transfer charges.

3. Confirm the real model file exists locally:

   ```bash
   test -s backend/backend/weights/best.pt && echo "YOLO weights found"
   ```

   The file stays local and out of Git. Docker sends it in the build context and stores it in the resulting image. Anyone with permission to pull the image can extract the model, so grant ECR read access only to the deployment roles and trusted operators. Do not describe an embedded model as impossible to retrieve.

4. Set the example values for your shell. Replace the account ID with the value returned by `aws sts get-caller-identity`:

   ```bash
   export AWS_REGION=ap-south-1
   export AWS_ACCOUNT_ID=123456789012
   export ECR_REPOSITORY=autoaudit-backend
   export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
   export ECR_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}"
   export IMAGE_TAG=v1.0.0
   ```

## Build and push the backend image

### 1. Create a private ECR repository (once)

```bash
aws ecr create-repository \
  --repository-name "$ECR_REPOSITORY" \
  --image-scanning-configuration scanOnPush=true \
  --region "$AWS_REGION"
```

If it already exists, ECR reports that; inspect it with `aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION"`.

### 2. Authenticate Docker to ECR

```bash
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$ECR_REGISTRY"
```

### 3. Build the image from the backend context

```bash
cd /home/dina/project/autoaudit/backend/backend
docker build --platform linux/amd64 -t "${ECR_REPOSITORY}:${IMAGE_TAG}" .
```

The `linux/amd64` target is suitable for x86_64 compute. For ARM/Graviton compute, use `--platform linux/arm64`; the image architecture must match the selected runtime. The `weights/` directory is copied by the Dockerfile, so the local `weights/best.pt` is baked into this image without adding it to Git. The image can be substantially larger than the source because it includes Python dependencies and model weights.

### 4. Tag and push

```bash
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:${IMAGE_TAG}"
```

Confirm ECR received the tag:

```bash
aws ecr describe-images \
  --repository-name "$ECR_REPOSITORY" \
  --image-ids "imageTag=${IMAGE_TAG}" \
  --region "$AWS_REGION"
```

Use a new, immutable release tag for each deployment (for example, `v1.0.1`) and record the image digest. Avoid reusing `latest` as the only deployment reference; a digest gives a reproducible rollback target.

## Configure the runtime

ECR stores the image; a compute service must still be configured to run it and expose port `8000`. Choose one target—App Runner, ECS/Fargate, or EC2 with Docker—based on the team’s networking and operations needs. The ECR commands above do not deploy or start the service.

Configure the container with the settings appropriate for the chosen environment:

| Setting | Purpose |
| --- | --- |
| `INFERENCE_MODE=auto` | Attempt to load the YOLO weights; if that fails, this backend currently falls back to its computer-vision engine. The current code also falls back when a non-`mock` mode cannot load YOLO, so the setting alone does not enforce real YOLO. Gate release on `/api/health` reporting `real_ai` and `model_loaded: true`. |
| `YOLO_WEIGHTS_PATH=weights/best.pt` | Model path relative to the container working directory `/app`. |
| `DATABASE_URL` | PostgreSQL connection string for shared persistent history. Supply it through a managed secret, not a checked-in file. |
| `AWS_REGION` | Region used by the backend for AWS SDK operations. |
| `AWS_S3_BUCKET_NAME` | Bucket for inspection image storage, if enabled. |
| `AWS_S3_PRESIGNED_URL_TTL=3600` | Lifetime in seconds for generated presigned links; choose a short value suitable for the workflow. |
| `CORS_ORIGINS` | Exact HTTPS origin(s) of the deployed frontend. Do not use `*` in production. |

Use a workload IAM role for AWS access: an ECS **task execution role** is used by ECS to pull the ECR image and retrieve configured secrets; the application’s **task role** is for calls made by the running backend, such as narrowly scoped access to its S3 bucket. For App Runner, assign the appropriate instance role for application access. Do not place AWS access keys in the image, repository, or runtime environment when a role is available. Limit S3 permissions to the required bucket and actions, and enable encryption and public-access blocking on the bucket.

For PostgreSQL, use a managed database such as RDS, keep it private, restrict inbound access to the backend security group, require TLS, and store the URL/password in a managed secret. A reachable database is not automatically configured by pushing an image; networking, schema migrations, backups, and retention must also be arranged.

## Health and real-model verification

After deploying the container, request `GET /api/health` through the service URL. For a real-model deployment, verify that the response reports `inference_mode: "real_ai"` and `model_loaded: true`. The current health route obtains the model manager, so the first health check may trigger model loading and take longer than later checks. Configure startup/health-check grace periods accordingly. A successful image push alone does not prove that the model can load or that inference works; perform a controlled inspection with a known sample and verify the annotated result and response fields.

The configured `auto` mode is intentionally forgiving for local use and can fall back to the computer-vision engine. Treat any health response other than `real_ai` as a failed production readiness check if real YOLO is required. The current model manager's fallback may report `demo_mock` for some fallback models, so verify the actual response from the built image before release.

## Production release checks

Before exposing the API publicly, address these application-level items in the deployed configuration/code:

- Replace the current permissive CORS defaults with only the deployed frontend origins.
- Add authentication and authorization appropriate to the operators and services using the API.
- Protect or disable unauthenticated state-changing/demo routes, including analytics simulation and reset endpoints, if they are not part of the production workflow.
- Set upload limits, request timeouts, rate limits, and logging/alerting at the service or gateway layer; ensure logs do not expose credentials or sensitive image URLs.
- Use private networking where possible and HTTPS at the public entry point.
- Confirm database migrations, backups/restore, S3 lifecycle/retention, and recovery procedures before relying on the data operationally.

These are release prerequisites, not properties provided by ECR or Docker. The current backend source includes wildcard CORS by default and public simulation/reset routes; an AWS deployment does not make those safe automatically.

## Keep AWS costs controlled

- Keep only the images needed for current deployment and rollback. Configure an ECR lifecycle policy to expire older untagged and obsolete tagged images; image storage and data transfer are billed.
- Avoid running duplicate development services. Stop or pause non-production compute when unused where the selected service supports it, and set sensible minimum/maximum instances and concurrency after load testing.
- App Runner has provisioned-memory charges while a service is running, even during idle periods; compare its ongoing cost with ECS/Fargate and expected usage before choosing it. Pricing depends on region and configuration, so check the current pricing calculator rather than copying a fixed estimate.
- Use a small RDS instance only for development and review its storage, backup, and availability costs. For production, size from measured workload and set backup retention intentionally.
- Keep traffic between compute, RDS, ECR, and S3 in the same region when practical. Monitor CloudWatch logs/metrics and configure retention so logs do not grow indefinitely.
- Set AWS Budgets and billing alerts before leaving resources running.

## Official AWS references

- [Amazon ECR overview](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html) and [ECR lifecycle policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html)
- [ECS task execution IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html) and [ECS task IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- [AWS App Runner pricing](https://aws.amazon.com/apprunner/pricing/)
