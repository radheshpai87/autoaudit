# AutoAudit Web

The production dashboard is a Next.js 15 application using TypeScript and the App Router.

## Local development

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Set `AUTOINSPECT_API_URL` to the FastAPI service origin. The default points to the local API on port 8000. The browser uses same-origin `/api/py/*` routes, which Next.js proxies to that server.

## Checks

```bash
npm run lint
npm run build
```

## AWS deployment

The root `amplify.yml` configures AWS Amplify Hosting for this app's Next.js SSR build. Set `AMPLIFY_MONOREPO_APP_ROOT=frontend` in Amplify and configure `AUTOINSPECT_API_URL` to the deployed FastAPI origin in the Amplify environment. See [`../infra/aws/README.md`](../infra/aws/README.md) for the deployment boundary and backend container notes.
