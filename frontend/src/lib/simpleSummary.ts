import { normalizeSimplePurchaseCycle, type SimplePurchaseCycleInput } from './sharedFinanceEngine';
import { allocateBreakEven, computeWACM, type LineItem, type WACMProductBreakdown } from './wacm';

export const WEEKS_PER_MONTH = 52 / 12;
export const DAYS_PER_MONTH = 365 / 12;

type OpeningStockCycle = SimplePurchaseCycleInput['purchaseCycleType'] | 'as-needed';

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
  openingStockCycle?: OpeningStockCycle;
  openingStockCycleDetails?: Partial<Omit<SimplePurchaseCycleInput, 'purchaseCycleType'>>;
  fallbackSelectedPrice?: number;
  fallbackVariableCostPerUnit?: number;
  fallbackContributionMargin?: number;
}

function calculateOpeningStockCost(input: {
  openingStockCycle: OpeningStockCycle;
  weeklyVariableCosts: number;
  monthlyVariableCosts: number;
  details?: Partial<Omit<SimplePurchaseCycleInput, 'purchaseCycleType'>>;
}): number {
  const cycle = input.openingStockCycle === 'as-needed' ? 'irregular' : input.openingStockCycle;

  switch (cycle) {
    case 'daily': {
      const purchasesPerWeek = input.details?.purchasesPerWeek && input.details.purchasesPerWeek > 0
        ? input.details.purchasesPerWeek
        : 1;
      const costPerPurchase = input.details?.costPerPurchase && input.details.costPerPurchase > 0
        ? input.details.costPerPurchase
        : input.weeklyVariableCosts / purchasesPerWeek;
      const normalized = normalizeSimplePurchaseCycle({
        purchaseCycleType: 'daily',
        purchasesPerWeek,
        costPerPurchase,
      });

      return normalized.dailyFloatRequired ?? costPerPurchase;
    }

    case 'weekly':
      return input.weeklyVariableCosts;

    case 'biweekly':
      return input.weeklyVariableCosts * 2;

    case 'monthly':
      return input.monthlyVariableCosts;

    case 'bulk': {
      const bulkPurchaseCost = input.details?.bulkPurchaseCost && input.details.bulkPurchaseCost > 0
        ? input.details.bulkPurchaseCost
        : input.monthlyVariableCosts;
      const normalized = normalizeSimplePurchaseCycle({
        purchaseCycleType: 'bulk',
        bulkPurchaseCost,
        bulkLifespanMonths: input.details?.bulkLifespanMonths,
      });

      return normalized.bulkCashNeededAtReorder ?? bulkPurchaseCost;
    }

    case 'irregular': {
      const purchaseEventsPerMonth = input.details?.purchaseEventsPerMonth && input.details.purchaseEventsPerMonth > 0
        ? input.details.purchaseEventsPerMonth
        : 1;
      const averagePurchaseAmount = input.details?.averagePurchaseAmount && input.details.averagePurchaseAmount > 0
        ? input.details.averagePurchaseAmount
        : input.monthlyVariableCosts / purchaseEventsPerMonth;
      const normalized = normalizeSimplePurchaseCycle({
        purchaseCycleType: 'irregular',
        purchaseEventsPerMonth,
        averagePurchaseAmount,
      });

      return purchaseEventsPerMonth > 0 ? normalized.monthlyVariableCost / purchaseEventsPerMonth : averagePurchaseAmount;
    }

    default: {
      const _exhaustive: never = cycle;
      void _exhaustive;

      return input.weeklyVariableCosts;
    }
  }
}

export function calculateSharedSimpleSummary({
  lineItems,
  totalMonthlyFixedCosts,
  startupCostsEntered,
  includeStartupInvestment = true,
  openingStockCycle = 'monthly',
  openingStockCycleDetails,
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
  const weeklyCycle = normalizeSimplePurchaseCycle({
    purchaseCycleType: 'weekly',
    costPerPurchase: wacmResult.weeklyVariableCosts,
    revenuePerCycle: wacmResult.weeklyRevenue,
  });
  const monthlyRevenue = weeklyCycle.monthlyRevenue;
  const monthlyVariableCosts = weeklyCycle.monthlyVariableCost;
  const firstStockCost = calculateOpeningStockCost({
    openingStockCycle,
    weeklyVariableCosts: wacmResult.weeklyVariableCosts,
    monthlyVariableCosts,
    details: openingStockCycleDetails,
  });
  const totalStartupMoney = startupCostsEntered + firstStockCost;
  const monthlyProfit = weeklyCycle.monthlyContribution - totalMonthlyFixedCosts;
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
