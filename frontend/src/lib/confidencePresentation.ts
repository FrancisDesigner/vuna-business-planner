import { WizardState, CalculationResult, BusinessLineItem } from '../types';
import { BusinessType, BusinessTypeConfig } from './config';
import { formatPlannerCurrency } from './marketContext';
import { formatPaybackMonths, formatRecoveryTime } from './recoveryTime';

export interface ConfidenceMetric {
  label: string;
  value: string;
  accent?: 'neutral' | 'green';
}

export interface ConfidencePricingOption {
  label: 'Low Price' | 'Medium Price' | 'High Price';
  price: number;
  description: string;
}

export interface ConfidenceItemRow {
  name: string;
  cost: number;
  price: number;
  margin: number;
  unitsPerWeek: number;
  weeklyProfit: number;
}

export interface ConfidencePresentation {
  businessName: string;
  location: string;
  businessTypeLabel: string;
  unitsSummary: string;
  todayTitle: string;
  todayHelper: string;
  todayMetrics: ConfidenceMetric[];
  recoveryTitle: string;
  recoveryHelper: string;
  recoveryMetrics: ConfidenceMetric[];
  recoveryNote: string;
  afterRecoveryTitle: string;
  afterRecoveryHelper: string;
  afterRecoveryMetrics: ConfidenceMetric[];
  firstMonthTitle: string;
  firstMonthDescription: string;
  pricingTitle: string;
  pricingHelper: string;
  pricingOptions: ConfidencePricingOption[];
  detailTitle: string;
  detailColumns: string[];
  detailRows: ConfidenceItemRow[];
  manufacturingDetails: ConfidenceMetric[];
  year2Title: string;
  year2Helper: string;
  year2Metrics: ConfidenceMetric[];
}

const getNamedItems = (items: BusinessLineItem[]): BusinessLineItem[] =>
  items.filter((item) => item.name.trim().length > 0);

export function buildConfidencePresentation(
  state: WizardState,
  results: CalculationResult,
  businessType: BusinessType,
  config: BusinessTypeConfig,
): ConfidencePresentation {
  const formatCurrency = (value: number): string => formatPlannerCurrency(value, state.currencyCode);
  const businessName = state.step1_entry.activityDescription || 'My Business';
  const location = state.step1_entry.location || 'your area';
  const operatingBreakEvenTime = formatRecoveryTime(results.recoveryDays);
  const paybackTime = formatPaybackMonths(results.investmentPaybackMonths);
  const slowPaybackTime = formatPaybackMonths(results.investmentPaybackMonths * 1.5);
  const namedItems = getNamedItems(state.step2_buckets.items);
  const detailRows: ConfidenceItemRow[] = namedItems.map((item) => ({
    name: item.name,
    cost: item.buyingPrice,
    price: item.sellingPrice,
    margin: item.sellingPrice - item.buyingPrice,
    unitsPerWeek: item.unitsPerWeek,
    weeklyProfit: (item.sellingPrice - item.buyingPrice) * item.unitsPerWeek,
  }));

  return {
    businessName,
    location,
    businessTypeLabel: config.label,
    unitsSummary: `${results.totalUnitsPerWeek.toLocaleString()} ${config.unitNamePlural}/week`,
    todayTitle: 'Your Business Today',
    todayHelper: 'This shows how your business performs for each sale.',
    todayMetrics: [
      {
        label: config.unitCostLabel,
        value: formatCurrency(results.unitBaseCost),
        accent: 'neutral',
      },
      {
        label: 'Your selling price',
        value: formatCurrency(results.selectedPrice),
        accent: 'neutral',
      },
      {
        label: config.showMultipleItems ? 'WACM per Item' : 'Profit per item',
        value: formatCurrency(results.contributionMargin),
        accent: 'green',
      },
    ],
    recoveryTitle: 'Recovering Your Startup Money',
    recoveryHelper: 'We show both your monthly operating break-even and the time to earn back your initial investment.',
    recoveryMetrics: [
      {
        label: 'Operating break-even',
        value: Number.isFinite(results.operatingBreakEvenUnits)
          ? `${Math.ceil(results.operatingBreakEvenUnits).toLocaleString()} ${config.unitNamePlural}`
          : 'Not achievable',
        accent: 'neutral',
      },
      {
        label: 'Initial investment',
        value: formatCurrency(results.totalInitialInvestment),
        accent: 'neutral',
      },
      {
        label: 'Investment payback',
        value: paybackTime,
        accent: 'green',
      },
    ],
    recoveryNote: `Operating break-even is ${operatingBreakEvenTime}. Investment payback is ${paybackTime}. Most new businesses start slower than plan, so expect payback to stretch to about ${slowPaybackTime} if your first month is soft.`,
    afterRecoveryTitle: 'After You Recover Your Money',
    afterRecoveryHelper: 'After your startup costs are recovered, this profit becomes your real income from each sale.',
    afterRecoveryMetrics: [
      {
        label: config.showMultipleItems ? 'WACM per Item' : 'Profit per item',
        value: formatCurrency(results.contributionMargin),
        accent: 'green',
      },
    ],
    firstMonthTitle: 'In your first month',
    firstMonthDescription: `Expect about 50% of your target sales. At that slower startup pace, covering monthly costs and recovering your startup money may take longer than the base plan.`,
    pricingTitle: 'Your Pricing Options',
    pricingHelper: 'These options help you compare customer friendliness, profit, and recovery speed.',
    pricingOptions: [
      {
        label: 'Low Price',
        price: results.survivalPrice,
        description: 'This price is easier for customers to accept. It may take longer to recover your money.',
      },
      {
        label: 'Medium Price',
        price: results.businessPrice,
        description: 'This price balances customer demand and profit. It may help your business grow steadily.',
      },
      {
        label: 'High Price',
        price: results.growthPrice,
        description: 'This price gives higher profit per sale. It may help you recover your money faster.',
      },
    ],
    detailTitle: config.showMultipleItems ? config.itemTableHeading : 'Your Business Costs',
    detailColumns: businessType === 'service'
      ? ['Service', 'Cost', 'Price', 'Margin', 'Jobs/Week', 'Weekly Profit']
      : ['Item', 'Buy Price', 'Sell Price', 'Margin', 'Units/Week', 'Weekly Profit'],
    detailRows,
    manufacturingDetails: [
      { label: 'Production Costs', value: formatCurrency(results.totalSeed), accent: 'neutral' },
      { label: 'Batch Yield', value: `${(state.step2_buckets.batchYield || 1).toLocaleString()} ${config.unitNamePlural}`, accent: 'neutral' },
      { label: 'Cost to make one item', value: formatCurrency(results.unitBaseCost), accent: 'green' },
      { label: 'Initial Investment', value: formatCurrency(results.totalInitialInvestment), accent: 'neutral' },
      { label: 'Monthly Foundation Costs', value: formatCurrency(results.totalFoundationMonthly), accent: 'neutral' },
      { label: 'Daily Running Costs', value: formatCurrency(results.totalFuel), accent: 'neutral' },
      { label: 'Possible Losses / Waste', value: formatCurrency(results.totalProtection), accent: 'neutral' },
    ],
    year2Title: 'Year 2 Outlook',
    year2Helper: 'After your startup costs are paid off, your second year can keep more of the value from each sale.',
    year2Metrics: [
      {
        label: 'Profit after 1 year',
        value: formatCurrency(results.projectedHarvest12Months),
        accent: 'neutral',
      },
      {
        label: 'Profit in year 2',
        value: formatCurrency(results.projectedHarvestYear2),
        accent: 'green',
      },
    ],
  };
}
