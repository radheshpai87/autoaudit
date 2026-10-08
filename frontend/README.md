# AutoAudit

AutoAudit is a Next.js dashboard for manufacturing inspection and brake rotor quality operations. It is built with TypeScript and uses Turbopack for local development.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard includes responsive production metrics, quality yield, line status, searchable inspection records, telemetry controls, and CSV report export.

The five views are Plant Overview, Component Inspector, Batch Analytics, Machine Intelligence, and Human Review. They share the same labeled demonstration records; human reviews persist in browser local storage for the mock workflow. No YOLO model or industrial backend is connected. Rotor annotations, telemetry, risk scores, and batch manifest aggregates are explicitly demonstration fixtures.

The `lib/api.ts` adapter defines the mock provider and proposed HTTP contracts. Mock mode is the default. Set `NEXT_PUBLIC_AUTOAUDIT_API=http` to select the future HTTP adapter when the corresponding endpoints are available; this app does not provide those backend routes.

## Scripts

- `npm run dev` — start the Next.js development server with Turbopack
- `npm run build` — create a production build
- `npm run start` — serve the production build
- `npm run lint` — lint the frontend
