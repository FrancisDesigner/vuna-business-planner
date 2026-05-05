# VunaMentor Calculation Constitution
## Binding Rules for Every Developer, AI or Human, Working on This Codebase

**Version:** 1.0
**Date:** April 2026
**Authority:** This document overrides any conflicting code, comment, or instruction in the repository.
**Scope:** All three modes — Simple, Advanced, Expert — across frontend (TypeScript/React) and backend (Python/FastAPI).

---

> **Prime Directive:** After a user finishes calculating in VunaMentor, the numbers on screen must be identical — to the last decimal place — to what a trained accountant or financial analyst would compute by hand with a calculator. There are no approximations in the output layer. Approximations in intermediate steps must be documented and labeled.

---

## TABLE OF CONTENTS

1. [Definitions](#1-definitions)
2. [Mode Boundaries — Absolute Rules](#2-mode-boundaries)
3. [Bugs Found in the Existing Calculator — With Fixes](#3-bugs-found)
4. [Shared Calculation Library — The WACM Engine](#4-shared-wacm-engine)
5. [Simple Mode Calculation Rules](#5-simple-mode)
6. [Advanced Mode Calculation Rules](#6-advanced-mode)
7. [Expert Mode Calculation Rules](#7-expert-mode)
8. [Backend Integration Plan](#8-backend-integration)
9. [Database Schema](#9-database-schema)
10. [Math Verification Protocol — No Human Expert Required](#10-verification-protocol)
11. [Pricing Architecture and Feature Tiers](#11-pricing)
12. [Simple Mode Inside Advanced Mode](#12-simple-inside-advanced)
13. [Sign-in and Data Storage Flow](#13-signin-storage)
14. [AI Developer Constraints](#14-ai-constraints)

---

## 1. DEFINITIONS

These terms have fixed meanings throughout this document. Never use them interchangeably.

| Term | Definition |
|---|---|
| **Contribution Margin (CM)** | Selling Price − Variable Cost per Unit. The amount each unit sold contributes toward covering fixed costs, then profit. |
| **Weighted Average Contribution Margin (WACM)** | Σ(CMᵢ × mixᵢ) where mixᵢ = unitsᵢ / totalUnits. The blended CM across all products, weighted by sales volume. |
| **Operating Break-Even (OBE)** | The number of units (or revenue) needed per period to cover all fixed operating costs. Does NOT include initial investment. Formula: Total Fixed Costs per Period / WACM. |
| **Investment Payback Period (IPP)** | The number of months needed for accumulated operating profit to equal the total initial investment. Not discounted. |
| **Discounted Payback Period (DPP)** | The number of months for discounted cash flows to recover initial investment. Expert Mode only. |
| **Fixed Cost** | A cost that does not change with production volume within the relevant range. Includes rent, salaries, insurance, depreciation. |
| **Variable Cost** | A cost that changes proportionally with production volume. Includes raw materials, packaging, direct labor per unit. |
| **Seed Cost** | A one-time startup cost incurred before operations begin. Not included in monthly fixed cost calculation. Used for Investment Payback only. |
| **Depreciation** | The systematic allocation of a fixed asset's cost over its useful life. Non-cash expense. Two methods: Straight-Line (SL) and Double Declining Balance (DDB). |
| **NPV** | Net Present Value. The sum of all discounted future cash flows minus initial investment. Positive NPV = value-creating investment. |
| **IRR** | Internal Rate of Return. The discount rate that makes NPV = 0. Compared against WACC or hurdle rate. |
| **MIRR** | Modified IRR. Corrects IRR by assuming reinvestment at WACC, not at IRR itself. |
| **WACC** | Weighted Average Cost of Capital. The blended required return on debt and equity. Used as the discount rate in NPV. |
| **Annuity** | A series of equal payments at regular intervals. Ordinary annuity: payments at end of period. Annuity Due: payments at beginning. |
| **Terminal Value** | The present value of all cash flows beyond the projection period. Calculated via Gordon Growth Model or Exit Multiple. |
| **Sales Mix** | The proportional breakdown of unit sales across products. Example: 60% books, 30% pens, 10% ink. |

---

## 2. MODE BOUNDARIES

### Absolute Rules — Never Violate These

**Rule B-01:** Simple Mode NEVER computes tax. Tax belongs in Advanced and Expert only.

**Rule B-02:** Simple Mode NEVER computes depreciation. Fixed assets in Simple Mode are expensed as one-time Seed Costs.

**Rule B-03:** Simple Mode NEVER computes loan payments. If a user asks about loans in Simple Mode, redirect them to Advanced Mode.

**Rule B-04:** Advanced Mode NEVER computes NPV, IRR, MIRR, or any time-value-of-money appraisal beyond simple payback. These belong to Expert Mode only.

**Rule B-05:** Advanced Mode NEVER computes multi-year projections beyond 12 months.

**Rule B-06:** Expert Mode NEVER uses year-1 extrapolation for DDB depreciation. Each year's depreciation comes from the computed schedule.

**Rule B-07:** ALL THREE MODES support both single-product and multi-product. There is no mode that is "single-product only." The WACM engine is shared.

**Rule B-08:** The WACM calculation engine is a single shared function called by all three modes. It is NEVER duplicated or re-implemented per mode.

**Rule B-09:** All three modes display BOTH the Operating Break-Even AND the Investment Payback Period. Both are labeled explicitly so users cannot confuse them.

**Rule B-10:** No mode pre-fills financial figures. Every monetary default is 0. Guidance text is allowed.

---

## 3. BUGS FOUND IN THE EXISTING CALCULATOR

### Bug 001 — CRITICAL: Break-Even Numerator Excludes Operating Costs

**File:** `frontend/src/lib/calculator.ts`, line 67

**Current (wrong) code:**
```typescript
breakEvenUnits = totalFoundation / contributionMargin;
```

**Problem:** `totalFoundation` holds only rent, equipment deposits, and setup costs. Fuel costs (utilities, transport, airtime) and Protection costs (insurance, licenses) are monthly fixed costs that must be recovered before the business breaks even. Excluding them means the break-even point is always understated — sometimes by 50% or more.

**Manual verification:**
If monthly fixed costs are: Rent 500,000 + Utilities 200,000 + Insurance 100,000 = 800,000 total
And contribution margin = 4,000 per unit
Correct break-even = 800,000 / 4,000 = **200 units**
Current code computes = 500,000 / 4,000 = **125 units** ← WRONG

**Fix in TypeScript:**
```typescript
// calculator.ts — replace line 67
const totalMonthlyFixedCosts = totalFoundation + totalFuel + totalProtection;

if (contributionMargin > 0 && salesPerWeek > 0) {
  breakEvenUnits = totalMonthlyFixedCosts / contributionMargin;
  weeksToTurningPoint = breakEvenUnits / salesPerWeek;
} else {
  weeksToTurningPoint = Number.POSITIVE_INFINITY;
}
```

**Equivalent in Python (for backend validation):**
```python
def compute_break_even_units(
    total_foundation: float,
    total_fuel: float,
    total_protection: float,
    contribution_margin: float
) -> float:
    if contribution_margin <= 0:
        return float('inf')
    total_monthly_fixed = total_foundation + total_fuel + total_protection
    return total_monthly_fixed / contribution_margin
```

---

### Bug 002 — MEDIUM: Equipment Cost Assumes First Foundation Item

**File:** `frontend/src/lib/calculator.ts`, line 73

**Current (fragile) code:**
```typescript
const equipmentCost = step2_buckets.foundationCosts[0]?.amount || 0;
```

**Problem:** This assumes the user always enters equipment as the first foundation cost item. If they enter rent first, the calculation treats rent (a recurring expense) as a one-time capital cost and subtracts it from Year-1 projected harvest. The projectedHarvest12Months figure becomes wrong.

**Fix:** Tag each CostItem as `costCategory: 'one-time' | 'monthly'`. Sum all one-time items for the Seed bucket, sum all monthly items for recurring fixed costs.

**Updated CostItem type:**
```typescript
export interface CostItem {
  id: string;
  name: string;
  amount: number;
  costCategory: 'one-time' | 'monthly'; // NEW FIELD
}
```

**Updated calculator logic:**
```typescript
const oneTimeCosts = step2_buckets.foundationCosts
  .filter(item => item.costCategory === 'one-time')
  .reduce((sum, item) => sum + item.amount, 0);

const monthlyFoundation = step2_buckets.foundationCosts
  .filter(item => item.costCategory === 'monthly')
  .reduce((sum, item) => sum + item.amount, 0);

// Investment payback uses one-time costs + seed costs
const totalInitialInvestment = totalSeed + oneTimeCosts;

// Monthly operating break-even uses only recurring fixed costs
const totalMonthlyFixedCosts = monthlyFoundation + totalFuel + totalProtection;
```

**Python equivalent:**
```python
from dataclasses import dataclass
from typing import List, Literal

@dataclass
class CostItem:
    id: str
    name: str
    amount: float
    cost_category: Literal['one-time', 'monthly']

def split_costs(foundation_costs: List[CostItem]) -> tuple[float, float]:
    one_time = sum(c.amount for c in foundation_costs if c.cost_category == 'one-time')
    monthly = sum(c.amount for c in foundation_costs if c.cost_category == 'monthly')
    return one_time, monthly
```

---

### Bug 003 — MEDIUM: Simple and Advanced Break-Even Measure Different Things Without Labeling

**Files:** `calculator.ts` and `advancedCalculator.ts`

**Problem:**
- Simple Mode computes: `totalFoundation / contributionMargin` — investment payback in units
- Advanced Mode computes: `totalAnnualFixed / contributionMargin` — annual operating break-even in units

A user who uses both modes gets radically different numbers with no explanation. They assume the app is broken.

**Fix:** Both modes must compute BOTH metrics and label them clearly in the output.

**TypeScript (shared output interface):**
```typescript
export interface BreakEvenResult {
  // Operating break-even: units needed per month to cover all monthly fixed costs
  operatingBreakEvenUnits: number;        // = totalMonthlyFixed / WACM
  operatingBreakEvenRevenue: number;      // = operatingBreakEvenUnits × weightedAvgPrice
  operatingBreakEvenWeeks: number;        // = operatingBreakEvenUnits / unitsPerWeek

  // Investment payback: months until cumulative profit = initial investment
  investmentPaybackMonths: number;        // = totalInitialInvestment / monthlyOperatingProfit
  investmentPaybackWeeks: number;         // = investmentPaybackMonths × 4.33

  // Per-product allocation (multi-product only)
  productBreakdown: ProductBreakEven[];
}

export interface ProductBreakEven {
  name: string;
  contributionMargin: number;
  mixPercent: number;                     // share of total weekly units
  allocatedBreakEvenUnits: number;        // operatingBreakEvenUnits × mixPercent
  allocatedBreakEvenRevenue: number;
  marginPercent: number;                  // CM / sellingPrice × 100
  isNegativeMargin: boolean;
  weeklyContribution: number;             // CM × unitsPerWeek
}
```

**Python equivalent:**
```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class ProductBreakEven:
    name: str
    contribution_margin: float
    mix_percent: float
    allocated_break_even_units: float
    allocated_break_even_revenue: float
    margin_percent: float
    is_negative_margin: bool
    weekly_contribution: float

@dataclass
class BreakEvenResult:
    operating_break_even_units: float
    operating_break_even_revenue: float
    operating_break_even_weeks: float
    investment_payback_months: float
    investment_payback_weeks: float
    product_breakdown: List[ProductBreakEven] = field(default_factory=list)
```

---

### Bug 004 — LOW: Advanced Mode DDB Uses Year-1 Depreciation for All Projections

**File:** `advancedCalculator.ts`, lines 54 and 65

**Current code:**
```typescript
annualDepreciation = state.equipmentCost * rate; // First year only
const monthlyDepreciation = annualDepreciation / 12; // Used everywhere
```

**Problem:** DDB depreciation falls each year. Year-1 depreciation is the highest. Using it for all profit and break-even calculations overstates fixed costs in years 2+. Year-1 projections are accurate; anything beyond is wrong.

**Fix for Year-1 projections (acceptable for Advanced Mode):** Label all Advanced Mode projections explicitly as "Year 1" and add a note: "DDB depreciation decreases each year. Year 2 depreciation = [value from schedule]."

**Fix for Expert Mode (mandatory):** Use the actual schedule value for each year's projection.

**TypeScript (correct approach for Expert Mode):**
```typescript
// Use the depreciationSchedule array, not the year-1 extrapolation
const year1Depreciation = depreciationSchedule[0]?.depreciation ?? 0;
const year2Depreciation = depreciationSchedule[1]?.depreciation ?? 0;
const year3Depreciation = depreciationSchedule[2]?.depreciation ?? 0;

// For each projected year, use the correct depreciation from the schedule
projectedYears.forEach((year, index) => {
  year.depreciation = depreciationSchedule[index]?.depreciation ?? 0;
});
```

**Python equivalent:**
```python
def get_ddb_schedule(
    cost: float, salvage: float, useful_life: int
) -> list[dict]:
    schedule = []
    book_value = cost
    rate = 2.0 / useful_life
    for year in range(1, useful_life + 1):
        dep = book_value * rate
        # Floor at salvage value or in final year
        if book_value - dep < salvage or year == useful_life:
            dep = max(book_value - salvage, 0)
        book_value = max(book_value - dep, salvage)
        schedule.append({
            "year": year,
            "depreciation": round(dep, 2),
            "book_value": round(book_value, 2)
        })
    return schedule
```

---

### Bug 005 — LOW: Advanced Mode Loan Interest Uses Month-1 Value

**File:** `advancedCalculator.ts`, line 76

**Current code:**
```typescript
loanInterestThisMonth = state.loanAmount * monthlyRate; // Month 1 only
```

**Problem:** Interest decreases each month as principal is paid down. Using month-1 interest overstates interest expense for "typical month" projections.

**Fix:** For Year-1 average, use the average of month 1-12 interest from the amortisation schedule.

**TypeScript:**
```typescript
// After building loanSchedule, compute year-1 average interest
const year1AvgMonthlyInterest = loanSchedule.length >= 12
  ? loanSchedule.slice(0, 12).reduce((sum, row) => sum + row.interest, 0) / 12
  : loanSchedule.reduce((sum, row) => sum + row.interest, 0) / (loanSchedule.length || 1);
```

**Python:**
```python
def year1_average_monthly_interest(schedule: list[dict]) -> float:
    first_12 = schedule[:12]
    if not first_12:
        return 0.0
    return sum(row['interest'] for row in first_12) / len(first_12)
```

---

### Bug 006 — UX: Multi-Product Output Shows Total Units, Not Per-Product Allocation

**File:** All results components

**Problem:** When a bookshop sells books, pens, and ink, the output says "Break-even: 534 units." This is useless. The user needs to know how many of each product.

**Fix:** Show the per-product allocation on all results screens when `showMultipleItems` is true. The math is already correct in aggregation. The fix is in the output rendering only.

**Required output format:**
```
To cover all your fixed costs each month, you need to sell:
  • Books:        134 units  (60,000 UGX revenue)
  • Pens:         334 units  (12,000 UGX revenue)
  • Ink bottles:   67 units  (24,000 UGX revenue)
  ─────────────────────────────────────────────
  Total:         535 units   96,000 UGX revenue
```

---

### Bug 007 — UX: Price Tier Suggestions Are Meaningless for Multi-Product

**File:** `calculator.ts`, lines 55-57

**Problem:** Survival/Business/Growth price suggestions are based on the weighted average unit cost. For a bookshop, this is meaningless — each product has its own price point.

**Fix:** Only show price tier suggestions when `!config.showMultipleItems` (manufacturing only). For multi-product modes, replace with a per-product margin health indicator.

**TypeScript:**
```typescript
const priceSuggestions = config.showMultipleItems
  ? null  // No suggestions for multi-product
  : {
      survivalPrice: unitBaseCost * 1.2,
      businessPrice: unitBaseCost * 2.0,
      growthPrice:   unitBaseCost * 3.0,
    };

// For multi-product, compute margin health per product
const productMarginHealth = config.showMultipleItems
  ? items.map(item => ({
      name: item.name,
      marginPercent: item.sellingPrice > 0
        ? ((item.sellingPrice - item.buyingPrice) / item.sellingPrice) * 100
        : 0,
      status: getMarginStatus(item.sellingPrice, item.buyingPrice),
    }))
  : null;

function getMarginStatus(
  selling: number, buying: number
): 'danger' | 'warning' | 'healthy' {
  if (selling <= buying) return 'danger';
  const margin = (selling - buying) / selling;
  if (margin < 0.15) return 'warning';
  return 'healthy';
}
```

---

## 4. SHARED WACM ENGINE

This function is the mathematical core of all break-even calculations. It is implemented ONCE in TypeScript (for client-side calculation) and ONCE in Python (for server-side validation and PDF generation). Both implementations must produce identical results.

### TypeScript Implementation

```typescript
// lib/wacm.ts — shared by Simple, Advanced, and Expert modes

export interface LineItem {
  id: string;
  name: string;
  sellingPrice: number;
  variableCostPerUnit: number;   // buyingPrice for retail; unitBaseCost for manufacturing
  unitsPerWeek: number;
}

export interface WACMResult {
  // Aggregated totals
  totalUnitsPerWeek: number;
  weeklyRevenue: number;
  weeklyVariableCosts: number;
  weeklyTotalContribution: number;

  // Weighted averages
  weightedAvgSellingPrice: number;
  weightedAvgVariableCost: number;
  wacm: number;                       // Weighted Average Contribution Margin per unit
  cmRatio: number;                    // WACM / weightedAvgSellingPrice (as decimal)

  // Per-product breakdown
  products: {
    id: string;
    name: string;
    sellingPrice: number;
    variableCostPerUnit: number;
    contributionMarginPerUnit: number;
    marginPercent: number;
    mixPercent: number;
    weeklyContribution: number;
    isNegativeMargin: boolean;
    allocatedBreakEvenUnits: number;  // Filled in after break-even is computed
    allocatedBreakEvenRevenue: number;
  }[];

  hasNegativeMarginProducts: boolean;
  negativeMarginWarnings: string[];
}

export function computeWACM(items: LineItem[]): WACMResult {
  const validItems = items.filter(
    item => item.unitsPerWeek > 0 && item.sellingPrice > 0
  );

  if (validItems.length === 0) {
    return emptyWACMResult();
  }

  const totalUnitsPerWeek = validItems.reduce(
    (sum, item) => sum + item.unitsPerWeek, 0
  );
  const weeklyRevenue = validItems.reduce(
    (sum, item) => sum + item.sellingPrice * item.unitsPerWeek, 0
  );
  const weeklyVariableCosts = validItems.reduce(
    (sum, item) => sum + item.variableCostPerUnit * item.unitsPerWeek, 0
  );
  const weeklyTotalContribution = weeklyRevenue - weeklyVariableCosts;

  // WACM = Σ(CMᵢ × unitsᵢ) / Σ(unitsᵢ)
  // This is algebraically equivalent to: total contribution / total units
  const wacm = totalUnitsPerWeek > 0
    ? weeklyTotalContribution / totalUnitsPerWeek
    : 0;

  const weightedAvgSellingPrice = totalUnitsPerWeek > 0
    ? weeklyRevenue / totalUnitsPerWeek
    : 0;

  const weightedAvgVariableCost = totalUnitsPerWeek > 0
    ? weeklyVariableCosts / totalUnitsPerWeek
    : 0;

  const cmRatio = weightedAvgSellingPrice > 0
    ? wacm / weightedAvgSellingPrice
    : 0;

  const negativeMarginWarnings: string[] = [];
  const products = validItems.map(item => {
    const cm = item.sellingPrice - item.variableCostPerUnit;
    const marginPercent = item.sellingPrice > 0
      ? (cm / item.sellingPrice) * 100
      : 0;
    const mixPercent = item.unitsPerWeek / totalUnitsPerWeek;
    const isNegative = cm < 0;

    if (isNegative) {
      negativeMarginWarnings.push(
        `${item.name}: selling price (${item.sellingPrice}) is below cost (${item.variableCostPerUnit}). You lose money on every sale.`
      );
    }

    return {
      id: item.id,
      name: item.name,
      sellingPrice: item.sellingPrice,
      variableCostPerUnit: item.variableCostPerUnit,
      contributionMarginPerUnit: cm,
      marginPercent,
      mixPercent,
      weeklyContribution: cm * item.unitsPerWeek,
      isNegativeMargin: isNegative,
      allocatedBreakEvenUnits: 0,       // Filled in below
      allocatedBreakEvenRevenue: 0,
    };
  });

  return {
    totalUnitsPerWeek,
    weeklyRevenue,
    weeklyVariableCosts,
    weeklyTotalContribution,
    weightedAvgSellingPrice,
    weightedAvgVariableCost,
    wacm,
    cmRatio,
    products,
    hasNegativeMarginProducts: negativeMarginWarnings.length > 0,
    negativeMarginWarnings,
  };
}

export function allocateBreakEven(
  wacmResult: WACMResult,
  breakEvenUnitsTotal: number
): WACMResult {
  const updated = { ...wacmResult };
  updated.products = wacmResult.products.map(p => ({
    ...p,
    allocatedBreakEvenUnits: breakEvenUnitsTotal * p.mixPercent,
    allocatedBreakEvenRevenue: breakEvenUnitsTotal * p.mixPercent * p.sellingPrice,
  }));
  return updated;
}
```

### Python Implementation (Backend Validation)

```python
# services/wacm.py

from dataclasses import dataclass, field
from typing import List

@dataclass
class LineItem:
    id: str
    name: str
    selling_price: float
    variable_cost_per_unit: float
    units_per_week: float

@dataclass
class ProductBreakdown:
    id: str
    name: str
    selling_price: float
    variable_cost_per_unit: float
    contribution_margin_per_unit: float
    margin_percent: float
    mix_percent: float
    weekly_contribution: float
    is_negative_margin: bool
    allocated_break_even_units: float = 0.0
    allocated_break_even_revenue: float = 0.0

@dataclass
class WACMResult:
    total_units_per_week: float
    weekly_revenue: float
    weekly_variable_costs: float
    weekly_total_contribution: float
    weighted_avg_selling_price: float
    weighted_avg_variable_cost: float
    wacm: float
    cm_ratio: float
    products: List[ProductBreakdown] = field(default_factory=list)
    has_negative_margin_products: bool = False
    negative_margin_warnings: List[str] = field(default_factory=list)

def compute_wacm(items: List[LineItem]) -> WACMResult:
    valid = [i for i in items if i.units_per_week > 0 and i.selling_price > 0]
    if not valid:
        return WACMResult(0, 0, 0, 0, 0, 0, 0, 0)

    total_units = sum(i.units_per_week for i in valid)
    weekly_revenue = sum(i.selling_price * i.units_per_week for i in valid)
    weekly_var_costs = sum(i.variable_cost_per_unit * i.units_per_week for i in valid)
    weekly_contribution = weekly_revenue - weekly_var_costs

    # WACM = Σ(CMᵢ × unitsᵢ) / Σ(unitsᵢ)
    wacm = weekly_contribution / total_units if total_units > 0 else 0
    wav_price = weekly_revenue / total_units if total_units > 0 else 0
    wav_cost = weekly_var_costs / total_units if total_units > 0 else 0
    cm_ratio = wacm / wav_price if wav_price > 0 else 0

    warnings = []
    products = []
    for item in valid:
        cm = item.selling_price - item.variable_cost_per_unit
        margin_pct = (cm / item.selling_price * 100) if item.selling_price > 0 else 0
        mix = item.units_per_week / total_units
        negative = cm < 0
        if negative:
            warnings.append(
                f"{item.name}: price {item.selling_price} < cost {item.variable_cost_per_unit}"
            )
        products.append(ProductBreakdown(
            id=item.id,
            name=item.name,
            selling_price=item.selling_price,
            variable_cost_per_unit=item.variable_cost_per_unit,
            contribution_margin_per_unit=cm,
            margin_percent=margin_pct,
            mix_percent=mix,
            weekly_contribution=cm * item.units_per_week,
            is_negative_margin=negative,
        ))

    return WACMResult(
        total_units_per_week=total_units,
        weekly_revenue=weekly_revenue,
        weekly_variable_costs=weekly_var_costs,
        weekly_total_contribution=weekly_contribution,
        weighted_avg_selling_price=wav_price,
        weighted_avg_variable_cost=wav_cost,
        wacm=wacm,
        cm_ratio=cm_ratio,
        products=products,
        has_negative_margin_products=bool(warnings),
        negative_margin_warnings=warnings,
    )

def allocate_break_even(
    wacm_result: WACMResult,
    break_even_units_total: float
) -> WACMResult:
    for p in wacm_result.products:
        p.allocated_break_even_units = break_even_units_total * p.mix_percent
        p.allocated_break_even_revenue = (
            p.allocated_break_even_units * p.selling_price
        )
    return wacm_result
```

---

## 5. SIMPLE MODE CALCULATION RULES

### Rule S-01: Operating Break-Even

```
OBE_units = (totalFoundation_monthly + totalFuel + totalProtection) / WACM
OBE_revenue = OBE_units × weightedAvgSellingPrice
OBE_weeks = OBE_units / totalUnitsPerWeek
```

- Numerator: sum of ALL monthly fixed costs across all three recurring cost buckets
- Denominator: WACM from the shared engine
- NEVER use only one cost bucket as the numerator

### Rule S-02: Investment Payback Period

```
totalInitialInvestment = seedCosts + oneTimeFoundationCosts
monthlyOperatingProfit = monthlyRevenue - monthlyVariableCosts - monthlyFixedCosts
IPP_months = totalInitialInvestment / monthlyOperatingProfit
```

- If `monthlyOperatingProfit ≤ 0`, IPP = ∞. Display: "Not achievable at current price"
- Never show negative payback period

### Rule S-03: Monthly Projections

```
monthlyRevenue        = weightedAvgSellingPrice × totalUnitsPerWeek × WEEKS_PER_MONTH
monthlyVariableCosts  = weightedAvgVariableCost × totalUnitsPerWeek × WEEKS_PER_MONTH
monthlyFixedCosts     = monthlyFoundation + totalFuel + totalProtection
monthlyOperatingProfit = monthlyRevenue - monthlyVariableCosts - monthlyFixedCosts

projectedYear1Profit  = (monthlyOperatingProfit × 12) - totalInitialInvestment
projectedYear2Profit  = monthlyOperatingProfit × 12
```

### Rule S-04: The 4.33 Constant

Never hardcode `4.33`, `4.333`, or `4.3333`. Always define and import the exact constant once as `WEEKS_PER_MONTH = 52 / 12`.

### Rule S-05: Simple Mode Does Not Compute Tax, Depreciation, or Loan Payments

Any code path in Simple Mode that computes tax, depreciation, or loan payments is a constitution violation.

---

## 6. ADVANCED MODE CALCULATION RULES

Advanced Mode inherits all Simple Mode rules PLUS the following.

### Rule A-01: Depreciation — Straight-Line

```
Annual_SL_Depreciation = (AssetCost - SalvageValue) / UsefulLife
Monthly_SL_Depreciation = Annual_SL_Depreciation / 12

Verification: after UsefulLife years, BookValue = SalvageValue (never below)
```

**TypeScript:**
```typescript
function straightLineSchedule(
  cost: number, salvage: number, life: number
): { year: number; depreciation: number; bookValue: number }[] {
  const annualDep = (cost - salvage) / life;
  let bv = cost;
  return Array.from({ length: life }, (_, i) => {
    bv = Math.max(bv - annualDep, salvage);
    return { year: i + 1, depreciation: annualDep, bookValue: bv };
  });
}
```

**Python:**
```python
def straight_line_schedule(
    cost: float, salvage: float, life: int
) -> list[dict]:
    annual_dep = (cost - salvage) / life
    bv = cost
    schedule = []
    for year in range(1, life + 1):
        bv = max(bv - annual_dep, salvage)
        schedule.append({"year": year, "depreciation": annual_dep, "book_value": bv})
    return schedule
```

### Rule A-02: Depreciation — Double Declining Balance

```
Rate = 2 / UsefulLife
Year_n_Depreciation = BookValue_at_start_of_year_n × Rate
  UNLESS BookValue − (BookValue × Rate) < SalvageValue
  OR it is the final year
  IN THOSE CASES: Depreciation = BookValue − SalvageValue
```

**TypeScript:**
```typescript
function ddbSchedule(
  cost: number, salvage: number, life: number
): { year: number; depreciation: number; bookValue: number }[] {
  const rate = 2 / life;
  let bv = cost;
  return Array.from({ length: life }, (_, i) => {
    const isFinalYear = i === life - 1;
    let dep = bv * rate;
    if (bv - dep < salvage || isFinalYear) {
      dep = Math.max(bv - salvage, 0);
    }
    bv = Math.max(bv - dep, salvage);
    return { year: i + 1, depreciation: dep, bookValue: bv };
  });
}
```

**Python:**
```python
def ddb_schedule(cost: float, salvage: float, life: int) -> list[dict]:
    rate = 2.0 / life
    bv = cost
    schedule = []
    for year in range(1, life + 1):
        dep = bv * rate
        is_final = year == life
        if bv - dep < salvage or is_final:
            dep = max(bv - salvage, 0.0)
        bv = max(bv - dep, salvage)
        schedule.append({"year": year, "depreciation": round(dep, 4), "book_value": round(bv, 4)})
    return schedule
```

### Rule A-03: Loan Amortisation

```
monthlyRate = annualInterestRate / 100 / 12

PMT = LoanAmount × [monthlyRate × (1 + monthlyRate)^n] / [(1 + monthlyRate)^n − 1]

For each month m:
  Interest_m  = Balance_(m-1) × monthlyRate
  Principal_m = PMT − Interest_m
  Balance_m   = Balance_(m-1) − Principal_m

Verification: Balance at month n must equal 0 (within rounding tolerance of 0.01)
```

**TypeScript:**
```typescript
function loanSchedule(
  principal: number,
  annualRate: number,
  termMonths: number
): { month: number; payment: number; principal: number; interest: number; balance: number }[] {
  const r = annualRate / 100 / 12;
  const pmt = (principal * r * Math.pow(1 + r, termMonths))
            / (Math.pow(1 + r, termMonths) - 1);
  let balance = principal;
  return Array.from({ length: termMonths }, (_, i) => {
    const interest = balance * r;
    const princ = pmt - interest;
    balance = Math.max(balance - princ, 0);
    return { month: i + 1, payment: pmt, principal: princ, interest, balance };
  });
}
```

**Python:**
```python
def loan_schedule(
    principal: float, annual_rate: float, term_months: int
) -> list[dict]:
    r = annual_rate / 100 / 12
    pmt = (principal * r * (1 + r) ** term_months) / ((1 + r) ** term_months - 1)
    balance = principal
    schedule = []
    for month in range(1, term_months + 1):
        interest = balance * r
        princ = pmt - interest
        balance = max(balance - princ, 0.0)
        schedule.append({
            "month": month,
            "payment": round(pmt, 2),
            "principal": round(princ, 2),
            "interest": round(interest, 2),
            "balance": round(balance, 2),
        })
    return schedule
```

### Rule A-04: Monthly P&L

```
monthlyRevenue          = WACM_weightedAvgPrice × totalUnitsPerWeek × 4.33
monthlyVariableCosts    = WACM_weightedAvgVarCost × totalUnitsPerWeek × 4.33
grossProfit             = monthlyRevenue − monthlyVariableCosts
monthlyFixedOps         = rent + salaries + utilities + transport + marketing + otherFixed
monthlyDepreciation     = year1AnnualDepreciation / 12      [SL: constant; DDB: year-1 value]
monthlyLoanInterest     = year1AvgMonthlyInterest           [average of months 1-12]
EBITDA                  = grossProfit − monthlyFixedOps
EBIT                    = EBITDA − monthlyDepreciation
EBT (profit before tax) = EBIT − monthlyLoanInterest
monthlyTax              = max(0, EBT × (taxRate / 100))
netProfit               = EBT − monthlyTax
```

Advanced Mode must show EBITDA, EBIT, EBT, and Net Profit as separate labeled lines. Never collapse them.

### Rule A-05: Advanced Break-Even

```
annualFixedOps           = monthlyFixedOps × 12
annualDepreciation       = year1AnnualDepreciation
annualLoanInterest       = sum of all interest payments in month 1-12
totalAnnualFixed         = annualFixedOps + annualDepreciation + annualLoanInterest
OBE_units_annual         = totalAnnualFixed / WACM
OBE_weeks                = OBE_units_annual / totalUnitsPerWeek
OBE_months               = OBE_weeks / 4.33
```

Label this: "Annual Operating Break-Even — the number of weeks into the year before you start making profit."

### Rule A-06: Scenario Analysis

```
For multiplier in {0.8 (pessimistic), 1.0 (base), 1.2 (optimistic)}:
  adjustedUnitsPerWeek = totalUnitsPerWeek × multiplier
  Apply Rule A-04 with adjustedUnitsPerWeek
  Report: breakEvenWeeks, netProfit, annualNetProfit
```

The multiplier applies to sales volume only. Prices, costs, and fixed charges do not change.

### Rule A-07: 52-Week Cash Flow Timeline

```
For each week w (0 to 52):
  cumulativeRevenue_w  = weightedAvgSellingPrice × totalUnitsPerWeek × w
  cumulativeCosts_w    = equipmentCost                                 [week 0 only, then 0]
                       + (weightedAvgVarCost × totalUnitsPerWeek × w)
                       + (monthlyFixedOps / 4.33 × w)
                       + (monthlyLoanPayment / 4.33 × w)
  netCash_w            = cumulativeRevenue_w − cumulativeCosts_w
```

Note: this is a CASH FLOW view (loan payment = full PMT, not just interest). The income statement view (Rule A-04) uses only interest as an expense. Both views are valid — label them clearly.

---

## 7. EXPERT MODE CALCULATION RULES

Expert Mode inherits all Simple and Advanced rules PLUS the following.

### Rule E-01: Multi-Year Depreciation

For each projection year y (1 to n):
```
depreciationYear_y = depreciationSchedule[y-1].depreciation
```

Never use year-1 depreciation for year 2, 3, 4, or 5.

### Rule E-02: Net Present Value

```
NPV = −InitialInvestment + Σ(NetCashFlow_t / (1 + WACC)^t)   for t = 1 to n

Where:
  NetCashFlow_t = NetProfit_t + Depreciation_t − ΔWorkingCapital_t + TerminalValue (year n only)
  WACC          = user-supplied discount rate (decimal, e.g. 0.12 for 12%)
  n             = projection years (3 or 5)
```

**TypeScript:**
```typescript
function computeNPV(
  initialInvestment: number,
  cashFlows: number[],  // index 0 = year 1
  wacc: number
): number {
  const pv = cashFlows.reduce(
    (sum, cf, i) => sum + cf / Math.pow(1 + wacc, i + 1), 0
  );
  return pv - initialInvestment;
}
```

**Python:**
```python
def compute_npv(
    initial_investment: float,
    cash_flows: list[float],  # index 0 = year 1
    wacc: float
) -> float:
    pv = sum(cf / (1 + wacc) ** (i + 1) for i, cf in enumerate(cash_flows))
    return round(pv - initial_investment, 2)
```

### Rule E-03: Internal Rate of Return (Newton-Raphson)

```
IRR is the value r such that:
  0 = −InitialInvestment + Σ(CF_t / (1 + r)^t)

Solve iteratively. If no convergence after 100 iterations, return None and display "IRR not computable."
```

**TypeScript:**
```typescript
function computeIRR(
  initialInvestment: number,
  cashFlows: number[],
  guess = 0.1,
  tolerance = 1e-6,
  maxIter = 200
): number | null {
  const allFlows = [-initialInvestment, ...cashFlows];
  let r = guess;
  for (let i = 0; i < maxIter; i++) {
    const f = allFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t), 0);
    const fPrime = allFlows.reduce(
      (sum, cf, t) => sum - (t * cf) / Math.pow(1 + r, t + 1), 0
    );
    if (Math.abs(fPrime) < 1e-12) return null;
    const r1 = r - f / fPrime;
    if (Math.abs(r1 - r) < tolerance) return r1;
    r = r1;
  }
  return null;
}
```

**Python:**
```python
def compute_irr(
    initial_investment: float,
    cash_flows: list[float],
    guess: float = 0.1,
    tolerance: float = 1e-6,
    max_iter: int = 200
) -> float | None:
    all_flows = [-initial_investment] + cash_flows
    r = guess
    for _ in range(max_iter):
        f = sum(cf / (1 + r) ** t for t, cf in enumerate(all_flows))
        f_prime = sum(-t * cf / (1 + r) ** (t + 1) for t, cf in enumerate(all_flows))
        if abs(f_prime) < 1e-12:
            return None
        r1 = r - f / f_prime
        if abs(r1 - r) < tolerance:
            return round(r1, 6)
        r = r1
    return None
```

### Rule E-04: Modified IRR

```
MIRR = [(FV of positive cash flows at reinvestment rate) / (PV of negative cash flows at finance rate)]^(1/n) − 1

Where:
  reinvestmentRate = WACC (assume reinvestment at cost of capital)
  financeRate      = cost of debt (or WACC if not specified)
  n                = number of periods
```

**TypeScript:**
```typescript
function computeMIRR(
  cashFlows: number[],  // includes initial (negative) at index 0
  financeRate: number,
  reinvestRate: number
): number {
  const n = cashFlows.length - 1;
  const negativePV = cashFlows.reduce((sum, cf, t) => {
    if (cf < 0) sum += cf / Math.pow(1 + financeRate, t);
    return sum;
  }, 0);
  const positiveFV = cashFlows.reduce((sum, cf, t) => {
    if (cf > 0) sum += cf * Math.pow(1 + reinvestRate, n - t);
    return sum;
  }, 0);
  if (negativePV === 0) return 0;
  return Math.pow(positiveFV / Math.abs(negativePV), 1 / n) - 1;
}
```

### Rule E-05: Annuities

```
PV of Ordinary Annuity    = PMT × [1 − (1 + r)^−n] / r
FV of Ordinary Annuity    = PMT × [(1 + r)^n − 1] / r

PV of Annuity Due         = PV_ordinary × (1 + r)
FV of Annuity Due         = FV_ordinary × (1 + r)

PV of Growing Annuity     = PMT / (r − g)  [when r > g; perpetuity form]
PV of Growing Annuity, n  = PMT × [1 − ((1+g)/(1+r))^n] / (r − g)

PV of Perpetuity          = PMT / r
PV of Growing Perpetuity  = PMT / (r − g)  [r > g required]
```

**TypeScript:**
```typescript
const annuity = {
  pvOrdinary: (pmt: number, r: number, n: number) =>
    pmt * (1 - Math.pow(1 + r, -n)) / r,

  fvOrdinary: (pmt: number, r: number, n: number) =>
    pmt * (Math.pow(1 + r, n) - 1) / r,

  pvDue: (pmt: number, r: number, n: number) =>
    annuity.pvOrdinary(pmt, r, n) * (1 + r),

  fvDue: (pmt: number, r: number, n: number) =>
    annuity.fvOrdinary(pmt, r, n) * (1 + r),

  pvGrowing: (pmt: number, r: number, g: number, n: number) =>
    r !== g
      ? pmt * (1 - Math.pow((1 + g) / (1 + r), n)) / (r - g)
      : pmt * n / (1 + r),

  pvPerpetuity: (pmt: number, r: number) => pmt / r,

  pvGrowingPerpetuity: (pmt: number, r: number, g: number) => {
    if (r <= g) throw new Error('Growth rate must be less than discount rate');
    return pmt / (r - g);
  },
};
```

### Rule E-06: Terminal Value

```
Gordon Growth Model:   TV = FinalYearCashFlow × (1 + g) / (WACC − g)
Exit Multiple:        TV = FinalYearEBITDA × multiple

PV of Terminal Value  = TV / (1 + WACC)^n
```

### Rule E-07: Profitability Index

```
PI = NPV / InitialInvestment + 1
   (or equivalently: PI = PV of future cash flows / InitialInvestment)

PI > 1 → Accept
PI = 1 → Indifferent
PI < 1 → Reject
```

### Rule E-08: Discounted Payback Period

```
For each year t:
  DiscountedCF_t = CF_t / (1 + WACC)^t
  CumulativeDiscountedCF_t = Σ(DiscountedCF_1 to DiscountedCF_t)

DPP = the year t when CumulativeDiscountedCF first ≥ InitialInvestment
     (interpolate within the year for fractional result)
```

### Rule E-09: Working Capital Changes

```
ΔWorkingCapital_t = ΔAR_t + ΔInventory_t − ΔAP_t

Where:
  AR  = AccountsReceivable = (Revenue × receivableDays / 365)
  AP  = AccountsPayable    = (COGS × payableDays / 365)
  Inv = Inventory          = (COGS × inventoryDays / 365)

In the cash flow statement:
  An INCREASE in AR or Inventory = cash OUTFLOW (negative)
  An INCREASE in AP              = cash INFLOW (positive)
```

---

## 8. BACKEND INTEGRATION PLAN

### 8.1 Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Frontend (React + TypeScript)      │
│                                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │  Simple  │  │  Advanced │  │  Expert  │ │
│  │  Mode    │  │  Mode     │  │  Mode    │ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘ │
│       └──────────────┼──────────────┘       │
│              WACM Engine (shared)           │
│              All calculations run here      │
└─────────────────────┬───────────────────────┘
                      │ HTTPS API calls
                      │ (save/load/PDF/auth only)
┌─────────────────────▼───────────────────────┐
│           Backend (Python FastAPI)           │
│           Hosted on Railway                  │
│                                             │
│  /auth/register                             │
│  /auth/login                                │
│  /auth/refresh                              │
│  /planner/plans          (save/load)        │
│  /planner/generate-pdf   (paywall)          │
│  /planner/validate       (math verification)│
│  /subscriptions/status                      │
│  /payments/initiate      (mobile money)     │
│  /payments/callback                         │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│           Database (PostgreSQL on Railway)   │
└─────────────────────────────────────────────┘
```

**Key principle:** Calculations ALWAYS run client-side first. The backend NEVER does the calculation for the user in real time — it validates, stores, and generates documents. This keeps the app fast, offline-capable, and PWA-compatible.

### 8.2 API Endpoints to Build

#### Authentication
```
POST   /auth/register          Create account (email + password)
POST   /auth/login             Return JWT access token + refresh token
POST   /auth/refresh           Exchange refresh token for new access token
POST   /auth/logout            Invalidate refresh token
GET    /auth/me                Return current user profile
```

#### Plans (Save / Load)
```
POST   /planner/plans          Save a plan (body: mode, inputs JSON, results JSON)
GET    /planner/plans          List user's saved plans (paginated)
GET    /planner/plans/{id}     Load a specific plan
PUT    /planner/plans/{id}     Update a plan
DELETE /planner/plans/{id}     Delete a plan
```

#### PDF Generation (Gated by Subscription)
```
POST   /planner/generate-pdf   Accept plan inputs + results, return PDF blob
                               Requires: valid JWT + active subscription
                               (Simple Mode users: free PDF via client-side only)
```

#### Validation (Math Verification)
```
POST   /planner/validate       Accept inputs, return Python-computed results
                               Used by the automated test suite to cross-check
                               TypeScript vs Python outputs
```

#### Subscriptions
```
GET    /subscriptions/status   Return current subscription tier and expiry
POST   /subscriptions/webhook  Payment provider callback (MTN MoMo, Stripe)
```

### 8.3 Integration Phases

**Phase 1 — Auth + Save/Load (build first)**
- User registration and login (JWT)
- Save plan to database
- Load saved plans
- No payment required yet — all plans saved for free during beta

**Phase 2 — PDF Paywall**
- Move Advanced + Expert PDF generation to backend
- Simple Mode PDF stays client-side (free forever)
- Gate backend PDF endpoint behind subscription check

**Phase 3 — Payment**
- MTN Mobile Money integration (primary market: Uganda/East Africa)
- Airtel Money integration
- Stripe/card payments (global market: Advanced + Expert)
- VunaBooks subscriber check (subscribers get Advanced free)

**Phase 4 — Math Validation Endpoint**
- Deploy `/planner/validate` endpoint
- CI pipeline calls this endpoint on every pull request with golden test cases

---

## 9. DATABASE SCHEMA

```sql
-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    country_code    VARCHAR(3),
    currency_code   VARCHAR(3) DEFAULT 'UGX',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier            VARCHAR(20) NOT NULL  -- 'free' | 'advanced' | 'expert'
                    CHECK (tier IN ('free', 'advanced', 'expert')),
    status          VARCHAR(20) NOT NULL  -- 'active' | 'cancelled' | 'expired'
                    CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at      TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ,
    payment_ref     VARCHAR(255),         -- Mobile money or Stripe reference
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Plans
CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode            VARCHAR(20) NOT NULL
                    CHECK (mode IN ('simple', 'advanced', 'expert')),
    name            VARCHAR(255) NOT NULL DEFAULT 'Untitled Plan',
    business_type   VARCHAR(30),
    currency_code   VARCHAR(3) NOT NULL DEFAULT 'UGX',
    inputs          JSONB NOT NULL,       -- Full wizard/form state
    results         JSONB,                -- Computed results (cached)
    is_archived     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- PDF Generation Log
CREATE TABLE pdf_generations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID REFERENCES plans(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    mode            VARCHAR(20) NOT NULL,
    generated_at    TIMESTAMPTZ DEFAULT NOW(),
    file_size_bytes INTEGER
);

-- Indexes
CREATE INDEX idx_plans_user_id      ON plans(user_id);
CREATE INDEX idx_plans_mode         ON plans(mode);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_exp  ON subscriptions(expires_at);
```

**Simple Mode users:** `tier = 'free'`. They can save plans to the database if signed in, but cannot generate server-side PDFs and cannot access Advanced or Expert Mode calculations.

---

## 10. MATH VERIFICATION PROTOCOL

### The Problem
There is no human accountant or financial analyst checking every calculation. The developer (human or AI) must prove the math is correct without a live expert.

### The Solution: Golden Test Cases + Cross-Validation

#### Step 1: Define Golden Test Cases

Each golden test case contains:
- A fixed set of inputs (no randomness)
- The expected output computed by hand, verified against two independent sources (e.g., Excel + manual calculation)
- Tolerance for floating-point comparison: `|computed − expected| < 0.01`

**Golden Test Case G-001: Single-Product Break-Even**
```
Inputs:
  sellingPrice = 10,000
  variableCost = 4,000
  monthlyFoundation = 600,000
  totalFuel = 200,000
  totalProtection = 100,000
  unitsPerWeek = 50

Expected:
  contributionMargin      = 10,000 − 4,000 = 6,000
  totalMonthlyFixed       = 600,000 + 200,000 + 100,000 = 900,000
  OBE_units               = 900,000 / 6,000 = 150 units
  OBE_weeks               = 150 / 50 = 3 weeks
  monthlyRevenue          = 10,000 × 50 × 4.33 = 2,165,000
  monthlyVariableCosts    = 4,000 × 50 × 4.33 = 866,000
  monthlyOperatingProfit  = 2,165,000 − 866,000 − 900,000 = 399,000
```

**Golden Test Case G-002: Multi-Product WACM (Bookshop)**
```
Products:
  Books:  buy 15,000  sell 25,000  20/week   CM = 10,000  mix = 25%
  Pens:   buy 500     sell 1,500   50/week   CM = 1,000   mix = 62.5%
  Ink:    buy 3,000   sell 8,000   10/week   CM = 5,000   mix = 12.5%

Total units/week = 80
Total weekly revenue   = 25,000×20 + 1,500×50 + 8,000×10 = 500,000+75,000+80,000 = 655,000
Total weekly var costs = 15,000×20 + 500×50 + 3,000×10   = 300,000+25,000+30,000 = 355,000
Total weekly contrib   = 655,000 − 355,000 = 300,000
WACM                   = 300,000 / 80 = 3,750

Monthly fixed costs = 2,000,000
OBE_units = 2,000,000 / 3,750 = 533.33 units/month
Allocated:
  Books: 533.33 × 25%    = 133.33 units  → 3,333,250 UGX
  Pens:  533.33 × 62.5%  = 333.33 units  → 499,995 UGX
  Ink:   533.33 × 12.5%  = 66.67 units   → 533,360 UGX
```

**Golden Test Case G-003: Loan Amortisation**
```
Loan: 10,000,000 at 18% annual, 24 months

monthlyRate = 18 / 100 / 12 = 0.015
PMT = 10,000,000 × [0.015 × (1.015)^24] / [(1.015)^24 − 1]
    = 10,000,000 × [0.015 × 1.42950] / [1.42950 − 1]
    = 10,000,000 × 0.021443 / 0.42950
    = 10,000,000 × 0.049924
    = 499,243 per month

Month 1:
  Interest   = 10,000,000 × 0.015 = 150,000
  Principal  = 499,243 − 150,000 = 349,243
  Balance    = 10,000,000 − 349,243 = 9,650,757

Month 24:
  Balance must be ≈ 0 (within 10 UGX rounding)
```

**Golden Test Case G-004: NPV**
```
InitialInvestment: 50,000,000
CashFlows (years 1-5): [8,000,000, 12,000,000, 15,000,000, 18,000,000, 20,000,000]
WACC: 12% (0.12)

NPV = −50,000,000
    + 8,000,000 / 1.12^1
    + 12,000,000 / 1.12^2
    + 15,000,000 / 1.12^3
    + 18,000,000 / 1.12^4
    + 20,000,000 / 1.12^5

    = −50,000,000
    + 7,142,857
    + 9,566,327
    + 10,676,717
    + 11,436,590
    + 11,348,542

    = 171,033 (positive → acceptable investment)
```

**Golden Test Case G-005: IRR**
```
Same as G-004.
IRR ≈ 12.24% (solve iteratively)
Verify: NPV at 12.24% ≈ 0 (within tolerance of 100)
```

**Golden Test Case G-006: Annuity PV**
```
PV of ordinary annuity: PMT=5,000,000, r=10%, n=5 years
= 5,000,000 × [1 − (1.10)^−5] / 0.10
= 5,000,000 × [1 − 0.620921] / 0.10
= 5,000,000 × 3.79079
= 18,953,950
```

#### Step 2: Automated Cross-Validation CI Tests

Create a test script that:
1. Runs each golden case through the TypeScript WACM engine
2. Sends the same inputs to the Python `/planner/validate` endpoint
3. Compares outputs — any difference > 0.01 fails the build

```typescript
// tests/crossValidation.test.ts
describe('TypeScript ↔ Python cross-validation', () => {
  it('G-001: Single-product break-even matches Python', async () => {
    const tsResult = computeSimpleRoadmap(G001_INPUTS);
    const pyResult = await fetch('/planner/validate', {
      method: 'POST',
      body: JSON.stringify({ mode: 'simple', inputs: G001_INPUTS })
    }).then(r => r.json());

    expect(Math.abs(tsResult.breakEvenUnits - pyResult.break_even_units)).toBeLessThan(0.01);
    expect(Math.abs(tsResult.wacm - pyResult.wacm)).toBeLessThan(0.01);
  });
});
```

```python
# tests/test_golden.py
import pytest
from services.wacm import compute_wacm, allocate_break_even
from services.advanced import compute_loan_schedule, compute_depreciation
from services.expert import compute_npv, compute_irr, annuity

def test_G001_single_product_breakeven():
    result = compute_break_even(
        total_foundation=600_000,
        total_fuel=200_000,
        total_protection=100_000,
        wacm=6_000
    )
    assert abs(result - 150) < 0.01

def test_G002_multi_product_wacm():
    items = [
        LineItem("b", "Books", 25000, 15000, 20),
        LineItem("p", "Pens",  1500,  500,   50),
        LineItem("i", "Ink",   8000,  3000,  10),
    ]
    r = compute_wacm(items)
    assert abs(r.wacm - 3750) < 0.01
    assert abs(r.weekly_total_contribution - 300_000) < 0.01

def test_G004_npv():
    result = compute_npv(50_000_000, [8e6, 12e6, 15e6, 18e6, 20e6], 0.12)
    assert abs(result - 171_033) < 500   # 500 UGX tolerance for rounding

def test_G005_irr():
    result = compute_irr(50_000_000, [8e6, 12e6, 15e6, 18e6, 20e6])
    # IRR ≈ 12.24%; verify NPV at that rate ≈ 0
    npv_at_irr = compute_npv(50_000_000, [8e6, 12e6, 15e6, 18e6, 20e6], result)
    assert abs(npv_at_irr) < 100
```

#### Step 3: Excel Reference Workbook

Maintain a file `tests/golden-cases.xlsx` with the same inputs and hand-computed expected outputs. This is the "source of truth" that does not depend on either TypeScript or Python. When adding a new calculation to the app, add a corresponding sheet in this workbook first.

#### Step 4: User-Facing Verification

Add a "Verify calculation" expandable section to all results screens showing:
- The formula used
- Each input value substituted into the formula
- The intermediate steps
- The final result

This lets accountants review the math without needing to read code.

---

## 11. PRICING ARCHITECTURE AND FEATURE TIERS

### 11.1 Product Tiers

#### Free — Simple Mode (Forever Free)

**Target:** Market vendors, kiosk owners, first-time entrepreneurs

**What's included:**
- Full Simple Mode: break-even, investment payback, monthly profit projections
- Multi-product support (retail, wholesale, service, manufacturing)
- Per-product break-even allocation
- Margin health indicators
- Client-side PDF download
- No account required for calculation
- Sign up to save plans (free account, no subscription)

**What's NOT included:**
- Depreciation calculations
- Loan amortisation
- Tax calculations
- Scenario analysis
- Advanced/Expert Mode access
- Server-side PDF generation
- Plan sharing

**Pricing card wording:**
> **Simple Mode**
> Free — Forever
> For small businesses and market traders
> *(Pricing for advanced features coming soon)*

#### Advanced — Growth-Stage Business Plan

**Target:** Registered SMEs, loan applicants, businesses with fixed assets

**What's included:**
- Everything in Simple Mode
- Multi-product WACM in all calculations
- Full depreciation schedule (Straight-Line + Double Declining Balance)
- Complete loan amortisation schedule
- Monthly P&L: EBITDA → EBIT → EBT → Net Profit
- Annual operating break-even
- Three-scenario analysis (pessimistic / base / optimistic)
- 52-week cash flow timeline
- Tax calculation (flat effective rate)
- Investment payback period
- Server-side PDF — bank-ready business plan format
- Save and load plans
- Plan history

**Pricing card wording:**
> **Advanced Mode**
> Pricing coming soon
> For growing businesses seeking loans or investment
> *(Join the waitlist to be notified)*

#### Expert — Investment Appraisal Suite

**Target:** CFOs, finance directors, multinationals, investment analysts, MBAs

**What's included:**
- Everything in Advanced Mode
- 3-year and 5-year financial projections
- Net Present Value (NPV)
- Internal Rate of Return (IRR)
- Modified IRR (MIRR)
- Profitability Index
- Discounted Payback Period
- Future Value and Present Value of Annuities (ordinary + annuity due)
- Growing annuity and perpetuity
- Terminal value (Gordon Growth Model + Exit Multiple)
- Sensitivity analysis and tornado chart
- Working capital cycle (AR days, AP days, inventory days)
- Multi-currency support with FX assumptions
- Full Uganda tax modeling (VAT, PAYE, NSSF, WHT, thin capitalisation)
- Per-product growth rates over projection period
- DFI-grade PDF output (IFC, DEG, Norfund format)
- Unlimited plan saves
- Priority support

**Pricing card wording:**
> **Expert Mode**
> Pricing coming soon
> For CFOs, investment analysts, and multinationals
> *(Join the waitlist to be notified)*

### 11.2 Feature Comparison Table

| Feature | Simple (Free) | Advanced | Expert |
|---|:---:|:---:|:---:|
| Single-product break-even | ✅ | ✅ | ✅ |
| Multi-product WACM break-even | ✅ | ✅ | ✅ |
| Per-product break-even allocation | ✅ | ✅ | ✅ |
| Margin health per product | ✅ | ✅ | ✅ |
| Operating break-even | ✅ | ✅ | ✅ |
| Investment payback (simple) | ✅ | ✅ | ✅ |
| Monthly revenue & profit | ✅ | ✅ | ✅ |
| Year 1 & Year 2 projections | ✅ | ✅ | ✅ |
| Client-side PDF download | ✅ | ✅ | ✅ |
| Save plans (requires sign-in) | ✅ | ✅ | ✅ |
| **Depreciation (SL + DDB)** | ❌ | ✅ | ✅ |
| **Depreciation schedule** | ❌ | ✅ | ✅ |
| **Loan amortisation schedule** | ❌ | ✅ | ✅ |
| **EBITDA / EBIT / EBT separation** | ❌ | ✅ | ✅ |
| **Annual operating break-even** | ❌ | ✅ | ✅ |
| **Tax calculation** | ❌ | ✅ | ✅ |
| **Scenario analysis (±20%)** | ❌ | ✅ | ✅ |
| **52-week cash flow timeline** | ❌ | ✅ | ✅ |
| **Bank-ready PDF (server-side)** | ❌ | ✅ | ✅ |
| **3-year / 5-year projections** | ❌ | ❌ | ✅ |
| **Net Present Value (NPV)** | ❌ | ❌ | ✅ |
| **Internal Rate of Return (IRR)** | ❌ | ❌ | ✅ |
| **Modified IRR (MIRR)** | ❌ | ❌ | ✅ |
| **Profitability Index** | ❌ | ❌ | ✅ |
| **Discounted payback period** | ❌ | ❌ | ✅ |
| **Present/Future value of annuities** | ❌ | ❌ | ✅ |
| **Growing annuity / perpetuity** | ❌ | ❌ | ✅ |
| **Terminal value** | ❌ | ❌ | ✅ |
| **Sensitivity / tornado chart** | ❌ | ❌ | ✅ |
| **Working capital cycle** | ❌ | ❌ | ✅ |
| **Multi-currency + FX** | ❌ | ❌ | ✅ |
| **Full Uganda/international tax** | ❌ | ❌ | ✅ |
| **Multi-year per-product growth** | ❌ | ❌ | ✅ |
| **DFI-grade PDF output** | ❌ | ❌ | ✅ |
| **Thin capitalisation rules** | ❌ | ❌ | ✅ |
| **Carry-forward tax losses** | ❌ | ❌ | ✅ |
| Priority support | ❌ | ❌ | ✅ |

### 11.3 VunaBooks Subscriber Benefit

Users with an active VunaBooks subscription get Advanced Mode included. This is checked via:
```
GET /subscriptions/status
→ { tier: 'advanced', source: 'vunabooks_subscription', expires_at: '...' }
```

No separate payment needed. The VunaBooks subscription grants Advanced Mode access.

---

## 12. SIMPLE MODE INSIDE ADVANCED MODE

**Decision: Yes — Advanced Mode must include a Simple Mode Summary panel.**

Rationale: An Advanced Mode user needs to see both the strategic overview (Simple) and the detailed financial analysis (Advanced) in one place. Forcing them to switch modes to see the basic break-even is a UX failure.

**Implementation:**

Advanced Mode has 7 input sections. After completion, the results dashboard shows:

```
┌──────────────────────────────────────────────────────┐
│  QUICK SUMMARY (Simple Mode View)                    │
│  Operating Break-Even:    534 units/month            │
│  Investment Payback:       7.2 months                │
│  Monthly Profit (simple):  812,000 UGX               │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  DETAILED ANALYSIS (Advanced Mode View)              │
│  EBITDA:                   980,000 UGX/month         │
│  After depreciation (EBIT): 903,000 UGX/month        │
│  After loan interest (EBT): 804,000 UGX/month        │
│  After tax (Net Profit):    563,000 UGX/month        │
│  Annual operating BEP:      Week 11 of the year      │
│  Loan paid off:             Month 24                 │
└──────────────────────────────────────────────────────┘
```

The Simple Summary section in Advanced Mode uses the same WACM engine — there is no separate calculation. It just presents a simpler label set over the same numbers.

**Simple Mode as a standalone app remains unchanged.** It is not removed. It serves users who will never need Advanced Mode. The inclusion of a Simple Summary inside Advanced Mode does not change or duplicate the Simple Mode product.

---

## 13. SIGN-IN AND DATA STORAGE FLOW

### 13.1 Anonymous User (No Account)

1. User opens VunaMentor
2. Selects a mode (Simple, Advanced — if available)
3. Enters inputs, calculates
4. Sees results
5. Can download PDF (client-side, for Simple Mode)
6. Cannot save plan
7. Sees a persistent banner: "Sign up free to save this plan and access it on any device"

### 13.2 Free Account (Signed In, No Subscription)

1. User registers (email + password)
2. Default subscription tier: `free`
3. Can access Simple Mode fully
4. Can save Simple Mode plans (stored in database)
5. Can load saved Simple Mode plans from any device
6. Sees Advanced and Expert Mode cards with "Pricing coming soon" and waitlist sign-up
7. Cannot access Advanced or Expert Mode features

**Plan save flow:**
```
User finishes calculation →
"Save this plan" button appears →
If not signed in: prompt to sign in / register →
On sign-in: auto-save current plan →
Plan name defaults to business name + date →
User can rename plan
```

### 13.3 Paid Subscriber (Advanced or Expert)

1. User subscribes (mobile money / card — when payments are live)
2. Subscription tier updated in database: `advanced` or `expert`
3. JWT refresh includes new tier claim
4. Frontend unlocks appropriate mode
5. All plans (Simple + Advanced/Expert) saved to database
6. Server-side PDF generation available

### 13.4 Saving Plan Data

When a user saves a plan, the frontend sends:

```json
POST /planner/plans
{
  "mode": "advanced",
  "name": "Kampala Bakery Plan — April 2026",
  "business_type": "manufacturing",
  "currency_code": "UGX",
  "inputs": {
    // The complete form state (all fields the user filled in)
    // This is the same JSON structure as the WizardState or AdvancedFormState
  },
  "results": {
    // The computed results object
    // Stored for fast reload — recalculated on load to ensure freshness
  }
}
```

On load, the frontend recalculates from the stored inputs rather than trusting the stored results. The stored results are only for displaying the plan list without loading each plan fully.

### 13.5 What Simple Mode Users Get for Free

Simple Mode users have a free account and use the same Railway-hosted database as paid users. This means:
- They are using paid infrastructure (Railway costs money)
- Their plans count against database storage
- This is intentional — building the user base is more important than immediate infrastructure cost
- When traffic grows, the plan is to convert a portion to Advanced/Expert subscriptions, which funds the infrastructure

The free tier is sustainable as long as the ratio of paid to free users stays above 5% (rough target). Monitor this metric.

---

## 14. AI DEVELOPER CONSTRAINTS

These rules apply to any AI model (Claude, GPT, Gemini, Cursor, Copilot) modifying this codebase.

**C-01:** Never implement a break-even formula without including ALL fixed cost categories in the numerator. Check that totalFuel and totalProtection are included.

**C-02:** Never duplicate the WACM engine. If a calculation needs WACM, it calls `computeWACM()` from `lib/wacm.ts`. No mode reimplements WACM.

**C-03:** Never show a break-even result without both the Operating Break-Even label AND the Investment Payback label in the same view.

**C-04:** Never use year-1 DDB depreciation as a constant in Expert Mode multi-year projections. Each year uses its own schedule value.

**C-05:** Never compute tax on a loss. Always guard: `max(0, profitBeforeTax × taxRate)`.

**C-06:** Never add NPV, IRR, or annuity calculations to Simple Mode or Advanced Mode.

**C-07:** Never add loan or depreciation calculations to Simple Mode.

**C-08:** After any change to a calculation function, update the corresponding golden test case in `tests/golden-cases.xlsx` before committing.

**C-09:** When a new calculation formula is added to Expert Mode, add the equivalent Python implementation in `services/expert.py` and a golden test in `tests/test_golden.py` in the same pull request.

**C-10:** All monetary output must include the currency code. No bare numbers in results displays.

**C-11:** Never pre-fill financial input fields with non-zero example values. Zero is the only valid default for monetary inputs.

**C-12:** The `WEEKS_PER_MONTH` constant = `52 / 12 = 4.3333...`. Never hardcode `4`, `4.3`, or `4.5`. Always import the constant.

**C-13:** Simple Mode PDF generation is always client-side (jsPDF). Never move Simple Mode PDF to the backend or gate it behind authentication.

**C-14:** Never remove the "Pricing coming soon" text from Advanced and Expert pricing cards until a payment system is live and tested in production.

### Rounding Rules (Section 4)

**R-01:** Never truncate `WEEKS_PER_MONTH` or `DAYS_PER_MONTH`. Always define them exactly as:
- `const WEEKS_PER_MONTH = 52 / 12`
- `const DAYS_PER_MONTH = 365 / 12`

**R-02:** Never use a displayed rounded value in further calculations. Store full-precision internal values and round only at the last display step.

**R-03:** Apply rounding once, at display time only. Monthly profit, safe take-home, weekly safe spend, daily safe spend, weekly buffer, and daily buffer must all be calculated from the full-precision internal chain before display formatting.

**R-04:** Payback period rounds to 2 decimal places by default. If payback is greater than 24 months, 1 decimal place is acceptable. Never default to 1 decimal place for shorter payback periods.

**R-05:** Break-even formula displays the full decimal result with `toFixed(2)`, but the target displayed to the user must always use `Math.ceil()`. Never use `Math.round()` for break-even targets.

**R-06:** WACM displays as `Math.round(wacmInternal)`, but all further calculations must continue using the internal float.

**R-07:** All Simple Mode currency displays must round to the nearest integer and include the currency code suffix. Never show decimal UGX amounts in Simple Mode.

**R-08:** Verification test after any rounding-related change:
- Input: `sell=45000`, `buy_exact=23898.72`, `units_week=50`, `monthly_running=2349000`, `startup=5178055`, `buffer=0.80`
- Expected outputs:
  - `monthly_sales: 9,750,000 UGX`
  - `monthly_restock: 5,178,055 UGX` (accept `5,178,056`)
  - `monthly_profit: 2,222,945 UGX`
  - `safe_take_home: 1,778,356 UGX`
  - `safe_per_week: 410,390 UGX` (accept `410,389`)
  - `safe_per_day: 58,467 UGX` (accept `58,466`)
  - `keep_per_week: 102,597 UGX`
  - `keep_per_day: 14,617 UGX`
  - `payback: 2.33 months`
  - `break_even_target: 112 items/month`
- If any output differs by more than `1 UGX`, do not ship.

---

*End of VunaMentor Calculation Constitution — Version 1.0*
*This document must be reviewed and updated whenever a new calculation is added to any mode.*
*All pull requests touching calculation logic must reference this constitution in the PR description.*
