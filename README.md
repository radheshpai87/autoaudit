# AutoAudit

AutoAudit is a brake-component quality inspection system with a Next.js dashboard and a FastAPI inference API.

## Repository map

```text
autoaudit/
├── frontend/                 # Production Next.js dashboard (TypeScript)
├── backend/                  # API and model workspace (renamed from autoinspect-ai)
│   ├── backend/              # FastAPI API, model code, samples, tests, weights
│   ├── frontend/             # Earlier Vite prototype; not used by the dashboard
│   ├── scripts/              # Model training and dataset preparation tools
│   └── docker-compose.yml    # Earlier prototype's local stack
├── infra/aws/                # AWS deployment notes and operating boundary
├── amplify.yml               # Amplify monorepo build configuration for frontend/
└── README.md
```

## Local development

Run the API from its own directory so its relative model and sample paths resolve:

```bash
cd backend/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In a second terminal, start the dashboard:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The default frontend API proxy target is `http://127.0.0.1:8000`.

## AWS deployment shape

- **Web:** AWS Amplify Hosting builds the Next.js SSR application using the root `amplify.yml`.
- **Inference API:** The FastAPI service is containerized by `backend/backend/Dockerfile`; deploy it as a separately managed AWS container service and provide its HTTPS origin to Amplify as `AUTOINSPECT_API_URL`.
- **Model files and secrets:** Store model artifacts in an access-controlled deployment artifact or model store and runtime secrets in AWS Secrets Manager or SSM Parameter Store. Do not commit production credentials or rely on local `.env` files in AWS.

See [`infra/aws/README.md`](infra/aws/README.md) for required deployment configuration. The repository does not provision AWS resources automatically.
