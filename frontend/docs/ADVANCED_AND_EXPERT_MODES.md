# Vuna Mentor Engine: Advanced & Expert Modes Documentation

## Overview

The Vuna Mentor Engine offers tiered analysis capabilities. While Simple Mode caters to beginners, **Advanced Mode** provides comprehensive financial modeling for growth-stage businesses, and **Expert Mode** targets large-scale investments requiring complex financial structuring.

---

## 1. Advanced Mode

**Target Audience:** Growth-stage businesses, single-product/service models, total investment up to UGX 100M.  
**Access:** Paid ($13 one-time fee) or included free with a VunaBooks subscription.

### File Locations
- **Wizard UI:** `src/components/AdvancedWizard.tsx`
- **Results UI:** `src/components/AdvancedResults.tsx`
- **Logic/Calculator:** `src/lib/advancedCalculator.ts`
- **Types:** `src/types/advanced.ts`

### Key Features & Capabilities

1. **7-Section Comprehensive Input Form:**
   - **Business Profile:** Name, location, industry, total planned investment.
   - **Variable Costs (Production Costs):** Raw materials, labor, packaging, batch yield.
   - **Fixed Costs (Capital Expenditure):** Equipment, depreciation method (Straight-line or Double Declining), useful life, salvage value, rent, salaries.
   - **Operating Costs (Monthly Expenses):** Utilities, transport, marketing.
   - **Financing:** Loan amount, interest rate, term length.
   - **Tax & Assumptions:** Flat tax rate on net profit.
   - **Sales Strategy:** Expected weekly units, selling price.

2. **Real-Time Helpers:**
   - Dynamic Base Cost per Unit calculation as users type.
   - "Suggested Price Ranges" pricing recommendations (Minimum, Standard, High).

3. **Financial Modeling & Outputs:**
   - **Business Summary:** Total investment, break-even point, monthly/annual net profit.
   - **Visual Timeline:** 52-week interactive chart (Recharts) showing cumulative revenue, costs, and net cash position.
   - **Scenario Planning:** Low Sales (-20%), Expected Sales, and High Sales (+20%) volume projections.
   - **Schedules:** Depreciation schedule and 12-month loan amortization table.
   - **Monthly Profit Breakdown:** Detailed profit and loss breakdown.

4. **Persistence & Export:**
   - **Auto-Save:** Form state is saved to `localStorage` (`vuna_advanced_form`).
   - **Manual Backup:** Users can download their raw JSON data and restore it later.
   - **PDF Export:** Browser-based PDF generation using `jsPDF` and `html2canvas`.

### Data Flow & State Management
- Uses `react-hook-form` with `zod` for strict schema validation.
- `localStorage` keys:
  - `vuna_advanced_form`: Stores the draft form data.
  - `vuna_payment_status`: Tracks if the user has unlocked the results (`true`/`false`).

---

## 2. Expert Mode

**Target Audience:** Large-scale projects (Investment > UGX 100M), multi-product businesses, complex financial structures.  
**Current Status:** Waitlist / Lead Generation.

### File Location
- **Waitlist UI:** `src/components/ExpertWaitlist.tsx`

### Key Features (Planned)
- **Multi-Product Modeling:** Handle different margins and sales volumes for multiple SKUs.
- **Working Capital Calculation:** Exact calculations for inventory cycles and credit sales.
- **Advanced Metrics:** Net Present Value (NPV) and Internal Rate of Return (IRR).
- **Investor-Ready Reports:** Formatted specifically for bank loans and equity investors.

### Current Implementation (Waitlist)
- **Form Fields:** Name, Email, Phone, Business Name, Industry, Investment Size, Specific Needs.
- **Validation:** Ensures valid email, phone, and required fields.
- **Submission:** Currently mocks an API call (simulating Airtable/Google Sheets webhook integration). Shows a success state upon completion.

---

## Integration & Routing

Both modes are integrated into the main `App.tsx` router:
- `mode === 'advanced'` renders `<AdvancedWizard />`
- `mode === 'expert'` renders `<ExpertWaitlist />`

**Investment Cap Redirect:**
If a user enters an investment size > UGX 100,000,000 in Advanced Mode, the UI automatically triggers a warning card prompting them to either adjust their investment or join the Expert Mode waitlist.
