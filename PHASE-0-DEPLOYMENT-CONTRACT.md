# Phase 0 Deployment Contract

## Status

Approved architecture lock for VunaMentor / Vuna Business Planner before math and UI test work begins.

This document resolves the deployment model for the planner and its relationship to the existing VunaBooks FastAPI backend on Railway.

## Core Decision

The planner is a dual-deployment product with one shared backend identity system:

- `Simple Mode` is deployed to `Vercel` as a static frontend and must calculate entirely in the browser.
- `Advanced Mode`, `Expert Mode`, and all authenticated planner data operations use the existing `VunaBooks FastAPI` backend on `Railway`.
- The planner and VunaBooks share one `users` table, one JWT authentication system, and one billing stack.
- A user who signs in through the planner is signing in to the same account used by VunaBooks.

## Non-Negotiable Rules

### 1. Simple Mode Must Survive Without Railway

- Simple Mode calculations must work with zero mandatory backend dependency.
- The Vercel deployment must not crash if the Railway API is down, slow, misconfigured, or unreachable.
- No Simple Mode render path may require a successful network request.
- Offline use is a first-class scenario, not an edge case.

### 2. Planner Uses the Existing VunaBooks Backend

- The planner frontend must connect to the existing VunaBooks FastAPI backend on Railway.
- The planner must reuse the existing `/api/auth/*` JWT authentication flows rather than creating a second auth system.
- The planner must reuse the same `users` table and any existing customer/account identity records already maintained by VunaBooks.
- Cross-sell into VunaBooks must be seamless: a planner user who already has an account should not register again.

### 3. Capability Gating Must Be Explicit

- If an action needs Railway, auth, or a paid tier, the UI must gate it deliberately instead of failing at click time.
- If the backend is unavailable, the app must show a clear message and remain usable for browser-only features.
- Gated actions must use product language, not raw network errors.

### 4. Advanced Keeps the Simple Summary

- Advanced Mode must still expose a Simple Summary computed from the same inputs.
- The summary must be produced from the shared math engine, not from a second implementation.

## Capability Matrix

| Capability | Vercel Simple Offline | Vercel Simple Anonymous Online | Signed-In Free User | Paid User |
|---|---|---|---|---|
| Enter planner inputs | Yes | Yes | Yes | Yes |
| Run Simple calculations | Yes | Yes | Yes | Yes |
| View Simple results | Yes | Yes | Yes | Yes |
| Save plan to backend | No, gate | No, gate | Yes, via Railway | Yes, via Railway |
| Generate premium / server PDF | No, gate | No, gate | No, gate | Yes, via Railway |
| Access Advanced mode | No, gate | No, gate | No, gate | Yes |
| Access Expert mode | No, gate | No, gate | No, gate | Yes or waitlist flow |
| Open VunaBooks without re-registering | Not until sign-in | After sign-in | Yes | Yes |

## Phase 0 Messaging Contract

Use explicit upgrade/auth messaging for gated actions.

Primary gate copy:

`Sign in or upgrade to save your plan and unlock Advanced metrics.`

Backend-unavailable copy:

`Simple Mode still works here in your browser. Sign in when you're online to save your plan.`

Premium PDF copy:

`Sign in or upgrade to generate your premium Break-Even PDF.`

## Backend Contract To Build Against

The planner should align to the existing VunaBooks backend shape, not to placeholder endpoints from earlier drafts.

Primary auth base:

- `/api/auth/register/`
- `/api/auth/login/`
- `/api/auth/token/refresh/`
- `/api/auth/me/`

Current planner backend status:

- `backend/api/planner.py` currently exposes waitlist endpoints only.
- Save/load plan endpoints still need to be added on the shared backend in a later phase.

## Frontend Contract To Build Against

The frontend must separate:

- `browser-safe capabilities`
- `backend-assisted capabilities`
- `paid-only capabilities`

This separation should live in code as a reusable capability/config layer so later UI work does not re-decide product rules in each component.

## Test Boundary For Next Phase

Before writing calculator/UI tests, assume:

- Railway may be unreachable.
- No user is signed in by default.
- Simple calculations must remain available.
- Gated actions must not throw.
- Planner auth and future plan persistence must target the shared VunaBooks FastAPI backend.
