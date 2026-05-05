# Vuna Business Planner Frontend

This frontend is the planner half of the broader VunaBooks platform.

## Deployment Model

- `Simple Mode` is designed for a static `Vercel` deployment and must run entirely in the browser.
- `Advanced Mode`, `Expert Mode`, authentication, saved plans, and premium PDF flows connect to the existing `VunaBooks FastAPI` backend on `Railway`.
- The planner does not own a separate user system. It reuses the same `users` table and JWT authentication stack as VunaBooks.

Phase 0 architecture lock lives in [PHASE-0-DEPLOYMENT-CONTRACT.md](../PHASE-0-DEPLOYMENT-CONTRACT.md).

## Run Locally

Prerequisite: `Node.js`

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `VITE_VUNABOOKS_API_BASE_URL` to your FastAPI backend, usually `http://localhost:8000/api`
4. Run the app with `npm run dev`

## Current Phase 0 Expectations

- Simple Mode must remain usable even if the backend is unreachable.
- Railway-backed actions must be capability-gated in the UI rather than assumed.
- Planner auth must target the shared VunaBooks backend, not a second auth service.
