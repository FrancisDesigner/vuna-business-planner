# Phase 1 Shared Planner Model Specification

## 1. Title and Metadata

- Title: `VunaBusinessPlanner Phase 1 - Shared Planner Model Across Simple, Advanced, and Expert Modes`
- Author: Codex
- Date: 2026-04-22
- Status: Draft
- Reviewers: Francis Kumakech, VunaBooks product/engineering stakeholders
- Related docs:
  - `docs/vunaplan_upgrade_spec.md`
  - `docs/vunaplan_upgrade_execution_plan.md`
  - `PHASE-0-DEPLOYMENT-CONTRACT.md`
  - `frontend/docs/ADVANCED_AND_EXPERT_MODES.md`

## 2. Context

VunaBusinessPlanner already has a usable browser-based `Simple Mode`, a partially implemented `Advanced Mode`, and an `Expert Mode` that is still mostly a waitlist. The upgrade spec is clear that the product must not become three disconnected apps. It must become one financial engine that answers the same business truth at three levels of depth.

The business priority is to serve small businesses first without losing the path to investor-grade analysis later. `Simple Mode` is not only for kiosks. It must cover a broader small-business base including kiosks, vegetable sellers, retailers, small manufacturers such as bakers and peanut-paste makers, small service businesses, and small wholesalers. That means Phase 1 is not a UI polish phase. It is a product-model phase that defines what each mode means, which metrics are shared, how those metrics are translated for different users, and which Expert features are truly in scope.

The current codebase already reflects some of this structure. `Simple Mode` computes in-browser and must remain offline-safe. `Advanced Mode` already has forms, scenario logic, and schedules. `Expert Mode` does not yet have the underlying finance engine needed for WACC, return spread, valuation, or investment appraisal. Without a shared spec, implementation will drift into duplicate formulas, inconsistent outputs, and mode-specific hacks.

Agribusiness is related but different enough to deserve its own future planning track. Small-scale, medium-scale, and large-scale farming workflows should be treated as a future dedicated expansion rather than forced prematurely into the generic small-business assumptions of Phase 1.

Phase 1 therefore exists to create a binding product-and-technical contract before more code is written. This spec defines the shared planner model, mode boundaries, terminology rules, internal data contracts, acceptance criteria, and explicit exclusions.

## 3. Functional Requirements

### Shared Product Model

- FR-1: The planner MUST define three supported analysis modes: `simple`, `advanced`, and `expert`.
- FR-2: All three modes MUST derive their outputs from a shared financial metric registry rather than separate hand-built result formulas per mode.
- FR-3: The shared metric registry MUST support, at minimum, revenue, variable costs, fixed costs, profit, cash position, invested capital, debt cost, benchmark rate, and reinvestment/distribution amounts.
- FR-4: A single business scenario entered into different modes MUST NOT produce contradictory values for the same underlying metric after normalizing for available inputs and time horizon.

### Mode Definitions

- FR-5: `Simple Mode` MUST optimize for small-business owners and operators using plain-language guidance, minimal input burden, and browser-only/offline-safe execution.
- FR-5a: `Simple Mode` MUST be framed broadly enough to serve kiosks, vegetable sellers, retailers, small manufacturers, small service businesses, and small wholesalers without being branded as kiosk-only.
- FR-6: `Advanced Mode` MUST optimize for growing small businesses by exposing richer unit economics, debt safety, return, and sensitivity outputs without requiring finance-professional vocabulary.
- FR-7: `Expert Mode` MUST optimize for finance-literate users and MUST support investment appraisal, cost-of-capital comparison, valuation framing, and benchmarked outputs.

### Translation Layer

- FR-8: Every shared metric displayed to a user MUST support mode-specific presentation metadata:
  - user-facing label
  - explanation copy
  - warning thresholds
  - display format
  - whether the metric is hidden, summarized, or fully shown in each mode
- FR-9: The planner MUST distinguish between a metric's numeric definition and its mode-specific wording.
- FR-10: The planner MUST support at least one plain-language explanation for any metric shown in `simple` or `advanced` mode.

### Profit and Cash Rules

- FR-11: The shared model MUST treat `profit` and `cash position` as separate first-class outputs.
- FR-12: `Simple Mode` MUST support a cash-timing input that captures when customers pay.
- FR-13: The shared model MUST allow output framing that explains why a business can show profit while lacking enough cash to restock or operate.

### Expert Financial Scope Decisions

- FR-14: `Expert Mode` MUST include `NPV` and `IRR` in scope for investment appraisal.
- FR-15: `Expert Mode` MUST include a terminal-value-capable discounted cash flow path using a long-term growth assumption.
- FR-16: The Phase 1 shared model MUST support `annuity` calculations as an internal financial primitive for level-payment or level-cash-flow analysis, but `annuity` MUST NOT be treated as a separate top-level user mode or standalone headline module in v1.
- FR-17: The planner MUST model `dividends` for target users as `owner distribution` or `take-home` versus `reinvestment`, not as public-company dividend-policy analysis.
- FR-18: `Expert Mode` MUST support a distribution decision framed as `reinvest`, `retain`, or `take out`, and MUST NOT require public-equity dividend terminology for private-business users.

### Shared Finance Engine Boundaries

- FR-19: The shared model MUST define finance-engine modules for:
  - unit economics
  - fixed and variable cost structure
  - working capital or cash timing
  - debt service and interest coverage
  - invested capital and return on invested capital
  - benchmark or hurdle rate
  - WACC inputs for expert analysis
  - NPV, IRR, and terminal value
  - distribution versus reinvestment analysis
- FR-20: The shared model MUST separate pure calculations from UI concerns, storage concerns, and backend transport concerns.

### Capability and Deployment Rules

- FR-21: The shared model MUST preserve the Phase 0 rule that `Simple Mode` calculations remain browser-safe and backend-optional.
- FR-22: The shared model MUST allow `Advanced` and `Expert` features to be gated by auth, paid tier, or backend availability without breaking shared metric definitions.
- FR-23: The shared model MUST support explicit capability states for anonymous, signed-in free, and signed-in paid users.

### Implementation Mapping

- FR-24: The Phase 1 deliverable MUST include a canonical internal contract for mode definitions, metric definitions, calculation outputs, and explanation metadata.
- FR-25: The Phase 1 deliverable MUST identify which current code paths can be reused and which should be refactored behind the shared model.

## 4. Non-Functional Requirements

- NFR-1: `Simple Mode` calculations MUST remain executable without a network connection after the frontend bundle is loaded.
- NFR-2: Core shared calculations for a typical single-business scenario SHOULD complete in under 100 ms on a mid-range mobile device once inputs are available.
- NFR-3: The shared metric registry MUST be deterministic. The same input payload MUST return the same numeric outputs.
- NFR-4: The translation layer MUST support localization-ready copy separation so numeric formulas are not embedded directly inside display strings.
- NFR-5: The shared model MUST be testable through pure function inputs and outputs without requiring DOM rendering.
- NFR-6: Expert finance utilities MUST reject invalid combinations such as discount rate less than or equal to terminal growth rate for growing perpetuity calculations.
- NFR-7: Capability gating MUST fail with product-language messages rather than raw transport or stack errors.
- NFR-8: Phase 1 definitions MUST be compatible with the current dual-deployment architecture:
  - Vercel static frontend for browser-safe flows
  - Railway FastAPI backend for authenticated and premium flows

## 5. Acceptance Criteria

- AC-1 [FR-1, FR-5, FR-6, FR-7]
  - Given the Phase 1 spec is reviewed
  - When a reviewer checks supported product modes
  - Then the spec explicitly defines `simple`, `advanced`, and `expert` with separate user goals and usage boundaries.

- AC-1a [FR-5a]
  - Given a reviewer checks the `Simple Mode` audience definition
  - When they inspect the Phase 1 spec
  - Then they find that `Simple Mode` is positioned for small businesses broadly rather than kiosks only.

- AC-2 [FR-2, FR-3, FR-8, FR-24]
  - Given a reviewer inspects the shared model section
  - When they look for the planner's source of truth
  - Then they find a canonical metric registry that covers revenue, cost, profit, cash, capital, debt, benchmark, and distribution metrics.

- AC-3 [FR-4]
  - Given the same business facts are entered into multiple modes
  - When a developer maps those facts to shared metrics
  - Then the spec requires numeric consistency for equivalent underlying metrics and forbids contradictory formulas by mode.

- AC-4 [FR-11, FR-12, FR-13]
  - Given a kiosk owner has delayed customer payments
  - When the planner calculates results
  - Then the spec requires profit and cash to be modeled separately and explained separately.

- AC-5 [FR-14, FR-15, FR-16]
  - Given a reviewer checks Expert-mode investment analysis scope
  - When they inspect the finance scope decisions
  - Then `NPV` and `IRR` are explicitly included, terminal value is included, and `annuity` is defined as a supporting calculation primitive rather than a top-level module.

- AC-6 [FR-17, FR-18]
  - Given a reviewer checks whether Expert mode includes dividends
  - When they inspect the distribution logic
  - Then the spec frames the feature as private-business `owner distribution versus reinvestment` rather than public-company dividend analysis.

- AC-7 [FR-19, FR-20]
  - Given an engineer begins implementation planning
  - When they inspect engine responsibilities
  - Then they can identify which modules belong in pure finance logic and which belong in UI/gating layers.

- AC-8 [FR-21, FR-22, FR-23, NFR-1, NFR-7, NFR-8]
  - Given the deployment contract remains in force
  - When a reviewer checks capability and offline rules
  - Then the spec preserves browser-only simple calculations and separates capability gating from formula definitions.

- AC-9 [FR-25]
  - Given the codebase already contains `calculator.ts`, `advancedCalculator.ts`, and mode-specific components
  - When an engineer reads the spec
  - Then they can identify reuse paths and refactor targets instead of rebuilding the planner from scratch.

- AC-10 [NFR-5, NFR-6]
  - Given a test engineer prepares unit tests for the finance engine
  - When they read the spec
  - Then the spec gives enough contract detail to write pure-function tests, including invalid Expert calculation cases.

## 6. Edge Cases

- EC-1: If a user has profit but customer payments are delayed, the planner must allow cash-risk messaging without forcing the business into a loss state.
- EC-2: If loan amount is zero, debt-service and interest-coverage outputs must resolve cleanly without divide-by-zero or misleading warnings.
- EC-3: If invested capital is zero or missing, ROIC-style outputs must return a handled `not enough information` state rather than an invented percentage.
- EC-4: If discount rate is less than or equal to terminal growth rate, Expert DCF calculations must block terminal value computation and explain the invalid assumption.
- EC-5: If a user is offline, `Simple Mode` calculations must still run and capability messages must reflect offline limitations without disabling core planning.
- EC-6: If the backend is unavailable, shared metrics must remain valid while save, premium, or expert-gated actions show product-language gating.
- EC-7: If a business has no debt but strong profits, the planner must not invent WACC debt-weight behavior beyond available inputs.
- EC-8: If a business uses mixed costs, the shared model must support a mixed classification rather than forcing every cost into purely fixed or purely variable.
- EC-9: If a user wants owner take-home guidance in `simple` or `advanced` mode, the planner must use private-business wording and avoid capital-markets terms such as dividend yield.
- EC-10: If a future user is primarily a farmer or agribusiness operator, the product must avoid pretending generic small-business assumptions already cover agricultural seasonality, harvest cycles, or farm-specific cash timing before the agribusiness track is designed.

## 7. API Contracts

Phase 1 introduces internal product contracts first. No new public HTTP API is required to approve this phase. Existing backend endpoints for waitlist, premium PDF, and future saved-plan operations remain unchanged in this spec.

### 7.1 Internal Type Contracts

```ts
export type PlannerMode = 'simple' | 'advanced' | 'expert';

export type PlannerMetricKey =
  | 'revenue'
  | 'variable_costs'
  | 'fixed_costs'
  | 'profit'
  | 'cash_position'
  | 'invested_capital'
  | 'debt_cost'
  | 'benchmark_rate'
  | 'interest_coverage'
  | 'roic'
  | 'wacc'
  | 'return_spread'
  | 'npv'
  | 'irr'
  | 'terminal_value'
  | 'reinvestment_need'
  | 'owner_distribution';

export interface PlannerMetricDefinition {
  key: PlannerMetricKey;
  formulaSource: 'shared_engine';
  dependsOn: PlannerMetricKey[];
  displayByMode: Partial<Record<PlannerMode, PlannerMetricPresentation>>;
  hiddenByDefaultInModes?: PlannerMode[];
}

export interface PlannerMetricPresentation {
  label: string;
  shortExplanation: string;
  warningThresholds?: Array<{
    severity: 'info' | 'warning' | 'danger';
    comparator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
    value: number;
    message: string;
  }>;
  valueFormat: 'currency' | 'percent' | 'ratio' | 'integer' | 'text';
}

export interface SharedPlannerInputs {
  currencyCode: string;
  countryCode?: string;
  paymentTiming?: 'immediate' | 'within_week' | 'within_month' | 'mixed';
  totalRevenue?: number;
  variableCosts?: number;
  fixedCosts?: number;
  investedCapital?: number;
  loanAmount?: number;
  annualInterestRate?: number;
  annualDebtService?: number;
  targetGrowthRate?: number;
  ownerDistributionPreference?: 'reinvest' | 'balanced' | 'take_home';
}

export interface SharedPlannerOutputs {
  metrics: Partial<Record<PlannerMetricKey, number | null>>;
  explanations: Partial<Record<PlannerMetricKey, string>>;
  warnings: Array<{
    metric: PlannerMetricKey;
    severity: 'info' | 'warning' | 'danger';
    message: string;
  }>;
  unavailableMetrics: PlannerMetricKey[];
}

export interface PlannerModeDefinition {
  mode: PlannerMode;
  primaryUser: string;
  primaryQuestion: string;
  requiredInputs: string[];
  supportedMetrics: PlannerMetricKey[];
  hiddenMetrics: PlannerMetricKey[];
  capabilityRequirements: {
    requiresBackend: boolean;
    requiresAuth: boolean;
    requiresPaidTier: boolean;
  };
}
```

### 7.2 Existing Backend Dependency Contract

```ts
export interface PlannerCapabilityState {
  authState: 'anonymous' | 'signed_in_free' | 'signed_in_paid';
  backendReachable: boolean;
  capability:
    | 'save_plan'
    | 'premium_pdf'
    | 'advanced_mode'
    | 'expert_mode';
  allowed: boolean;
  message: string | null;
}
```

## 8. Data Models

### 8.1 Shared Planner Mode Definition

| Field | Type | Constraints |
|---|---|---|
| `mode` | `PlannerMode` | Required; one of `simple`, `advanced`, `expert` |
| `primaryUser` | `string` | Required |
| `primaryQuestion` | `string` | Required |
| `requiredInputs` | `string[]` | Required; non-null |
| `supportedMetrics` | `PlannerMetricKey[]` | Required |
| `hiddenMetrics` | `PlannerMetricKey[]` | Required; may be empty |
| `capabilityRequirements` | object | Required |

### 8.2 Planner Metric Definition

| Field | Type | Constraints |
|---|---|---|
| `key` | `PlannerMetricKey` | Required; unique |
| `formulaSource` | `'shared_engine'` | Required |
| `dependsOn` | `PlannerMetricKey[]` | Required; may be empty for base inputs |
| `displayByMode` | `Partial<Record<PlannerMode, PlannerMetricPresentation>>` | Required |
| `hiddenByDefaultInModes` | `PlannerMode[]` | Optional |

### 8.3 Planner Metric Presentation

| Field | Type | Constraints |
|---|---|---|
| `label` | `string` | Required |
| `shortExplanation` | `string` | Required |
| `warningThresholds` | array | Optional |
| `valueFormat` | enum | Required; `currency`, `percent`, `ratio`, `integer`, or `text` |

### 8.4 Shared Planner Inputs

| Field | Type | Constraints |
|---|---|---|
| `currencyCode` | `string` | Required |
| `countryCode` | `string` | Optional |
| `paymentTiming` | enum | Optional |
| `totalRevenue` | `number` | Optional; >= 0 |
| `variableCosts` | `number` | Optional; >= 0 |
| `fixedCosts` | `number` | Optional; >= 0 |
| `investedCapital` | `number` | Optional; >= 0 |
| `loanAmount` | `number` | Optional; >= 0 |
| `annualInterestRate` | `number` | Optional; >= 0 |
| `annualDebtService` | `number` | Optional; >= 0 |
| `targetGrowthRate` | `number` | Optional |
| `ownerDistributionPreference` | enum | Optional |

### 8.5 Shared Planner Outputs

| Field | Type | Constraints |
|---|---|---|
| `metrics` | map | Required; keys from `PlannerMetricKey` |
| `explanations` | map | Required; may omit unsupported metrics |
| `warnings` | array | Required |
| `unavailableMetrics` | `PlannerMetricKey[]` | Required |

### 8.6 Current Code Reuse and Refactor Mapping

| Current asset | Status in Phase 1 | Direction |
|---|---|---|
| `frontend/src/lib/calculator.ts` | Reuse and refactor | Keep as the current simple-mode calculation base, but migrate shared outputs behind the future shared metric registry |
| `frontend/src/lib/simpleSummary.ts` | Reuse | Treat as an early shared-summary candidate and expand for profit-versus-cash separation |
| `frontend/src/lib/advancedCalculator.ts` | Refactor | Split into pure finance primitives and advanced-only presentation assembly |
| `frontend/src/lib/wacm.ts` | Reuse | Preserve weighted contribution logic as a unit-economics primitive |
| `frontend/src/components/Wizard.tsx` | Reuse | Keep as simple-mode orchestration while swapping output rendering onto shared definitions |
| `frontend/src/components/AdvancedWizard.tsx` | Reuse | Keep form shell, but rewire result generation to shared calculations plus advanced-only enrichments |
| `frontend/src/components/AdvancedResults.tsx` | Refactor | Replace mode-specific formula assumptions with shared output contracts |
| `frontend/src/components/ExpertWaitlist.tsx` | Replace later | Serves only as temporary Expert placeholder until Phase 5 |
| `frontend/src/lib/deployment.ts` | Reuse | Keep capability gating separate from finance calculations |
| `frontend/src/lib/plannerApi.ts` | Reuse | Preserve backend transport boundaries without coupling transport to the shared finance engine |

## 9. Out of Scope

- OS-1: Phase 1 does NOT implement the full Expert UI. It defines the contract needed to build it.
- OS-2: Phase 1 does NOT add new backend endpoints. It defines internal contracts and capability boundaries first.
- OS-3: Phase 1 does NOT finalize live Uganda benchmark-rate sourcing. It only reserves benchmark-rate support in the shared model.
- OS-4: Phase 1 does NOT add public-company dividend analytics such as dividend yield, payout ratio benchmarking against listed firms, or shareholder-distribution policy modeling.
- OS-5: Phase 1 does NOT create an annuity-specific standalone tool page. Annuity support is internal and may surface only through loan, payment, or investment helpers later.
- OS-6: Phase 1 does NOT introduce Monte Carlo simulation, CAPM beta estimation, multi-factor pricing models, or public capital-markets tooling.
- OS-7: Phase 1 does NOT rewrite all existing calculators immediately. It defines the target contract that later slices must migrate toward.
- OS-8: Phase 1 does NOT change the Phase 0 rule that `Simple Mode` must survive without Railway.
- OS-9: Phase 1 does NOT yet design the dedicated agribusiness planning track for small-scale, medium-scale, or large-scale farming. That work will be specified separately.
