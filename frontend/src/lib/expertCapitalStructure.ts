import { calculateInterestCoverageRatio, calculateWeightedAverageCostOfCapital } from './sharedFinanceEngine';

export interface SyntheticRatingBand {
  rating: string;
  minimumCoverage: number;
  spreadPremiumPercent: number;
  riskLevel: 'healthy' | 'watch' | 'risky';
}

export interface CapitalStructureCurvePoint {
  debtShare: number;
  debtAmount: number;
  equityAmount: number;
  debtCostPercent: number;
  equityCostPercent: number;
  wacc: number | null;
  coverageRatio: number | null;
  rating: string;
}

export interface ExpertCapitalStructureInsights {
  currentDebtShare: number;
  currentCoverageRatio: number | null;
  currentRating: string;
  currentRiskLevel: 'healthy' | 'watch' | 'risky';
  currentWacc: number | null;
  optimalDebtShare: number;
  optimalWacc: number | null;
  verdictStatus: 'room_to_borrow' | 'healthy_limit' | 'too_much_debt';
  verdictMessage: string;
  counterintuitiveLesson: string;
  curve: CapitalStructureCurvePoint[];
}

const SYNTHETIC_RATING_TABLE: SyntheticRatingBand[] = [
  { rating: 'AAA', minimumCoverage: 8, spreadPremiumPercent: 0.6, riskLevel: 'healthy' },
  { rating: 'AA', minimumCoverage: 6.5, spreadPremiumPercent: 0.8, riskLevel: 'healthy' },
  { rating: 'A', minimumCoverage: 5.5, spreadPremiumPercent: 1.0, riskLevel: 'healthy' },
  { rating: 'BBB', minimumCoverage: 4.25, spreadPremiumPercent: 1.4, riskLevel: 'healthy' },
  { rating: 'BB', minimumCoverage: 3, spreadPremiumPercent: 1.9, riskLevel: 'watch' },
  { rating: 'B+', minimumCoverage: 2.5, spreadPremiumPercent: 2.6, riskLevel: 'watch' },
  { rating: 'B', minimumCoverage: 2, spreadPremiumPercent: 3.6, riskLevel: 'watch' },
  { rating: 'CCC', minimumCoverage: 1.5, spreadPremiumPercent: 5.2, riskLevel: 'risky' },
  { rating: 'CC', minimumCoverage: 1, spreadPremiumPercent: 7.0, riskLevel: 'risky' },
  { rating: 'C / Distressed', minimumCoverage: 0, spreadPremiumPercent: 9.5, riskLevel: 'risky' },
] as const;

function getSyntheticRatingBand(coverageRatio: number | null): SyntheticRatingBand {
  if (coverageRatio === null || !Number.isFinite(coverageRatio)) {
    return SYNTHETIC_RATING_TABLE[SYNTHETIC_RATING_TABLE.length - 1];
  }

  return SYNTHETIC_RATING_TABLE.find((band) => coverageRatio >= band.minimumCoverage)
    ?? SYNTHETIC_RATING_TABLE[SYNTHETIC_RATING_TABLE.length - 1];
}

function buildCurvePoint(input: {
  debtShare: number;
  totalCapital: number;
  annualOperatingProfit: number;
  impliedBaseDebtCostPercent: number;
  baseEquityCostPercent: number;
}): CapitalStructureCurvePoint {
  const debtAmount = input.totalCapital * input.debtShare;
  const equityAmount = Math.max(input.totalCapital - debtAmount, 0);

  if (debtAmount <= 0) {
    return {
      debtShare: input.debtShare,
      debtAmount: 0,
      equityAmount: input.totalCapital,
      debtCostPercent: input.impliedBaseDebtCostPercent,
      equityCostPercent: input.baseEquityCostPercent,
      wacc: input.baseEquityCostPercent / 100,
      coverageRatio: null,
      rating: 'All equity',
    };
  }

  const provisionalInterestCost = debtAmount * (Math.max(input.impliedBaseDebtCostPercent, 0.1) / 100);
  const provisionalCoverage = calculateInterestCoverageRatio(input.annualOperatingProfit, provisionalInterestCost);
  let band = getSyntheticRatingBand(provisionalCoverage);

  let debtCostPercent = input.impliedBaseDebtCostPercent + band.spreadPremiumPercent;
  let annualInterestCost = debtAmount * (debtCostPercent / 100);
  let coverageRatio = calculateInterestCoverageRatio(input.annualOperatingProfit, annualInterestCost);
  band = getSyntheticRatingBand(coverageRatio);

  debtCostPercent = input.impliedBaseDebtCostPercent + band.spreadPremiumPercent;
  annualInterestCost = debtAmount * (debtCostPercent / 100);
  coverageRatio = calculateInterestCoverageRatio(input.annualOperatingProfit, annualInterestCost);

  const equityCostPercent = input.baseEquityCostPercent + (input.debtShare * 3) + (band.spreadPremiumPercent * 0.2);
  const wacc = calculateWeightedAverageCostOfCapital({
    debtAmount,
    equityAmount,
    costOfDebtPercent: debtCostPercent,
    costOfEquityPercent: equityCostPercent,
  });

  return {
    debtShare: input.debtShare,
    debtAmount,
    equityAmount,
    debtCostPercent,
    equityCostPercent,
    wacc,
    coverageRatio,
    rating: band.rating,
  };
}

export function buildExpertCapitalStructureInsights(input: {
  debtAmount: number;
  equityAmount: number;
  annualOperatingProfit: number;
  costOfDebtPercent: number;
  costOfEquityPercent: number;
}): ExpertCapitalStructureInsights | null {
  const totalCapital = input.debtAmount + input.equityAmount;
  if (totalCapital <= 0 || input.annualOperatingProfit <= 0) {
    return null;
  }

  const currentInterestCost = input.debtAmount > 0
    ? input.debtAmount * (input.costOfDebtPercent / 100)
    : 0;
  const currentCoverageRatio = input.debtAmount > 0
    ? calculateInterestCoverageRatio(input.annualOperatingProfit, currentInterestCost)
    : null;
  const currentBand = input.debtAmount > 0
    ? getSyntheticRatingBand(currentCoverageRatio)
    : { rating: 'All equity', minimumCoverage: 0, spreadPremiumPercent: 0, riskLevel: 'healthy' as const };
  const impliedBaseDebtCostPercent = Math.max(
    input.costOfDebtPercent - ('spreadPremiumPercent' in currentBand ? currentBand.spreadPremiumPercent : 0),
    0.1,
  );
  const curveDebtShares = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  const curve = curveDebtShares.map((debtShare) => buildCurvePoint({
    debtShare,
    totalCapital,
    annualOperatingProfit: input.annualOperatingProfit,
    impliedBaseDebtCostPercent,
    baseEquityCostPercent: input.costOfEquityPercent,
  }));
  const currentDebtShare = input.debtAmount / totalCapital;
  const currentPoint = buildCurvePoint({
    debtShare: currentDebtShare,
    totalCapital,
    annualOperatingProfit: input.annualOperatingProfit,
    impliedBaseDebtCostPercent,
    baseEquityCostPercent: input.costOfEquityPercent,
  });

  const optimalPoint = curve.reduce((best, candidate) => {
    if (best.wacc === null) return candidate;
    if (candidate.wacc === null) return best;
    return candidate.wacc < best.wacc ? candidate : best;
  }, curve[0]);

  let verdictStatus: ExpertCapitalStructureInsights['verdictStatus'] = 'healthy_limit';
  if (
    currentPoint.coverageRatio !== null
    && (currentPoint.coverageRatio < 1.5 || currentBand.riskLevel === 'risky')
  ) {
    verdictStatus = 'too_much_debt';
  } else if (
    currentPoint.coverageRatio !== null
    && currentPoint.coverageRatio >= 3
    && optimalPoint.debtShare >= currentDebtShare + 0.1
  ) {
    verdictStatus = 'room_to_borrow';
  }

  const verdictMessage = verdictStatus === 'too_much_debt'
    ? `Debt currently represents ${(currentDebtShare * 100).toFixed(0)}% of total capital. Based on your coverage ratio, the business has taken on too much debt for its current earnings power.`
    : verdictStatus === 'room_to_borrow'
      ? `Debt currently represents ${(currentDebtShare * 100).toFixed(0)}% of total capital. Based on your coverage ratio, there is still room to borrow more before the cost of capital bottoms out.`
      : `Debt currently represents ${(currentDebtShare * 100).toFixed(0)}% of total capital. Based on your coverage ratio, you appear to be near a healthy borrowing limit already.`;

  const counterintuitiveLesson = input.costOfDebtPercent < input.costOfEquityPercent
    ? `Your loan cost of ${input.costOfDebtPercent.toFixed(1)}% is still below your equity cost of ${input.costOfEquityPercent.toFixed(1)}%, which means moderate debt can be cheaper than relying only on your own capital.`
    : `Your current debt already costs about ${input.costOfDebtPercent.toFixed(1)}%, versus equity at ${input.costOfEquityPercent.toFixed(1)}%. More borrowing will only help if the business return improves enough to justify the extra risk.`;

  return {
    currentDebtShare,
    currentCoverageRatio,
    currentRating: currentPoint.rating,
    currentRiskLevel: currentBand.riskLevel,
    currentWacc: currentPoint.wacc,
    optimalDebtShare: optimalPoint.debtShare,
    optimalWacc: optimalPoint.wacc,
    verdictStatus,
    verdictMessage,
    counterintuitiveLesson,
    curve,
  };
}
