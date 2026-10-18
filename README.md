# Sanket

Sanket is a healthcare operations prototype for rehearsing medicine shortage response before it becomes an incident. It combines a network-level stock risk overview, deterministic shortage projections, safe donor allocation, scenario comparison, report intake, and an auditable decision trail.

## Run locally

Requirements: Node.js 18.17+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The demo uses seeded in-memory data in `lib/domain.ts`; approved transfers update the shared in-memory session state and the decision history. Persistence and authentication are intentionally outside this prototype. The interface labels these records as synthetic demo data and uses a current-date snapshot header. The report route works without a key and returns a human-review fallback. Set GEMINI_API_KEY in .env.local to enable server-side report extraction using Gemini 3.8 Flash. The model is configured in the server route; no separate model environment variable is required. Responses are validated against known facility and medicine IDs, and provider failures fall back safely.

## Validation

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub and import it into Vercel.
2. Keep the framework preset as **Next.js** and the build command as `next build`.
3. Add `GEMINI_API_KEY` under **Settings → Environment Variables** for Preview and Production if Gemini extraction is required.
4. Deploy. No database or separate server is required for the seeded demo.

## Product surfaces

- **Operations overview:** facility readiness, critical/watched medicines, coverage, and next best action.
- **Response rehearsal:** select a facility, medicine, and scenario; inspect projected cover and gap; compare eligible donors with a donor safety buffer in an interactive SVG network; preview before/after outcomes; and approve a simulated transfer.
- **Report intake:** load a synthetic sample or submit an unstructured field note through the server-side Gemini route, review/correct extracted IDs and quantity, then open the rehearsal with those reviewed fields.
- **Decision history:** inspect risk recalculations, inventory syncs, rehearsal opens, and transfer approvals.
