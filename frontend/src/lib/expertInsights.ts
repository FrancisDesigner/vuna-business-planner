import type { ExpertValidationResult } from './plannerApi';
import type { ExpertFormState } from './expertPlanner';

export const EXPERT_UGANDA_HURDLE_RATE = 0.15;
export const EXPERT_PRIVATE_BUSINESS_HURDLE_LABEL = 'Private-business hurdle baseline';

export const EXPERT_AFRICA_REGIONAL_BENCHMARKS = {
  returnOnEquity: 0.0755,
  costOfEquity: 0.1098,
  roic: 0.0477,
  wacc: 0.0933,
  returnSpread: -0.0456,
  positiveSpreadShare: 0.25,
} as const;

export interface ExpertBenchmarkRow {
  metric: string;
  thisBusiness: number | null;
  regionalAverage: number | null;
}

export interface ExpertValuationRange {
  low: number;
  mid: number;
  high: number;
  sectorLabel: string;
}

export interface ExpertDashboardInsights {
  headlineLabel: string;
  headlineValue: number | null;
  headlineTone: 'positive' | 'negative' | 'neutral';
  headlineMessage: string;
  hurdleBaselineRate: number;
  hurdleMessage: string;
  benchmarkRows: ExpertBenchmarkRow[];
  regionalContextMessage: string;
  dcfIntrinsicValue: number | null;
  dcfMessage: string;
  revenueMultipleRange: ExpertValuationRange | null;
  revenueMultipleMessage: string | null;
  valuationBridgeMessage: string | null;
  terminalValueDependencyShare: number | null;
  terminalDependencyMessage: string | null;
  assumptions: Array<{ label: string; value: string; helper?: string }>;
  capitalMixMessage: string | null;
}

const INDUSTRY_MULTIPLES = [
  { match: /retail|shop|store|trading/i, label: 'Retail', low: 0.8, high: 1.5 },
  { match: /wholesale|distribut/i, label: 'Wholesale', low: 0.7, high: 1.3 },
  { match: /service|agency|consult|salon|repair/i, label: 'Services', low: 0.9, high: 1.8 },
  { match: /manufact|factory|bakery|processing|production/i, label: 'Manufacturing', low: 0.9, high: 1.7 },
  { match: /agri|farm|crop|livestock/i, label: 'Agribusiness', low: 0.7, high: 1.4 },
  { match: /.*/, label: 'General small business', low: 0.8, high: 1.4 },
] as const;

function getIndustryMultiple(industry: string) {
  return INDUSTRY_MULTIPLES.find((entry) => entry.match.test(industry.trim())) ?? INDUSTRY_MULTIPLES[INDUSTRY_MULTIPLES.length - 1];
}

function formatBasisPoints(rate: number): string {
  const percentage = Math.abs(rate * 100).toFixed(1);
  return `${rate >= 0 ? '+' : '-'}${percentage}%`;
}

function calculateDiscountedTerminalValue(terminalValue: number, discountRatePercent: number, years: number): number {
  const rate = discountRatePercent / 100;
  return terminalValue / Math.pow(1 + rate, years);
}

export function calculateRevenueMultipleValuation(
  annualRevenue: number,
  industry: string,
): ExpertValuationRange | null {
  if (annualRevenue <= 0) {
    return null;
  }

  const sector = getIndustryMultiple(industry);
  const low = annualRevenue * sector.low;
  const high = annualRevenue * sector.high;

  return {
    low,
    mid: (low + high) / 2,
    high,
    sectorLabel: sector.label,
  };
}

export function buildExpertDashboardInsights(
  form: ExpertFormState,
  result: ExpertValidationResult,
): ExpertDashboardInsights {
  const annualRevenue = Number(form.annualRevenue.replace(/,/g, '').trim() || '0');
  const revenueMultipleRange = calculateRevenueMultipleValuation(annualRevenue, form.industry);
  const dcfIntrinsicValue = result.npv !== null ? result.npv + Number(form.initialInvestment.replace(/,/g, '').trim() || '0') : null;
  const hurdleBaselineRate = EXPERT_UGANDA_HURDLE_RATE;
  const effectiveDiscountRate = result.discount_rate_percent !== null
    ? result.discount_rate_percent / 100
    : hurdleBaselineRate;

  const headlineValue = result.return_spread ?? (
    result.irr !== null && result.discount_rate_percent !== null
      ? result.irr - (result.discount_rate_percent / 100)
      : null
  );
  const headlineLabel = result.return_spread !== null ? 'Return Spread' : 'IRR vs Hurdle';
  const headlineTone = headlineValue === null ? 'neutral' : headlineValue >= 0 ? 'positive' : 'negative';

  let headlineMessage = 'Add capital-structure inputs to see true value creation above the cost of capital.';
  if (result.return_spread !== null && result.roic !== null && result.wacc !== null) {
    headlineMessage = `Your business earns ${(result.roic * 100).toFixed(1)}% on capital against a blended cost of ${(result.wacc * 100).toFixed(1)}%. The spread is ${formatBasisPoints(result.return_spread)}.`;
  } else if (headlineValue !== null && result.irr !== null) {
    headlineMessage = `The project IRR is ${(result.irr * 100).toFixed(1)}% versus a hurdle of ${(effectiveDiscountRate * 100).toFixed(1)}%, giving an excess return of ${formatBasisPoints(headlineValue)}.`;
  }

  const hurdleMessage = `Private-business capital usually needs to clear about ${(hurdleBaselineRate * 100).toFixed(1)}% before it is attractive versus safer local instruments and market risk.`;

  const benchmarkRows: ExpertBenchmarkRow[] = [
    { metric: 'ROIC', thisBusiness: result.roic, regionalAverage: EXPERT_AFRICA_REGIONAL_BENCHMARKS.roic },
    { metric: 'WACC', thisBusiness: result.wacc, regionalAverage: EXPERT_AFRICA_REGIONAL_BENCHMARKS.wacc },
    { metric: 'Return Spread', thisBusiness: result.return_spread, regionalAverage: EXPERT_AFRICA_REGIONAL_BENCHMARKS.returnSpread },
    { metric: 'Cost of Equity Baseline', thisBusiness: effectiveDiscountRate, regionalAverage: EXPERT_AFRICA_REGIONAL_BENCHMARKS.costOfEquity },
  ];

  const regionalContextMessage = (result.return_spread ?? headlineValue ?? -1) >= 0
    ? `Regional context: only about ${Math.round(EXPERT_AFRICA_REGIONAL_BENCHMARKS.positiveSpreadShare * 100)}% of Africa and Middle East firms earn a positive return spread. This case clears that bar.`
    : `Regional context: most firms in Africa and the Middle East operate with a negative return spread. This case still sits in that danger zone and needs stronger economics.`;

  let terminalValueDependencyShare: number | null = null;
  let terminalDependencyMessage: string | null = null;
  if (result.terminal_value > 0 && result.discount_rate_percent !== null && dcfIntrinsicValue !== null && dcfIntrinsicValue > 0) {
    const discountedTerminalValue = calculateDiscountedTerminalValue(result.terminal_value, result.discount_rate_percent, 5);
    terminalValueDependencyShare = discountedTerminalValue / dcfIntrinsicValue;
    terminalDependencyMessage = terminalValueDependencyShare >= 0.6
      ? `About ${(terminalValueDependencyShare * 100).toFixed(0)}% of the DCF value comes from terminal value, so this case depends heavily on the long-run assumption.`
      : `About ${(terminalValueDependencyShare * 100).toFixed(0)}% of the DCF value comes from terminal value, which is meaningful but not dominating the whole case.`;
  }

  const dcfMessage = dcfIntrinsicValue === null
    ? 'Run the validation with a discount rate or WACC path to derive an intrinsic business value from the DCF.'
    : `The discounted cash flows imply an intrinsic value of about the initial investment plus NPV, or ${Math.round(dcfIntrinsicValue).toLocaleString()} in local currency terms.`;

  const revenueMultipleMessage = revenueMultipleRange
    ? `${revenueMultipleRange.sectorLabel} revenue multiples suggest a rough market value range of ${Math.round(revenueMultipleRange.low).toLocaleString()} to ${Math.round(revenueMultipleRange.high).toLocaleString()}.`
    : null;

  let valuationBridgeMessage: string | null = null;
  if (revenueMultipleRange && dcfIntrinsicValue !== null) {
    if (dcfIntrinsicValue < revenueMultipleRange.low) {
      valuationBridgeMessage = 'The DCF value is below the market-multiple range, which can mean the business is overpriced relative to its projected cash generation.';
    } else if (dcfIntrinsicValue > revenueMultipleRange.high) {
      valuationBridgeMessage = 'The DCF value is above the market-multiple range, which can mean the cash-flow case is strong or the market may be undervaluing similar businesses.';
    } else {
      valuationBridgeMessage = 'The DCF value lands inside the rough market-multiple range, so the earnings case and market context are broadly aligned.';
    }
  }

  const debtAmount = Number(form.debtAmount.replace(/,/g, '').trim() || '0');
  const equityAmount = Number(form.equityAmount.replace(/,/g, '').trim() || '0');
  const totalCapital = debtAmount + equityAmount;
  const capitalMixMessage = totalCapital > 0
    ? `Debt is ${((debtAmount / totalCapital) * 100).toFixed(0)}% of total capital and equity is ${((equityAmount / totalCapital) * 100).toFixed(0)}%. This framing helps explain why WACC can fall or rise as leverage changes.`
    : null;

  return {
    headlineLabel,
    headlineValue,
    headlineTone,
    headlineMessage,
    hurdleBaselineRate,
    hurdleMessage,
    benchmarkRows,
    regionalContextMessage,
    dcfIntrinsicValue,
    dcfMessage,
    revenueMultipleRange,
    revenueMultipleMessage,
    valuationBridgeMessage,
    terminalValueDependencyShare,
    terminalDependencyMessage,
    assumptions: [
      { label: 'Projection horizon', value: '5 years', helper: 'Expert DCF is currently locked to a 5-year horizon.' },
      { label: 'Industry', value: form.industry || 'General small business' },
      { label: 'Annual revenue', value: annualRevenue > 0 ? Math.round(annualRevenue).toLocaleString() : 'Not entered', helper: 'Needed for the rough revenue-multiple valuation range.' },
      { label: 'Discount framework', value: result.wacc !== null ? 'Blended WACC' : 'Direct hurdle rate' },
      { label: 'Terminal value', value: result.terminal_value > 0 ? 'Included' : 'Not included', helper: result.terminal_value > 0 ? 'Depends on long-run growth assumptions.' : 'Useful when value persists beyond year 5.' },
    ],
    capitalMixMessage,
  };
}
