# VunaBusinessPlanner — Advanced Mode Deep Audit Report v2

**Audit date**: 2026-05-05
**Auditor**: Product Integrity Director
**Scope**: Advanced Mode — calculator, UI components, math engine, state management, capability gating
**Verdict**: NEEDS WORK

---

## 1. Overview

Advanced Mode is a single-page financial analysis tool for growing small businesses. It replaces Simple Mode's 4-step wizard with a single scrollable form divided into 7 sections, revealing full results only after an explicit "unlock" action. The calculation engine is separate from the UI (pure TypeScript in `advancedCalculator.ts`) and feeds into `AdvancedResults.tsx` for rendering. The product uses a local unlock mechanism (free) but gates cloud save/load behind the `signed_in_paid` tier.

**Primary user**: Growing small-business owner or operational manager.

**Primary question**: "Is this business efficient, safe with debt, and worth the capital tied up in it?"

**Investment cap**: `investmentGuidanceLimit` per currency (e.g., UGX 50M default). Exceeding this shows a gate screen with option to join Expert waitlist.

---

## 2. Tech Stack

### Architecture Layers

```
AdvancedWizard.tsx (form orchestration)
    ├── react-hook-form + Zod v4 (form state, validation)
    ├── AdvancedResults.tsx (results display)
    └── advancedCalculator.ts (pure calculation engine)
            ├── sharedFinanceEngine.ts (finance primitives)
            ├── simpleSummary.ts (WACM + break-even + safe take-home)
            └── plannerModel.ts (shared metric registry — NOT used in rendering)
```

### Key Libraries

- **react-hook-form** + **@hookform/resolvers** + **Zod v4**: Form validation schema across 7 sections
- **Recharts**: `LineChart` for 52-week projection, `Line`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ReferenceLine`
- **jsPDF** + **html2canvas**: Local PDF generation from DOM capture
- **lucide-react**: Icons (Download, AlertCircle, Mail, etc.)

### State Storage

- **localStorage**: `vuna_advanced_form` (JSON of entire form state, auto-saved every 500ms debounce)
- **localStorage**: `vuna_advanced_unlocked` (boolean, set after first successful unlock)
- **localStorage**: `vuna_payment_status` (legacy boolean, checked as fallback unlock signal)
- **Railway backend**: Saved plans (authenticated, paid tier)

---

## 3. Form Structure

### Section 1 — Business Profile
| Field | Type | Notes |
|---|---|---|
| `businessName` | string | Required, min 1 |
| `location` | string | Dropdown of 14 countries including Uganda/Kenya etc. |
| `industry` | string | Select: Retail, Manufacturing, Services, Agriculture, Other |
| `investmentSize` | number (≥ 0) | Subject to `investmentGuidanceLimit` cap |

### Section 2 — Variable Costs
| Field | Type | Notes |
|---|---|---|
| `rawMaterials` | number | Per batch |
| `directLabor` | number | Per batch |
| `packaging` | number | Per batch |
| `otherVariable` | number | Per batch |
| `batchYield` | number | Units produced per batch, min 1 |

**Derived (display only)**:
```
costPerUnit = (rawMaterials + directLabor + packaging + otherVariable) / batchYield
```

### Section 3 — Fixed Costs
| Field | Type | Notes |
|---|---|---|
| `equipmentCost` | number | For depreciation |
| `depreciationMethod` | enum | straight-line OR declining-balance |
| `usefulLife` | number | Years, min 0 |
| `salvageValue` | number | |
| `monthlyRent` | number | |
| `monthlySalaries` | number | Admin salaries only |
| `monthlyOtherFixed` | number | |

### Section 4 — Operating Costs (with behavior tagging)
| Field | Type | Behavior options |
|---|---|---|
| `utilities` | number | fixed / variable / mixed |
| `transport` | number | fixed / variable / mixed |
| `marketing` | number | fixed / variable / mixed |
| `otherOperating` | number | fixed / variable / mixed |

Each cost has a companion `_Behavior` field (e.g., `utilitiesBehavior: 'fixed' | 'variable' | 'mixed'`).

**Behavior classification logic**:
```
if behavior == 'fixed': contributes to fixedOperatingCosts
if behavior == 'variable': contributes to variableOperatingCosts
if behavior == 'mixed': split 50/50 into fixed and variable shares
```

### Section 5 — Financing
| Field | Type | Notes |
|---|---|---|
| `loanAmount` | number | 0 = no loan |
| `annualInterestRate` | number | % |
| `loanTermMonths` | number | |

### Section 6 — Tax
| Field | Type | Notes |
|---|---|---|
| `taxRate` | number | %, 0–100, default 25 |

Disclaimer shown: "simplified flat percentage applied to monthly net profit."

### Section 7 — Sales & Pricing
| Field | Type | Notes |
|---|---|---|
| `unitsPerWeek` | number | |
| `sellingPrice` | number | |
| `growthTargetPercent` | number | 0/15/30/50 presets |

---

## 4. Calculation Engine — Full Math Walkthrough

### Step 1: Unit Economics
```
totalVariableInputCost = rawMaterials + directLabor + packaging + otherVariable
safeBatchYield = max(batchYield, 1)
unitBaseCost = totalVariableInputCost / safeBatchYield
```
`unitBaseCost` is the per-unit variable cost of production (materials + labor + packaging).

### Step 2: Monthly Units
```
monthlyUnits = unitsPerWeek × 4.33
```
4.33 = 52 weeks / 12 months. Used consistently throughout for converting weekly → monthly.

### Step 3: Operating Cost Behavior Classification
```
fixedOperatingCosts = Σ(cost_i where behavior_i == 'fixed')
variableOperatingCosts = Σ(cost_i where behavior_i == 'variable')
mixedOperatingCosts = Σ(cost_i where behavior_i == 'mixed')

mixedFixedShare = mixedOperatingCosts × 0.5
mixedVariableShare = mixedOperatingCosts × 0.5
```

**Total fixed base costs**:
```
monthlyFixedBaseCosts = monthlyRent + monthlySalaries + monthlyOtherFixed + fixedOperatingCosts
monthlyFixedOps = monthlyFixedBaseCosts + mixedFixedShare
```

**Total variable operating costs at base sales**:
```
monthlyOperatingVariableCostsAtBaseSales = variableOperatingCosts + mixedVariableShare
operatingVariableCostPerUnit = monthlyUnits > 0
    ? monthlyOperatingVariableCostsAtBaseSales / monthlyUnits
    : 0
```

### Step 4: Depreciation

**Straight-line**:
```
annualDepreciation = (equipmentCost - salvageValue) / usefulLifeYears
```
Each year: `bookValue -= annualDepreciation`, capped at salvageValue.

**Declining balance**:
```
rate = 2 / usefulLifeYears
each year: depreciation = bookValue × rate
if bookValue - depreciation < salvageValue: depreciation = bookValue - salvageValue
bookValue -= depreciation
```

**Monthly conversion**:
```
monthlyDepreciation = annualDepreciation / 12
```

### Step 5: Loan Amortization
```
monthlyRate = annualInterestRate / 12
monthlyPayment = principal × monthlyRate × (1 + monthlyRate)^term / ((1 + monthlyRate)^term - 1)
```
If `principal = 0` or `term = 0`, returns `{ monthlyPayment: 0, firstMonthInterest: 0, schedule: [] }`.

**Month 1 interest**: `loanInterestThisMonth = balance × monthlyRate` (same as schedule[0].interest).

**Annual interest**: `annualInterestCost = Σ(schedule[].interest)`.

### Step 6: Monthly Profit Snapshot
```
monthlyRevenue = sellingPrice × monthlyUnits
monthlyVariableCosts = (unitBaseCost × monthlyUnits) + monthlyOperatingVariableCostsAtBaseSales

profitBeforeTax = monthlyRevenue
                - monthlyVariableCosts
                - monthlyFixedOps
                - monthlyDepreciation
                - loanInterestThisMonth

taxAmount = max(0, profitBeforeTax × (taxRate / 100))
netProfit = profitBeforeTax - taxAmount
```

**Monthly units edge case**: if `unitsPerWeek = 0`, then `monthlyUnits = 0`, so `operatingVariableCostPerUnit = 0` (division by zero guard). Revenue = 0, variable costs = `monthlyOperatingVariableCostsAtBaseSales` only (the operating variable costs not tied to production volume).

### Step 7: Profit-to-Cash Bridge
```
principalPaymentThisMonth = max(monthlyLoanPayment - loanInterestThisMonth, 0)
cashFromOperations = netProfit + monthlyDepreciation
cashPosition = cashFromOperations - principalPaymentThisMonth
differenceFromProfit = cashPosition - netProfit
```

### Step 8: Annual Operating Profit Before Interest
```
annualOperatingProfitBeforeInterest = (monthlyRevenue - monthlyVariableCosts - monthlyFixedOps - monthlyDepreciation) × 12
```

This is EBIT × 12. Does NOT subtract interest. Used for interest coverage and ROIC.

### Step 9: Interest Coverage Ratio
```
if annualInterestCost > 0:
    interestCoverageRatio = annualOperatingProfitBeforeInterest / annualInterestCost
else:
    interestCoverageRatio = null  // not applicable
```

**Status thresholds**:
- `≥ 3.0`: healthy
- `≥ 1.5`: watch
- `< 1.5`: risky
- `null`: not_applicable

### Step 10: Invested Capital and ROIC
```
investedCapital = investmentSize > 0 ? investmentSize : totalStartupInvestment

annualNopat = annualOperatingProfitBeforeInterest × (1 - taxRate/100)
roic = investedCapital > 0 ? annualNopat / investedCapital : null
```

**Note**: `totalStartupInvestment = state.equipmentCost + (monthlyFixedOps × 3)` (see ISSUE-2 below).

### Step 11: Return vs Benchmark
```
benchmarkRate = 14% (DEFAULT_ADVANCED_BENCHMARK_RATE)
benchmarkComparison = compareReturnToBenchmark(roic, benchmarkRate)

spread = roic - benchmarkRate
if roic === null or benchmarkRate === null: spread = null, status = not_applicable
else if spread ≥ 0.03: status = strong
else if spread ≥ 0: status = watch
else: status = weak
```

### Step 12: Reinvestment Need and Owner Distribution
```
reinvestmentNeed = simpleSummary.safetyBufferAmount  // 20% of monthlyProfit
ownerDistributionCapacity = simpleSummary.safeTakeHomeAmount  // monthlyProfit - safetyBuffer
```

Both sourced from `simpleSummary` (the shared WACM engine result), not computed independently here.

### Step 13: Growth Retention Guidance
```
estimatedGrowthReinvestment = monthlyVariableCosts × (targetGrowthPercent / 100)
recommendedRetention = max(reinvestmentNeed, estimatedGrowthReinvestment)
profitBasedTakeHome = max(monthlyNetProfit - recommendedRetention, 0)
cashSafeTakeHome = max(monthlyCashPosition - recommendedRetention, 0)
fundingGap = max(recommendedRetention - monthlyCashPosition, 0)

if targetGrowthPercent <= 0: status = base_only
else if fundingGap > 0: status = shortfall
else if cashSafeTakeHome <= 0: status = tight
else: status = funded
```

### Step 14: Cost Structure Shares
```
totalCostStructureBase = monthlyFixedBaseCosts + variableOperatingCosts + mixedOperatingCosts

fixedShare = totalCostStructureBase > 0 ? monthlyFixedBaseCosts / totalCostStructureBase : 0
variableShare = totalCostStructureBase > 0 ? variableOperatingCosts / totalCostStructureBase : 0
mixedShare = totalCostStructureBase > 0 ? mixedOperatingCosts / totalCostStructureBase : 0

if fixedShare >= 0.60: riskMessage = "A large share... bad month can hurt more sharply."
else if fixedShare >= 0.35: riskMessage = "Meaningful fixed portion..."
else: riskMessage = "Good share of operating cost base is flexible..."
```

### Step 15: Break-even
```
effectiveContributionMargin = sellingPrice - unitBaseCost - operatingVariableCostPerUnit

annualFixedExcludingDepreciation = (monthlyFixedOps + loanInterestThisMonth) × 12
totalAnnualFixed = annualFixedExcludingDepreciation + annualDepreciation

breakEvenUnits = effectiveContributionMargin > 0
    ? totalAnnualFixed / effectiveContributionMargin
    : Infinity

weeksToBreakEven = breakEvenUnits / (unitsPerWeek || 1)
monthsToBreakEven = weeksToBreakEven / 4.33
```

**Edge case**: If `effectiveContributionMargin ≤ 0`, break-even never reached (Infinity). Warning raised if `weeksToBreakEven > 104`.

### Step 16: Scenarios
Three scenarios computed identically using a `calcScenario(salesMultiplier)` helper:

```
weeklySales = unitsPerWeek × salesMultiplier
rev = sellingPrice × (weeklySales × 4.33)
varCosts = (unitBaseCost × (weeklySales × 4.33)) + (monthlyOperatingVariableCostsAtBaseSales × salesMultiplier)
pbt = rev - varCosts - monthlyFixedOps - monthlyDepreciation - loanInterestThisMonth
tax = max(0, pbt × (taxRate / 100))
net = pbt - tax
beWeeks = effectiveContributionMargin > 0 ? (totalAnnualFixed / effectiveContributionMargin) / (weeklySales || 1) : Infinity

Returns: { breakEvenWeeks: beWeeks, monthlyNetProfit: net }
```

**Scenarios**:
- `pessimistic`: salesMultiplier = 0.8
- `base`: salesMultiplier = 1.0
- `optimistic`: salesMultiplier = 1.2

### Step 17: Sensitivity Matrix
Uses `calculateSensitivityMatrix()` from `sharedFinanceEngine.ts`:

**Revenue multipliers**: [0.8, 1.0, 1.2]
**Cost multipliers**: [1.0, 1.15]

Total 6 cells. For each cell:
```
cellRevenue = monthlyRevenue × revenueMultiplier
cellVarCosts = monthlyVariableCosts × revenueMultiplier × costMultiplier
cellFixedCosts = monthlyFixedCosts × costMultiplier
cellNetProfit = cellRevenue - cellVarCosts - cellFixedCosts - monthlyDepreciation - monthlyInterestCost
cellNetProfit after tax = max(0, cellNetProfit × (1 - taxRate/100)) [WRONG — see BUG-S1]

status: cellNetProfit <= 0 → loss
        profitMargin < 5% → thin
        else → profit
```

**Loss cases**: described as `revenueMultiplier < 1 ? 'sales drop' : 'sales rise'` and `costMultiplier > 1 ? 'costs rise' : 'costs stay flat'`.

### Step 18: Timeline Data (52 weeks)
```
cumulativeRevenue[0] = 0
cumulativeCosts[0] = equipmentCost  // initial investment as starting cost

for week = 0 to 52:
    push { week, revenue: cumulativeRevenue, costs: cumulativeCosts, netCash: cumulativeRevenue - cumulativeCosts }
    cumulativeRevenue += sellingPrice × unitsPerWeek
    cumulativeCosts += (unitBaseCost × unitsPerWeek) + (monthlyFixedOps / 4.33) + (monthlyLoanPayment / 4.33)
```

**Issues**:
- Week 0 shows `netCash = 0 - equipmentCost = -equipmentCost` (correct as initial investment outflow)
- Timeline always shows base scenario — not updated when user adjusts inputs after viewing results (form values update, but timeline is already baked into `results` object)
- `monthlyFixedOps / 4.33` and `monthlyLoanPayment / 4.33` convert monthly to weekly for even distribution

### Step 19: Shared Planner Outputs (Translation Layer)
```
buildSharedPlannerOutputs('advanced', {
    revenue: monthlyRevenue,
    variable_costs: monthlyVariableCosts,
    fixed_costs: monthlyFixedOps,
    profit: monthlyNetProfit,
    cash_position: monthlyCashPosition,
    invested_capital: investedCapital,
    debt_cost: annualInterestCost > 0 ? annualInterestCost : null,
    benchmark_rate: 0.14,
    interest_coverage: interestCoverageRatio,
    roic,
    reinvestment_need: reinvestmentNeed,
    owner_distribution: ownerDistributionCapacity,
}, warningMap)
```

**Critical Issue**: `sharedPlannerOutputs` is computed but NOT consumed by `AdvancedResults.tsx`. The results component reads `results.monthlyNetProfit`, `results.roic`, etc. directly — it never accesses `results.sharedPlannerOutputs`. This means the Phase 1 translation layer (mode-specific labels, explanations, warning thresholds from `plannerModel.ts`) is defined but completely disconnected from the rendering layer.

---

## 5. Warnings System

### Calculator-generated warnings (advancedCalculator.ts:278-287)
```
if weeksToBreakEven > 104: "Break-even is taking longer than 2 years..."
if monthlyNetProfit < 0: "Your business is operating at a loss..."
if effectiveContributionMargin < sellingPrice × 0.1 && sellingPrice > 0: "Your margin is very low..."
if sellingPrice < unitBaseCost && sellingPrice > 0: "You are selling below your variable cost..."
if benchmarkComparison.status === 'weak': benchmarkComparison.message
if monthlyNetProfit > 0 && monthlyCashPosition < 0: cashBridge.message
if growthRetention.status === 'shortfall' || growthRetention.status === 'tight': growthRetention.message
if interestCoverageStatus === 'watch' || interestCoverageStatus === 'risky': interestCoverageMessage
if fixedShare >= 0.6: costStructureRiskMessage
```

All 9 warning types are pushed into a flat `warnings[]` array. No prioritization, no per-warning severity classification in the data model (only implied by source). `AdvancedResults.tsx` renders them as a bulleted list with a red left border — all treated equally.

---

## 6. Bugs and Issues

### BUG-S1: Sensitivity Matrix tax calculation is incorrect
**File**: `sharedFinanceEngine.ts:344`
```typescript
const monthlyNetProfit = snapshot.netProfit;
// snapshot.netProfit is already after-tax from calculateMonthlyProfitSnapshot
// But the sensitivity matrix then treats it as pre-tax
```

In `calculateSensitivityMatrix`, `calculateMonthlyProfitSnapshot` is called with the modified revenues/costs. This function already applies tax (via `taxAmount = Math.max(0, profitBeforeTax * taxRatePercent / 100)`). So `snapshot.netProfit` is the after-tax result. The sensitivity matrix correctly shows after-tax profit.

**However**: In `advancedCalculator.ts:346`, the comment `const profitMargin = monthlyRevenue > 0 ? monthlyNetProfit / monthlyRevenue : 0` uses the cell's `monthlyNetProfit` which is after-tax, but `monthlyRevenue` is the base (pre-scenario) revenue — not the cell's revenue. This is a scaling mismatch:
```typescript
const profitMargin = monthlyRevenue > 0 ? monthlyNetProfit / monthlyRevenue : 0;
```
Should be:
```typescript
const profitMargin = cellRevenue > 0 ? monthlyNetProfit / cellRevenue : 0;
```
This causes the "thin" classification to potentially misfire — it benchmarks after-tax profit against base-case gross revenue rather than scenario revenue.

### BUG-S2: `totalStartupInvestment` conflates operating costs with capital investment
**File**: `advancedCalculator.ts:175`
```typescript
const totalStartupInvestment = state.equipmentCost + (monthlyFixedOps * 3);
```

`monthlyFixedOps` is an **operating cost** (rent + salaries + operating fixed costs per month). Multiplying it by 3 and adding it to equipment cost produces an inflated startup investment figure that doesn't represent actual capital deployed. This value flows into:
- `investedCapital` fallback: `state.investmentSize > 0 ? state.investmentSize : totalStartupInvestment`
- The "Total Investment" display in `AdvancedResults.tsx:167`

If the user enters `investmentSize = 0`, the display will show a number that is 3 months of operating fixed costs larger than the actual equipment cost — potentially massively misleading.

### BUG-S3: Timeline data is computed from base scenario only, not re-computed on form changes
**File**: `advancedCalculator.ts:312-327`

The timeline data is baked into the `results` object at calculation time. When the form autosaves and recalculates (every 500ms after unlock), `setResults(calculateAdvancedRoadmap(parsed.data))` is called. This does recompute the timeline. So this is not a staleness bug — it is dynamically updated.

**However**: The 52-week timeline uses the base `unitsPerWeek` and `sellingPrice` with no growth trajectory applied. The comment in `AdvancedWizard.tsx:848` ("We do not calculate working capital in this mode") is accurate. The timeline shows a flat projection — revenue and costs stay constant every week.

### ISSUE-S1: AdvancedResults ignores `sharedPlannerOutputs` (Phase 1 translation layer is disconnected)
**File**: `AdvancedResults.tsx`

The component reads these fields from `results`:
- `results.simpleSummary.*`
- `results.monthlyNetProfit`, `results.monthlyRevenue`, etc.
- `results.interestCoverageRatio`, `results.roic`
- `results.cashBridge.*`
- `results.growthRetention.*`
- `results.costStructure.*`
- `results.depreciationSchedule`, `results.loanSchedule`

It **never reads** `results.sharedPlannerOutputs`. The `PLANNER_METRIC_REGISTRY` in `plannerModel.ts` defines:
- Mode-specific labels (e.g., "Debt safety" in Advanced, "Interest coverage" in Expert)
- Mode-specific short explanations
- Warning thresholds per metric

None of this is applied. All labels in `AdvancedResults.tsx` are hardcoded strings like "Interest coverage", "Monthly loan payment", "ROIC vs benchmark".

### ISSUE-S2: Investment cap gate only checks `investmentSize`, not `equipmentCost`
**File**: `AdvancedWizard.tsx:333`
```typescript
if (formValues.investmentSize > investmentGuidanceLimit) {
    return (/* gate screen */);
}
```

`totalStartupInvestment = equipmentCost + (monthlyFixedOps * 3)` could exceed the limit even when `investmentSize <= limit`, because `equipmentCost` is not included in the gate check. However, `equipmentCost` is a component of `investmentSize` in typical usage, so this may not trigger in practice for most users.

### ISSUE-S3: Form auto-save happens even when form is invalid
**File**: `AdvancedWizard.tsx:312-325`
```typescript
useEffect(() => {
    const timer = setTimeout(() => {
        localStorage.setItem('vuna_advanced_form', JSON.stringify(formValues));
        if (isAdvancedUnlocked) {
            const parsed = schema.safeParse(formValues);
            if (parsed.success) {
                setResults(calculateAdvancedRoadmap(parsed.data));
            }
        }
    }, 500);
    return () => clearTimeout(timer);
}, [formValues, isAdvancedUnlocked]);
```

Every keystroke triggers a 500ms debounce write to localStorage. The schema validation only gates the recalculation, not the save. If the user types invalid data, `localStorage` still gets the invalid JSON. On next load, `reset({ ...defaultValues, ...JSON.parse(saved) })` will restore the invalid state, but `useForm` will also apply Zod validation errors inline. This is minor but creates a path where localStorage can hold invalid form state that causes errors on the next unlock attempt.

### ISSUE-S4: No unit consistency comment in annual vs monthly switching
**File**: `advancedCalculator.ts`

The code switches between annual and monthly figures throughout:
- `annualOperatingProfitBeforeInterest` (annual) vs `monthlyNetProfit` (monthly)
- `annualInterestCost` (annual) passed to `calculateInterestCoverageRatio` with `annualOperatingProfitBeforeInterest` (annual)
- `annualDepreciation` computed in `calculateAnnualDepreciationFromSchedule`, then `monthlyDepreciation = annualDepreciation / 12`

There is no comment marking the unit boundaries. For maintainers, this creates risk of future bugs if new calculations are added without tracking which unit applies.

---

## 7. Results Display — Component Inventory

### Quick Summary Panel
- Header: "Quick Summary (Simple Mode View)"
- Sub-header: "This panel uses the shared WACM/simple-summary engine so Advanced Mode keeps the same high-level view as Simple Mode."
- 3 cards: Operating Break-Even (units/month), Investment Payback, Monthly Profit (Simple)
- Source: `results.simpleSummary.*`

### Golden Warnings
- Red left-border panel, `AlertCircle` icon
- Bulleted list of all `results.warnings`
- No severity differentiation

### Business Summary (4-grid)
- Total Investment (`totalStartupInvestment`), Break-even Point (weeks), Monthly Net Profit, 12-Month Net Profit
- Uses `results.totalStartupInvestment` which has BUG-S2 inflation

### Cost Structure Panel
- 3 cards: Fixed / Variable / Mixed monthly cost amounts and share %
- Effective contribution margin card (highlighted)
- Risk message

### Debt Safety Panel
- Interest coverage ratio badge (color-coded by healthy/watch/risky)
- Interest coverage message
- 3 cards: Annual interest cost, Monthly loan payment, Monthly cash position

### Return Quality Panel
- ROIC vs benchmark spread badge
- 3 cards: ROIC, Benchmark rate, Invested capital
- 2 cards: Reinvestment need, Owner distribution
- Growth retention plan card (color-coded by funded/tight/shortfall)

### Profit to Cash Bridge
- Table: Net profit → Add back depreciation → Cash from operations → Less principal repayment → Monthly cash position
- Bridge message

### 52-Week Financial Projection Chart
- Recharts `LineChart`: Cumulative Revenue (green), Cumulative Costs (red), Net Cash Position (dark green)
- `ReferenceLine` at break-even week if within range

### Sales Scenarios Table
- 3 rows: Low Sales (-20%), Expected Sales, High Sales (+20%)
- Columns: Scenario name, Sales volume/month, Break-even weeks, Monthly net profit

### Sensitivity Table
- 2×3 grid (2 cost assumptions × 3 revenue scenarios)
- Cell background color: green (profit), amber (thin), red (loss)
- Summary sentence

### Depreciation Schedule Table
- Year / Depreciation / Book Value
- Only shown if schedule length > 0

### Loan Repayment Schedule Table
- Month / Payment / Interest / Balance
- Only first 12 months shown
- Only shown if schedule length > 0

### Monthly Profit Breakdown Table
- Revenue → Variable Costs → Fixed Operating Costs → Depreciation → Loan Interest (Month 1) → Profit Before Tax → Tax → **Net Profit**

---

## 8. PDF Generation

**Method**: `html2canvas` captures `reportRef.current` (the div containing all results), then `jsPDF` converts the canvas to a PDF page.

**Limitation**: This is a visual capture of the DOM — not a structured PDF. Text is rasterized, tables are images. The PDF footer reads:
```
"Generated by Vuna Business Planner - Advanced Analysis. Not a substitute for professional financial advice. For multi-year NPV/IRR, join Expert Mode waitlist."
```

**Filename**: `${state.businessName || 'Business'}_Analysis.pdf`

**Email button**: Shows alert: "To email this report, please download the PDF first and attach it to your email. Automated emailing is coming soon!" — no actual email functionality.

---

## 9. Capability Gating

| Action | Anonymous | Signed-in Free | Signed-in Paid | Offline |
|--------|-----------|----------------|----------------|---------|
| Fill form | ✅ | ✅ | ✅ | ✅ |
| Unlock locally | ✅ | ✅ | ✅ | ✅ |
| View results (local) | ✅ | ✅ | ✅ | ✅ |
| Save to account | ❌ | ❌ | ✅ | ❌ |
| Load from account | ❌ | ❌ | ✅ | ❌ |
| Premium PDF | ❌ | ❌ | ✅ | ❌ (with fallback) |

**Auth dialog**: When anonymous user attempts save/load, a `PlannerAuthDialog` opens with register/login options. After auth, the deferred action resumes.

**Backend unreachable**: Save/load disabled with message "Go online to save/load". Local form still works (auto-saves to localStorage).

---

## 10. Summary Assessment

### What's solid:
- **Calculation engine separation**: The calculator is a pure function with no React dependencies. Testable in isolation.
- **Cost behavior classification**: The fixed/variable/mixed split is thoughtful and appropriate for the target user's mental model.
- **Loan amortization**: Correct annuity formula implementation.
- **Depreciation**: Both straight-line and declining balance correctly implemented.
- **Profit-to-cash bridge**: Clear explanation of why accounting profit ≠ cash.
- **Scenario analysis**: Pessimistic/base/optimistic at ±20% is reasonable.
- **Sensitivity matrix**: 6 scenarios covering revenue and cost variance is adequate.

### What needs fixing:
- **BUG-S2** (high impact): `totalStartupInvestment` = `equipmentCost + (monthlyFixedOps * 3)` inflates the investment figure. The 3-month multiplier has no justification and will mislead users.
- **ISSUE-S1** (high impact): `sharedPlannerOutputs` is built but never used. The Phase 1 translation layer (mode-specific labels and explanations from `plannerModel.ts`) is dead code.
- **BUG-S1** (medium impact): Sensitivity matrix profit margin calculation uses base revenue as denominator instead of scenario revenue.
- **ISSUE-S3** (low impact): Form auto-saves invalid JSON to localStorage on validation errors.

### Investment cap enforcement gap:
The cap check uses `investmentSize` only. If `equipmentCost > investmentGuidanceLimit` but `investmentSize = 0` (mistakenly left blank), the gate doesn't fire. `equipmentCost` could be 500M while `investmentSize` is 0, and the user would proceed through the full form only to have `totalStartupInvestment` drive incorrect ROIC calculations.

---

## 11. Fix Priority

| Priority | ID | Issue | Fix |
|----------|----|-------|-----|
| P1 | BUG-S2 | `totalStartupInvestment` inflation | Remove the `+ (monthlyFixedOps * 3)` term. For display, use `equipmentCost` only, or compute `equipmentCost + firstStockCost` properly |
| P1 | ISSUE-S1 | `sharedPlannerOutputs` disconnected | Either wire `AdvancedResults` to consume the translation layer, or remove `buildSharedPlannerOutputs` call to avoid confusion |
| P2 | BUG-S1 | Sensitivity matrix margin denominator | Use `cellRevenue` (scenario revenue) as denominator, not `monthlyRevenue` (base) |
| P2 | ISSUE-S2 | Investment cap ignores `equipmentCost` | Add `|| state.equipmentCost > investmentGuidanceLimit` to the gate condition |
| P3 | ISSUE-S3 | Auto-save of invalid form state | Guard localStorage write with `schema.safeParse(formValues).success` |