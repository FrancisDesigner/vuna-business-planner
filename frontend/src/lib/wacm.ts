export interface LineItem {
  id: string;
  name: string;
  sellingPrice: number;
  variableCostPerUnit: number;
  unitsPerWeek: number;
}

export interface WACMProductBreakdown {
  id: string;
  name: string;
  sellingPrice: number;
  variableCostPerUnit: number;
  unitsPerWeek: number;
  contributionMarginPerUnit: number;
  marginPercent: number;
  mixPercent: number;
  weeklyContribution: number;
  isNegativeMargin: boolean;
  allocatedBreakEvenUnits: number;
  allocatedBreakEvenRevenue: number;
}

export interface WACMResult {
  totalUnitsPerWeek: number;
  weeklyRevenue: number;
  weeklyVariableCosts: number;
  weeklyTotalContribution: number;
  weightedAvgSellingPrice: number;
  weightedAvgVariableCost: number;
  wacm: number;
  cmRatio: number;
  products: WACMProductBreakdown[];
  hasNegativeMarginProducts: boolean;
  negativeMarginWarnings: string[];
}

function emptyWACMResult(): WACMResult {
  return {
    totalUnitsPerWeek: 0,
    weeklyRevenue: 0,
    weeklyVariableCosts: 0,
    weeklyTotalContribution: 0,
    weightedAvgSellingPrice: 0,
    weightedAvgVariableCost: 0,
    wacm: 0,
    cmRatio: 0,
    products: [],
    hasNegativeMarginProducts: false,
    negativeMarginWarnings: [],
  };
}

export function computeWACM(items: LineItem[]): WACMResult {
  const validItems = items.filter((item) => item.unitsPerWeek > 0 && item.sellingPrice > 0);

  if (validItems.length === 0) {
    return emptyWACMResult();
  }

  const totalUnitsPerWeek = validItems.reduce((sum, item) => sum + item.unitsPerWeek, 0);
  const weeklyRevenue = validItems.reduce((sum, item) => sum + (item.sellingPrice * item.unitsPerWeek), 0);
  const weeklyVariableCosts = validItems.reduce((sum, item) => sum + (item.variableCostPerUnit * item.unitsPerWeek), 0);
  const weeklyTotalContribution = weeklyRevenue - weeklyVariableCosts;

  const wacm = totalUnitsPerWeek > 0 ? weeklyTotalContribution / totalUnitsPerWeek : 0;
  const weightedAvgSellingPrice = totalUnitsPerWeek > 0 ? weeklyRevenue / totalUnitsPerWeek : 0;
  const weightedAvgVariableCost = totalUnitsPerWeek > 0 ? weeklyVariableCosts / totalUnitsPerWeek : 0;
  const cmRatio = weightedAvgSellingPrice > 0 ? wacm / weightedAvgSellingPrice : 0;

  const negativeMarginWarnings: string[] = [];
  const products = validItems.map<WACMProductBreakdown>((item) => {
    const contributionMarginPerUnit = item.sellingPrice - item.variableCostPerUnit;
    const marginPercent = item.sellingPrice > 0
      ? (contributionMarginPerUnit / item.sellingPrice) * 100
      : 0;
    const mixPercent = totalUnitsPerWeek > 0 ? item.unitsPerWeek / totalUnitsPerWeek : 0;
    const isNegativeMargin = contributionMarginPerUnit < 0;

    if (isNegativeMargin) {
      negativeMarginWarnings.push(
        `${item.name}: selling price (${item.sellingPrice}) is below cost (${item.variableCostPerUnit}). You lose money on every sale.`,
      );
    }

    return {
      id: item.id,
      name: item.name,
      sellingPrice: item.sellingPrice,
      variableCostPerUnit: item.variableCostPerUnit,
      unitsPerWeek: item.unitsPerWeek,
      contributionMarginPerUnit,
      marginPercent,
      mixPercent,
      weeklyContribution: contributionMarginPerUnit * item.unitsPerWeek,
      isNegativeMargin,
      allocatedBreakEvenUnits: 0,
      allocatedBreakEvenRevenue: 0,
    };
  });

  return {
    totalUnitsPerWeek,
    weeklyRevenue,
    weeklyVariableCosts,
    weeklyTotalContribution,
    weightedAvgSellingPrice,
    weightedAvgVariableCost,
    wacm,
    cmRatio,
    products,
    hasNegativeMarginProducts: negativeMarginWarnings.length > 0,
    negativeMarginWarnings,
  };
}

export function allocateBreakEven(
  wacmResult: WACMResult,
  breakEvenUnitsTotal: number,
): WACMResult {
  return {
    ...wacmResult,
    products: wacmResult.products.map((product) => ({
      ...product,
      allocatedBreakEvenUnits: breakEvenUnitsTotal * product.mixPercent,
      allocatedBreakEvenRevenue: breakEvenUnitsTotal * product.mixPercent * product.sellingPrice,
    })),
  };
}
