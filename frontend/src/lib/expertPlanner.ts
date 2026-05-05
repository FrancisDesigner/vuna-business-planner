import type {
  ExpertValidationPayload,
  ExpertValidationResult,
  PlannerPlanPayload,
} from './plannerApi';
import {
  calculateGrowingPerpetuityTerminalValue,
  calculateInternalRateOfReturn,
  calculateNetPresentValue,
  calculateReturnOnInvestedCapital,
  calculateWeightedAverageCostOfCapital,
} from './sharedFinanceEngine';

export interface ExpertFormState {
  caseName: string;
  industry: string;
  annualRevenue: string;
  initialInvestment: string;
  year1: string;
  year2: string;
  year3: string;
  year4: string;
  year5: string;
  useCapitalStructure: boolean;
  discountRatePercent: string;
  debtAmount: string;
  equityAmount: string;
  costOfDebtPercent: string;
  costOfEquityPercent: string;
  annualOperatingProfitAfterTax: string;
  useTerminalValue: boolean;
  longTermGrowthRatePercent: string;
}

export interface ExpertStoredInputs extends ExpertValidationPayload {
  case_name: string;
  industry: string;
  annual_revenue?: number;
  use_capital_structure: boolean;
  use_terminal_value: boolean;
}

export interface ExpertStoredResults extends ExpertValidationResult {
  verdict_headline: string;
  verdict_summary: string;
}

export interface ExpertCaseSnapshot {
  exported_at: string;
  mode: 'expert';
  name: string;
  business_type: string;
  currency_code: string;
  inputs: ExpertStoredInputs;
  results: ExpertStoredResults | null;
}

export const DEFAULT_EXPERT_FORM_STATE: ExpertFormState = {
  caseName: 'Expansion Case',
  industry: 'Manufacturing',
  annualRevenue: '',
  initialInvestment: '50000000',
  year1: '8000000',
  year2: '12000000',
  year3: '15000000',
  year4: '18000000',
  year5: '20000000',
  useCapitalStructure: false,
  discountRatePercent: '12',
  debtAmount: '20000000',
  equityAmount: '30000000',
  costOfDebtPercent: '20',
  costOfEquityPercent: '16',
  annualOperatingProfitAfterTax: '9000000',
  useTerminalValue: false,
  longTermGrowthRatePercent: '5',
};

function toStringField(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function toBooleanField(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function parseExpertNumber(value: string): number {
  return Number(value.replace(/,/g, '').trim() || '0');
}

export function restoreExpertFormState(input: unknown): ExpertFormState {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_EXPERT_FORM_STATE };
  }

  const record = input as Record<string, unknown>;

  return {
    caseName: toStringField(record.caseName, DEFAULT_EXPERT_FORM_STATE.caseName),
    industry: toStringField(record.industry, DEFAULT_EXPERT_FORM_STATE.industry),
    annualRevenue: toStringField(record.annualRevenue, DEFAULT_EXPERT_FORM_STATE.annualRevenue),
    initialInvestment: toStringField(record.initialInvestment, DEFAULT_EXPERT_FORM_STATE.initialInvestment),
    year1: toStringField(record.year1, DEFAULT_EXPERT_FORM_STATE.year1),
    year2: toStringField(record.year2, DEFAULT_EXPERT_FORM_STATE.year2),
    year3: toStringField(record.year3, DEFAULT_EXPERT_FORM_STATE.year3),
    year4: toStringField(record.year4, DEFAULT_EXPERT_FORM_STATE.year4),
    year5: toStringField(record.year5, DEFAULT_EXPERT_FORM_STATE.year5),
    useCapitalStructure: toBooleanField(record.useCapitalStructure, DEFAULT_EXPERT_FORM_STATE.useCapitalStructure),
    discountRatePercent: toStringField(record.discountRatePercent, DEFAULT_EXPERT_FORM_STATE.discountRatePercent),
    debtAmount: toStringField(record.debtAmount, DEFAULT_EXPERT_FORM_STATE.debtAmount),
    equityAmount: toStringField(record.equityAmount, DEFAULT_EXPERT_FORM_STATE.equityAmount),
    costOfDebtPercent: toStringField(record.costOfDebtPercent, DEFAULT_EXPERT_FORM_STATE.costOfDebtPercent),
    costOfEquityPercent: toStringField(record.costOfEquityPercent, DEFAULT_EXPERT_FORM_STATE.costOfEquityPercent),
    annualOperatingProfitAfterTax: toStringField(record.annualOperatingProfitAfterTax, DEFAULT_EXPERT_FORM_STATE.annualOperatingProfitAfterTax),
    useTerminalValue: toBooleanField(record.useTerminalValue, DEFAULT_EXPERT_FORM_STATE.useTerminalValue),
    longTermGrowthRatePercent: toStringField(record.longTermGrowthRatePercent, DEFAULT_EXPERT_FORM_STATE.longTermGrowthRatePercent),
  };
}

export function hydrateExpertFormFromStoredInputs(inputs: Partial<ExpertStoredInputs>): ExpertFormState {
  return {
    caseName: inputs.case_name || DEFAULT_EXPERT_FORM_STATE.caseName,
    industry: inputs.industry || DEFAULT_EXPERT_FORM_STATE.industry,
    annualRevenue: inputs.annual_revenue !== undefined ? String(inputs.annual_revenue) : DEFAULT_EXPERT_FORM_STATE.annualRevenue,
    initialInvestment: String(inputs.initial_investment ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.initialInvestment)),
    year1: String(inputs.annual_cash_flows?.[0] ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.year1)),
    year2: String(inputs.annual_cash_flows?.[1] ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.year2)),
    year3: String(inputs.annual_cash_flows?.[2] ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.year3)),
    year4: String(inputs.annual_cash_flows?.[3] ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.year4)),
    year5: String(inputs.annual_cash_flows?.[4] ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.year5)),
    useCapitalStructure: Boolean(inputs.use_capital_structure),
    discountRatePercent: String(inputs.discount_rate_percent ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.discountRatePercent)),
    debtAmount: String(inputs.debt_amount ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.debtAmount)),
    equityAmount: String(inputs.equity_amount ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.equityAmount)),
    costOfDebtPercent: String(inputs.cost_of_debt_percent ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.costOfDebtPercent)),
    costOfEquityPercent: String(inputs.cost_of_equity_percent ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.costOfEquityPercent)),
    annualOperatingProfitAfterTax: String(
      inputs.annual_operating_profit_after_tax ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.annualOperatingProfitAfterTax),
    ),
    useTerminalValue: Boolean(inputs.use_terminal_value),
    longTermGrowthRatePercent: String(
      inputs.long_term_growth_rate_percent ?? parseExpertNumber(DEFAULT_EXPERT_FORM_STATE.longTermGrowthRatePercent),
    ),
  };
}

export function getExpertAnnualCashFlows(form: ExpertFormState): number[] {
  return [form.year1, form.year2, form.year3, form.year4, form.year5].map(parseExpertNumber);
}

export function buildExpertValidationPayload(form: ExpertFormState): ExpertValidationPayload {
  const annualCashFlows = getExpertAnnualCashFlows(form);
  const payload: ExpertValidationPayload = {
    initial_investment: parseExpertNumber(form.initialInvestment),
    annual_cash_flows: annualCashFlows,
  };

  if (form.useCapitalStructure) {
    payload.debt_amount = parseExpertNumber(form.debtAmount);
    payload.equity_amount = parseExpertNumber(form.equityAmount);
    payload.cost_of_debt_percent = parseExpertNumber(form.costOfDebtPercent);
    payload.cost_of_equity_percent = parseExpertNumber(form.costOfEquityPercent);
    payload.annual_operating_profit_after_tax = parseExpertNumber(form.annualOperatingProfitAfterTax);
  } else {
    payload.discount_rate_percent = parseExpertNumber(form.discountRatePercent);
  }

  if (form.useTerminalValue) {
    payload.final_year_cash_flow = annualCashFlows[annualCashFlows.length - 1] ?? 0;
    payload.long_term_growth_rate_percent = parseExpertNumber(form.longTermGrowthRatePercent);
  }

  return payload;
}

export function buildExpertStoredInputs(form: ExpertFormState): ExpertStoredInputs {
  return {
    case_name: form.caseName.trim() || DEFAULT_EXPERT_FORM_STATE.caseName,
    industry: form.industry.trim() || DEFAULT_EXPERT_FORM_STATE.industry,
    annual_revenue: parseExpertNumber(form.annualRevenue) > 0 ? parseExpertNumber(form.annualRevenue) : undefined,
    use_capital_structure: form.useCapitalStructure,
    use_terminal_value: form.useTerminalValue,
    ...buildExpertValidationPayload(form),
  };
}

export function calculateExpertFinanceCase(inputs: ExpertValidationPayload): ExpertValidationResult {
  const debtAmount = inputs.debt_amount ?? 0;
  const equityAmount = inputs.equity_amount ?? 0;
  const investedCapital = (debtAmount + equityAmount) > 0
    ? debtAmount + equityAmount
    : inputs.initial_investment;

  const wacc = (debtAmount > 0 || equityAmount > 0)
    ? calculateWeightedAverageCostOfCapital({
      debtAmount,
      equityAmount,
      costOfDebtPercent: inputs.cost_of_debt_percent ?? 0,
      costOfEquityPercent: inputs.cost_of_equity_percent ?? 0,
    })
    : null;

  const discountRatePercent = inputs.discount_rate_percent ?? (wacc !== null ? wacc * 100 : null);
  const roic = inputs.annual_operating_profit_after_tax !== undefined
    ? calculateReturnOnInvestedCapital(inputs.annual_operating_profit_after_tax, investedCapital)
    : null;
  const returnSpread = roic !== null && wacc !== null ? roic - wacc : null;

  let terminalValue = inputs.terminal_value ?? 0;
  if (
    terminalValue === 0
    && inputs.final_year_cash_flow !== undefined
    && inputs.long_term_growth_rate_percent !== undefined
  ) {
    if (discountRatePercent === null) {
      throw new Error('A discount rate or WACC inputs are required to compute terminal value.');
    }

    terminalValue = calculateGrowingPerpetuityTerminalValue({
      finalYearCashFlow: inputs.final_year_cash_flow,
      discountRatePercent,
      longTermGrowthRatePercent: inputs.long_term_growth_rate_percent,
    });
  }

  const npv = discountRatePercent !== null
    ? calculateNetPresentValue({
      initialInvestment: inputs.initial_investment,
      annualCashFlows: inputs.annual_cash_flows,
      discountRatePercent,
      terminalValue,
    })
    : null;

  return {
    engine: 'ts-expert-parity',
    discount_rate_percent: discountRatePercent,
    invested_capital: investedCapital,
    wacc,
    roic,
    return_spread: returnSpread,
    terminal_value: terminalValue,
    npv,
    irr: calculateInternalRateOfReturn({
      initialInvestment: inputs.initial_investment,
      annualCashFlows: inputs.annual_cash_flows,
      terminalValue,
    }),
  };
}

export function getExpertVerdict(result: ExpertValidationResult | null): {
  headline: string;
  summary: string;
} {
  if (!result) {
    return {
      headline: 'Run backend validation',
      summary: 'Python will return the trusted finance outputs for this case before you save or share it.',
    };
  }

  if (result.npv !== null && result.npv < 0) {
    return {
      headline: 'Below hurdle rate',
      summary: 'This case is not yet clearing the chosen hurdle rate. Rework price, timing, cash flows, or capital structure before trusting it.',
    };
  }

  if (result.return_spread !== null && result.return_spread < 0) {
    return {
      headline: 'Returns are below cost of capital',
      summary: 'The business is not yet earning enough above its funding cost. A positive IRR alone is not enough if the spread stays negative.',
    };
  }

  return {
    headline: 'Value appears to be created',
    summary: 'This case is clearing its hurdle rate on the current assumptions. Keep checking the spread, terminal-value dependence, and downside scenarios.',
  };
}

export function buildExpertStoredResults(result: ExpertValidationResult): ExpertStoredResults {
  const verdict = getExpertVerdict(result);

  return {
    ...result,
    verdict_headline: verdict.headline,
    verdict_summary: verdict.summary,
  };
}

export function buildExpertPlanPayload(
  form: ExpertFormState,
  result: ExpertValidationResult,
  currencyCode: string,
): PlannerPlanPayload<ExpertStoredInputs, ExpertStoredResults> {
  const safeCaseName = form.caseName.trim() || DEFAULT_EXPERT_FORM_STATE.caseName;
  const safeIndustry = form.industry.trim() || DEFAULT_EXPERT_FORM_STATE.industry;

  return {
    mode: 'expert',
    name: `${safeCaseName} - ${new Date().toISOString().slice(0, 10)}`,
    business_type: safeIndustry,
    currency_code: currencyCode,
    inputs: buildExpertStoredInputs(form),
    results: buildExpertStoredResults(result),
  };
}

export function buildExpertCaseSnapshot(
  form: ExpertFormState,
  result: ExpertValidationResult | null,
  currencyCode: string,
): ExpertCaseSnapshot {
  const safeCaseName = form.caseName.trim() || DEFAULT_EXPERT_FORM_STATE.caseName;
  const safeIndustry = form.industry.trim() || DEFAULT_EXPERT_FORM_STATE.industry;

  return {
    exported_at: new Date().toISOString(),
    mode: 'expert',
    name: safeCaseName,
    business_type: safeIndustry,
    currency_code: currencyCode,
    inputs: buildExpertStoredInputs(form),
    results: result ? buildExpertStoredResults(result) : null,
  };
}
