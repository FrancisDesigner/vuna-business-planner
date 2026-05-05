# VunaBusinessPlanner Upgrade Execution Plan

## Goal

Make VunaBusinessPlanner the best planning tool for small businesses first, including kiosks, vegetable sellers, retailers, small manufacturers, small service businesses, and small wholesalers, while still growing into a serious finance tool for advanced operators and expert users.

This plan is based on:

- `docs/vunaplan_upgrade_spec.md`
- current frontend implementation
- the Phase 0 deployment contract

## What We Learned From Exploration

### 1. The product direction is already strong

The spec is clear: one financial truth, translated into three languages:

- `Simple` for small-business owners and operators
- `Advanced` for growing small businesses
- `Expert` for accountants, investors, NGO/DFI-style analysis

The core product idea is not "add more features." It is:

- keep the math consistent
- change the language, depth, and workflow by mode
- always show the difference between `profit` and `cash`

### 2. The current app already has a usable base

Current state:

- `Simple Mode` already exists and runs in-browser
- `Advanced Mode` already exists with real forms, calculations, scenarios, export, and local save
- `Expert Mode` is still mostly a waitlist
- offline/browser-first behavior is already part of the deployment contract

### 3. The main gap is not only UI

The biggest gaps are:

- Simple mode does not yet fully reflect small-business reality around cash timing and purpose framing
- Advanced mode has useful math, but does not yet implement the new finance concepts in the spec
- Expert mode is not built
- there is not yet one obvious shared metrics layer for all three modes

## Product Strategy

We should build this in order of business impact:

1. Make `Simple Mode` exceptional for small-business users.
2. Upgrade `Advanced Mode` so it becomes the serious step-up product.
3. Build `Expert Mode` only after the shared finance engine is ready.

Reason:

- small business users are the core market
- Simple mode is already architected for offline/browser use
- Expert mode depends on finance primitives that should be shared, not hardcoded separately

## Execution Phases

## Phase 1: Lock The Product Model

Outcome:

- we agree on what each mode is for
- we define the shared financial vocabulary once
- we avoid rebuilding the same logic three times

Work:

- define a shared metrics map for all modes:
  - revenue
  - variable costs
  - fixed costs
  - profit
  - cash position
  - invested capital
  - debt cost
  - benchmark/hurdle rate
- define the mode translation layer:
  - `simpleLabel`
  - `advancedLabel`
  - `expertLabel`
  - `plain-language explanation`
  - `warning thresholds`
- map every item from `vunaplan_upgrade_spec.md` into:
  - `shared engine`
  - `mode-specific UI`
  - `optional backend data`

Deliverable:

- a short technical spec for the shared planner engine and mode-specific presentation rules

## Phase 2: Make Simple Mode The Best Small-Business Planner

Outcome:

- the app becomes genuinely useful for a broad small-business base including kiosks, market traders, retailers, small makers, service operators, and wholesalers
- the experience works fast on mobile, in poor network conditions, and with low finance literacy

Priority features from the upgrade spec:

- cash gap question:
  - "When do your customers pay you?"
- best case / bad month toggle
- growth cash warning
- purpose-setting at the start
- clear profit vs cash display in simple language

Small-business-first UX improvements:

- reduce typing wherever possible
- make option choices tappable and large
- use one-screen-at-a-time flow with strong progress cues
- bias language toward action:
  - "watch out"
  - "you are safe"
  - "you may run short of cash"
- improve offline confidence messaging
- keep export/share actions secondary, not primary

Technical work:

- extend the existing browser calculator instead of adding parallel logic
- store new simple-mode inputs in local state/localStorage
- add result cards that explain cash risk, not just profit
- test on narrow mobile layouts first

Success criteria:

- a small-business user can complete the planner quickly on a phone
- the result answers:
  - "Am I making money?"
  - "Will I have cash?"
  - "What should I be careful about?"

## Phase 3: Upgrade Advanced Mode Into The Real Growth Tool

Outcome:

- Advanced mode becomes the product for serious small businesses, not just a longer form

Priority features from the spec:

- fixed / variable / mixed cost classification
- interest coverage health check
- ROIC vs Uganda benchmark
- stronger sensitivity table
- reinvestment vs take-home guidance
- better profit-to-cash reconciliation
- sunk cost prompt for investment decisions

Current implementation we can reuse:

- `AdvancedWizard.tsx`
- `AdvancedResults.tsx`
- `advancedCalculator.ts`
- local save/restore flow
- scenario structure and schedules

Main refactor needed:

- split current `advancedCalculator.ts` into:
  - core finance calculations
  - advanced presentation calculations
- add new result objects for:
  - cost structure
  - debt safety
  - return on invested capital
  - reinvestment requirement
  - profit vs cash reconciliation

Success criteria:

- Advanced mode clearly tells a business owner:
  - how risky their cost base is
  - whether debt is safe
  - whether the business is actually worth the capital tied up in it
  - what happens when sales or costs change

## Phase 4: Build The Shared Finance Engine

Outcome:

- Simple, Advanced, and Expert all run on one trusted math layer

This phase is the hinge point before Expert mode.

Core engine modules to add:

- working capital timing / cash conversion logic
- benchmark rate configuration for Uganda and other markets
- invested capital / ROIC calculations
- WACC building blocks
- NPV / IRR / terminal value utilities
- valuation helpers

Architecture direction:

- keep pure financial logic in `src/lib`
- keep mode text and thresholds separate from formulas
- write tests around the engine before wiring every UI surface

Success criteria:

- one source of truth for finance math
- unit tests cover edge cases and low-data inputs

## Phase 5: Build Expert Mode Properly

Outcome:

- Expert mode becomes a real product instead of a waitlist

Priority features from the spec:

- Uganda-context hurdle rate
- return spread headline metric
- WACC calculation
- debt capacity / capital structure module
- 5-year NPV and IRR
- business valuation outputs
- Africa regional benchmark comparison

Important rule:

- Expert mode should reuse the shared finance engine from Phase 4
- it should not become a disconnected second app

UX direction:

- cleaner dashboard layout
- institutional-grade outputs
- strong assumptions panel
- visible source notes for benchmarked values

Success criteria:

- Expert mode output feels credible to a finance professional
- the same business can be viewed in Simple, Advanced, and Expert without inconsistent numbers

## Phase 6: Backend, Identity, Save, And Premium Paths

Outcome:

- the planner feels like part of VunaBooks, not a disconnected microsite

Work:

- keep Simple mode fully usable without backend access
- connect advanced/expert save flows to the existing VunaBooks backend
- add plan persistence endpoints
- replace mock premium/payment flows with real gated flows
- keep capability gating explicit and user-friendly

Success criteria:

- anonymous users can always use Simple mode
- signed-in users can save and resume
- premium capabilities fail gracefully if backend is unavailable

## Phase 7: Polish, Testing, And Field Validation

Outcome:

- the app is reliable enough for real kiosk and small-business use

Work:

- add mobile-first UI review across the full planner
- add offline and flaky-network test coverage
- add content review for plain-language clarity
- verify PDF/report outputs match the new mode logic
- run user validation with:
  - kiosk owners
  - small shop operators
  - one or two financially literate reviewers

Success criteria:

- no confusing finance language in Simple mode
- no broken gating/offline paths
- core calculator behavior is covered by tests

## Recommended Immediate Next Steps

This is the order I recommend:

1. Write the shared planner engine spec and metric map.
2. Implement the new `Simple Mode` kiosk features first.
3. Refactor `Advanced Mode` onto the shared engine while adding the missing finance outputs.
4. Build `Expert Mode` after the shared engine is stable.
5. Connect backend persistence and premium paths as a separate hardening stream.

## Suggested Build Slices

To keep momentum and reduce risk, we should build in these slices:

1. `Simple Mode cash intelligence`
2. `Simple Mode purpose + scenario language`
3. `Advanced Mode cost structure + debt safety`
4. `Advanced Mode ROIC + reinvestment + cash reconciliation`
5. `Shared finance engine for expert metrics`
6. `Expert Mode dashboard MVP`
7. `Persistence + premium + QA hardening`

## Recommendation

If we want the fastest path to a genuinely better product, we should not start with Expert mode.

We should start by making `Simple Mode` the strongest small-business planner in the market, then use that same financial backbone to upgrade Advanced and finally unlock Expert.

## Implementation Closure Status - April 23, 2026

The build phases in this plan have now been combined into a completed implementation pass.

Completed in code:

- `Phase 1`: shared mode model, metric registry, and planner vocabulary.
- `Phase 2`: Simple Mode small-business flow, cash-gap logic, scenario framing, PDF/share updates, and offline browser verification.
- `Phase 3`: Advanced Mode cost behavior, debt safety, ROIC benchmark, sensitivity, reinvestment, and profit-to-cash logic.
- `Phase 4`: shared finance engine for unit economics, working-capital-style cash timing, annuity payment logic, ROIC, WACC, NPV, IRR, terminal value, sensitivity, and growth retention.
- `Phase 5`: Expert Mode dashboard, backend validation, parity fixtures, WACC/ROIC/return-spread outputs, valuation view, capital-structure module, and Expert PDF reporting.
- `Phase 6`: Simple, Advanced, and Expert save/report paths now have explicit capability gates. Simple remains browser-first. Advanced keeps local preview/save while adding paid-account cloud save/load. Expert uses backend-authoritative validation and PDF generation for paid online users, with local fallback when needed.
- `Phase 7`: automated unit/build coverage has been expanded across all three modes, with Simple offline browser coverage and explicit report-source/status messaging for Expert.

Important product constraint:

- The planner is not controlled by Vuna admin. Expert report benchmarks and report-source behavior are embedded in the planner code/backend validation path, not managed through an admin dashboard.

Remaining non-code work:

- Run field validation with real small-business users and financially literate reviewers.
- Review production payment/subscription provisioning so `planner_tier = paid` is assigned correctly by the wider VunaBooks account system.
- Do a final deployed-environment smoke test on Vercel plus the Railway backend before public rollout.
