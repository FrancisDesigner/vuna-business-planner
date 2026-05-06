export interface DepreciationScheduleRow {
  year: number;
  depreciation: number;
  bookValue: number;
}

export interface LoanScheduleRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface UnitEconomicsInput {
  totalVariableInputCost: number;
  batchYield: number;
  sellingPrice: number;
  weeklyUnits: number;
}

export interface UnitEconomicsSnapshot {
  unitBaseCost: number;
  contributionMarginPerUnit: number;
  weeklyRevenue: number;
  weeklyVariableCosts: number;
}

export interface MonthlyProfitInput {
  monthlyRevenue: number;
  monthlyVariableCosts: number;
  monthlyFixedCosts: number;
  monthlyDepreciation?: number;
  monthlyInterestCost?: number;
  taxRatePercent?: number;
}

export interface MonthlyProfitSnapshot {
  profitBeforeTax: number;
  taxAmount: number;
  netProfit: number;
}

export interface ReturnBenchmarkComparison {
  spread: number | null;
  status: 'strong' | 'watch' | 'weak' | 'not_applicable';
  message: string;
}

export interface ProfitToCashBridgeInput {
  netProfit: number;
  depreciation: number;
  principalRepayment: number;
}

export interface ProfitToCashBridge {
  netProfit: number;
  depreciationAddBack: number;
  principalRepayment: number;
  cashFromOperations: number;
  cashPosition: number;
  differenceFromProfit: number;
  message: string;
}

export interface SensitivityMatrixCell {
  revenueMultiplier: number;
  costMultiplier: number;
  monthlyNetProfit: number;
  status: 'profit' | 'thin' | 'loss';
}

export interface SensitivityMatrixResult {
  cells: SensitivityMatrixCell[];
  profitableScenarios: number;
  totalScenarios: number;
  lossCases: string[];
  summary: string;
}

export interface GrowthRetentionGuidance {
  targetGrowthPercent: number;
  estimatedGrowthReinvestment: number;
  recommendedRetention: number;
  profitBasedTakeHome: number;
  cashSafeTakeHome: number;
  fundingGap: number;
  status: 'base_only' | 'funded' | 'tight' | 'shortfall';
  message: string;
}

export type PurchaseCycleType =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bulk'
  | 'irregular';

export interface SimplePurchaseCycleInput {
  purchaseCycleType: PurchaseCycleType;
  purchasesPerWeek?: number;
  costPerPurchase?: number;
  dailySales?: number;
  sellingDaysPerWeek?: number;
  revenuePerCycle?: number;
  monthlyStockCostInput?: number;
  monthlyRevenueInput?: number;
  bulkPurchaseCost?: number;
  bulkLifespanMonths?: number;
  purchaseEventsPerMonth?: number;
  averagePurchaseAmount?: number;
}

export interface SimplePurchaseCycleNormalized {
  monthlyRevenue: number;
  monthlyVariableCost: number;
  monthlyContribution: number;
  dailyFloatRequired?: number;
  monthlyReorderReserve?: number;
  bulkCashNeededAtReorder?: number;
  estimateWarning?: string;
}

export interface LoanAmortizationResult {
  monthlyPayment: number;
  firstMonthInterest: number;
  schedule: LoanScheduleRow[];
}

const IRR_EPSILON = 0.000001;
const IRR_MAX_ITERATIONS = 200;

const WEEKS_PER_MONTH = 52 / 12;

function safeNonNegativeNumber(value: number | undefined, fallback = 0): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(value, 0);
}

export function normalizeSimplePurchaseCycle(input: SimplePurchaseCycleInput): SimplePurchaseCycleNormalized {
  switch (input.purchaseCycleType) {
    case 'daily': {
      const purchasesPerWeek = safeNonNegativeNumber(input.purchasesPerWeek);
      const sellingDaysPerWeek = safeNonNegativeNumber(input.sellingDaysPerWeek, purchasesPerWeek);
      const costPerPurchase = safeNonNegativeNumber(input.costPerPurchase);
      const dailySales = safeNonNegativeNumber(input.dailySales);

      const monthlyVariableCost = costPerPurchase * purchasesPerWeek * WEEKS_PER_MONTH;
      const monthlyRevenue = dailySales * sellingDaysPerWeek * WEEKS_PER_MONTH;

      return {
        monthlyRevenue,
        monthlyVariableCost,
        monthlyContribution: monthlyRevenue - monthlyVariableCost,
        dailyFloatRequired: costPerPurchase,
      };
    }

    case 'weekly': {
      const costPerPurchase = safeNonNegativeNumber(input.costPerPurchase);
      const revenuePerCycle = safeNonNegativeNumber(input.revenuePerCycle);

      const monthlyVariableCost = costPerPurchase * WEEKS_PER_MONTH;
      const monthlyRevenue = revenuePerCycle * WEEKS_PER_MONTH;

      return {
        monthlyRevenue,
        monthlyVariableCost,
        monthlyContribution: monthlyRevenue - monthlyVariableCost,
      };
    }

    case 'biweekly': {
      const costPerPurchase = safeNonNegativeNumber(input.costPerPurchase);
      const revenuePerCycle = safeNonNegativeNumber(input.revenuePerCycle);
      const cyclesPerMonth = WEEKS_PER_MONTH / 2;

      const monthlyVariableCost = costPerPurchase * cyclesPerMonth;
      const monthlyRevenue = revenuePerCycle * cyclesPerMonth;

      return {
        monthlyRevenue,
        monthlyVariableCost,
        monthlyContribution: monthlyRevenue - monthlyVariableCost,
      };
    }

    case 'monthly': {
      const monthlyVariableCost = safeNonNegativeNumber(input.monthlyStockCostInput);
      const monthlyRevenue = safeNonNegativeNumber(input.monthlyRevenueInput);

      return {
        monthlyRevenue,
        monthlyVariableCost,
        monthlyContribution: monthlyRevenue - monthlyVariableCost,
      };
    }

    case 'bulk': {
      const bulkPurchaseCost = safeNonNegativeNumber(input.bulkPurchaseCost);
      const bulkLifespanMonths = Math.max(safeNonNegativeNumber(input.bulkLifespanMonths, 1), 1);
      const monthlyRevenue = safeNonNegativeNumber(input.monthlyRevenueInput);
      const monthlyVariableCost = bulkPurchaseCost / bulkLifespanMonths;

      return {
        monthlyRevenue,
        monthlyVariableCost,
        monthlyContribution: monthlyRevenue - monthlyVariableCost,
        monthlyReorderReserve: monthlyVariableCost,
        bulkCashNeededAtReorder: bulkPurchaseCost,
      };
    }

    case 'irregular': {
      const purchaseEventsPerMonth = safeNonNegativeNumber(input.purchaseEventsPerMonth);
      const averagePurchaseAmount = safeNonNegativeNumber(input.averagePurchaseAmount);
      const monthlyRevenue = safeNonNegativeNumber(input.monthlyRevenueInput);
      const monthlyVariableCost = averagePurchaseAmount * purchaseEventsPerMonth;
      const purchaseLabel = purchaseEventsPerMonth === 1 ? 'purchase' : 'purchases';

      return {
        monthlyRevenue,
        monthlyVariableCost,
        monthlyContribution: monthlyRevenue - monthlyVariableCost,
        estimateWarning: `Based on your estimate of ${purchaseEventsPerMonth} ${purchaseLabel} per month.`,
      };
    }

    default: {
      const _exhaustive: never = input.purchaseCycleType;
      void _exhaustive;

      return {
        monthlyRevenue: 0,
        monthlyVariableCost: 0,
        monthlyContribution: 0,
      };
    }
  }
}

export function calculateUnitEconomics(input: UnitEconomicsInput): UnitEconomicsSnapshot {
  const safeBatchYield = input.batchYield > 0 ? input.batchYield : 1;
  const unitBaseCost = input.totalVariableInputCost / safeBatchYield;
  const weeklyRevenue = input.sellingPrice * input.weeklyUnits;
  const weeklyVariableCosts = unitBaseCost * input.weeklyUnits;

  return {
    unitBaseCost,
    contributionMarginPerUnit: input.sellingPrice - unitBaseCost,
    weeklyRevenue,
    weeklyVariableCosts,
  };
}

export function calculateStraightLineDepreciation(
  equipmentCost: number,
  salvageValue: number,
  usefulLifeYears: number,
): DepreciationScheduleRow[] {
  if (usefulLifeYears <= 0) {
    return [];
  }

  const annualDepreciation = (equipmentCost - salvageValue) / usefulLifeYears;
  let currentBookValue = equipmentCost;
  const schedule: DepreciationScheduleRow[] = [];

  for (let year = 1; year <= usefulLifeYears; year += 1) {
    currentBookValue -= annualDepreciation;
    schedule.push({
      year,
      depreciation: annualDepreciation,
      bookValue: Math.max(currentBookValue, salvageValue),
    });
  }

  return schedule;
}

export function calculateDecliningBalanceDepreciation(
  equipmentCost: number,
  salvageValue: number,
  usefulLifeYears: number,
): DepreciationScheduleRow[] {
  if (usefulLifeYears <= 0) {
    return [];
  }

  const rate = 2 / usefulLifeYears;
  let currentBookValue = equipmentCost;
  const schedule: DepreciationScheduleRow[] = [];

  for (let year = 1; year <= usefulLifeYears; year += 1) {
    let depreciation = currentBookValue * rate;

    if (currentBookValue - depreciation < salvageValue || year === usefulLifeYears) {
      depreciation = currentBookValue - salvageValue;
    }

    currentBookValue -= depreciation;
    schedule.push({
      year,
      depreciation,
      bookValue: Math.max(currentBookValue, salvageValue),
    });
  }

  return schedule;
}

export function calculateAnnualDepreciationFromSchedule(schedule: DepreciationScheduleRow[]): number {
  return schedule[0]?.depreciation ?? 0;
}

export function calculateAnnuityPayment(principal: number, annualInterestRatePercent: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualInterestRatePercent / 100 / 12;
  if (monthlyRate === 0) {
    return principal / termMonths;
  }

  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths))
    / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

export function calculateLoanAmortization(
  principal: number,
  annualInterestRatePercent: number,
  termMonths: number,
): LoanAmortizationResult {
  if (principal <= 0 || termMonths <= 0) {
    return {
      monthlyPayment: 0,
      firstMonthInterest: 0,
      schedule: [],
    };
  }

  const monthlyPayment = calculateAnnuityPayment(principal, annualInterestRatePercent, termMonths);
  const monthlyRate = annualInterestRatePercent / 100 / 12;
  let balance = principal;
  const schedule: LoanScheduleRow[] = [];

  for (let month = 1; month <= termMonths; month += 1) {
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
    const principalPayment = monthlyPayment - interest;
    balance -= principalPayment;

    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest,
      balance: Math.max(balance, 0),
    });
  }

  return {
    monthlyPayment,
    firstMonthInterest: schedule[0]?.interest ?? 0,
    schedule,
  };
}

export function calculateMonthlyProfitSnapshot(input: MonthlyProfitInput): MonthlyProfitSnapshot {
  const profitBeforeTax = input.monthlyRevenue
    - input.monthlyVariableCosts
    - input.monthlyFixedCosts
    - (input.monthlyDepreciation ?? 0)
    - (input.monthlyInterestCost ?? 0);
  const taxRate = (input.taxRatePercent ?? 0) / 100;
  const taxAmount = Math.max(0, profitBeforeTax * taxRate);

  return {
    profitBeforeTax,
    taxAmount,
    netProfit: profitBeforeTax - taxAmount,
  };
}

export function calculateInterestCoverageRatio(operatingProfit: number, annualInterestCost: number): number | null {
  if (annualInterestCost <= 0) {
    return null;
  }

  return operatingProfit / annualInterestCost;
}

export function calculateReturnOnInvestedCapital(annualOperatingProfitAfterTax: number, investedCapital: number): number | null {
  if (investedCapital <= 0) {
    return null;
  }

  return annualOperatingProfitAfterTax / investedCapital;
}

export function compareReturnToBenchmark(roic: number | null, benchmarkRate: number | null): ReturnBenchmarkComparison {
  if (roic === null || benchmarkRate === null) {
    return {
      spread: null,
      status: 'not_applicable',
      message: 'Return quality cannot be judged until both invested capital and a benchmark are available.',
    };
  }

  const spread = roic - benchmarkRate;
  if (spread >= 0.03) {
    return {
      spread,
      status: 'strong',
      message: 'This business is earning clearly above the benchmark, which suggests the capital is working well.',
    };
  }

  if (spread >= 0) {
    return {
      spread,
      status: 'watch',
      message: 'This business is clearing the benchmark, but only with a thin margin of safety.',
    };
  }

  return {
    spread,
    status: 'weak',
    message: 'This business is earning below the benchmark, so the capital tied up here is not yet working hard enough.',
  };
}

export function calculateProfitToCashBridge(input: ProfitToCashBridgeInput): ProfitToCashBridge {
  const cashFromOperations = input.netProfit + input.depreciation;
  const cashPosition = cashFromOperations - input.principalRepayment;
  const differenceFromProfit = cashPosition - input.netProfit;

  let message = 'Cash is currently stronger than accounting profit because depreciation is non-cash and debt principal pressure is limited.';
  if (input.netProfit > 0 && cashPosition < 0) {
    message = 'The business shows profit on paper, but loan principal repayments are creating a real cash squeeze.';
  } else if (cashPosition < input.netProfit) {
    message = 'The business is profitable, but principal repayments reduce what is actually left in cash each month.';
  } else if (cashPosition < 0) {
    message = 'Cash is under pressure, so the business may need stronger margins, slower debt, or a bigger buffer.';
  }

  return {
    netProfit: input.netProfit,
    depreciationAddBack: input.depreciation,
    principalRepayment: input.principalRepayment,
    cashFromOperations,
    cashPosition,
    differenceFromProfit,
    message,
  };
}

export function calculateSensitivityMatrix(input: {
  monthlyRevenue: number;
  monthlyVariableCosts: number;
  monthlyFixedCosts: number;
  monthlyDepreciation: number;
  monthlyInterestCost: number;
  taxRatePercent: number;
  revenueMultipliers: number[];
  costMultipliers: number[];
}): SensitivityMatrixResult {
  const cells: SensitivityMatrixCell[] = [];
  const lossCases: string[] = [];

  for (const costMultiplier of input.costMultipliers) {
    for (const revenueMultiplier of input.revenueMultipliers) {
      const scenarioMonthlyRevenue = input.monthlyRevenue * revenueMultiplier;
      const monthlyVariableCosts = input.monthlyVariableCosts * revenueMultiplier * costMultiplier;
      const monthlyFixedCosts = input.monthlyFixedCosts * costMultiplier;
      const snapshot = calculateMonthlyProfitSnapshot({
        monthlyRevenue: scenarioMonthlyRevenue,
        monthlyVariableCosts,
        monthlyFixedCosts,
        monthlyDepreciation: input.monthlyDepreciation,
        monthlyInterestCost: input.monthlyInterestCost,
        taxRatePercent: input.taxRatePercent,
      });
      const monthlyNetProfit = snapshot.netProfit;
      const profitMargin = scenarioMonthlyRevenue > 0 ? monthlyNetProfit / scenarioMonthlyRevenue : 0;
      const status: SensitivityMatrixCell['status'] = monthlyNetProfit <= 0
        ? 'loss'
        : profitMargin < 0.05
          ? 'thin'
          : 'profit';

      if (status === 'loss') {
        const revenueLabel = revenueMultiplier < 1 ? 'sales drop' : revenueMultiplier > 1 ? 'sales rise' : 'sales stay flat';
        const costLabel = costMultiplier > 1 ? 'costs rise' : 'costs stay flat';
        lossCases.push(`${revenueLabel} and ${costLabel}`);
      }

      cells.push({
        revenueMultiplier,
        costMultiplier,
        monthlyNetProfit,
        status,
      });
    }
  }

  const profitableScenarios = cells.filter((cell) => cell.monthlyNetProfit > 0).length;
  const totalScenarios = cells.length;
  const summary = lossCases.length === 0
    ? `Your business stays profitable in all ${totalScenarios} scenarios shown here.`
    : `Your business stays profitable in ${profitableScenarios} of ${totalScenarios} scenarios. The loss cases appear when ${lossCases.join(', ')}.`;

  return {
    cells,
    profitableScenarios,
    totalScenarios,
    lossCases,
    summary,
  };
}

export function calculateGrowthRetentionGuidance(input: {
  targetGrowthPercent: number;
  monthlyVariableCosts: number;
  baseRetention: number;
  monthlyNetProfit: number;
  monthlyCashPosition: number;
}): GrowthRetentionGuidance {
  const growthRate = Math.max(input.targetGrowthPercent, 0) / 100;
  const estimatedGrowthReinvestment = input.monthlyVariableCosts * growthRate;
  const recommendedRetention = Math.max(input.baseRetention, estimatedGrowthReinvestment);
  const profitBasedTakeHome = Math.max(input.monthlyNetProfit - recommendedRetention, 0);
  const cashSafeTakeHome = Math.max(input.monthlyCashPosition - recommendedRetention, 0);
  const fundingGap = Math.max(recommendedRetention - input.monthlyCashPosition, 0);

  if (input.targetGrowthPercent <= 0) {
    return {
      targetGrowthPercent: input.targetGrowthPercent,
      estimatedGrowthReinvestment,
      recommendedRetention,
      profitBasedTakeHome,
      cashSafeTakeHome,
      fundingGap,
      status: 'base_only',
      message: `Without a growth target, it is safer to keep about ${Math.round(recommendedRetention).toLocaleString()} in the business before deciding what to take home.`,
    };
  }

  if (fundingGap > 0) {
    return {
      targetGrowthPercent: input.targetGrowthPercent,
      estimatedGrowthReinvestment,
      recommendedRetention,
      profitBasedTakeHome,
      cashSafeTakeHome,
      fundingGap,
      status: 'shortfall',
      message: `To target ${input.targetGrowthPercent}% growth, you may need about ${Math.round(recommendedRetention).toLocaleString()} kept in the business, but current monthly cash is short by about ${Math.round(fundingGap).toLocaleString()}.`,
    };
  }

  if (cashSafeTakeHome <= 0) {
    return {
      targetGrowthPercent: input.targetGrowthPercent,
      estimatedGrowthReinvestment,
      recommendedRetention,
      profitBasedTakeHome,
      cashSafeTakeHome,
      fundingGap,
      status: 'tight',
      message: `Your current profit could fund ${input.targetGrowthPercent}% growth on paper, but cash is still tight, so take-home should stay limited until liquidity improves.`,
    };
  }

  return {
    targetGrowthPercent: input.targetGrowthPercent,
    estimatedGrowthReinvestment,
    recommendedRetention,
    profitBasedTakeHome,
    cashSafeTakeHome,
    fundingGap,
    status: 'funded',
    message: `To target ${input.targetGrowthPercent}% growth, keep about ${Math.round(recommendedRetention).toLocaleString()} in the business. That still leaves about ${Math.round(cashSafeTakeHome).toLocaleString()} available in cash to take home if the month performs as planned.`,
  };
}

export function calculateWeightedAverageCostOfCapital(input: {
  debtAmount: number;
  equityAmount: number;
  costOfDebtPercent: number;
  costOfEquityPercent: number;
}): number | null {
  const totalCapital = input.debtAmount + input.equityAmount;
  if (totalCapital <= 0) {
    return null;
  }

  const debtWeight = input.debtAmount / totalCapital;
  const equityWeight = input.equityAmount / totalCapital;

  return (debtWeight * (input.costOfDebtPercent / 100)) + (equityWeight * (input.costOfEquityPercent / 100));
}

export function calculateGrowingPerpetuityTerminalValue(input: {
  finalYearCashFlow: number;
  discountRatePercent: number;
  longTermGrowthRatePercent: number;
}): number {
  const discountRate = input.discountRatePercent / 100;
  const longTermGrowthRate = input.longTermGrowthRatePercent / 100;

  if (discountRate <= longTermGrowthRate) {
    throw new Error('Discount rate must be greater than long-term growth rate.');
  }

  return (input.finalYearCashFlow * (1 + longTermGrowthRate)) / (discountRate - longTermGrowthRate);
}

function buildCashFlowSeries(initialInvestment: number, annualCashFlows: number[], terminalValue = 0): number[] {
  if (annualCashFlows.length === 0) {
    return [-Math.abs(initialInvestment)];
  }

  return [
    -Math.abs(initialInvestment),
    ...annualCashFlows.map((cashFlow, index) => (
      index === annualCashFlows.length - 1 ? cashFlow + terminalValue : cashFlow
    )),
  ];
}

function npvFromSeries(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((sum, cashFlow, index) => sum + (cashFlow / Math.pow(1 + discountRate, index)), 0);
}

export function calculateNetPresentValue(input: {
  initialInvestment: number;
  annualCashFlows: number[];
  discountRatePercent: number;
  terminalValue?: number;
}): number {
  const discountRate = input.discountRatePercent / 100;
  const cashFlows = buildCashFlowSeries(input.initialInvestment, input.annualCashFlows, input.terminalValue ?? 0);
  return npvFromSeries(cashFlows, discountRate);
}

export function calculateInternalRateOfReturn(input: {
  initialInvestment: number;
  annualCashFlows: number[];
  terminalValue?: number;
  initialGuessPercent?: number;
}): number | null {
  const cashFlows = buildCashFlowSeries(input.initialInvestment, input.annualCashFlows, input.terminalValue ?? 0);
  if (cashFlows.length < 2) {
    return null;
  }

  let rate = (input.initialGuessPercent ?? 15) / 100;

  for (let iteration = 0; iteration < IRR_MAX_ITERATIONS; iteration += 1) {
    const npv = npvFromSeries(cashFlows, rate);
    if (Math.abs(npv) < IRR_EPSILON) {
      return rate;
    }

    let derivative = 0;
    for (let index = 1; index < cashFlows.length; index += 1) {
      derivative -= (index * cashFlows[index]) / Math.pow(1 + rate, index + 1);
    }

    if (Math.abs(derivative) < IRR_EPSILON) {
      return null;
    }

    const nextRate = rate - (npv / derivative);
    if (!Number.isFinite(nextRate) || nextRate <= -0.9999) {
      return null;
    }

    rate = nextRate;
  }

  return null;
}
