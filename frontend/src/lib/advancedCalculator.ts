import { AdvancedFormState } from '../types/advanced';
import {
  calculateAnnualDepreciationFromSchedule,
  calculateDecliningBalanceDepreciation,
  calculateGrowthRetentionGuidance,
  calculateInterestCoverageRatio,
  calculateLoanAmortization,
  calculateMonthlyProfitSnapshot,
  calculateProfitToCashBridge,
  calculateReturnOnInvestedCapital,
  calculateSensitivityMatrix,
  calculateStraightLineDepreciation,
  calculateUnitEconomics,
  compareReturnToBenchmark,
} from './sharedFinanceEngine';
import { calculateSharedSimpleSummary, type SharedSimpleSummaryResult } from './simpleSummary';

export const DEFAULT_ADVANCED_BENCHMARK_RATE = 0.14;

export type WarningSeverity = 'critical' | 'warning' | 'note';

export interface PlannerWarning {
  severity: WarningSeverity;
  code: string;
  message: string;
}

export interface AdvancedCalculationResult {
  simpleSummary: SharedSimpleSummaryResult;
  unitBaseCost: number;
  contributionMargin: number;
  effectiveContributionMargin: number;
  monthlyFixedOps: number;
  monthlyOperatingVariableCostsAtBaseSales: number;
  monthlyOperatingMixedCosts: number;
  monthlyFixedBaseCosts: number;
  operatingVariableCostPerUnit: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  monthlyLoanPayment: number;
  loanInterestThisMonth: number;
  monthlyRevenue: number;
  monthlyVariableCosts: number;
  monthlyProfitBeforeTax: number;
  monthlyTax: number;
  monthlyNetProfit: number;
  monthlyCashPosition: number;
  annualInterestCost: number;
  interestCoverageRatio: number | null;
  interestCoverageStatus: 'healthy' | 'watch' | 'risky' | 'not_applicable';
  interestCoverageMessage: string;
  roic: number | null;
  benchmarkRate: number;
  benchmarkSpread: number | null;
  benchmarkStatus: 'strong' | 'watch' | 'weak' | 'not_applicable';
  benchmarkMessage: string;
  reinvestmentNeed: number;
  ownerDistributionCapacity: number;
  growthRetention: {
    targetGrowthPercent: number;
    estimatedGrowthReinvestment: number;
    recommendedRetention: number;
    profitBasedTakeHome: number;
    cashSafeTakeHome: number;
    fundingGap: number;
    status: 'base_only' | 'funded' | 'tight' | 'shortfall';
    message: string;
  };
  cashBridge: {
    netProfit: number;
    depreciationAddBack: number;
    principalRepayment: number;
    cashFromOperations: number;
    cashPosition: number;
    differenceFromProfit: number;
    message: string;
  };
  costStructure: {
    fixedMonthlyCost: number;
    variableMonthlyCostAtBaseSales: number;
    mixedMonthlyCost: number;
    fixedShare: number;
    variableShare: number;
    mixedShare: number;
    riskMessage: string;
  };
  breakEvenUnits: number;
  weeksToBreakEven: number;
  monthsToBreakEven: number;
  totalStartupInvestment: number;
  twelveMonthNetProfit: number;
  depreciationSchedule: { year: number; depreciation: number; bookValue: number }[];
  loanSchedule: { month: number; payment: number; principal: number; interest: number; balance: number }[];
  scenarios: {
    base: { breakEvenWeeks: number; monthlyNetProfit: number };
    pessimistic: { breakEvenWeeks: number; monthlyNetProfit: number };
    optimistic: { breakEvenWeeks: number; monthlyNetProfit: number };
  };
  sensitivityMatrix: {
    cells: Array<{
      revenueMultiplier: number;
      costMultiplier: number;
      monthlyNetProfit: number;
      status: 'profit' | 'thin' | 'loss';
    }>;
    profitableScenarios: number;
    totalScenarios: number;
    lossCases: string[];
    summary: string;
  };
  warnings: PlannerWarning[];
  investedCapital: number;
  timelineData: { week: number; revenue: number; costs: number; netCash: number }[];
}

export const calculateAdvancedRoadmap = (state: AdvancedFormState): AdvancedCalculationResult => {
  // 1. Unit economics
  const unitEconomics = calculateUnitEconomics({
    totalVariableInputCost: state.rawMaterials + state.directLabor + state.packaging + state.otherVariable,
    batchYield: state.batchYield,
    sellingPrice: state.sellingPrice,
    weeklyUnits: state.unitsPerWeek,
  });
  const unitBaseCost = unitEconomics.unitBaseCost;

  const monthlyUnits = state.unitsPerWeek * 4.33;

  const fixedOperatingCosts = (
    (state.utilitiesBehavior === 'fixed' ? state.utilities : 0)
    + (state.transportBehavior === 'fixed' ? state.transport : 0)
    + (state.marketingBehavior === 'fixed' ? state.marketing : 0)
    + (state.otherOperatingBehavior === 'fixed' ? state.otherOperating : 0)
  );
  const variableOperatingCosts = (
    (state.utilitiesBehavior === 'variable' ? state.utilities : 0)
    + (state.transportBehavior === 'variable' ? state.transport : 0)
    + (state.marketingBehavior === 'variable' ? state.marketing : 0)
    + (state.otherOperatingBehavior === 'variable' ? state.otherOperating : 0)
  );
  const mixedOperatingCosts = (
    (state.utilitiesBehavior === 'mixed' ? state.utilities : 0)
    + (state.transportBehavior === 'mixed' ? state.transport : 0)
    + (state.marketingBehavior === 'mixed' ? state.marketing : 0)
    + (state.otherOperatingBehavior === 'mixed' ? state.otherOperating : 0)
  );
  const monthlyFixedBaseCosts = state.monthlyRent + state.monthlySalaries + state.monthlyOtherFixed + fixedOperatingCosts;
  const mixedFixedShare = mixedOperatingCosts * 0.5;
  const mixedVariableShare = mixedOperatingCosts * 0.5;
  const monthlyFixedOps = monthlyFixedBaseCosts + mixedFixedShare;
  const monthlyOperatingVariableCostsAtBaseSales = variableOperatingCosts + mixedVariableShare;
  const operatingVariableCostPerUnit = monthlyUnits > 0 ? monthlyOperatingVariableCostsAtBaseSales / monthlyUnits : 0;

  // 3. Depreciation
  const depreciationSchedule = state.depreciationMethod === 'straight-line'
    ? calculateStraightLineDepreciation(state.equipmentCost, state.salvageValue, state.usefulLife)
    : calculateDecliningBalanceDepreciation(state.equipmentCost, state.salvageValue, state.usefulLife);
  const annualDepreciation = calculateAnnualDepreciationFromSchedule(depreciationSchedule);
  const monthlyDepreciation = annualDepreciation / 12;

  // 4. Loan
  const loanAmortization = calculateLoanAmortization(state.loanAmount, state.annualInterestRate, state.loanTermMonths);
  const monthlyLoanPayment = loanAmortization.monthlyPayment;
  const loanInterestThisMonth = loanAmortization.firstMonthInterest;
  const loanSchedule = loanAmortization.schedule;

  // 5. Monthly profit
  const monthlyRevenue = state.sellingPrice * monthlyUnits;
  const monthlyVariableCosts = (unitBaseCost * monthlyUnits) + monthlyOperatingVariableCostsAtBaseSales;
  const monthlyProfitSnapshot = calculateMonthlyProfitSnapshot({
    monthlyRevenue,
    monthlyVariableCosts,
    monthlyFixedCosts: monthlyFixedOps,
    monthlyDepreciation,
    monthlyInterestCost: loanInterestThisMonth,
    taxRatePercent: state.taxRate,
  });
  const monthlyProfitBeforeTax = monthlyProfitSnapshot.profitBeforeTax;
  const monthlyTax = monthlyProfitSnapshot.taxAmount;
  const monthlyNetProfit = monthlyProfitSnapshot.netProfit;

  // 6. Shared Simple Mode summary
  const totalStartupInvestment = state.equipmentCost;
  const simpleSummary = calculateSharedSimpleSummary({
    lineItems: [
      {
        id: 'advanced-primary',
        name: state.businessName || 'Primary product',
        sellingPrice: state.sellingPrice,
        variableCostPerUnit: unitBaseCost,
        unitsPerWeek: state.unitsPerWeek,
      },
    ],
    totalMonthlyFixedCosts: monthlyFixedOps,
    startupCostsEntered: totalStartupInvestment,
    fallbackSelectedPrice: state.sellingPrice,
    fallbackVariableCostPerUnit: unitBaseCost,
    fallbackContributionMargin: state.sellingPrice - unitBaseCost,
  });
  const contributionMargin = simpleSummary.contributionMargin;
  const effectiveContributionMargin = state.sellingPrice - unitBaseCost - operatingVariableCostPerUnit;
  const principalPaymentThisMonth = Math.max(monthlyLoanPayment - loanInterestThisMonth, 0);
  const cashBridge = calculateProfitToCashBridge({
    netProfit: monthlyNetProfit,
    depreciation: monthlyDepreciation,
    principalRepayment: principalPaymentThisMonth,
  });
  const monthlyCashPosition = cashBridge.cashPosition;
  const annualInterestCost = loanSchedule.reduce((sum, row) => sum + row.interest, 0);
  const annualOperatingProfitBeforeInterest = (monthlyRevenue - monthlyVariableCosts - monthlyFixedOps - monthlyDepreciation) * 12;
  const interestCoverageRatio = calculateInterestCoverageRatio(annualOperatingProfitBeforeInterest, annualInterestCost);
  const investedCapital = state.investmentSize > 0 ? state.investmentSize : totalStartupInvestment;
  const annualNopat = annualOperatingProfitBeforeInterest * (1 - (state.taxRate / 100));
  const roic = calculateReturnOnInvestedCapital(annualNopat, investedCapital);
  const reinvestmentNeed = simpleSummary.safetyBufferAmount;
  const ownerDistributionCapacity = simpleSummary.safeTakeHomeAmount;
  const benchmarkRate = DEFAULT_ADVANCED_BENCHMARK_RATE;
  const benchmarkComparison = compareReturnToBenchmark(roic, benchmarkRate);
  const growthRetention = calculateGrowthRetentionGuidance({
    targetGrowthPercent: state.growthTargetPercent,
    monthlyVariableCosts,
    baseRetention: reinvestmentNeed,
    monthlyNetProfit,
    monthlyCashPosition,
  });
  const totalCostStructureBase = monthlyFixedBaseCosts + variableOperatingCosts + mixedOperatingCosts;
  const fixedShare = totalCostStructureBase > 0 ? monthlyFixedBaseCosts / totalCostStructureBase : 0;
  const variableShare = totalCostStructureBase > 0 ? variableOperatingCosts / totalCostStructureBase : 0;
  const mixedShare = totalCostStructureBase > 0 ? mixedOperatingCosts / totalCostStructureBase : 0;
  const costStructureRiskMessage = fixedShare >= 0.6
    ? 'A large share of your monthly cost base is fixed, so a bad month can hurt more sharply.'
    : fixedShare >= 0.35
      ? 'Your cost base has a meaningful fixed portion, so sales discipline still matters.'
      : 'A good share of your operating cost base is flexible, which gives more breathing room in weaker months.';
  let interestCoverageStatus: AdvancedCalculationResult['interestCoverageStatus'] = 'not_applicable';
  let interestCoverageMessage = 'No loan entered, so debt safety does not apply yet.';
  if (interestCoverageRatio !== null) {
    if (interestCoverageRatio >= 3) {
      interestCoverageStatus = 'healthy';
      interestCoverageMessage = 'Your business comfortably covers its interest cost and has room for a difficult month.';
    } else if (interestCoverageRatio >= 1.5) {
      interestCoverageStatus = 'watch';
      interestCoverageMessage = 'Debt is manageable, but there is limited room if sales fall or costs rise.';
    } else {
      interestCoverageStatus = 'risky';
      interestCoverageMessage = 'Debt service looks risky. A small drop in sales could make repayment difficult.';
    }
  }

  // 7. Break-even
  const annualFixedExcludingDepreciation = (monthlyFixedOps + loanInterestThisMonth) * 12;
  const totalAnnualFixed = annualFixedExcludingDepreciation + annualDepreciation;
  const breakEvenUnits = effectiveContributionMargin > 0 ? totalAnnualFixed / effectiveContributionMargin : Infinity;
  const weeksToBreakEven = breakEvenUnits / (state.unitsPerWeek || 1);
  const monthsToBreakEven = weeksToBreakEven / 4.33;

  // 8. Scenarios
  const calcScenario = (salesMultiplier: number) => {
    const weeklySales = state.unitsPerWeek * salesMultiplier;
    const rev = state.sellingPrice * (weeklySales * 4.33);
    const varCosts = (unitBaseCost * (weeklySales * 4.33)) + (monthlyOperatingVariableCostsAtBaseSales * salesMultiplier);
    const pbt = rev - varCosts - monthlyFixedOps - monthlyDepreciation - loanInterestThisMonth;
    const tax = Math.max(0, pbt * (state.taxRate / 100));
    const net = pbt - tax;
    const beWeeks = effectiveContributionMargin > 0 ? (totalAnnualFixed / effectiveContributionMargin) / (weeklySales || 1) : Infinity;
    return { breakEvenWeeks: beWeeks, monthlyNetProfit: net };
  };

  const scenarios = {
    base: calcScenario(1),
    pessimistic: calcScenario(0.8),
    optimistic: calcScenario(1.2),
  };
  const sensitivityMatrix = calculateSensitivityMatrix({
    monthlyRevenue,
    monthlyVariableCosts,
    monthlyFixedCosts: monthlyFixedOps,
    monthlyDepreciation,
    monthlyInterestCost: loanInterestThisMonth,
    taxRatePercent: state.taxRate,
    revenueMultipliers: [0.8, 1, 1.2],
    costMultipliers: [1, 1.15],
  });

  // 9. Warnings
  const warnings: PlannerWarning[] = [];
  const addWarning = (severity: WarningSeverity, code: string, message: string) => {
    warnings.push({ severity, code, message });
  };

  if (monthlyNetProfit < 0) {
    addWarning('critical', 'monthly_loss', 'Your business is operating at a loss. You need to increase sales, raise prices, or cut costs.');
  }
  if (state.sellingPrice < unitBaseCost && state.sellingPrice > 0) {
    addWarning('critical', 'selling_below_variable_cost', 'You are selling below your variable cost. You lose money on every sale.');
  }
  if (effectiveContributionMargin <= 0 && state.sellingPrice > 0) {
    addWarning('critical', 'no_effective_contribution_margin', 'Your selling price does not cover variable and operating costs per unit. Break-even is not reachable at this setup.');
  }
  if (interestCoverageRatio !== null && interestCoverageRatio < 1.5) {
    addWarning('critical', 'risky_interest_coverage', interestCoverageMessage);
  }
  if (monthlyNetProfit > 0 && monthlyCashPosition < 0) {
    addWarning('critical', 'profit_cash_squeeze', cashBridge.message);
  }
  if (weeksToBreakEven > 104) {
    addWarning('warning', 'long_break_even', 'Break-even is taking longer than 2 years. Consider reducing fixed costs or increasing price.');
  }
  if (effectiveContributionMargin > 0 && effectiveContributionMargin < state.sellingPrice * 0.1 && state.sellingPrice > 0) {
    addWarning('warning', 'thin_effective_margin', 'Your margin is very low once operating cost behavior is considered. Any unexpected cost could make you unprofitable.');
  }
  if (benchmarkComparison.status === 'weak') {
    addWarning('warning', 'weak_benchmark_return', benchmarkComparison.message);
  }
  if (growthRetention.status === 'shortfall' || growthRetention.status === 'tight') {
    addWarning('warning', `growth_${growthRetention.status}`, growthRetention.message);
  }
  if (fixedShare >= 0.6) {
    addWarning('warning', 'high_fixed_cost_share', costStructureRiskMessage);
  }
  if (interestCoverageStatus === 'watch') {
    addWarning('warning', 'watch_interest_coverage', interestCoverageMessage);
  }
  if (interestCoverageRatio === null) {
    addWarning('note', 'no_loan_entered', 'No loan entered, so debt safety does not apply yet.');
  }
  addWarning('note', 'simplified_tax', 'Tax is a simplified estimate.');
  addWarning('note', 'working_capital_not_full', 'Working capital timing is not fully calculated in Advanced Mode.');
  addWarning('note', 'flat_timeline_projection', 'Timeline projections use the current weekly sales pace and do not model seasonal changes.');

  // 10. Timeline Data (52 weeks)
  const timelineData = [];
  let cumulativeRevenue = 0;
  let cumulativeCosts = state.equipmentCost; // Start with initial investment
  
  for (let week = 0; week <= 52; week++) {
    timelineData.push({
      week,
      revenue: cumulativeRevenue,
      costs: cumulativeCosts,
      netCash: cumulativeRevenue - cumulativeCosts
    });
    
    cumulativeRevenue += (state.sellingPrice * state.unitsPerWeek);
    cumulativeCosts += (unitBaseCost * state.unitsPerWeek) + (monthlyFixedOps / 4.33) + (monthlyLoanPayment / 4.33);
  }

  return {
    simpleSummary,
    unitBaseCost,
    contributionMargin,
    effectiveContributionMargin,
    monthlyFixedOps,
    monthlyOperatingVariableCostsAtBaseSales,
    monthlyOperatingMixedCosts: mixedOperatingCosts,
    monthlyFixedBaseCosts,
    operatingVariableCostPerUnit,
    annualDepreciation,
    monthlyDepreciation,
    monthlyLoanPayment,
    loanInterestThisMonth,
    monthlyRevenue,
    monthlyVariableCosts,
    monthlyProfitBeforeTax,
    monthlyTax,
    monthlyNetProfit,
    monthlyCashPosition,
    annualInterestCost,
    interestCoverageRatio,
    interestCoverageStatus,
    interestCoverageMessage,
    roic,
    benchmarkRate,
    benchmarkSpread: benchmarkComparison.spread,
    benchmarkStatus: benchmarkComparison.status,
    benchmarkMessage: benchmarkComparison.message,
    reinvestmentNeed,
    ownerDistributionCapacity,
    growthRetention,
    cashBridge,
    costStructure: {
      fixedMonthlyCost: monthlyFixedBaseCosts,
      variableMonthlyCostAtBaseSales: variableOperatingCosts,
      mixedMonthlyCost: mixedOperatingCosts,
      fixedShare,
      variableShare,
      mixedShare,
      riskMessage: costStructureRiskMessage,
    },
    breakEvenUnits,
    weeksToBreakEven,
    monthsToBreakEven,
    totalStartupInvestment,
    twelveMonthNetProfit: monthlyNetProfit * 12,
    depreciationSchedule,
    loanSchedule,
    scenarios,
    sensitivityMatrix,
    warnings,
    investedCapital,
    timelineData
  };
};
