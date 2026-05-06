import {
  WizardState,
  CalculationResult,
  BusinessLineItem,
  CalculationLineItemBreakdown,
  CostItem,
  CostCategory,
  PricingOptionBreakdown,
  PriceImpactSimulation,
} from '../types';
import { BusinessType, BUSINESS_TYPE_CONFIG } from './config';
import { weeksToDays } from './recoveryTime';
import type { LineItem } from './wacm';
import { calculateSharedSimpleSummary, WEEKS_PER_MONTH } from './simpleSummary';

export const SIMPLE_PRICING_MULTIPLIERS = {
  low: 1,
  medium: 1.1,
  high: 1.2,
} as const;

const SIMULATOR_PROFIT_IMPROVEMENT_THRESHOLD = 1.1;
const SIMULATOR_PROFIT_REDUCTION_THRESHOLD = 0.9;
const BAD_MONTH_REVENUE_MULTIPLIER = 0.75;

const PAYMENT_COLLECTION_RATE: Record<WizardState['step1_entry']['customerPaymentTiming'], number> = {
  immediate: 1,
  within_week: 0.85,
  mixed: 0.7,
  within_month: 0.5,
};

const sumAmounts = (items: { amount: number }[]): number =>
  items.reduce((sum, item) => sum + item.amount, 0);

function getFoundationCostCategory(item: CostItem): CostCategory {
  return item.costCategory || 'monthly';
}

function splitFoundationCosts(foundationCosts: CostItem[]) {
  return foundationCosts.reduce(
    (totals, item) => {
      if (getFoundationCostCategory(item) === 'one-time') {
        totals.oneTime += item.amount;
      } else {
        totals.monthly += item.amount;
      }
      return totals;
    },
    { oneTime: 0, monthly: 0 },
  );
}

function buildSimpleModeLineItems(
  state: WizardState,
  businessType: BusinessType,
  unitBaseCost: number,
  fallbackSelectedPrice: number,
): LineItem[] {
  const { step1_entry, step2_buckets } = state;
  const config = BUSINESS_TYPE_CONFIG[businessType];

  if (config.showMultipleItems) {
    return step2_buckets.items.map<LineItem>((item: BusinessLineItem) => ({
      id: item.id,
      name: item.name.trim() || 'Unnamed item',
      sellingPrice: item.sellingPrice,
      variableCostPerUnit: item.buyingPrice,
      unitsPerWeek: item.unitsPerWeek,
    }));
  }

  return [
    {
      id: 'simple-mode-primary',
      name: step1_entry.activityDescription.trim() || 'Primary product',
      sellingPrice: fallbackSelectedPrice,
      variableCostPerUnit: unitBaseCost,
      unitsPerWeek: step1_entry.salesPerWeek,
    },
  ];
}

function buildLineItemBreakdown(result: ReturnType<typeof calculateSharedSimpleSummary>): CalculationLineItemBreakdown[] {
  return result.productBreakdown.map((product) => ({
    id: product.id,
    name: product.name,
    buyPrice: product.variableCostPerUnit,
    sellPrice: product.sellingPrice,
    profitPerItem: product.contributionMarginPerUnit,
    unitsPerWeek: product.unitsPerWeek,
    mixPercent: product.mixPercent,
    weeklyRevenue: product.sellingPrice * product.unitsPerWeek,
    weeklyCost: product.variableCostPerUnit * product.unitsPerWeek,
    weeklyProfit: product.weeklyContribution,
    allocatedBreakEvenUnits: product.allocatedBreakEvenUnits,
    allocatedBreakEvenRevenue: product.allocatedBreakEvenRevenue,
  }));
}

function buildPricingOptions(
  items: CalculationLineItemBreakdown[],
): PricingOptionBreakdown[] {
  const totalUnits = items.reduce((sum, item) => sum + item.unitsPerWeek, 0);

  const optionTemplates: Array<Pick<PricingOptionBreakdown, 'key' | 'label' | 'multiplier' | 'description'>> = [
    {
      key: 'low',
      label: 'Low Price',
      multiplier: SIMPLE_PRICING_MULTIPLIERS.low,
      description: 'Keep today’s prices if you want the most familiar customer price point.',
    },
    {
      key: 'medium',
      label: 'Medium Price',
      multiplier: SIMPLE_PRICING_MULTIPLIERS.medium,
      description: 'Add a clear 10% increase on each item if you want a steadier profit cushion.',
    },
    {
      key: 'high',
      label: 'High Price',
      multiplier: SIMPLE_PRICING_MULTIPLIERS.high,
      description: 'Add a clear 20% increase on each item if you want faster recovery per sale.',
    },
  ];

  return optionTemplates.map((option) => {
    const optionItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      buyPrice: item.buyPrice,
      currentSellPrice: item.sellPrice,
      suggestedSellPrice: Math.round(item.sellPrice * option.multiplier),
      unitsPerWeek: item.unitsPerWeek,
    }));

    const averageSuggestedPrice = totalUnits > 0
      ? optionItems.reduce((sum, item) => sum + (item.suggestedSellPrice * item.unitsPerWeek), 0) / totalUnits
      : 0;

    return {
      ...option,
      averageSuggestedPrice,
      items: optionItems,
    };
  });
}

function getUnitBaseCostAndSelectedPrice(
  state: WizardState,
  businessType: BusinessType,
) {
  const { step2_buckets, step3_strategy } = state;
  const totalSeed = sumAmounts(step2_buckets.seedCosts);
  const batchYield = step2_buckets.batchYield || 1;
  const manufacturingUnitBaseCost = batchYield > 0 ? totalSeed / batchYield : 0;
  const defaultSelectedPrice = manufacturingUnitBaseCost * 2;

  return {
    unitBaseCost: manufacturingUnitBaseCost,
    selectedPrice: step3_strategy.selectedPrice || defaultSelectedPrice,
    totalSeed,
    batchYield,
  };
}

function getSharedSummaryForState(
  state: WizardState,
  businessType: BusinessType,
  options?: {
    priceMultiplier?: number;
    demandMultiplier?: number;
  },
) {
  const { step2_buckets } = state;
  const { oneTime: totalFoundationOneTime, monthly: totalFoundationMonthly } = splitFoundationCosts(step2_buckets.foundationCosts);
  const { unitBaseCost, selectedPrice } = getUnitBaseCostAndSelectedPrice(state, businessType);
  const totalFuel = sumAmounts(step2_buckets.fuelCosts);
  const totalProtection = sumAmounts(step2_buckets.protectionCosts);
  const totalMonthlyFixedCosts = totalFoundationMonthly + totalFuel + totalProtection;
  const startupCostsEntered = businessType === 'manufacturing'
    ? totalFoundationOneTime
    : sumAmounts(step2_buckets.seedCosts) + totalFoundationOneTime;
  const includeStartupInvestment = businessType !== 'agriculture' && state.step1_entry.businessStatus === 'new';

  const lineItems = buildSimpleModeLineItems(state, businessType, unitBaseCost, selectedPrice).map((item) => ({
    ...item,
    sellingPrice: item.sellingPrice * (options?.priceMultiplier ?? 1),
    unitsPerWeek: item.unitsPerWeek * (options?.demandMultiplier ?? 1),
  }));

  const sharedSummary = calculateSharedSimpleSummary({
    lineItems,
    totalMonthlyFixedCosts,
    startupCostsEntered,
    includeStartupInvestment,
    openingStockCycle: step2_buckets.stockRefillFrequency,
    openingStockCycleDetails: {
      purchasesPerWeek: step2_buckets.purchasesPerWeek,
      sellingDaysPerWeek: step2_buckets.sellingDaysPerWeek,
      costPerPurchase: step2_buckets.costPerPurchase,
      bulkPurchaseCost: step2_buckets.bulkPurchaseCost,
      bulkLifespanMonths: step2_buckets.bulkLifespanMonths,
      purchaseEventsPerMonth: step2_buckets.purchaseEventsPerMonth,
      averagePurchaseAmount: step2_buckets.averagePurchaseAmount,
    },
    fallbackSelectedPrice: selectedPrice * (options?.priceMultiplier ?? 1),
    fallbackVariableCostPerUnit: unitBaseCost,
    fallbackContributionMargin: (selectedPrice * (options?.priceMultiplier ?? 1)) - unitBaseCost,
  });

  return {
    sharedSummary,
    totalMonthlyFixedCosts,
    startupCostsEntered,
    unitBaseCost,
    selectedPrice,
  };
}

function getPlanningDays(state: WizardState): number {
  const { seasonCycle } = state.step1_entry;

  if (seasonCycle === 'continuous') {
    return 365;
  }

  return Math.round(365 / seasonCycle);
}

function buildAgriculturePricingOptions(expectedPrice: number): PricingOptionBreakdown[] {
  const options: Array<{ key: 'low' | 'medium' | 'high'; label: 'Low Price' | 'Medium Price' | 'High Price'; multiplier: number; description: string }> = [
    { key: 'low', label: 'Low Price', multiplier: 0.95, description: 'A more cautious selling price if the market is soft.' },
    { key: 'medium', label: 'Medium Price', multiplier: 1, description: 'Your current expected selling price for the season.' },
    { key: 'high', label: 'High Price', multiplier: 1.1, description: 'A stronger selling price if the market gives you room.' },
  ];

  return options.map((option) => ({
    ...option,
    averageSuggestedPrice: Math.round(expectedPrice * option.multiplier),
    items: [],
  }));
}

function calculateAgricultureRoadmap(state: WizardState): CalculationResult {
  const { step1_entry, step2_buckets, step3_strategy } = state;
  const planningDays = getPlanningDays(state);
  const seasonWeeks = planningDays / 7;
  const variableFieldCosts = sumAmounts(step2_buckets.seedCosts) + sumAmounts(step2_buckets.fuelCosts) + sumAmounts(step2_buckets.protectionCosts);
  const landArea = Number(step1_entry.landArea) || 0;
  const landRentPerUnit = Number(step1_entry.landRentPerUnit) || 0;
  const landRentCost = step1_entry.landStatus === 'rented'
    ? landRentPerUnit * landArea
    : 0;
  const totalVariableCosts = variableFieldCosts + landRentCost;
  const expectedYield = Number(step3_strategy.expectedYield) || 0;
  const expectedPrice = Number(step3_strategy.expectedPrice) || 0;
  const byProductRevenue = Number(step3_strategy.byProductRevenue) || 0;
  const effectiveRevenue = (expectedYield * expectedPrice) + byProductRevenue;
  const grossMargin = effectiveRevenue - totalVariableCosts;
  const grossMarginPerLandUnit = landArea > 0 ? grossMargin / landArea : 0;
  const costOfProductionPerUnit = expectedYield > 0 ? totalVariableCosts / expectedYield : 0;
  const breakEvenYield = expectedPrice > 0 ? totalVariableCosts / expectedPrice : Number.POSITIVE_INFINITY;
  const breakEvenPricePerUnit = expectedYield > 0 ? totalVariableCosts / expectedYield : Number.POSITIVE_INFINITY;
  const safeTakeHomeAmount = grossMargin > 0 ? grossMargin * 0.8 : 0;
  const safetyBufferAmount = grossMargin > 0 ? grossMargin * 0.2 : 0;
  const safeTakeHomeWeeklyAmount = safeTakeHomeAmount / seasonWeeks;
  const safeTakeHomeDailyAmount = safeTakeHomeAmount / planningDays;
  const safetyBufferWeeklyAmount = safetyBufferAmount / seasonWeeks;
  const safetyBufferDailyAmount = safetyBufferAmount / planningDays;
  const weeklyRevenue = effectiveRevenue / seasonWeeks;
  const weeklyCost = totalVariableCosts / seasonWeeks;
  const weeklyProfit = grossMargin / seasonWeeks;
  const totalUnitsPerWeek = expectedYield / seasonWeeks;
  const requiredUnitsPerWeek = Number.isFinite(breakEvenYield) ? breakEvenYield / seasonWeeks : Number.POSITIVE_INFINITY;
  const unitsPerWeekGap = Number.isFinite(requiredUnitsPerWeek)
    ? Math.max(requiredUnitsPerWeek - totalUnitsPerWeek, 0)
    : Number.POSITIVE_INFINITY;
  const pricingOptions = buildAgriculturePricingOptions(expectedPrice);
  const warnings: string[] = [];

  if (step1_entry.landStatus === 'rented' && landRentCost <= 0) {
    warnings.push(`Add your land rent per ${step1_entry.landUnit} so the season costs are complete.`);
  }

  if (expectedYield <= 0) {
    warnings.push(`Add your expected yield in ${step1_entry.yieldUnit} so we can calculate gross margin and break-even yield.`);
  }

  if (expectedPrice <= 0) {
    warnings.push(`Add your expected selling price per ${step1_entry.yieldUnit} so we can calculate revenue and break-even price.`);
  }

  if (expectedPrice > 0 && expectedPrice < costOfProductionPerUnit) {
    warnings.push('This selling price is below your cost of production per unit. At that price the season loses money.');
  }

  return {
    businessStatus: step1_entry.businessStatus,
    isAgricultureMode: true,
    baseCost: costOfProductionPerUnit,
    unitBaseCost: costOfProductionPerUnit,
    selectedPrice: expectedPrice,
    survivalPrice: pricingOptions[0]?.averageSuggestedPrice ?? expectedPrice,
    businessPrice: pricingOptions[1]?.averageSuggestedPrice ?? expectedPrice,
    growthPrice: pricingOptions[2]?.averageSuggestedPrice ?? expectedPrice,
    totalSeed: sumAmounts(step2_buckets.seedCosts),
    totalFoundation: 0,
    totalFoundationOneTime: 0,
    totalFoundationMonthly: 0,
    totalFuel: sumAmounts(step2_buckets.fuelCosts),
    totalProtection: sumAmounts(step2_buckets.protectionCosts),
    totalMonthlyFixedCosts: 0,
    totalInitialInvestment: 0,
    startupCostsEntered: 0,
    firstStockCost: 0,
    totalVariableCosts,
    effectiveRevenue,
    grossMargin,
    grossMarginPerLandUnit,
    costOfProductionPerUnit,
    breakEvenYield,
    breakEvenPricePerUnit,
    dailyEquivalentIncome: grossMargin / planningDays,
    planningDays,
    contributionMargin: expectedPrice - costOfProductionPerUnit,
    weightedAvgSellingPrice: expectedPrice,
    weightedAvgVariableCost: costOfProductionPerUnit,
    wacm: expectedPrice - costOfProductionPerUnit,
    weeklyTotalContribution: weeklyProfit,
    operatingBreakEvenUnits: breakEvenYield,
    operatingBreakEvenRevenue: totalVariableCosts,
    operatingBreakEvenWeeks: Number.POSITIVE_INFINITY,
    investmentPaybackMonths: 0,
    investmentPaybackWeeks: 0,
    productBreakdown: [],
    breakEvenUnits: breakEvenYield,
    weeksToTurningPoint: Number.POSITIVE_INFINITY,
    projectedHarvest12Months: grossMargin * (step1_entry.seasonCycle === 'continuous' ? 1 : step1_entry.seasonCycle),
    projectedHarvestYear2: grossMargin * (step1_entry.seasonCycle === 'continuous' ? 2 : step1_entry.seasonCycle * 2),
    warnings,
    monthlySales: expectedYield,
    monthlyRevenue: effectiveRevenue,
    monthlyVariableCosts: totalVariableCosts,
    monthlyProfit: grossMargin,
    estimatedCashPosition: grossMargin,
    estimatedCashCollected: effectiveRevenue,
    cashCollectionRate: 1,
    cashGapRisk: 'low',
    cashGapMessage: 'This simple agriculture plan assumes the crop is sold and collected within the planned season.',
    normalMonthMonthlyProfit: grossMargin,
    normalMonthEstimatedCashPosition: grossMargin,
    badMonthMonthlyRevenue: effectiveRevenue * 0.8,
    badMonthMonthlyProfit: (effectiveRevenue * 0.8) - totalVariableCosts,
    badMonthEstimatedCashPosition: (effectiveRevenue * 0.8) - totalVariableCosts,
    growthStockNeeded: 0,
    growthWarningMessage: null,
    purposeHeadline: step1_entry.businessStatus === 'new'
      ? 'Will this crop season justify starting the farm plan now?'
      : 'Will the next stock-and-harvest cycle make enough profit at this price?',
    purposeSupportMessage: step1_entry.businessStatus === 'new'
      ? 'Use this to judge whether the season looks profitable before you commit more cash.'
      : 'Use this to check whether the next season or restocking cycle is worth the money you are about to put back in.',
    monthlyRestockCost: totalVariableCosts,
    safeTakeHomeAmount,
    safetyBufferAmount,
    safeTakeHomeWeeklyAmount,
    safeTakeHomeDailyAmount,
    safetyBufferWeeklyAmount,
    safetyBufferDailyAmount,
    lossPerDay: grossMargin < 0 ? Math.abs(grossMargin) / planningDays : 0,
    weeklyRevenue,
    weeklyCost,
    weeklyProfit,
    totalUnitsPerWeek,
    requiredUnitsPerWeek,
    unitsPerWeekGap,
    breakEvenPriceNeeded: breakEvenPricePerUnit,
    recoveryDays: 0,
    breakEvenWarning: null,
    startupMoneyWarning: null,
    lineItemBreakdown: [],
    pricingOptions,
  };
}

function getPurposeHeadline(state: WizardState): string {
  switch (state.step1_entry.businessPurpose) {
    case 'cover_family_needs':
      return 'Can this business cover what your household needs each month?';
    case 'save_for_something_big':
      return 'Can this business help you save toward a bigger goal?';
    case 'grow_the_business':
      return 'Can this business grow without starving itself of cash?';
    case 'pay_back_a_loan':
      return 'Can this business pay back your loan without too much pressure?';
    case 'keep_it_running':
      return 'Can this business stay steady and keep operating safely?';
    case 'not_sure_yet':
    default:
      return 'Is this business making money and keeping enough cash inside?';
  }
}

function getPurposeSupportMessage(state: WizardState, results: {
  monthlyProfit: number;
  estimatedCashPosition: number;
  safeTakeHomeAmount: number;
  growthWarningMessage: string | null;
}): string {
  switch (state.step1_entry.businessPurpose) {
    case 'cover_family_needs':
      return results.safeTakeHomeAmount > 0
        ? `After protecting the business, you may be able to take home about ${Math.round(results.safeTakeHomeAmount).toLocaleString()} each month.`
        : 'The business is not yet safely covering monthly take-home needs.';
    case 'save_for_something_big':
      return results.safeTakeHomeAmount > 0
        ? `If you leave your safety buffer in place, this business can start building a monthly saving habit.`
        : 'Focus on getting to stable positive cash first before depending on this for saving.';
    case 'grow_the_business':
      return results.growthWarningMessage
        ?? 'Growth needs cash first. Make sure the business can restock before you push for bigger sales.';
    case 'pay_back_a_loan':
      return results.estimatedCashPosition > 0
        ? 'There is some cash room here, but keep watching timing so loan pressure does not squeeze restocking.'
        : 'Even if the business shows profit, delayed cash could make loan repayment stressful.';
    case 'keep_it_running':
      return results.estimatedCashPosition > 0
        ? 'The main job here is to protect cash flow and avoid taking too much out too early.'
        : 'Right now the business needs more breathing room before it can run safely month after month.';
    case 'not_sure_yet':
    default:
      return results.monthlyProfit > 0
        ? 'This result shows the business can work, but cash timing still matters.'
        : 'Start by improving the basics: price, sales pace, and monthly costs.';
  }
}

function getCashGapMessage(input: {
  monthlyProfit: number;
  estimatedCashPosition: number;
  customerPaymentTiming: WizardState['step1_entry']['customerPaymentTiming'];
}): { risk: 'low' | 'medium' | 'high'; message: string | null } {
  if (input.customerPaymentTiming === 'immediate') {
    return {
      risk: 'low',
      message: 'Most customers pay straight away, so your profit and your cash should stay closer together.',
    };
  }

  if (input.monthlyProfit > 0 && input.estimatedCashPosition < 0) {
    return {
      risk: 'high',
      message: 'You may show profit on paper but still run short of cash before customers pay. Keep extra money aside for restocking.',
    };
  }

  if (input.monthlyProfit > 0 && input.estimatedCashPosition < input.monthlyProfit * 0.65) {
    return {
      risk: 'medium',
      message: 'Some of your sales money arrives later, so the cash in hand may feel much tighter than the profit number.',
    };
  }

  return {
    risk: 'low',
    message: 'Some cash arrives later, but the business still appears able to keep operating at this pace.',
  };
}

export function simulatePriceImpact(
  state: WizardState,
  businessType: BusinessType,
  priceChangePercent: number,
  salesChangePercent: number,
): PriceImpactSimulation {
  const priceMultiplier = 1 + (priceChangePercent / 100);
  const demandMultiplier = 1 + (salesChangePercent / 100);

  if (businessType === 'agriculture') {
    const scenarioState: WizardState = {
      ...state,
      step3_strategy: {
        ...state.step3_strategy,
        expectedPrice: state.step3_strategy.expectedPrice * priceMultiplier,
        expectedYield: state.step3_strategy.expectedYield * demandMultiplier,
      },
    };
    const scenario = calculateAgricultureRoadmap(scenarioState);
    const currentResults = calculateAgricultureRoadmap(state);
    let advice = 'This keeps your crop plan close to where it is now.';

    if (scenario.grossMargin < 0) {
      advice = 'At this price and harvest level, the season loses money.';
    } else if (scenario.grossMargin > currentResults.grossMargin * SIMULATOR_PROFIT_IMPROVEMENT_THRESHOLD) {
      advice = 'This improves the season gross margin.';
    } else if (scenario.grossMargin < currentResults.grossMargin * SIMULATOR_PROFIT_REDUCTION_THRESHOLD) {
      advice = 'This reduces the season gross margin.';
    }

    return {
      priceChangePercent,
      salesChangePercent,
      priceMultiplier,
      demandMultiplier,
      monthlyProfit: scenario.grossMargin,
      safeTakeHomeAmount: scenario.safeTakeHomeAmount,
      safeTakeHomeDailyAmount: scenario.safeTakeHomeDailyAmount,
      safeTakeHomeWeeklyAmount: scenario.safeTakeHomeWeeklyAmount,
      safetyBufferAmount: scenario.safetyBufferAmount,
      safetyBufferDailyAmount: scenario.safetyBufferDailyAmount,
      safetyBufferWeeklyAmount: scenario.safetyBufferWeeklyAmount,
      monthlyRevenue: scenario.effectiveRevenue,
      monthlyRestockCost: scenario.totalVariableCosts,
      operatingBreakEvenUnits: Math.ceil(scenario.breakEvenYield),
      requiredUnitsPerWeek: scenario.requiredUnitsPerWeek,
      totalUnitsPerWeek: scenario.totalUnitsPerWeek,
      startupMoney: 0,
      paybackMonths: 0,
      advice,
    };
  }

  const { sharedSummary, totalMonthlyFixedCosts } = getSharedSummaryForState(state, businessType, {
    priceMultiplier,
    demandMultiplier,
  });
  const requiredUnitsPerWeek = Number.isFinite(sharedSummary.operatingBreakEvenUnits)
    ? sharedSummary.operatingBreakEvenUnits / WEEKS_PER_MONTH
    : Number.POSITIVE_INFINITY;
  const currentResults = calculateRoadmap(state, businessType);
  const monthlyProfit = sharedSummary.monthlyProfit;

  let advice = 'This keeps your business close to where it is now.';
  if (monthlyProfit < 0) {
    advice = 'At this price and demand your business loses money.';
  } else if (monthlyProfit > currentResults.monthlyProfit * SIMULATOR_PROFIT_IMPROVEMENT_THRESHOLD) {
    advice = 'This improves your profit and speeds up your recovery.';
  } else if (monthlyProfit < currentResults.monthlyProfit * SIMULATOR_PROFIT_REDUCTION_THRESHOLD) {
    advice = 'This reduces your profit. Recovery takes longer.';
  }

  return {
    priceChangePercent,
    salesChangePercent,
    priceMultiplier,
    demandMultiplier,
    monthlyProfit,
    safeTakeHomeAmount: sharedSummary.safeTakeHomeAmount,
    safeTakeHomeDailyAmount: sharedSummary.safeTakeHomeDailyAmount,
    safeTakeHomeWeeklyAmount: sharedSummary.safeTakeHomeWeeklyAmount,
    safetyBufferAmount: sharedSummary.safetyBufferAmount,
    safetyBufferDailyAmount: sharedSummary.safetyBufferDailyAmount,
    safetyBufferWeeklyAmount: sharedSummary.safetyBufferWeeklyAmount,
    monthlyRevenue: sharedSummary.monthlyRevenue,
    monthlyRestockCost: sharedSummary.monthlyRestockCost,
    operatingBreakEvenUnits: Math.ceil(sharedSummary.operatingBreakEvenUnits),
    requiredUnitsPerWeek,
    totalUnitsPerWeek: sharedSummary.totalUnitsPerWeek,
    startupMoney: sharedSummary.totalStartupMoney,
    paybackMonths: monthlyProfit > 0 ? sharedSummary.totalStartupMoney / monthlyProfit : Number.POSITIVE_INFINITY,
    advice,
  };
}

export const calculateRoadmap = (
  state: WizardState,
  businessType: BusinessType = 'manufacturing',
): CalculationResult => {
  if (businessType === 'agriculture') {
    return calculateAgricultureRoadmap(state);
  }

  const { step1_entry, step2_buckets } = state;
  const config = BUSINESS_TYPE_CONFIG[businessType];

  const totalSeed = sumAmounts(step2_buckets.seedCosts);
  const totalFoundation = sumAmounts(step2_buckets.foundationCosts);
  const totalFuel = sumAmounts(step2_buckets.fuelCosts);
  const totalProtection = sumAmounts(step2_buckets.protectionCosts);
  const { oneTime: totalFoundationOneTime, monthly: totalFoundationMonthly } = splitFoundationCosts(step2_buckets.foundationCosts);

  const { unitBaseCost: manufacturingUnitBaseCost, selectedPrice: fallbackSelectedPrice } = getUnitBaseCostAndSelectedPrice(state, businessType);
  const { sharedSummary, totalMonthlyFixedCosts, startupCostsEntered } = getSharedSummaryForState(state, businessType);

  const totalUnitsPerWeek = config.showMultipleItems
    ? sharedSummary.totalUnitsPerWeek
    : step1_entry.salesPerWeek;
  const selectedPrice = config.showMultipleItems
    ? sharedSummary.selectedPrice
    : fallbackSelectedPrice;
  const weightedAvgVariableCost = config.showMultipleItems
    ? sharedSummary.weightedAvgVariableCost
    : manufacturingUnitBaseCost;
  const contributionMargin = config.showMultipleItems
    ? sharedSummary.contributionMargin
    : selectedPrice - manufacturingUnitBaseCost;
  const monthlySales = sharedSummary.monthlySales || (totalUnitsPerWeek * WEEKS_PER_MONTH);
  const totalInitialInvestment = sharedSummary.totalStartupMoney;
  const foundationAllocationPerUnit = monthlySales > 0 ? totalMonthlyFixedCosts / monthlySales : 0;
  const baseCost = weightedAvgVariableCost + foundationAllocationPerUnit;
  const lineItemBreakdown = buildLineItemBreakdown(sharedSummary);
  const pricingOptions = buildPricingOptions(lineItemBreakdown);
  const survivalPrice = pricingOptions.find((option) => option.key === 'low')?.averageSuggestedPrice ?? selectedPrice;
  const businessPrice = pricingOptions.find((option) => option.key === 'medium')?.averageSuggestedPrice ?? selectedPrice;
  const growthPrice = pricingOptions.find((option) => option.key === 'high')?.averageSuggestedPrice ?? selectedPrice;
  const operatingBreakEvenUnits = sharedSummary.operatingBreakEvenUnits;
  const operatingBreakEvenRevenue = sharedSummary.operatingBreakEvenRevenue;
  const operatingBreakEvenWeeks = sharedSummary.operatingBreakEvenWeeks;
  const requiredUnitsPerWeek = Number.isFinite(operatingBreakEvenUnits) ? operatingBreakEvenUnits / WEEKS_PER_MONTH : Number.POSITIVE_INFINITY;
  const unitsPerWeekGap = Number.isFinite(requiredUnitsPerWeek)
    ? Math.max(requiredUnitsPerWeek - totalUnitsPerWeek, 0)
    : Number.POSITIVE_INFINITY;
  const breakEvenPriceNeeded = monthlySales > 0
    ? weightedAvgVariableCost + (totalMonthlyFixedCosts / monthlySales)
    : Number.POSITIVE_INFINITY;
  const monthlyOperatingProfit = sharedSummary.monthlyProfit;
  const cashCollectionRate = PAYMENT_COLLECTION_RATE[state.step1_entry.customerPaymentTiming];
  const estimatedCashCollected = sharedSummary.monthlyRevenue * cashCollectionRate;
  const estimatedCashPosition = estimatedCashCollected - sharedSummary.monthlyVariableCosts - totalMonthlyFixedCosts;
  const cashGapState = getCashGapMessage({
    monthlyProfit: monthlyOperatingProfit,
    estimatedCashPosition,
    customerPaymentTiming: state.step1_entry.customerPaymentTiming,
  });
  const badMonthMonthlyRevenue = sharedSummary.monthlyRevenue * BAD_MONTH_REVENUE_MULTIPLIER;
  const badMonthMonthlyVariableCosts = sharedSummary.monthlyVariableCosts * BAD_MONTH_REVENUE_MULTIPLIER;
  const badMonthMonthlyProfit = badMonthMonthlyRevenue - badMonthMonthlyVariableCosts - totalMonthlyFixedCosts;
  const badMonthEstimatedCashPosition = (badMonthMonthlyRevenue * cashCollectionRate) - badMonthMonthlyVariableCosts - totalMonthlyFixedCosts;
  const growthStockNeeded = state.step1_entry.growthAmbitionPercent > 0
    ? sharedSummary.monthlyRestockCost * (state.step1_entry.growthAmbitionPercent / 100)
    : 0;
  const growthWarningMessage = growthStockNeeded > 0
    ? `To grow sales by ${state.step1_entry.growthAmbitionPercent}%, you may need about ${Math.round(growthStockNeeded).toLocaleString()} more for stock or work inputs before the extra sales come in.`
    : null;
  const investmentPaybackMonths = sharedSummary.investmentPaybackMonths;
  const investmentPaybackWeeks = sharedSummary.investmentPaybackWeeks;

  const projectedHarvest12Months = (monthlyOperatingProfit * 12) - totalInitialInvestment;
  const projectedHarvestYear2 = monthlyOperatingProfit * 12;

  const warnings: string[] = [];
  if (!config.showMultipleItems && selectedPrice < weightedAvgVariableCost && selectedPrice > 0) {
    warnings.push('This price is too low. You lose money on every sale.');
  }
  if (totalUnitsPerWeek <= 0) {
    warnings.push("If you don't sell, you cannot recover your money.");
  }
  if (monthlyOperatingProfit <= 0 && totalUnitsPerWeek > 0) {
    warnings.push(step1_entry.businessStatus === 'new'
      ? 'Your current setup does not recover the initial investment at this sales pace and price.'
      : 'Your current setup is not yet profitable at this sales pace and price.');
  }
  const breakEvenWarning = totalMonthlyFixedCosts <= 0
    ? 'You have not entered any monthly costs like rent or transport. Add them in Step 2 for an accurate result.'
    : null;
  if (breakEvenWarning) {
    warnings.push(breakEvenWarning);
  }

  const startupMoneyWarning = step1_entry.businessStatus === 'new'
    ? sharedSummary.firstStockCost <= 0
      ? 'Your startup money may be incomplete because we cannot see the opening stock or work cash you need yet.'
      : startupCostsEntered <= 0
        ? 'Your startup money only includes opening stock or work cash. Add one-time costs in Step 2 if you also need shelves, equipment, or opening cash.'
        : null
    : null;
  if (startupMoneyWarning) {
    warnings.push(startupMoneyWarning);
  }
  warnings.push(...sharedSummary.warnings);
  if (cashGapState.message && state.step1_entry.customerPaymentTiming !== 'immediate') {
    warnings.push(cashGapState.message);
  }
  if (growthWarningMessage) {
    warnings.push(growthWarningMessage);
  }

  const purposeHeadline = getPurposeHeadline(state);
  const purposeSupportMessage = getPurposeSupportMessage(state, {
    monthlyProfit: monthlyOperatingProfit,
    estimatedCashPosition,
    safeTakeHomeAmount: sharedSummary.safeTakeHomeAmount,
    growthWarningMessage,
  });

  return {
    businessStatus: step1_entry.businessStatus,
    isAgricultureMode: false,
    baseCost,
    unitBaseCost: weightedAvgVariableCost,
    selectedPrice,
    survivalPrice,
    businessPrice,
    growthPrice,
    totalSeed,
    totalFoundation,
    totalFoundationOneTime,
    totalFoundationMonthly,
    totalFuel,
    totalProtection,
    totalMonthlyFixedCosts,
    totalInitialInvestment,
    startupCostsEntered,
    firstStockCost: sharedSummary.firstStockCost,
    totalVariableCosts: sharedSummary.monthlyVariableCosts,
    effectiveRevenue: sharedSummary.monthlyRevenue,
    grossMargin: monthlyOperatingProfit,
    grossMarginPerLandUnit: 0,
    costOfProductionPerUnit: weightedAvgVariableCost,
    breakEvenYield: operatingBreakEvenUnits,
    breakEvenPricePerUnit: breakEvenPriceNeeded,
    dailyEquivalentIncome: sharedSummary.safeTakeHomeDailyAmount,
    planningDays: 30,
    contributionMargin,
    weightedAvgSellingPrice: selectedPrice,
    weightedAvgVariableCost,
    wacm: contributionMargin,
    weeklyTotalContribution: sharedSummary.weeklyProfit,
    operatingBreakEvenUnits,
    operatingBreakEvenRevenue,
    operatingBreakEvenWeeks,
    investmentPaybackMonths,
    investmentPaybackWeeks,
    productBreakdown: sharedSummary.productBreakdown,
    breakEvenUnits: operatingBreakEvenUnits,
    weeksToTurningPoint: operatingBreakEvenWeeks,
    projectedHarvest12Months,
    projectedHarvestYear2,
    warnings,
    monthlySales,
    monthlyRevenue: sharedSummary.monthlyRevenue,
    monthlyVariableCosts: sharedSummary.monthlyVariableCosts,
    monthlyProfit: monthlyOperatingProfit,
    estimatedCashPosition,
    estimatedCashCollected,
    cashCollectionRate,
    cashGapRisk: cashGapState.risk,
    cashGapMessage: cashGapState.message,
    normalMonthMonthlyProfit: monthlyOperatingProfit,
    normalMonthEstimatedCashPosition: estimatedCashPosition,
    badMonthMonthlyRevenue,
    badMonthMonthlyProfit,
    badMonthEstimatedCashPosition,
    growthStockNeeded,
    growthWarningMessage,
    purposeHeadline,
    purposeSupportMessage,
    monthlyRestockCost: sharedSummary.monthlyRestockCost,
    safeTakeHomeAmount: sharedSummary.safeTakeHomeAmount,
    safetyBufferAmount: sharedSummary.safetyBufferAmount,
    safeTakeHomeWeeklyAmount: sharedSummary.safeTakeHomeWeeklyAmount,
    safeTakeHomeDailyAmount: sharedSummary.safeTakeHomeDailyAmount,
    safetyBufferWeeklyAmount: sharedSummary.safetyBufferWeeklyAmount,
    safetyBufferDailyAmount: sharedSummary.safetyBufferDailyAmount,
    lossPerDay: sharedSummary.lossPerDay,
    weeklyRevenue: sharedSummary.weeklyRevenue,
    weeklyCost: sharedSummary.weeklyCost,
    weeklyProfit: sharedSummary.weeklyProfit,
    totalUnitsPerWeek,
    requiredUnitsPerWeek,
    unitsPerWeekGap,
    breakEvenPriceNeeded,
    recoveryDays: weeksToDays(operatingBreakEvenWeeks),
    breakEvenWarning,
    startupMoneyWarning,
    lineItemBreakdown,
    pricingOptions,
  };
};
