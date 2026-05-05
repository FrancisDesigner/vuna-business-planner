# Vuna Business Planner - Technical Documentation

## Overview

Vuna Business Planner (also known as Vuna Mentor Engine) is an interactive, multi-mode financial planning and business modeling application designed for African entrepreneurs. It guides users through structured business planning workflows, helping them understand unit economics, categorize costs, set profitable prices, and project financial outcomes.

The application offers three tiers of analysis:
- **Simple Mode**: Beginner-friendly 4-step wizard for small businesses
- **Advanced Mode**: Comprehensive financial modeling for growth-stage businesses (investment up to UGX 100M)
- **Expert Mode**: Waitlist-based tier for large-scale projects requiring complex financial structuring

## Deployment Architecture

The planner uses a dual-deployment model:

- **Vercel Static Frontend**: Simple Mode must run entirely client-side and remain usable offline.
- **Railway FastAPI Backend**: Authentication, saved plans, premium planner features, and future heavy server-side generation run on the existing VunaBooks backend.

The planner is not a separate account system. It shares:

- the existing VunaBooks `users` table
- the existing JWT authentication flows
- the same billing destination and upgrade path

This means a planner user can later move into VunaBooks without re-registering.

---

## Technology Stack

### Core Technologies
| Category | Technology |
|----------|------------|
| **Language** | TypeScript 5.8, JavaScript (ESNext) |
| **Frontend Framework** | React 19 with Vite 6 |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | @base-ui/react, shadcn/ui patterns |
| **Animations** | Framer Motion (`motion/react`) |
| **Icons** | lucide-react |
| **Forms** | react-hook-form with Zod validation |
| **Charts** | Recharts |
| **PDF Generation** | jsPDF, jsPDF-autotable, html2canvas |
| **PWA** | vite-plugin-pwa |

### Build & Development
- **Bundler**: Vite 6 with HMR support
- **Compiler**: TypeScript (target ES2022)
- **CSS Processing**: PostCSS with Autoprefixer
- **Module Resolution**: Bundler-based with path aliases (`@/*` → `./src/*`)
- **Backend Contract**: Existing VunaBooks FastAPI API on Railway (`/api/auth/*` today, planner save/load endpoints to follow)

### Key Dependencies
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "motion": "^12.23.24",
  "lucide-react": "^0.546.0",
  "recharts": "^3.8.1",
  "jspdf": "^4.2.1",
  "jspdf-autotable": "^5.0.7",
  "react-hook-form": "^7.72.0",
  "zod": "^4.3.6",
  "tailwindcss": "^4.1.14"
}
```

---

## Project Structure

```
vuna-business-planner/
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # Base UI components (buttons, inputs, etc.)
│   │   ├── Wizard.tsx       # Simple mode: 4-step wizard controller
│   │   ├── AdvancedWizard.tsx    # Advanced mode: 7-section form
│   │   ├── Step1Entry.tsx   # Business description & categorization
│   │   ├── Step2Buckets.tsx # Cost breakdown (4 buckets)
│   │   ├── Step3Strategy.tsx# Pricing strategy & profit calculation
│   │   ├── Step4Vision.tsx  # Projections & PDF export
│   │   ├── AdvancedResults.tsx   # Advanced mode results dashboard
│   │   ├── ExpertWaitlist.tsx    # Expert mode lead capture
│   │   ├── LandingPage.tsx  # Entry point with mode selection
│   │   ├── FeaturesPage.tsx # Feature comparison
│   │   ├── PricingPage.tsx  # Pricing information
│   │   ├── LessonModal.tsx  # Educational tooltips
│   │   └── PWAInstallPrompt.tsx # PWA installation prompt
│   ├── lib/                 # Business logic & utilities
│   │   ├── calculator.ts         # Simple mode calculation engine
│   │   ├── advancedCalculator.ts # Advanced mode calculation engine
│   │   ├── pdfGenerator.ts       # PDF generation logic (Simple mode)
│   │   ├── templates.ts          # Industry templates & categorization
│   │   └── utils.ts              # Helper functions
│   ├── types/               # TypeScript type definitions
│   │   ├── types.ts         # Simple mode types
│   │   └── advanced.ts      # Advanced mode types
│   ├── App.tsx              # Main router & mode selector
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles (Tailwind)
├── components/
│   └── ui/                  # Additional UI component library
├── public/                  # Static assets (PWA icons, etc.)
├── docs/
│   └── ADVANCED_AND_EXPERT_MODES.md # Advanced/Expert mode documentation
├── .env.example             # Environment variable template
├── package.json             # Dependencies & scripts
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── components.json          # shadcn/ui configuration
```

---

## Core Features & Application Flow

### Simple Mode (4-Step Wizard)

#### Step 1: The Three Questions (Entry)
**File**: `src/components/Step1Entry.tsx`

- **Smart Categorization**: Regex-based business categorization engine (`src/lib/templates.ts`)
  - Manufacturing: `make|produce|build|create|manufacture|craft|cook|bake...`
  - Retail: `sell|shop|store|kiosk|retail|boutique|supermarket...`
  - Wholesale: `distribute|wholesale|supply|bulk|export|import...`
  - Services: `service|repair|salon|consult|clean|teach|drive...`
- **Sales Velocity**: Weekly sales volume input with thousands separators
- **Location Tracking**: Operating location for contextual benchmark suggestions

#### Step 2: The Four Buckets (Cost Breakdown)
**File**: `src/components/Step2Buckets.tsx`

Dynamic cost allocation into four categories:
1. **The Seed (Variable Costs)**: Direct production costs
2. **The Foundation (Fixed Costs)**: Monthly overhead (rent, equipment)
3. **The Fuel (Operating Costs)**: Day-to-day running costs
4. **The Protection (Risk Costs)**: Insurance, spoilage, shrinkage

Features:
- Batch yield calculation for accurate unit base cost
- Interactive "See How" buttons with contextual analogies
- Industry-specific cost templates from `INDUSTRY_TEMPLATES`

#### Step 3: Rule of Three (Pricing Strategy)
**File**: `src/components/Step3Strategy.tsx`

Dynamic pricing tiers based on Unit Base Cost:
- **Survival Price**: Base Cost × 1.2 (20% margin)
- **Business Price**: Base Cost × 2.0 (100% margin)
- **Growth Price**: Base Cost × 3.0 (200% margin)

Features:
- Real-time profit tracking (color-coded: green for profit, red for loss)
- Visual thermometer slider showing price zones
- Capital loss protection (prevents proceeding below unit base cost)

#### Step 4: The Vision (Projections & Export)
**File**: `src/components/Step4Vision.tsx`

Outputs:
- Break-even analysis and payback outputs
- Timeline generation (weeks to turning point)
- Year 1 vs Year 2 projections (demonstrating equipment payoff impact)
- Export and save actions must follow capability gating rules from the deployment contract

---

### Advanced Mode (7-Section Financial Model)

**Files**: `src/components/AdvancedWizard.tsx`, `src/components/AdvancedResults.tsx`

**Target**: Growth-stage businesses, single-product models, investment up to UGX 100M

#### Input Sections
1. **Business Profile**: Name, location, industry, total planned investment
2. **Variable Costs**: Raw materials, direct labor, packaging, batch yield
3. **Fixed Costs (CapEx)**: Equipment cost, depreciation method, useful life, salvage value, rent, salaries
4. **Operating Costs**: Utilities, transport, marketing
5. **Financing**: Loan amount, interest rate, term length
6. **Tax & Assumptions**: Flat tax rate on net profit
7. **Sales Strategy**: Expected weekly units, selling price

#### Financial Outputs
- **Business Summary**: Total investment, break-even point, monthly/annual net profit
- **Visual Timeline**: 52-week interactive chart (Recharts) showing cumulative revenue, costs, net cash
- **Scenario Planning**: Low Sales (-20%), Expected Sales, High Sales (+20%) projections
- **Depreciation Schedule**: Straight-line or Double Declining Balance methods
- **Loan Amortization**: 12-month payment schedule
- **Monthly Profit Breakdown**: Detailed P&L statement

#### Data Persistence
- Auto-save to `localStorage` (`vuna_advanced_form`)
- Manual JSON export/import for backup
- Payment status tracking (`vuna_payment_status`)
- Future authenticated persistence must reuse the shared VunaBooks auth/session model

---

## Platform Constraints

- Simple Mode must not require a successful backend request to load, calculate, or display results.
- If Railway is unavailable, the frontend must degrade gracefully and keep browser-safe features working.
- Authenticated planner features must connect to the shared VunaBooks FastAPI backend on Railway.
- Product gating must be explicit for save, premium PDF, and paid-mode access.

---

### Expert Mode (Waitlist)

**File**: `src/components/ExpertWaitlist.tsx`

**Target**: Large-scale projects (Investment > UGX 100M), multi-product businesses

**Planned Features**:
- Multi-product modeling with different margins/SKUs
- Working capital calculations (inventory cycles, credit sales)
- Advanced metrics: NPV, IRR
- Investor-ready reports for bank loans/equity

**Current Implementation**: Lead capture form with validation (name, email, phone, business details, investment size, needs)

---

## Key Algorithms & Calculations

### Simple Mode (`src/lib/calculator.ts`)

```typescript
// 1. Unit Base Cost
unitBaseCost = totalSeed / batchYield

// 2. Total Base Cost (Allocated)
baseCost = unitBaseCost + (fixedCostsPerMonth / salesPerMonth)

// 3. Pricing Tiers
survivalPrice = unitBaseCost × 1.2
businessPrice = unitBaseCost × 2.0
growthPrice = unitBaseCost × 3.0

// 4. Contribution Margin
contributionMargin = selectedPrice - unitBaseCost

// 5. Break-Even Analysis
breakEvenUnits = totalFoundation / contributionMargin
weeksToTurningPoint = breakEvenUnits / salesPerWeek

// 6. Profit Projections
monthlyRevenue = selectedPrice × monthlySales
monthlyVariableCosts = unitBaseCost × monthlySales
monthlyOperatingProfit = monthlyRevenue - monthlyVariableCosts - monthlyFixedCosts

projectedHarvest12Months = (monthlyOperatingProfit × 12) - equipmentCost
projectedHarvestYear2 = monthlyOperatingProfit × 12  // Equipment paid off
```

### Advanced Mode (`src/lib/advancedCalculator.ts`)

```typescript
// 1. Unit Economics
unitBaseCost = (rawMaterials + directLabor + packaging + otherVariable) / batchYield
contributionMargin = sellingPrice - unitBaseCost

// 2. Monthly Fixed Operations
monthlyFixedOps = rent + salaries + otherFixed + utilities + transport + marketing + otherOperating

// 3. Depreciation (Straight-Line)
annualDepreciation = (equipmentCost - salvageValue) / usefulLife

// 4. Depreciation (Double Declining Balance)
decliningRate = 2 / usefulLife
annualDepreciation = currentBookValue × decliningRate

// 5. Loan Payment (Amortization)
monthlyRate = annualInterestRate / 100 / 12
monthlyPayment = (loanAmount × monthlyRate × (1 + monthlyRate)^term) / ((1 + monthlyRate)^term - 1)

// 6. Monthly Profit
monthlyProfitBeforeTax = revenue - variableCosts - fixedOps - depreciation - loanInterest
monthlyTax = max(0, profitBeforeTax × taxRate)
monthlyNetProfit = profitBeforeTax - tax

// 7. Break-Even
breakEvenUnits = totalAnnualFixed / contributionMargin
weeksToBreakEven = breakEvenUnits / unitsPerWeek
monthsToBreakEven = weeksToBreakEven / 4.33

// 8. Scenario Analysis
pessimistic = calcScenario(0.8)  // -20% sales
optimistic = calcScenario(1.2)   // +20% sales
```

---

## PDF Generation (`src/lib/pdfGenerator.ts`)

Generates a professional 3-page PDF business plan:

### Page 1: Executive Summary & Cost Breakdown
- Sales speed, selected price, contribution margin
- Weeks to recovery, 1-year profit projection
- Four buckets breakdown with batch yield
- Pricing strategy comparison

### Page 2: Timeline & Projections
- Items needed to recover investment
- Sales speed and recovery timeline
- Year 1 vs Year 2 profit comparison

### Page 3: Business Advice Report
- Recovery analysis with detailed calculations
- Slow sales scenario planning
- Minimum price warnings
- Conditional "Start Small" advice (if monthly profit < running costs)
- Reality check on estimates vs actuals
- Actionable next steps

**Footer**: "Generated by Vuna Mentor Engine - Track this in VunaBooks"

---

## Industry Templates (`src/lib/templates.ts`)

Pre-configured cost suggestions by business category:

| Category | Seed Costs | Foundation Costs | Fuel Costs | Protection Costs |
|----------|-----------|------------------|------------|------------------|
| **Manufacturing** | Raw materials, Packaging, Power/water | Equipment, Workspace rent, Machine operators | Transport, Storage, Maintenance | Machine repair, Spoilage |
| **Retail** | Cost of goods, Customer packaging | Shop rent, Licenses, Security, Fixtures | Bags/receipts, Utilities, Transport | Theft insurance, Damages/Shrinkage |
| **Wholesale** | Purchase price, Import duties | Warehouse rent, Delivery vehicle, Sales staff | Fuel, Phone/internet, Loading labor | Stock loss, Bad debt |
| **Services** | Materials per job, Subcontractors | Tools/equipment, Workspace, Certifications | Transport, Internet, Marketing, Rework | Customer complaints, Rework |

**Helper Suggestions**: Location-based cost benchmarks for rent, salaries, and typical expenses.

---

## Type System

### Simple Mode Types (`src/types.ts`)

```typescript
type BusinessCategory = 'manufacturing' | 'retail' | 'wholesale' | 'services';

interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  completedSteps: number[];
  isExpertMode: boolean;
  step1_entry: { activityDescription, category, location, salesPerWeek };
  step2_buckets: { seedCosts, foundationCosts, fuelCosts, protectionCosts, batchYield };
  step3_strategy: { selectedPrice };
  step4_vision: { pdfGenerated };
}

interface CalculationResult {
  baseCost, unitBaseCost, survivalPrice, businessPrice, growthPrice;
  totalSeed, totalFoundation, totalFuel, totalProtection;
  contributionMargin, breakEvenUnits, weeksToTurningPoint;
  projectedHarvest12Months, projectedHarvestYear2;
  warnings, monthlySales, monthlyProfit;
}

interface LessonCard {
  id, title, formula;
  userValues: { label, value, formatted }[];
  explanation, analogy;
  visualType: 'progress-bar' | 'equation' | 'timeline';
  actionText;
}
```

### Advanced Mode Types (`src/types/advanced.ts`)

```typescript
interface AdvancedFormState {
  businessName, location, industry;
  totalInvestment, equipmentCost, usefulLife, salvageValue;
  depreciationMethod: 'straight-line' | 'double-declining';
  rawMaterials, directLabor, packaging, otherVariable;
  batchYield, monthlyRent, monthlySalaries, monthlyOtherFixed;
  utilities, transport, marketing, otherOperating;
  loanAmount, annualInterestRate, loanTermMonths;
  taxRate, unitsPerWeek, sellingPrice;
}
```

---

## Routing & Mode Selection

**File**: `src/App.tsx`

The application router manages three modes:
- `mode === 'simple'` → `<Wizard />`
- `mode === 'advanced'` → `<AdvancedWizard />`
- `mode === 'expert'` → `<ExpertWaitlist />`

**Investment Cap Redirect**: If investment > UGX 100,000,000 in Advanced Mode, triggers warning card prompting adjustment or Expert Mode waitlist signup.

---

## PWA Configuration

**File**: `vite.config.ts`

```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'VunaBooks Mentor',
    short_name: 'VunaMentor',
    description: 'Financial planning and modeling for African businesses.',
    theme_color: '#10b981',
    background_color: '#f8fafc',
    display: 'standalone',
    icons: [{ src: 'pwa-icon.svg', sizes: '192x192 512x512', type: 'image/svg+xml' }]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}']
  }
})
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000, all interfaces)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking (lint)
npm run lint

# Clean build artifacts
npm run clean
```

---

## Environment Variables

**File**: `.env.local`

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Required for AI-powered features (if enabled).

---

## Key Design Patterns

### State Management
- **Simple Mode**: React state in `Wizard.tsx` with step transitions
- **Advanced Mode**: `react-hook-form` with Zod schema validation
- **Persistence**: `localStorage` for draft forms and payment status

### Validation
- Zod schemas for form validation
- Real-time validation on input changes
- Investment cap enforcement (>100M redirects to Expert waitlist)

### Animations
- Framer Motion for page transitions
- Smooth step transitions in wizards
- Interactive chart animations (Recharts)

### Responsive Design
- Mobile-first Tailwind CSS
- Breakpoints for tablet and desktop
- PWA-optimized for mobile installation

---

## Integration Points

### VunaBooks Integration
- PDF footer: "Track this in VunaBooks"
- Positioned as upstream planning tool for VunaBooks accounting software
- Seamless handoff from planning to ongoing tracking

### Deployment
- Deployed via Business Planner
- App URL: https://ai.studio/apps/425614bb-4026-4119-b2c8-4ff4709cec72
- HMR disabled in production via `DISABLE_HMR` environment variable

---

## Performance Considerations

- **Code Splitting**: Vite automatic code splitting
- **Lazy Loading**: Component-level lazy loading for heavy features
- **Memoization**: React.memo for expensive calculations
- **Debouncing**: Input debouncing for real-time calculations
- **PWA Caching**: Workbox service worker for offline support

---

## Security Considerations

- Client-side only (no backend API calls except optional AI features)
- Environment variables for API keys
- No sensitive data persisted beyond localStorage
- Input sanitization via Zod validation
- XSS protection via React's default escaping

---

## Future Enhancements

### Planned Features
1. **Expert Mode Full Implementation**
   - Multi-product modeling
   - NPV/IRR calculations
   - Working capital cycles
   - Investor-ready report formats

2. **AI Integration**
   - Automated cost suggestions via Gemini API
   - Industry benchmark comparisons
   - Personalized advice generation

3. **Data Export**
   - Excel/CSV export for financial models
   - Integration with VunaBooks API
   - Cloud sync option

4. **Localization**
   - Multi-language support (Swahili, Luganda, etc.)
   - Currency flexibility beyond UGX
   - Regional benchmark databases

---

## License & Attribution

Part of the VunaBooks ecosystem. Designed for African entrepreneurs.
