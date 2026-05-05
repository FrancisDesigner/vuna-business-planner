# VunaBusinessPlanner — Upgrade Specification
## plan.vunabooks.com | Three-Mode Redesign

**Version:** 1.0  
**Prepared by:** Francis Kumakech, Resilience From Within / Adept Graphics Services  
**Source Frameworks:** Damodaran Corporate Finance (Sessions 6, 10, 12, Capital Structure), McKinsey Valuation, Berman & Knight *Financial Intelligence*, CFI Practitioner Guides

---

## The Design Principle That Governs Everything

A kiosk owner in Gulu and a CFO in Chicago are asking the same question. They just say it differently.

The kiosk owner says: *"Is my business actually working?"*  
The CFO says: *"Is my return on capital exceeding my cost of capital?"*

VunaBusinessPlanner must answer both. The language changes by mode. The math does not.

> **Profit is an opinion. Cash is a fact.**  
> — Berman & Knight, *Financial Intelligence*

This single sentence is the philosophical foundation of all three modes. Every improvement below flows from it.

---

## The Three Questions Every Business Must Answer

Damodaran's Applied Corporate Finance organizes all business decisions into three questions. VunaPlanner must help users answer all three, at whatever depth their mode allows.

| Question | Plain Language | Mode Coverage |
|----------|---------------|---------------|
| **The Investment Decision** | Should I buy this asset, expand, or invest here? | All three modes |
| **The Financing Decision** | How should I pay for it — loan, savings, or partner? | Advanced + Expert |
| **The Distribution Decision** | What do I do with the profit — reinvest or take home? | All three modes |

---

## Mode 1: Simple Mode

### Who This Is For

A kiosk owner in Gulu. A mama selling groundnuts at the market in Arua. A tailor in Lira who has been in business for two years. A bodaboda operator thinking about buying a second bike.

This person does not have an accounting degree. They may not have finished secondary school. They understand their business from the inside, not from a spreadsheet. English may be their third language.

**The rule for Simple mode:** If a 5-year-old cannot understand the output sentence, rewrite it.

---

### What Simple Mode Does Today (Keep As-Is)

- Revenue entry
- Cost entry
- Basic profit calculation
- Break-even estimate
- Salary/owner withdrawal input

The language in these fields stays as currently written. Do not change terminology that the current user base already understands.

---

### What Simple Mode Is Missing (Add These)

#### 1. The Cash Gap Question

**The problem:** A business can show profit and still run out of money. This happens every day in African small business contexts — maize traders, grain sellers, credit-based kiosks. VunaPlanner currently shows profit. It does not show cash timing.

**What to add:** After the revenue input, ask one question:

> *"When do your customers pay you?"*  
> Options: Straight away / Within a week / Within a month / Some pay now, some pay later

If the user selects anything other than "Straight away," show a plain-language flag:

> *"You may have profit on paper but not enough cash in hand. This is normal — but it means you need to keep some cash saved to restock before your customers pay you."*

This is the single most important addition to Simple mode. It is the Berman and Knight lesson translated for a market trader.

---

#### 2. Best Case / Worst Case Toggle

**The problem:** Life is not one number. A rain season destroys sales. A funeral week slows the market. The planner currently gives one answer. Users need to understand the range.

**What to add:** A simple two-position slider or toggle at the results screen:

- **Normal days** → shows current projection
- **Bad month** → automatically reduces revenue by 25% and shows the new profit/loss outcome

Output example:

> *"On a normal month, you earn UGX 180,000 profit. In a difficult month (25% fewer sales), you would earn UGX 82,000 — or possibly nothing if your costs stay the same."*

No formulas visible. No percentages explained. Just two scenarios, two plain sentences.

---

#### 3. The Growth Cash Warning

**The problem:** Growth costs money before it makes money. A kiosk owner who doubles her stock needs double the cash upfront before she sees any revenue from the extra sales.

**What to add:** When a user inputs a growth target (e.g., "I want to grow sales by 50%"), show a plain-language note:

> *"To grow your sales, you will need more stock first. Before you earn more, you will spend more. Make sure you have that extra money available, or a plan to get it."*

This is Damodaran's working capital principle, translated into 5-year-old language.

---

#### 4. Purpose-Setting at the Start

**The problem:** The planner assumes the goal is maximum profit. For many Simple mode users, the real goal is school fees in January, or rent covered by the end of month, or enough to pay one assistant.

**What to add:** One optional question at the very beginning:

> *"What is the most important thing your business needs to do for you right now?"*  
> Options: Cover my family's monthly needs / Save for something big / Grow the business / Pay back a loan / Just keep it running

The answer does not change the math. It changes the framing of every output. A user who says "Pay back a loan" sees their results framed around loan coverage first. A user who says "Save for something big" sees a savings-rate recommendation alongside the profit number.

---

### Simple Mode Language Rules

Every output sentence must pass three tests:

1. Can it be read aloud without sounding like a textbook?
2. Does it tell the user what to do or watch out for, not just what the number is?
3. Would a trader at Gulu Main Market understand it without a translation?

---

## Mode 2: Advanced Mode

### Who This Is For

A small business owner who has been operating for at least one year. A savings group treasurer. An NGO program officer managing a revolving fund. A school bursar. A shop owner who already tracks their own stock. Someone who has used VunaBooks and wants to go deeper on planning.

This user understands profit and loss. They may have some secondary school or vocational training. They think in monthly cycles and have some experience with loans.

---

### What Advanced Mode Does Today (Keep As-Is)

The existing multi-year projection, cost categorization, and salary recovery logic stays. The VunaMentor four-stage confidence flow stays. The business-type terminology (retail/wholesale/service/manufacturing) stays.

---

### What Advanced Mode Is Missing (Add These)

#### 1. Fixed vs. Variable Cost Separation

**The concept (Damodaran Session 12):** Not all costs move with revenue. Rent stays the same whether you sell ten items or a hundred. Staff salary (if fixed) stays the same. Airtime, packaging, transport, raw materials — these move with sales volume.

**Why it matters:** A business with high fixed costs has more risk. When sales fall, costs do not fall with them. The same business has more upside when sales grow, because the extra revenue mostly becomes profit.

**What to add:** In the cost entry section, a toggle on each cost line:

> *"Does this cost change when your sales change?"*  
> Yes (variable) / No (fixed) / Partly (mixed)

Output: A simple statement showing the user their cost structure:

> *"About 60% of your costs are fixed — they stay even if you sell nothing. This means a bad month hurts you harder than a business where most costs are flexible. Your break-even point is X."*

---

#### 2. Interest Coverage Health Check (Debt Safety Indicator)

**The concept (Damodaran Session 10):** The interest coverage ratio tells you how safely a business can service its debt. It is calculated as: operating profit divided by annual interest payments. A ratio above 3 is healthy. A ratio below 1.5 is dangerous.

For a private small business, this is more useful than a credit rating.

**What to add:** If the user has a loan entered, automatically calculate and display:

> *"Your business earns [X] times what it costs to service your loan. [Green: 3+] This is healthy — you can comfortably cover your loan payments. [Yellow: 1.5–3] This is manageable but leaves little room for a difficult month. [Red: below 1.5] This is risky — a small drop in sales could make it hard to meet your loan payments."*

No formula shown. Just the verdict and color.

---

#### 3. Return on Investment (Is This Business Worth Running?)

**The concept (Damodaran Session 12 / McKinsey Valuation):** Return on Invested Capital (ROIC) asks: for every shilling the owner has put into the business, how much does the business earn back each year?

A business earning 8% ROIC in a market where you could earn 14% by putting the same money in a savings group or government bond is not creating value. It is destroying it, even if it shows a profit.

**What to add:** A simple ROIC display alongside the profit:

> *"For every UGX 100 you have invested in this business, it is earning UGX [X] per year — a return of [X]%."*  
> *"The Bank of Uganda savings rate is approximately 12–14%. Your business is [beating / matching / below] that benchmark."*

This is the hurdle rate concept made practical for a Ugandan context. The benchmark rate should be pre-loaded and periodically updated (Bank of Uganda T-bill rate is the right reference).

---

#### 4. Sensitivity Analysis (What-If Table)

**The concept (CFI Financial Modeling / Damodaran):** Every financial projection rests on assumptions. The most important skill in financial planning is understanding which assumptions matter most, and what happens when they change.

**What to add:** A 2×2 sensitivity table at the end of the projection:

|  | Revenue −20% | Revenue as projected | Revenue +20% |
|--|--|--|--|
| **Costs as projected** | UGX X | UGX X | UGX X |
| **Costs +15%** | UGX X | UGX X | UGX X |

Show profit in each cell. Color-code: green = profit, yellow = thin margin, red = loss.

Plain-language summary:

> *"Your business stays profitable in 4 of 6 scenarios. The only scenarios where you lose money are if both your sales drop AND your costs rise at the same time."*

---

#### 5. Reinvestment vs. Distribution Decision

**The concept (Damodaran Corporate Finance — Dividend Decision):** A business cannot grow at 30% per year if the owner takes all the profit home. Growth requires reinvestment. The planner should make this visible.

**What to add:** When the user enters a growth target, show:

> *"To grow your sales by [X]% next year, you will need to reinvest approximately [UGX Y] of your profits back into the business. This leaves [UGX Z] available to take home."*

This extends the existing VunaMentor salary-choice toggle from machine recovery into general growth planning.

---

## Mode 3: Expert Mode

### Who This Is For

An American investor evaluating a business for acquisition or co-investment. A Ugandan accountant or financial analyst. An NGO finance officer preparing a business case for a donor. A development finance institution (DFI) analyst. A VunaBooks power user who understands balance sheets and wants institutional-grade output.

This user speaks the language of finance. They know what EBITDA means. They expect to see a discount rate, a projection horizon, and a valuation. They will compare what VunaPlanner produces against what a CFO would produce.

**The rule for Expert mode:** It must produce output that would not embarrass a finance professional in a room with institutional investors.

---

### What Expert Mode Needs (Full Build)

#### 1. Uganda-Contextualized Hurdle Rate (Pre-Loaded)

**The concept (Damodaran Session 6 — Risk-Free Rate):** Every investment decision needs a hurdle rate: the minimum acceptable return. For Uganda-based businesses, the correct baseline is the Bank of Uganda Treasury bill rate, adjusted for the country's default spread.

Damodaran's own January 2025 data shows Uganda and Kenya in the 14–16% range for total risk-adjusted cost of capital. The planner should:

- Pre-load the current Bank of Uganda 91-day T-bill rate (update quarterly)
- Add the Uganda country risk premium (approximately 5–7% above the US base)
- Display the resulting hurdle rate to the user with a plain explanation:

> *"In Uganda, money invested in a government security earns approximately X%. For a private business investment to make sense, it should earn more than this — otherwise, the investor would do better putting money in a safer instrument."*

All projections in Expert mode are benchmarked against this rate.

---

#### 2. Return Spread as the Headline Metric

**The concept (Damodaran Session 12 — Global Return Spreads):** The single most revealing number about a business is its Return Spread: ROIC minus WACC. Damodaran's global data shows that in the Africa and Middle East region, 83% of firms have a return spread more than 5 percentage points below their cost of capital. Most businesses are destroying value even while showing a profit.

**What to add:** The Expert mode dashboard leads with:

> **Return Spread: [+X% / −X%]**  
> *"Your business earns X% on its capital. The cost of that capital in Uganda is approximately Y%. Your return spread is [positive/negative] Z%."*  
> *"A positive spread means this business is creating value above its cost of capital. A negative spread means it is consuming more value than it generates, even if it shows a monthly profit."*

Contextual benchmark:

> *"For reference, only 25% of businesses in the Africa and Middle East region earn a positive return spread. If your business is in that 25%, it is performing better than three out of four businesses in your region."*

---

#### 3. Full WACC Calculation

**The concept (Damodaran Sessions 6 + 10):** WACC (Weighted Average Cost of Capital) blends the cost of equity and the cost of debt, weighted by how much of each the business uses.

For a small business in Uganda:

- **Cost of Debt** = actual loan interest rate (entered by user)
- **Cost of Equity** = Uganda hurdle rate (pre-loaded, can be adjusted)
- **Weight of Debt** = loan balance ÷ total capital invested
- **Weight of Equity** = owner's capital ÷ total capital invested

The planner calculates WACC automatically from these inputs. No user needs to understand the formula. They need to understand the output:

> *"Your blended cost of capital — combining your loan and your own investment — is approximately X% per year. This is the minimum your business needs to earn to justify running it."*

---

#### 4. Debt Capacity and Optimal Structure (Capital Structure Module)

**The concept (Damodaran Capital Structure slides — "U-Shaped Cost of Capital"):** Every business has an optimal debt level. Too little debt means the owner is using expensive equity when cheaper debt is available. Too much debt means the interest coverage ratio falls, financial risk rises, and lenders charge more.

The optimal debt level is the one that minimizes WACC.

**What to add:** An optional Capital Structure module in Expert mode:

- Input: current debt amount, interest rate, operating profit
- Output: interest coverage ratio with rating equivalent (using Damodaran's synthetic rating table)
- Visual: a simple curve showing how WACC changes as debt increases
- Verdict: *"Your current debt level represents [X]% of your total capital. Based on your coverage ratio, you have [room to borrow more / reached a healthy limit / taken on too much debt]."*

Key insight surfaced for the user:

> *"Your own money is not free. As the business owner, you take all the risk — which means you must demand a higher return on your investment than a bank charges on a loan. A loan at 20% is actually cheaper than your equity, if your business earns more than 20%."*

This is the most counterintuitive lesson in all of corporate finance. It needs to appear clearly in Expert mode.

---

#### 5. NPV Calculator with Terminal Value

**The concept (Damodaran Session 12 — NPV, IRR, Terminal Value):** Net Present Value is the gold standard for investment decisions. It answers: if you invest X today and receive Y over the next several years, is this investment worth making?

The terminal value — the present value of all cash flows beyond the projection horizon — is calculated using the growing perpetuity formula:

> Terminal Value = Cash Flow in Final Year × (1 + Long-term Growth Rate) ÷ (Cost of Capital − Long-term Growth Rate)

**What to add:** A 5-year NPV calculator in Expert mode:

- User inputs: initial investment, annual cash flow projections (or use the planner's generated projections), exit year
- Pre-loaded: Uganda discount rate, long-term growth assumption (defaulting to Uganda's approximate long-term inflation rate of 5–7%)
- Output: NPV, IRR, and verdict

Output example:

> *"At a discount rate of 16% (Uganda cost of capital), the net present value of this investment is UGX [X]. This means the investment creates [/ destroys] approximately UGX [X] of value above what you would earn putting the same money in a safer instrument."*  
> *"The internal rate of return is [X]%. The project [exceeds / falls short of] your hurdle rate of [Y]%."*

**Currency consistency rule (Damodaran Session 12):** All cash flows and discount rates must be in the same currency. If working in Uganda Shillings, the discount rate must be the Shilling-denominated rate (which already incorporates Uganda's inflation). The planner enforces this automatically and does not allow mixed-currency inputs.

---

#### 6. Business Valuation Output

**The concept (McKinsey Valuation / Damodaran):** The Expert mode user often needs to know what the business is worth — for a potential investor, for a sale, for bringing in a co-owner, or for a donor that wants to see economic sustainability.

Two valuation methods are appropriate for small private businesses:

**Method A — Revenue Multiple:**  
A quick estimate using sector multiples. Example: retail businesses in East Africa typically sell for 0.8 to 1.5 times annual revenue. The planner pre-loads sector-specific multiples (updated annually from available East African market data).

> *"Based on your sector and revenue, this business has an estimated market value of UGX [X] to UGX [Y]. This is a rough estimate — an actual sale would depend on your specific assets, customer relationships, and negotiation."*

**Method B — DCF Valuation (from the NPV calculator):**  
If the user has completed the NPV calculator, the planner derives an implied business value:

> *"Based on your projected cash flows and a discount rate of X%, the intrinsic value of this business is approximately UGX [Z]."*

Both methods are shown side by side with a plain note:

> *"These are two different ways of estimating value. The revenue multiple reflects what buyers typically pay. The DCF reflects what the cash flows are actually worth. If the DCF value is significantly lower than the market multiple, the business may be overpriced relative to its earnings power."*

---

#### 7. Africa Regional Benchmarking

**The concept (Damodaran Session 12 — Global Return Spreads Table):** Damodaran publishes annual data on return spreads by region. The Africa and Middle East data provides a real benchmark against which any business in Uganda can be measured.

**What to add:** In Expert mode results, show the user where their business sits relative to the regional data:

| Metric | This Business | Africa & Middle East Average |
|--------|--------------|------------------------------|
| Return on Equity | X% | 7.55% |
| Cost of Equity | Y% | 10.98% |
| ROIC | X% | 4.77% |
| WACC | Y% | 9.33% |
| Return Spread | Z% | −4.56% |

Source line: *"Regional averages from Damodaran Global Data, updated annually."*

This table allows an American investor or DFI analyst to immediately contextualize the business against the regional landscape. It also gives a Ugandan business owner a legitimate sense of how their performance compares.

---

## Cross-Mode Features (Apply to All Three)

### Profit vs. Cash Flow Display

Every mode must show both profit and estimated cash position, with a plain explanation of why they may differ. This is the Berman and Knight principle applied universally.

In Simple mode: two numbers, two sentences.  
In Advanced mode: a simple reconciliation (profit → add back depreciation → subtract loan principal payments → adjust for timing → cash available).  
In Expert mode: a full cash flow statement.

---

### Sunk Cost Prompt (Advanced and Expert)

When a user is evaluating a new investment and mentions money already spent, the planner should prompt:

> *"You mentioned that you have already spent [amount] on this. For this analysis, that money is already gone — it does not change whether the new investment makes sense. We will only look at what you will spend and earn from this point forward."*

This prevents the most common decision-making error in business investment: letting past spending drive future decisions.

---

### The Three Corporate Finance Questions as Navigation

In Advanced and Expert modes, the planner's main menu should be organized around the three decisions:

1. **Should I invest in this?** → Investment appraisal (NPV, IRR, hurdle rate comparison)  
2. **How should I fund it?** → Capital structure, debt capacity, WACC  
3. **What do I do with the profit?** → Distribution vs. reinvestment, growth-required retention

This structure, drawn directly from Damodaran's Applied Corporate Finance framework, gives the planner a logical architecture that a finance professional immediately recognizes and a business owner can navigate.

---

## What We Are NOT Building

These concepts appear in the source materials but do not belong in VunaPlanner at any mode:

- CAPM beta estimation (requires stock market data; not applicable to private firms)
- APM and multi-factor models (too complex, marginal benefit over simpler tools)
- Monte Carlo simulation (overkill for the target user base; scenario analysis covers the need)
- Detailed capital markets analysis (bonds, equity issuance, IPO pricing)
- Goodwill amortization and R&D capitalization adjustments

The discipline is in knowing what to leave out. VunaPlanner is not a CFO software suite. It is the tool that answers the questions a business owner is actually asking, at the depth they actually need, grounded in the same financial logic that a CFO would use.

---

## Summary: What Each Mode Answers

| Mode | Primary User | Core Question Answered | New Capabilities Added |
|------|-------------|----------------------|----------------------|
| **Simple** | Kiosk owner, market trader, small operator | Is my business making money and will I have cash? | Cash timing, best/worst case toggle, growth cash warning, purpose-setting |
| **Advanced** | Growing business owner, savings group treasurer, school bursar | Is my business efficient, can it handle debt, and what happens if things change? | Fixed/variable cost split, interest coverage health, ROIC vs. benchmark, sensitivity table, reinvestment decision |
| **Expert** | Investor, accountant, DFI analyst, NGO finance officer | What is this business worth, does it clear its cost of capital, and is it creating or destroying value? | WACC, return spread, Uganda hurdle rate, NPV/IRR, business valuation, regional benchmarking, capital structure analysis |

---

## A Note on Language Across Modes

The same business fact is described three ways depending on the mode:

**The fact:** The business earns 18% on invested capital against a 15% cost of capital.

**Simple mode says:**  
*"Your business is earning more than it costs to run. Every shilling you have put in is working hard."*

**Advanced mode says:**  
*"Your return on investment is 18%. The benchmark for a Ugandan business at current interest rates is approximately 15%. You are above that benchmark, which means your business is creating value."*

**Expert mode says:**  
*"ROIC: 18.0%. WACC: 15.2%. Return spread: +2.8%. The business is generating economic profit above its cost of capital. Regional context: 75% of African firms operate with a negative return spread. This business is in the top quartile."*

Same fact. Three languages. One platform.

---

*VunaBusinessPlanner — plan.vunabooks.com*  
*Adept Graphics Services / VunaBooks*  
*Prepared for internal development use*
