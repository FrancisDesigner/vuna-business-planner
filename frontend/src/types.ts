import { BusinessType } from './lib/config';
import type { WACMProductBreakdown } from './lib/wacm';

export type { BusinessType } from './lib/config';

export type BusinessCategory = BusinessType | null;
export type BusinessStatus = 'new' | 'ongoing';
export type CostCategory = 'one-time' | 'monthly';
export type StockRefillFrequency = 'weekly' | 'monthly' | 'as-needed';
export type LandUnit = 'acre' | 'hectare' | 'plot';
export type LandStatus = 'owned' | 'rented';
export type SeasonCycle = 1 | 2 | 'continuous';
export type YieldUnit = 'kg' | 'tonne' | 'bag' | 'litre' | 'unit';
export type BusinessPurpose =
  | 'cover_family_needs'
  | 'save_for_something_big'
  | 'grow_the_business'
  | 'pay_back_a_loan'
  | 'keep_it_running'
  | 'not_sure_yet';
export type CustomerPaymentTiming = 'immediate' | 'within_week' | 'within_month' | 'mixed';

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  costCategory: CostCategory;
}

export interface BusinessLineItem {
  id: string;
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  unitsPerWeek: number;
}

export interface CalculationLineItemBreakdown {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  profitPerItem: number;
  unitsPerWeek: number;
  mixPercent: number;
  weeklyRevenue: number;
  weeklyCost: number;
  weeklyProfit: number;
  allocatedBreakEvenUnits: number;
  allocatedBreakEvenRevenue: number;
}

export interface PricingOptionItem {
  id: string;
  name: string;
  buyPrice: number;
  currentSellPrice: number;
  suggestedSellPrice: number;
  unitsPerWeek: number;
}

export interface PricingOptionBreakdown {
  key: 'low' | 'medium' | 'high';
  label: 'Low Price' | 'Medium Price' | 'High Price';
  multiplier: number;
  description: string;
  averageSuggestedPrice: number;
  items: PricingOptionItem[];
}

export interface PriceImpactSimulation {
  priceChangePercent: number;
  salesChangePercent: number;
  priceMultiplier: number;
  demandMultiplier: number;
  monthlyProfit: number;
  safeTakeHomeAmount: number;
  safeTakeHomeDailyAmount: number;
  safeTakeHomeWeeklyAmount: number;
  safetyBufferAmount: number;
  safetyBufferDailyAmount: number;
  safetyBufferWeeklyAmount: number;
  monthlyRevenue: number;
  monthlyRestockCost: number;
  operatingBreakEvenUnits: number;
  requiredUnitsPerWeek: number;
  totalUnitsPerWeek: number;
  startupMoney: number;
  paybackMonths: number;
  advice: string;
}

export interface WizardState {
  currentStep: 0 | 1 | 2 | 3 | 4;
  completedSteps: number[];
  isExpertMode: boolean;
  currencyCode: string;
  marketCountryName: string;

  step1_entry: {
    businessStatus: BusinessStatus;
    activityDescription: string;
    category: BusinessCategory;
    location: string;
    salesPerWeek: number;
    landUnit: LandUnit;
    landStatus: LandStatus;
    landArea: number;
    landRentPerUnit: number;
    seasonCycle: SeasonCycle;
    yieldUnit: YieldUnit;
    businessPurpose: BusinessPurpose;
    customerPaymentTiming: CustomerPaymentTiming;
    growthAmbitionPercent: 0 | 25 | 50;
  };

  step2_buckets: {
    seedCosts: CostItem[];
    foundationCosts: CostItem[];
    fuelCosts: CostItem[];
    protectionCosts: CostItem[];
    stockRefillFrequency: StockRefillFrequency;
    batchYield: number;
    items: BusinessLineItem[];
  };

  step3_strategy: {
    selectedPrice: number;
    expectedYield: number;
    expectedPrice: number;
    byProductRevenue: number;
  };

  step4_vision: {
    pdfGenerated: boolean;
  };
}

export interface CalculationResult {
  businessStatus: BusinessStatus;
  isAgricultureMode: boolean;
  baseCost: number;
  unitBaseCost: number;
  selectedPrice: number;
  survivalPrice: number;
  businessPrice: number;
  growthPrice: number;

  totalSeed: number;
  totalFoundation: number;
  totalFoundationOneTime: number;
  totalFoundationMonthly: number;
  totalFuel: number;
  totalProtection: number;
  totalMonthlyFixedCosts: number;
  totalInitialInvestment: number;
  startupCostsEntered: number;
  firstStockCost: number;
  totalVariableCosts: number;
  effectiveRevenue: number;
  grossMargin: number;
  grossMarginPerLandUnit: number;
  costOfProductionPerUnit: number;
  breakEvenYield: number;
  breakEvenPricePerUnit: number;
  dailyEquivalentIncome: number;
  planningDays: number;

  contributionMargin: number;
  weightedAvgSellingPrice: number;
  weightedAvgVariableCost: number;
  wacm: number;
  weeklyTotalContribution: number;
  operatingBreakEvenUnits: number;
  operatingBreakEvenRevenue: number;
  operatingBreakEvenWeeks: number;
  investmentPaybackMonths: number;
  investmentPaybackWeeks: number;
  productBreakdown: WACMProductBreakdown[];

  breakEvenUnits: number;
  weeksToTurningPoint: number;

  projectedHarvest12Months: number;
  projectedHarvestYear2: number;

  warnings: string[];
  monthlySales: number;
  monthlyRevenue: number;
  monthlyVariableCosts: number;
  monthlyProfit: number;
  estimatedCashPosition: number;
  estimatedCashCollected: number;
  cashCollectionRate: number;
  cashGapRisk: 'low' | 'medium' | 'high';
  cashGapMessage: string | null;
  normalMonthMonthlyProfit: number;
  normalMonthEstimatedCashPosition: number;
  badMonthMonthlyRevenue: number;
  badMonthMonthlyProfit: number;
  badMonthEstimatedCashPosition: number;
  growthStockNeeded: number;
  growthWarningMessage: string | null;
  purposeHeadline: string;
  purposeSupportMessage: string;
  monthlyRestockCost: number;
  safeTakeHomeAmount: number;
  safetyBufferAmount: number;
  safeTakeHomeWeeklyAmount: number;
  safeTakeHomeDailyAmount: number;
  safetyBufferWeeklyAmount: number;
  safetyBufferDailyAmount: number;
  lossPerDay: number;
  weeklyRevenue: number;
  weeklyCost: number;
  weeklyProfit: number;
  totalUnitsPerWeek: number;
  requiredUnitsPerWeek: number;
  unitsPerWeekGap: number;
  breakEvenPriceNeeded: number;
  recoveryDays: number;
  breakEvenWarning: string | null;
  startupMoneyWarning: string | null;
  lineItemBreakdown: CalculationLineItemBreakdown[];
  pricingOptions: PricingOptionBreakdown[];
}

export interface LessonCardRow {
  label: string;
  value?: string;
  emphasize?: boolean;
}

export interface LessonCardSection {
  title: string;
  rows?: LessonCardRow[];
  paragraphs?: string[];
}

export interface LessonTimelinePoint {
  label: string;
  value: string;
  helper?: string;
}

export interface LessonCard {
  id: string;
  title: string;
  formula: string;
  userValues: {
    label: string;
    value: number;
    formatted: string;
  }[];
  explanation: string;
  analogy: string;
  visualType: 'progress-bar' | 'equation' | 'timeline';
  actionText: string;
  sections?: LessonCardSection[];
  timelinePoints?: LessonTimelinePoint[];
}
