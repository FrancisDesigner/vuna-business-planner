import { allocateBreakEven, computeWACM, type LineItem, type WACMProductBreakdown } from './wacm';

export const WEEKS_PER_MONTH = 52 / 12;
export const DAYS_PER_MONTH = 365 / 12;
export interface SharedSimpleSummaryResult {
  selectedPrice: number;
  weightedAvgVariableCost: number;
  contributionMargin: number;
  weeklyRevenue: number;
  weeklyCost: number;
  weeklyProfit: number;
  totalUnitsPerWeek: number;
  monthlySales: number;
  monthlyRevenue: number;
  monthlyVariableCosts: number;
  monthlyProfit: number;
  startupCostsEntered: number;
  firstStockCost: number;
  totalStartupMoney: number;
  monthlyRestockCost: number;
  safeTakeHomeAmount: number;
  safetyBufferAmount: number;
  safeTakeHomeWeeklyAmount: number;
  safeTakeHomeDailyAmount: number;
  safetyBufferWeeklyAmount: number;
  safetyBufferDailyAmount: number;
  lossPerDay: number;
  operatingBreakEvenUnits: number;
  operatingBreakEvenRevenue: number;
  operatingBreakEvenWeeks: number;
  investmentPaybackMonths: number;
  investmentPaybackWeeks: number;
  productBreakdown: WACMProductBreakdown[];
  warnings: string[];
}

interface SharedSimpleSummaryInput {
  lineItems: LineItem[];
  totalMonthlyFixedCosts: number;
  startupCostsEntered: number;
  includeStartupInvestment?: boolean;
  fallbackSelectedPrice?: number;
  fallbackVariableCostPerUnit?: number;
  fallbackContributionMargin?: number;
}

export function calculateSharedSimpleSummary({
  lineItems,
  totalMonthlyFixedCosts,
  startupCostsEntered,
  includeStartupInvestment = true,
  fallbackSelectedPrice = 0,
  fallbackVariableCostPerUnit = 0,
  fallbackContributionMargin,
}: SharedSimpleSummaryInput): SharedSimpleSummaryResult {
  const wacmResult = computeWACM(lineItems);
  const hasValidMix = wacmResult.products.length > 0;

  const selectedPrice = hasValidMix
    ? wacmResult.weightedAvgSellingPrice
    : fallbackSelectedPrice;
  const weightedAvgVariableCost = hasValidMix
    ? wacmResult.weightedAvgVariableCost
    : fallbackVariableCostPerUnit;
  const contributionMargin = hasValidMix
    ? wacmResult.wacm
    : fallbackContributionMargin ?? (selectedPrice - weightedAvgVariableCost);

  const totalUnitsPerWeek = wacmResult.totalUnitsPerWeek;
  const monthlySales = totalUnitsPerWeek * WEEKS_PER_MONTH;
  const monthlyRevenue = selectedPrice * monthlySales;
  const monthlyVariableCosts = weightedAvgVariableCost * monthlySales;
  const firstStockCost = monthlyVariableCosts;
  const totalStartupMoney = includeStartupInvestment ? startupCostsEntered + firstStockCost : 0;
  const monthlyProfit = monthlyRevenue - monthlyVariableCosts - totalMonthlyFixedCosts;
  const monthlyRestockCost = monthlyVariableCosts;
  const safetyBufferAmount = monthlyProfit > 0 ? monthlyProfit * 0.2 : 0;
  const safeTakeHomeAmount = monthlyProfit > 0 ? monthlyProfit - safetyBufferAmount : 0;
  const safeTakeHomeWeeklyAmount = safeTakeHomeAmount / WEEKS_PER_MONTH;
  const safeTakeHomeDailyAmount = safeTakeHomeAmount / DAYS_PER_MONTH;
  const safetyBufferWeeklyAmount = safetyBufferAmount / WEEKS_PER_MONTH;
  const safetyBufferDailyAmount = safetyBufferAmount / DAYS_PER_MONTH;
  const lossPerDay = monthlyProfit < 0 ? Math.abs(monthlyProfit) / DAYS_PER_MONTH : 0;

  const operatingBreakEvenUnits = contributionMargin > 0
    ? totalMonthlyFixedCosts / contributionMargin
    : Number.POSITIVE_INFINITY;
  const operatingBreakEvenRevenue = Number.isFinite(operatingBreakEvenUnits)
    ? operatingBreakEvenUnits * selectedPrice
    : Number.POSITIVE_INFINITY;
  const operatingBreakEvenWeeks = totalUnitsPerWeek > 0 && Number.isFinite(operatingBreakEvenUnits)
    ? operatingBreakEvenUnits / totalUnitsPerWeek
    : Number.POSITIVE_INFINITY;
  const investmentPaybackMonths = totalStartupMoney <= 0
    ? 0
    : monthlyProfit > 0
    ? totalStartupMoney / monthlyProfit
    : Number.POSITIVE_INFINITY;
  const investmentPaybackWeeks = Number.isFinite(investmentPaybackMonths)
    ? investmentPaybackMonths * WEEKS_PER_MONTH
    : Number.POSITIVE_INFINITY;

  const productBreakdown = allocateBreakEven(
    wacmResult,
    Number.isFinite(operatingBreakEvenUnits) ? operatingBreakEvenUnits : 0,
  ).products;

  return {
    selectedPrice,
    weightedAvgVariableCost,
    contributionMargin,
    weeklyRevenue: hasValidMix ? wacmResult.weeklyRevenue : 0,
    weeklyCost: hasValidMix ? wacmResult.weeklyVariableCosts : 0,
    weeklyProfit: hasValidMix ? wacmResult.weeklyTotalContribution : 0,
    totalUnitsPerWeek,
    monthlySales,
    monthlyRevenue,
    monthlyVariableCosts,
    monthlyProfit,
    startupCostsEntered,
    firstStockCost,
    totalStartupMoney,
    monthlyRestockCost,
    safeTakeHomeAmount,
    safetyBufferAmount,
    safeTakeHomeWeeklyAmount,
    safeTakeHomeDailyAmount,
    safetyBufferWeeklyAmount,
    safetyBufferDailyAmount,
    lossPerDay,
    operatingBreakEvenUnits,
    operatingBreakEvenRevenue,
    operatingBreakEvenWeeks,
    investmentPaybackMonths,
    investmentPaybackWeeks,
    productBreakdown,
    warnings: [...wacmResult.negativeMarginWarnings],
  };
}
