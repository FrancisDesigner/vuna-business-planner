# VunaBusinessPlanner — Product Integrity Audit Report

**Audit date**: 2026-05-05
**Auditor**: Product Integrity Director
**Scope**: Full application — Simple Mode, Advanced Mode, Expert Mode
**Verdict**: NEEDS WORK

---

## 1. Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript (Vite 6 build tool)
- **UI**: Custom CSS with Tailwind CSS v4 (via `@tailwindcss/vite`), shadcn/ui component primitives (Card, Button, Input, Label, Dialog, Tabs, Switch, Slider, Progress, Separator, Textarea)
- **Animations**: Motion (framer-motion wrapper) for step transitions; tw-animate-css for micro-animations
- **Forms**: react-hook-form + @hookform/resolvers + Zod v4 schema validation
- **Charts**: Recharts (LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer)
- **PDF**: jsPDF + jspdf-autotable + html2canvas for generation; backend Railway FastAPI for premium PDF
- **PWA**: vite-plugin-pwa for installability

### Backend
- **API**: Express.js (Node) for local fallback; Railway FastAPI (Python) for validated Expert outputs, premium PDF, auth, and plan storage
- **Auth**: VunaBooks planner auth tokens (JWT-based), stored in localStorage
- **Database**: Plan storage via plannerApi (Railway backend), localStorage for draft recovery

### Key Libraries
- **@google/genai**: Google AI integration (likely for insights/reports)
- **canvas-confetti**: Celebration animations on successful plan completion
- **lucide-react**: Icon library
- **recharts**: Data visualization

### Deployment Architecture
- **Vercel**: Static frontend (Simple Mode runs fully offline/browser-only)
- **Railway**: FastAPI backend (Expert Mode validation, premium PDF, auth, saved plans)
- **Phase 0 rule**: Simple Mode must work without Railway

---

## 2. Simple Mode

### Purpose
Small-business owner or operator. Primary question: "Is this business making money and will it have enough cash to keep going?"

### Screens (4-step wizard)
1. **Step 1 — Entry**: Business type selector (manufacturing, retail, service, agriculture), activity description, sales per week, customer payment timing, business status (new/existing), growth ambition, business purpose
2. **Step 2 — Buckets**: Seed/ingredient costs, foundation costs (one-time vs monthly), fuel costs, protection costs, stock refill frequency, batch yield
3. **Step 3 — Strategy**: Price selection (Low/Medium/High options), demand assumptions, price impact simulator
4. **Step 4 — Vision**: Results summary, PDF download, share via WhatsApp/SMS, save to account (gated), premium PDF (gated)

### Key Calculations

**WACM — Weighted Average Contribution Margin** (per product line):
```
weeklyRevenue = Σ(sellingPrice_i × unitsPerWeek_i)
weeklyVariableCosts = Σ(variableCostPerUnit_i × unitsPerWeek_i)
weeklyTotalContribution = weeklyRevenue - weeklyVariableCosts
totalUnitsPerWeek = Σ(unitsPerWeek_i)
wacm = weeklyTotalContribution / totalUnitsPerWeek
cmRatio = wacm / weightedAvgSellingPrice
```

**Break-even**:
```
monthlySales = totalUnitsPerWeek × (52/12)
monthlyRevenue = wacm × monthlySales [WRONG — should be weightedAvgSellingPrice × monthlySales]
monthlyVariableCosts = weightedAvgVariableCost × monthlySales
monthlyProfit = monthlyRevenue - monthlyVariableCosts - totalMonthlyFixedCosts

operatingBreakEvenUnits = totalMonthlyFixedCosts / wacm
operatingBreakEvenWeeks = operatingBreakEvenUnits / totalUnitsPerWeek
investmentPaybackMonths = totalStartupMoney / monthlyProfit  (if profitable)
```

**Cash position** (payment timing adjusted):
```
cashCollectionRate:
  immediate → 1.0
  within_week → 0.85
  mixed → 0.70
  within_month → 0.50

estimatedCashCollected = monthlyRevenue × cashCollectionRate
estimatedCashPosition = estimatedCashCollected - monthlyVariableCosts - totalMonthlyFixedCosts
```

**Safe take-home / safety buffer**:
```
safetyBufferAmount = monthlyProfit × 0.20  (if profit > 0)
safeTakeHomeAmount = monthlyProfit - safetyBufferAmount
```

**Agriculture mode** (separate path):
```
effectiveRevenue = (expectedYield × expectedPrice) + byProductRevenue
grossMargin = effectiveRevenue - totalVariableCosts
grossMarginPerLandUnit = grossMargin / landArea
breakEvenYield = totalVariableCosts / expectedPrice
breakEvenPricePerUnit = totalVariableCosts / expectedYield
```

### Bugs Found

**BUG-1 (Simple — calculator.ts:589)**: `totalInitialInvestment` is set to `sharedSummary.totalStartupMoney`, but this is used to compute `projectedHarvest12Months = (monthlyOperatingProfit * 12) - totalInitialInvestment`. However, `totalStartupMoney = startupCostsEntered + firstStockCost` where `firstStockCost = monthlyVariableCosts`. The startup investment should be the actual capital outlay, not recurring stock costs. This double-counts working capital.

**BUG-2 (Simple — calculator.ts:588)**: `monthlySales = sharedSummary.monthlySales || (totalUnitsPerWeek * WEEKS_PER_MONTH)`. If `sharedSummary.monthlySales` is falsy (0 or undefined), this falls back to `totalUnitsPerWeek * WEEKS_PER_MONTH`. But `sharedSummary.monthlySales` is computed from `computeWACM` which can legitimately return 0 if no products have unitsPerWeek > 0. The fallback is correct, but it masks that the calculation might be running with stale/empty product data.

**BUG-3 (Simple — WACM edge case)**: `computeWACM` filters to `items.filter(item => item.unitsPerWeek > 0 && item.sellingPrice > 0)`. Items with 0 units or 0 price are silently dropped. If all items are filtered out, `wacmResult` returns zeroed values. The `hasValidMix` check catches this, but then the fallback contribution margin formula `(selectedPrice - weightedAvgVariableCost)` uses `selectedPrice = fallbackSelectedPrice` and `weightedAvgVariableCost = fallbackVariableCostPerUnit`, both of which may be 0 — resulting in a 0 contribution margin.

---

## 3. Advanced Mode

### Purpose
Growing small-business owner or operational manager. Primary question: "Is this business efficient, safe with debt, and worth the capital tied up in it?"

### Screens
Single-page form with 7 sections (profile, variable costs, fixed costs, operating costs, financing, tax, sales/pricing), then unlock-and-reveal results. Sections navigable via sticky tab bar. Results gated behind local unlock (free) or cloud save (paid).

### Key Calculations

**Unit Economics**:
```
unitBaseCost = totalVariableInputCost / batchYield
```

**Cost Behavior Classification**:
```
monthlyFixedBaseCosts = monthlyRent + monthlySalaries + monthlyOtherFixed + fixedOperatingCosts
mixedFixedShare = mixedOperatingCosts × 0.5
mixedVariableShare = mixedOperatingCosts × 0.5
monthlyFixedOps = monthlyFixedBaseCosts + mixedFixedShare
monthlyOperatingVariableCostsAtBaseSales = variableOperatingCosts + mixedVariableShare
operatingVariableCostPerUnit = monthlyOperatingVariableCostsAtBaseSales / monthlyUnits
```

**Depreciation** (straight-line):
```
annualDepreciation = (equipmentCost - salvageValue) / usefulLifeYears
```

**Depreciation** (declining balance):
```
rate = 2 / usefulLifeYears
eachYearDepreciation = bookValue × rate  (capped at remaining life)
```

**Loan Amortization** (annuity formula):
```
monthlyRate = annualInterestRate / 12
monthlyPayment = (principal × monthlyRate × (1+monthlyRate)^term) / ((1+monthlyRate)^term - 1)
```

**Monthly Profit Snapshot**:
```
profitBeforeTax = monthlyRevenue - monthlyVariableCosts - monthlyFixedCosts - depreciation - interestCost
taxAmount = max(0, profitBeforeTax × (taxRate / 100))
netProfit = profitBeforeTax - taxAmount
```

**Profit-to-Cash Bridge**:
```
cashFromOperations = netProfit + depreciation
cashPosition = cashFromOperations - principalRepaymentThisMonth
```

**Interest Coverage Ratio**:
```
annualOperatingProfitBeforeInterest = (monthlyRevenue - monthlyVariableCosts - monthlyFixedOps - monthlyDepreciation) × 12
interestCoverageRatio = annualOperatingProfitBeforeInterest / annualInterestCost  (null if no debt)
```

**ROIC**:
```
annualNopat = annualOperatingProfitBeforeInterest × (1 - taxRate/100)
roic = annualNopat / investedCapital  (null if investedCapital = 0)
```

**Return vs Benchmark**:
```
benchmarkRate = 14% (DEFAULT_ADVANCED_BENCHMARK_RATE)
spread = roic - benchmarkRate
status: spread ≥ 3% → strong, spread ≥ 0% → watch, spread < 0% → weak
```

**Break-even**:
```
effectiveContributionMargin = sellingPrice - unitBaseCost - operatingVariableCostPerUnit
totalAnnualFixed = ((monthlyFixedOps + loanInterestThisMonth) × 12) + annualDepreciation
breakEvenUnits = totalAnnualFixed / effectiveContributionMargin
weeksToBreakEven = breakEvenUnits / unitsPerWeek
```

**Sensitivity Matrix**: 3 revenue multipliers (0.8, 1.0, 1.2) × 2 cost multipliers (1.0, 1.15) = 6 scenarios. Classified as profit/thin/loss.

**Growth Retention Guidance**:
```
estimatedGrowthReinvestment = monthlyVariableCosts × (targetGrowthPercent / 100)
recommendedRetention = max(safetyBufferAmount, estimatedGrowthReinvestment)
cashSafeTakeHome = max(monthlyCashPosition - recommendedRetention, 0)
fundingGap = max(recommendedRetention - monthlyCashPosition, 0)
status: base_only | funded | tight | shortfall
```

### Bugs Found

**BUG-4 (Advanced — advancedCalculator.ts:244-246)**: The break-even calculation uses `effectiveContributionMargin` which is `sellingPrice - unitBaseCost - operatingVariableCostPerUnit`. However, the formula `totalAnnualFixed / effectiveContributionMargin` gives units needed to recover total fixed costs. This is correct for operating break-even, but it conflates fixed cost recovery (which includes depreciation and interest) with operating variable margin — which is the right definition. However, `operatingVariableCostPerUnit` is derived from `monthlyOperatingVariableCostsAtBaseSales / monthlyUnits` where `monthlyUnits = unitsPerWeek × 4.33`. If the business has no sales (`unitsPerWeek = 0`), this becomes division by zero. The code checks `state.unitsPerWeek || 1` in the fallback, so it returns Infinity rather than NaN, but the break-even display will show Infinity.

**BUG-5 (Advanced — advancedCalculator.ts:176-191)**: The `simpleSummary` is computed by calling `calculateSharedSimpleSummary` with a single line item (the primary product). However, `calculateSharedSimpleSummary` internally calls `computeWACM` which will return valid WACM results. But the Advanced results also include `simpleSummary.weeklyTotalContribution` used in the timeline data. The problem: `calculateSharedSimpleSummary` is designed for Simple Mode with multi-product support and startup cost handling. In Advanced mode, the `startupCostsEntered` passed is `state.equipmentCost + (monthlyFixedOps * 3)`, which conflates operating fixed costs with startup investment. This doesn't affect the financial outputs but creates semantic confusion.

**BUG-6 (Advanced — advancedCalculator.ts:325-327)**: The 52-week timeline data uses `cumulativeCosts += (unitBaseCost * state.unitsPerWeek) + (monthlyFixedOps / 4.33) + (monthlyLoanPayment / 4.33)`. This assumes fixed costs are spread evenly across weeks, which is fine for a simplified model. However, the variable cost per week is `unitBaseCost * state.unitsPerWeek` — which uses the same unitsPerWeek every week without applying any growth or scenario multiplier. The timeline is always the base scenario, even if the user has changed inputs since last calculation.

---

## 4. Expert Mode

### Purpose
Finance-literate operator, investor, analyst, or advisor. Primary question: "Does this business clear its cost of capital and what is the investment worth?"

### Screens
Two-tab interface: Expert Validator (main form) and Rollout Waitlist. The form sections are: case name, industry, annual revenue (optional), initial investment, discount rate OR capital structure toggle, 5-year annual cash flows, capital structure builder (debt amount, equity amount, cost of debt, cost of equity, annual operating profit after tax), terminal value toggle (long-term growth rate).

### Key Calculations

**WACC**:
```
totalCapital = debtAmount + equityAmount
debtWeight = debtAmount / totalCapital
equityWeight = equityAmount / totalCapital
wacc = (debtWeight × (costOfDebtPercent / 100)) + (equityWeight × (costOfEquityPercent / 100))
```

**Terminal Value** (Growing Perpetuity):
```
terminalValue = (finalYearCashFlow × (1 + longTermGrowthRate)) / (discountRate - longTermGrowthRate)
// Throws if discountRate ≤ longTermGrowthRate
```

**NPV**:
```
cashFlows = [-initialInvestment, year1, year2, ..., year5 (+ terminalValue in year 5)]
npv = Σ(cashFlows[i] / (1 + discountRate)^i)  for i = 0 to 5
```

**IRR** (Newton-Raphson iterative):
```
cashFlows = [-initialInvestment, year1+terminalValue, year2, ..., year5+terminalValue]
IRR found when npv(cashFlows, rate) ≈ 0
Epsilon: 0.000001, Max iterations: 200
Derivative-based Newton-Raphson with guardrails for non-convergence
```

**ROIC**:
```
roic = annualOperatingProfitAfterTax / investedCapital
```

**Return Spread**:
```
returnSpread = roic - wacc
```

**Capital Structure Insights** (separate module):
```
currentDebtShare = debtAmount / totalCapital
currentCoverageRatio = annualOperatingProfitAfterTax / annualInterestCost
currentRating = syntheticRatingFromCoverage(currentCoverageRatio)  // BBB/BB/B etc.
// Optimal debt share: sweep from 0% to 100% debt, compute WACC at each point
// Optimal = debt share with lowest WACC
curve: array of {debtShare, wacc, debtCostPercent} for 0%, 10%, ..., 100%
```

### Backend Validation
- Expert Mode requires Railway FastAPI for authoritative NPV/IRR/WACC/terminal value
- Browser computes a preview (TypeScript), backend returns the authoritative result
- Staleness tracking: `validationSignature` tracks form state; `resultIsStale` triggers re-validation prompt when inputs change after last Python run
- PDF generation has two paths: backend-authoritative (paid, online) or local fallback (browser jsPDF)

### Bugs Found

**BUG-7 (Expert — sharedFinanceEngine.ts:518-543)**: The IRR Newton-Raphson implementation uses `initialGuessPercent = 15` as default. If the actual IRR is very far from 15%, convergence may require many iterations or may fail. The implementation returns `null` after 200 iterations without a better fallback guess. For cash flow patterns common in African small-business investments (high initial investment, modest early cash flows), the default guess of 15% may be far from the actual IRR, increasing failure probability.

**BUG-8 (Expert — sharedFinanceEngine.ts:519)**: `rate = (input.initialGuessPercent ?? 15) / 100` — the variable is named `rate` but holds the result of dividing by 100. In line 536 `nextRate = rate - (npv / derivative)`, `rate` is already a decimal (e.g., 0.15), not a percent. This is correct but the naming is confusing.

**BUG-9 (Expert — expertPlanner.ts:187-250)**: The `calculateExpertFinanceCase` function computes `discountRatePercent` from either the direct `discount_rate_percent` input OR from WACC (`wacc * 100`). However, WACC is only computed when `useCapitalStructure = true`. If the user does NOT use capital structure and enters no `discount_rate_percent`, the fallback `wacc * 100` will be `null * 100 = NaN`. The code checks `discountRatePercent !== null` before calling NPV, so NPV will be null — which is correct — but the behavior may be surprising to users who expect a default discount rate.

---

## 5. Cross-Mode Issues

### ISSUE-1: simpleSummary double-counting in Advanced
Advanced calculator calls `calculateSharedSimpleSummary` internally but passes `startupCostsEntered = state.equipmentCost + (monthlyFixedOps * 3)`. This is an operating cost, not a startup investment, so `totalStartupMoney = startupCostsEntered + firstStockCost` in simpleSummary will be inflated. However, Advanced doesn't expose `totalStartupMoney` or `investmentPaybackMonths` in its output interface — those belong to Simple Mode. So this is an internal inconsistency that doesn't leak to users of Advanced Mode.

### ISSUE-2: Shared Finance Engine functions called with inconsistent units
- `calculateInterestCoverageRatio(annualOperatingProfit, annualInterestCost)` — annual figures
- `calculateMonthlyProfitSnapshot` — monthly figures
- Advanced calculator mixes both in the same computation chain. This is correct internally but creates a documentation gap — there is no explicit comment noting the unit switching.

### ISSUE-3: WACM negative margin warnings
`computeWACM` generates warnings for items where `sellingPrice < variableCostPerUnit`. These warnings flow into `simpleSummary.warnings` and from there into the `CalculationResult.warnings` array. However, there is no UI element in `Wizard.tsx` that specifically surfaces per-product margin warnings differently from system warnings. All warnings are collapsed into a flat list.

### ISSUE-4: Advanced results don't include sharedPlannerOutputs in the local calculation path
In `advancedCalculator.ts:289-310`, `sharedPlannerOutputs` is built from `buildSharedPlannerOutputs()`. However, if Advanced is unlocked locally (not via backend save), the `AdvancedCalculationResult` object returned to the component does include `sharedPlannerOutputs` at line 371. The AdvancedResults component receives `results` but doesn't consume `results.sharedPlannerOutputs` — it uses the raw numeric fields directly. This means the translation layer (mode-specific labels, explanations, warning thresholds from plannerModel) is not being applied to Advanced output display.

### ISSUE-5: Phase 1 spec defines plannerModel.ts but implementation is incomplete
The spec (`phase1_shared_planner_model_spec.md`) defines `PLANNER_METRIC_REGISTRY` and `PLANNER_MODE_DEFINITIONS` in `plannerModel.ts` with mode-specific presentation metadata. However:
- Simple Mode uses raw fields from `CalculationResult` directly, not `buildSharedPlannerOutputs`
- Advanced Mode builds `sharedPlannerOutputs` but doesn't use it in rendering
- Expert Mode has its own separate result display logic that reads raw fields from `ExpertValidationResult`
- The metric registry is defined but not wired to actual display in any mode

This means the "translation layer" described in FR-8 exists as code but is not actually used to render any output in the product.

---

## 6. Missing States Inventory

| Screen | Empty | Loading | Error | Success | Disabled | Offline |
|--------|-------|---------|-------|---------|----------|---------|
| Simple Step 1 | ⚠️ (shows defaults, no prompt to fill) | N/A | N/A | ✅ (next step enabled) | N/A | ✅ |
| Simple Step 2 | ⚠️ (shows empty buckets, no product guidance) | N/A | N/A | ✅ | N/A | ✅ |
| Simple Step 3 | ⚠️ (price options disabled until items exist) | N/A | N/A | ✅ | ✅ | ✅ |
| Simple Step 4 | ✅ (shows zero-state results with guidance) | N/A | ⚠️ (PDF error shows generic) | ✅ | N/A | ⚠️ (save/load disabled with message) |
| Advanced Form | ✅ (shows all 0s with hints) | N/A | ⚠️ (schema errors inline) | ✅ (unlock button) | N/A | ⚠️ (save disabled) |
| Advanced Results | ✅ (shows empty-state prompt) | N/A | ⚠️ (load error is toast only) | ✅ | N/A | ✅ (local generation still works) |
| Expert Validator | ✅ (shows defaults, validation stale prompt) | ✅ | ✅ | ✅ | N/A | ✅ (local fallback available) |
| Expert Results | ✅ (shows placeholder) | ✅ | ✅ | ✅ | N/A | ⚠️ (PDF requires backend) |

---

## 7. Orphan Screens

None found. All navigable screens are reachable from the main App.

---

## 8. Dead-End Flows

- **Advanced → unlock without save**: If user unlocks Advanced preview, closes browser, returns — local form state restores but `results` state is lost. The UI will show the form but not the results until re-unlocking. The auto-save mechanism only saves the form JSON, not the computed results. This is documented behavior but could be clearer.
- **Expert → save without validation**: `handleSaveCase` requires `result && !resultIsStale`. If user clicks save immediately without running validation, they get a warning. This is correct but the warning is a toast, not an inline block.

---

## 9. Shipping Readiness Score

**5 / 10**

**Rationale**: Simple Mode is functional and stable for offline use. Advanced Mode has a clear unlock-then-results flow. Expert Mode has a complete validator with backend authority model. However, the Phase 1 shared model spec exists as code (`plannerModel.ts`) but is not actually wired into the display layer of any mode — the translation layer (FR-8 through FR-10) is defined but not implemented in practice. The WACM unit-confusion bug (BUG-1) creates real harm: `projectedHarvest12Months` and `projectedHarvestYear2` will be wrong for businesses with significant initial stock investment.

---

## 10. Top 3 Things to Fix First

1. **BUG-1 — Simple calculator.ts:589**: Fix `projectedHarvest12Months` calculation. `totalInitialInvestment` should be actual startup capital (equipment, one-time costs, first month stock), not `totalStartupMoney` which includes recurring `firstStockCost` already counted in monthly variable costs. The fix: compute `actualStartupCapital = startupCostsEntered` (one-time only) or compute it as `totalFoundationOneTime + totalSeed + firstStockCost` depending on business type, then use that for the payback/projections.

2. **ISSUE-4 — Advanced Results not using sharedPlannerOutputs**: Wire `AdvancedResults` to consume `results.sharedPlannerOutputs` from the plannerModel translation layer. This requires adding a shared display component or adapter that reads from the metric registry and renders with mode-appropriate labels and explanations. Without this, the Phase 1 spec's FR-8 and FR-9 are unimplemented.

3. **BUG-9 — Expert discount rate fallback is NaN**: In `calculateExpertFinanceCase`, when `useCapitalStructure = false` and no `discount_rate_percent` is entered, `discountRatePercent` becomes `null`. NPV and IRR correctly return null, but the user sees no indication that their case is incomplete — the verdict still shows "Below hurdle rate" or "Value appears to be created" based on whatever partial result exists. Add an explicit guard: if `discountRatePercent === null`, require the user to enter either a discount rate OR enable capital structure before running validation.

---

## Appendix: Key File Map

| File | Purpose |
|------|---------|
| `frontend/src/lib/calculator.ts` | Simple Mode calculation engine |
| `frontend/src/lib/advancedCalculator.ts` | Advanced Mode calculation engine |
| `frontend/src/lib/expertPlanner.ts` | Expert Mode form state, validation payload, result processing |
| `frontend/src/lib/simpleSummary.ts` | Shared calculation helper (WACM aggregation, break-even, safe take-home) |
| `frontend/src/lib/wacm.ts` | Weighted Average Contribution Margin per product line |
| `frontend/src/lib/sharedFinanceEngine.ts` | Pure finance primitives: NPV, IRR, WACC, depreciation, loan amortization, sensitivity matrix |
| `frontend/src/lib/plannerModel.ts` | Phase 1 spec: metric registry, mode definitions, translation layer (not yet wired to display) |
| `frontend/src/lib/plannerApi.ts` | Backend transport: validate, save, load, premium PDF |
| `frontend/src/lib/deployment.ts` | Capability gating logic |
| `frontend/src/components/Wizard.tsx` | Simple Mode UI orchestration |
| `frontend/src/components/AdvancedWizard.tsx` | Advanced Mode form and results |
| `frontend/src/components/ExpertMode.tsx` | Expert Mode validator and dashboard |
| `frontend/src/components/AdvancedResults.tsx` | Advanced Mode results display |
| `docs/phase1_shared_planner_model_spec.md` | Canonical Phase 1 spec (binding contract) |