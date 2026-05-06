import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import CountUp from 'react-countup';
import { WizardState, CalculationResult, LessonCard, BusinessType, LessonCardRow, LessonCardSection, PricingOptionBreakdown, LessonTimelinePoint } from '../types';
import { BUSINESS_TYPE_CONFIG } from '../lib/config';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Info, Download, ArrowRight, RefreshCw, Share2, Save, ChevronDown, Copy, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatPaybackMonths, formatRecoveryTime } from '../lib/recoveryTime';
import { formatPlannerCurrency, isNeutralPlannerCurrencyCode } from '../lib/marketContext';
import { simulatePriceImpact } from '../lib/calculator';

export interface ActionGateState {
  saveLabel: string;
  saveHint: string | null;
  premiumPdfLabel: string;
  premiumPdfHint: string | null;
}

type ShareFeedback = {
  tone: 'success' | 'warning' | 'error';
  message: string;
} | null;

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  onSeeHow: (lesson: LessonCard) => void;
  onBack: () => void;
  onSavePlan: () => void;
  onDownloadSimplePdf: () => void;
  onGeneratePremiumPdf: () => Promise<void>;
  onShareWhatsApp: () => void;
  onCopyShareText: () => void;
  isSharingPdf: boolean;
  shareFeedback: ShareFeedback;
  actionGateState: ActionGateState;
  results: CalculationResult;
  businessType: BusinessType;
  config: typeof BUSINESS_TYPE_CONFIG[BusinessType];
}

function buildCenteredSliderTrackStyle(
  value: number,
  min: number,
  max: number,
  zeroPoint: number,
  negativeColor: string,
  positiveColor: string,
) {
  const totalRange = max - min;
  const zeroPercent = ((zeroPoint - min) / totalRange) * 100;
  const valuePercent = ((value - min) / totalRange) * 100;

  if (value >= zeroPoint) {
    return {
      background: `linear-gradient(90deg, #D1D5DB 0%, #D1D5DB ${zeroPercent}%, ${positiveColor} ${zeroPercent}%, ${positiveColor} ${valuePercent}%, #D1D5DB ${valuePercent}%, #D1D5DB 100%)`,
    };
  }

  return {
    background: `linear-gradient(90deg, #D1D5DB 0%, #D1D5DB ${valuePercent}%, ${negativeColor} ${valuePercent}%, ${negativeColor} ${zeroPercent}%, #D1D5DB ${zeroPercent}%, #D1D5DB 100%)`,
  };
}

function buildDemandSliderTrackStyle(value: number, min: number, max: number, fillColor: string) {
  const percentage = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(90deg, ${fillColor} 0%, ${fillColor} ${percentage}%, #D1D5DB ${percentage}%, #D1D5DB 100%)`,
  };
}

function formatChangeLabel(value: number): string {
  if (value === 0) {
    return '0%';
  }

  return `${value > 0 ? '+' : ''}${value}%`;
}

function formatDeltaLabel(value: number, currencyFormatter: (value: number) => string, suffix = ''): string {
  if (!Number.isFinite(value)) {
    return 'No change';
  }

  if (Math.abs(value) < 0.5) {
    return 'No change';
  }

  const sign = value > 0 ? '+' : '−';
  return `${sign}${currencyFormatter(Math.abs(value))}${suffix}`;
}

function formatWholeUnits(value: number, unitLabel: string): string {
  if (!Number.isFinite(value)) {
    return 'Not possible at this price';
  }

  return `${Math.ceil(value).toLocaleString()} ${unitLabel}`;
}

function formatPurposeTag(value: WizardState['step1_entry']['businessPurpose']): string {
  switch (value) {
    case 'cover_family_needs':
      return 'Cover family needs';
    case 'save_for_something_big':
      return 'Save for something big';
    case 'grow_the_business':
      return 'Grow the business';
    case 'pay_back_a_loan':
      return 'Pay back a loan';
    case 'keep_it_running':
      return 'Keep it running';
    case 'not_sure_yet':
    default:
      return 'Not sure yet';
  }
}

function buildSection(title: string, rows?: LessonCardRow[], paragraphs?: string[]): LessonCardSection {
  return { title, rows, paragraphs };
}

function BreakdownPreview({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="flex items-start justify-between gap-3 text-sm text-vuna-dark">
            <span className="min-w-0 break-words">{row.label}</span>
            <span className="shrink-0 font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-vuna-slate transition-colors hover:border-vuna-primary hover:text-vuna-primary"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

function MetricCard({
  label,
  value,
  helper,
  accent = 'neutral',
  onInfo,
}: {
  label: string;
  value: React.ReactNode;
  helper: string;
  accent?: 'neutral' | 'green';
  onInfo?: () => void;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent === 'green' ? 'border-green-200 bg-green-50' : 'border-neutral-200 bg-neutral-50'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${accent === 'green' ? 'text-vuna-primary' : 'text-vuna-slate'}`}>
          {label}
        </p>
        {onInfo && <InfoButton onClick={onInfo} label={`See how we calculated ${label.toLowerCase()}`} />}
      </div>
      <div className={`mt-3 text-3xl font-black ${accent === 'green' ? 'text-vuna-primary' : 'text-vuna-dark'}`}>{value}</div>
      <p className="mt-3 text-sm text-vuna-slate">{helper}</p>
    </div>
  );
}

function SnapshotPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'alert';
}) {
  const toneClasses = tone === 'positive'
    ? 'border-green-200 bg-green-50 text-vuna-primary'
    : tone === 'alert'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-white/14 bg-white/10 text-white';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

export default function Step4Vision({
  state,
  setState: _setState,
  onSeeHow,
  onBack,
  onSavePlan,
  onDownloadSimplePdf,
  onGeneratePremiumPdf,
  onShareWhatsApp,
  onCopyShareText,
  isSharingPdf,
  shareFeedback,
  actionGateState,
  results,
  businessType: _businessType,
  config,
}: Props) {
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [salesChangePercent, setSalesChangePercent] = useState(0);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(true);
  const [scenarioView, setScenarioView] = useState<'normal' | 'bad'>('normal');

  useEffect(() => {
    if (results.monthlyProfit > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1DB954', '#1A7A3C', '#0D1B2A'],
      });
    }
  }, [results.monthlyProfit]);

  const businessName = state.step1_entry.activityDescription || 'Your business';
  const location = state.step1_entry.location || state.marketCountryName || 'your area';
  const operatingBreakEvenTime = formatRecoveryTime(results.recoveryDays);
  const paybackTime = formatPaybackMonths(results.investmentPaybackMonths);
  const formatCurrency = (value: number): string => formatPlannerCurrency(value, state.currencyCode);
  const profitSuffix = isNeutralPlannerCurrencyCode(state.currencyCode) ? '' : ` ${state.currencyCode}`;
  const shareFeedbackTone = shareFeedback?.tone === 'success'
    ? 'border-green-200 bg-green-50 text-vuna-primary'
    : shareFeedback?.tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : 'border-amber-200 bg-amber-50 text-amber-900';
  const simulator = useMemo(
    () => simulatePriceImpact(state, _businessType, priceChangePercent, salesChangePercent),
    [state, _businessType, priceChangePercent, salesChangePercent],
  );
  const simulatorDisplayedPrice = results.weightedAvgSellingPrice * simulator.priceMultiplier;
  const priceChangeDelta = simulator.monthlyProfit - results.monthlyProfit;
  const safePerDayDelta = simulator.safeTakeHomeDailyAmount - results.safeTakeHomeDailyAmount;
  const paybackDelta = Number.isFinite(simulator.paybackMonths) && Number.isFinite(results.investmentPaybackMonths)
    ? simulator.paybackMonths - results.investmentPaybackMonths
    : 0;
  const breakEvenDelta = simulator.operatingBreakEvenUnits - Math.ceil(results.operatingBreakEvenUnits);

  const startupCostRows = [
    ...(config.showProductionCosts
      ? []
      : state.step2_buckets.seedCosts
          .filter((item) => item.amount > 0)
          .map((item) => ({ label: `${item.name || 'Startup cost'} (startup)`, value: formatCurrency(item.amount) }))),
    ...state.step2_buckets.foundationCosts
      .filter((item) => item.costCategory === 'one-time' && item.amount > 0)
      .map((item) => ({ label: `${item.name || 'One-time cost'} (one-time)`, value: formatCurrency(item.amount) })),
  ];

  const monthlyRunningRows = [
    ...state.step2_buckets.foundationCosts
      .filter((item) => item.costCategory === 'monthly' && item.amount > 0)
      .map((item) => ({ label: `${item.name || 'Monthly foundation cost'} (monthly)`, value: formatCurrency(item.amount) })),
    ...state.step2_buckets.fuelCosts
      .filter((item) => item.amount > 0)
      .map((item) => ({ label: item.name || 'Running cost', value: formatCurrency(item.amount) })),
    ...state.step2_buckets.protectionCosts
      .filter((item) => item.amount > 0)
      .map((item) => ({ label: item.name || 'Protection cost', value: formatCurrency(item.amount) })),
  ];

  const paybackMonthFloor = Number.isFinite(results.investmentPaybackMonths)
    ? Math.max(1, Math.floor(results.investmentPaybackMonths))
    : 0;
  const timelinePoints: LessonTimelinePoint[] = [
    { label: 'Start', value: formatCurrency(0), helper: 'Day one' },
    {
      label: 'Break-Even',
      value: Number.isFinite(results.investmentPaybackMonths) ? `Month ${paybackMonthFloor}` : 'Not yet',
      helper: 'Costs recovered',
    },
    {
      label: 'Profit',
      value: `${formatCurrency(results.monthlyProfit)}/month`,
      helper: Number.isFinite(results.investmentPaybackMonths) ? `From month ${paybackMonthFloor + 1} onwards` : 'After recovery',
    },
  ];
  const needsMoreSalesMessage = Number.isFinite(results.requiredUnitsPerWeek)
    ? `You are currently selling ${results.totalUnitsPerWeek.toLocaleString()} ${config.unitNamePlural} per week. You need about ${Math.ceil(results.requiredUnitsPerWeek).toLocaleString()} ${config.unitNamePlural} per week to cover your monthly running costs.`
    : 'At the current price, this business is not yet covering its monthly running costs.';
  const paymentTimingLabel = state.step1_entry.customerPaymentTiming === 'immediate'
    ? 'Customers pay straight away'
    : state.step1_entry.customerPaymentTiming === 'within_week'
      ? 'Customers usually pay within a week'
      : state.step1_entry.customerPaymentTiming === 'within_month'
        ? 'Customers usually pay within a month'
        : 'Some customers pay now and some later';
  const scenarioMonthlyProfit = scenarioView === 'normal' ? results.normalMonthMonthlyProfit : results.badMonthMonthlyProfit;
  const scenarioCashPosition = scenarioView === 'normal' ? results.normalMonthEstimatedCashPosition : results.badMonthEstimatedCashPosition;
  const scenarioRevenue = scenarioView === 'normal' ? results.monthlyRevenue : results.badMonthMonthlyRevenue;
  const scenarioLabel = scenarioView === 'normal' ? 'Normal month' : 'Bad month';
  const cashTone = results.cashGapRisk === 'high'
    ? 'border-red-200 bg-red-50 text-red-900'
    : results.cashGapRisk === 'medium'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-green-200 bg-green-50 text-vuna-primary';
  const showStartupRecovery = !results.isAgricultureMode && state.step1_entry.businessStatus === 'new';
  const planStatusLabel = results.isAgricultureMode
    ? 'Season gross margin'
    : state.step1_entry.businessStatus === 'new'
      ? 'Startup recovery'
      : 'Profit check';
  const planStatusValue = showStartupRecovery
    ? paybackTime
    : formatCurrency(results.monthlyProfit);

  const openAverageBuyingCostLesson = () => {
    onSeeHow({
      id: 'average-buying-cost',
      title: 'How we calculated this',
      formula: `Total weekly restock cost ${formatCurrency(results.weeklyCost)} ÷ total ${config.unitNamePlural} ${results.totalUnitsPerWeek.toLocaleString()} = ${formatCurrency(results.weightedAvgVariableCost)}`,
      userValues: [
        { label: 'Total weekly restock cost', value: results.weeklyCost, formatted: formatCurrency(results.weeklyCost) },
        { label: `Total ${config.unitNamePlural} per week`, value: results.totalUnitsPerWeek, formatted: results.totalUnitsPerWeek.toLocaleString() },
        { label: 'Average buying cost', value: results.weightedAvgVariableCost, formatted: formatCurrency(results.weightedAvgVariableCost) },
      ],
      explanation: 'This is the average amount you need to spend to restock one item across your normal weekly mix.',
      analogy: 'timeline',
      visualType: 'equation',
      actionText: 'Got It',
      sections: [
        buildSection(
          'Your items',
          results.lineItemBreakdown.map((item) => ({
            label: item.name,
            value: `${formatCurrency(item.buyPrice)} x ${item.unitsPerWeek.toLocaleString()} = ${formatCurrency(item.weeklyCost)}/week`,
          })),
        ),
        buildSection('Formula', [
          { label: 'Total weekly restock cost', value: formatCurrency(results.weeklyCost) },
          { label: `Total ${config.unitNamePlural} per week`, value: results.totalUnitsPerWeek.toLocaleString() },
          { label: 'Average buying cost', value: `${formatCurrency(results.weeklyCost)} ÷ ${results.totalUnitsPerWeek.toLocaleString()} = ${formatCurrency(results.weightedAvgVariableCost)}`, emphasize: true },
        ]),
      ],
    });
  };

  const openAverageProfitLesson = () => {
    onSeeHow({
      id: 'average-profit-per-item',
      title: 'How we calculated this',
      formula: `Total weekly profit ${formatCurrency(results.weeklyProfit)} ÷ total ${config.unitNamePlural} ${results.totalUnitsPerWeek.toLocaleString()} = ${formatCurrency(results.contributionMargin)}`,
      userValues: [
        { label: 'Total weekly profit', value: results.weeklyProfit, formatted: formatCurrency(results.weeklyProfit) },
        { label: `Total ${config.unitNamePlural} per week`, value: results.totalUnitsPerWeek, formatted: results.totalUnitsPerWeek.toLocaleString() },
        { label: 'Average profit per item', value: results.contributionMargin, formatted: formatCurrency(results.contributionMargin) },
      ],
      explanation: 'We first look at how much profit each item gives, then we weight it by how many of those items you sell in a normal week.',
      analogy: 'timeline',
      visualType: 'equation',
      actionText: 'I Understand',
      sections: [
        buildSection(
          'Your items',
          results.lineItemBreakdown.map((item) => ({
            label: item.name,
            value: `${formatCurrency(item.profitPerItem)} x ${item.unitsPerWeek.toLocaleString()} = ${formatCurrency(item.weeklyProfit)}/week`,
          })),
        ),
        buildSection('Formula', [
          { label: 'Total weekly profit', value: formatCurrency(results.weeklyProfit) },
          { label: `Total ${config.unitNamePlural} per week`, value: results.totalUnitsPerWeek.toLocaleString() },
          { label: 'Average profit per item', value: `${formatCurrency(results.weeklyProfit)} ÷ ${results.totalUnitsPerWeek.toLocaleString()} = ${formatCurrency(results.contributionMargin)}`, emphasize: true },
        ]),
      ],
    });
  };

  const openAverageSellingPriceLesson = () => {
    onSeeHow({
      id: 'average-selling-price',
      title: 'How we calculated this',
      formula: `Total weekly sales money ${formatCurrency(results.weeklyRevenue)} ÷ total ${config.unitNamePlural} ${results.totalUnitsPerWeek.toLocaleString()} = ${formatCurrency(results.weightedAvgSellingPrice)}`,
      userValues: [
        { label: 'Total weekly sales money', value: results.weeklyRevenue, formatted: formatCurrency(results.weeklyRevenue) },
        { label: `Total ${config.unitNamePlural} per week`, value: results.totalUnitsPerWeek, formatted: results.totalUnitsPerWeek.toLocaleString() },
        { label: 'Average selling price', value: results.weightedAvgSellingPrice, formatted: formatCurrency(results.weightedAvgSellingPrice) },
      ],
      explanation: 'This is the average selling price across all the items or services you sell in a normal week.',
      analogy: 'timeline',
      visualType: 'equation',
      actionText: 'Got It',
      sections: [
        buildSection(
          'Your items',
          results.lineItemBreakdown.map((item) => ({
            label: item.name,
            value: `${formatCurrency(item.sellPrice)} x ${item.unitsPerWeek.toLocaleString()} = ${formatCurrency(item.weeklyRevenue)}/week`,
          })),
        ),
        buildSection('Formula', [
          { label: 'Total weekly sales money', value: formatCurrency(results.weeklyRevenue) },
          { label: `Total ${config.unitNamePlural} per week`, value: results.totalUnitsPerWeek.toLocaleString() },
          { label: 'Average selling price', value: `${formatCurrency(results.weeklyRevenue)} ÷ ${results.totalUnitsPerWeek.toLocaleString()} = ${formatCurrency(results.weightedAvgSellingPrice)}`, emphasize: true },
        ]),
      ],
    });
  };

  const openMonthlySalesTargetLesson = () => {
    onSeeHow({
      id: 'monthly-sales-target',
      title: 'How we calculated this',
      formula: `${formatCurrency(results.totalMonthlyFixedCosts)} monthly running costs ÷ ${formatCurrency(results.contributionMargin)} profit per item = ${results.operatingBreakEvenUnits.toFixed(2)} ${config.unitNamePlural}`,
      userValues: [
        { label: 'Monthly running costs used', value: results.totalMonthlyFixedCosts, formatted: formatCurrency(results.totalMonthlyFixedCosts) },
        { label: 'Profit you keep per item sold', value: results.contributionMargin, formatted: formatCurrency(results.contributionMargin) },
        { label: 'Your monthly sales target', value: results.operatingBreakEvenUnits, formatted: formatWholeUnits(results.operatingBreakEvenUnits, config.unitNamePlural) },
      ],
      explanation: results.totalMonthlyFixedCosts <= 0
        ? 'You have not entered monthly costs yet, so the sales target is zero. Add rent, transport, airtime, or similar costs in Step 2 for a real target.'
        : 'This target shows how many items you need to sell in a normal month before your monthly running costs are fully covered.',
      analogy: 'timeline',
      visualType: 'timeline',
      actionText: 'I See It',
      timelinePoints,
      sections: [
        buildSection(
          'Monthly running costs used',
          monthlyRunningRows.length > 0
            ? monthlyRunningRows
            : [{ label: 'No monthly costs entered', value: formatCurrency(0), emphasize: true }],
          ['These are costs you estimated for a typical month. They may vary. Update them in your plan when they change significantly.'],
        ),
        buildSection('Formula', [
          { label: 'Monthly running costs used', value: formatCurrency(results.totalMonthlyFixedCosts) },
          { label: 'Profit you keep per item sold', value: formatCurrency(results.contributionMargin) },
          { label: 'Your monthly sales target', value: `${formatCurrency(results.totalMonthlyFixedCosts)} ÷ ${formatCurrency(results.contributionMargin)} = ${results.operatingBreakEvenUnits.toFixed(2)} ${config.unitNamePlural}`, emphasize: true },
        ]),
        buildSection(
          'Sales mix to hit that target',
          results.lineItemBreakdown.map((item) => ({
            label: item.name,
            value: `${Math.ceil(item.allocatedBreakEvenUnits).toLocaleString()} ${config.unitNamePlural}`,
          })),
          ['We split the target using the same weekly sales mix you entered.'],
        ),
      ],
    });
  };

  const openPaybackLesson = () => {
    onSeeHow({
      id: 'startup-money-payback',
      title: 'How we calculated this',
      formula: `${formatCurrency(results.totalInitialInvestment)} startup money ÷ ${formatCurrency(results.monthlyProfit)} monthly profit after costs = ${formatPaybackMonths(results.investmentPaybackMonths)}`,
      userValues: [
        { label: 'Startup costs entered', value: results.startupCostsEntered, formatted: formatCurrency(results.startupCostsEntered) },
        { label: 'Opening stock or work cash', value: results.firstStockCost, formatted: formatCurrency(results.firstStockCost) },
        { label: 'Your startup money', value: results.totalInitialInvestment, formatted: formatCurrency(results.totalInitialInvestment) },
        { label: 'Monthly profit after costs', value: results.monthlyProfit, formatted: formatCurrency(results.monthlyProfit) },
        { label: 'Time to recover startup money', value: results.investmentPaybackMonths, formatted: formatPaybackMonths(results.investmentPaybackMonths) },
      ],
      explanation: 'This shows how long it takes for your monthly profit, after monthly costs, to pay back the money you needed to start the business and cover the first buying cycle.',
      analogy: 'timeline',
      visualType: 'timeline',
      actionText: 'Understood',
      timelinePoints,
      sections: [
        buildSection('Startup money used', [
          ...(startupCostRows.length > 0 ? startupCostRows : [{ label: 'No startup costs entered', value: formatCurrency(0) }]),
          { label: 'Opening stock or work cash', value: formatCurrency(results.firstStockCost) },
          { label: 'Your startup money', value: `${formatCurrency(results.startupCostsEntered)} + ${formatCurrency(results.firstStockCost)} = ${formatCurrency(results.totalInitialInvestment)}`, emphasize: true },
        ], config.showProductionCosts ? ['Production costs per batch are used to find the cost to make one item. They are not counted as one-time startup unless you truly pay them only once.'] : undefined),
        buildSection('Monthly profit used', [
          { label: 'Monthly sales money', value: formatCurrency(results.monthlyRevenue) },
          { label: 'Minus monthly restock cost', value: `-${formatCurrency(results.monthlyVariableCosts)}` },
          { label: 'Minus monthly running costs', value: `-${formatCurrency(results.totalMonthlyFixedCosts)}` },
          { label: 'Monthly profit after costs', value: formatCurrency(results.monthlyProfit), emphasize: true },
        ]),
        buildSection('Formula', [
          { label: 'Time to recover startup money', value: Number.isFinite(results.investmentPaybackMonths) ? `${formatCurrency(results.totalInitialInvestment)} ÷ ${formatCurrency(results.monthlyProfit)} = ${formatPaybackMonths(results.investmentPaybackMonths)}` : 'Not achievable at the current price and sales pace', emphasize: true },
        ], results.startupMoneyWarning ? [results.startupMoneyWarning] : undefined),
      ],
    });
  };

  const openSafeTakeHomeLesson = () => {
    onSeeHow({
      id: 'safe-take-home',
      title: 'How we calculated this',
      formula: results.monthlyProfit > 0
        ? `${formatCurrency(results.monthlyProfit)} monthly profit - ${formatCurrency(results.safetyBufferAmount)} safety buffer = ${formatCurrency(results.safeTakeHomeAmount)}`
        : 'Your business is not yet covering all its costs.',
      userValues: [
        { label: 'Monthly profit after costs', value: results.monthlyProfit, formatted: formatCurrency(results.monthlyProfit) },
        { label: 'Safety buffer (20%)', value: results.safetyBufferAmount, formatted: formatCurrency(results.safetyBufferAmount) },
        { label: 'Safe to take home', value: results.safeTakeHomeAmount, formatted: formatCurrency(results.safeTakeHomeAmount) },
      ],
      explanation: results.monthlyProfit > 0
        ? 'This keeps the full restock amount inside the business, then leaves 20% of the profit as a safety buffer.'
        : needsMoreSalesMessage,
      analogy: 'timeline',
      visualType: 'equation',
      actionText: 'I Understand',
      sections: [
        buildSection('Breakdown', [
          { label: 'Monthly sales money', value: formatCurrency(results.monthlyRevenue) },
          { label: 'Minus monthly restock', value: `-${formatCurrency(results.monthlyRestockCost)}` },
          { label: 'Minus monthly running costs', value: `-${formatCurrency(results.totalMonthlyFixedCosts)}` },
          { label: 'Monthly profit', value: formatCurrency(results.monthlyProfit), emphasize: true },
          { label: 'Safety buffer (20%)', value: `-${formatCurrency(results.safetyBufferAmount)}` },
          { label: 'Safe to take home', value: formatCurrency(results.safeTakeHomeAmount), emphasize: true },
          { label: 'Safe to spend per week', value: formatCurrency(results.safeTakeHomeWeeklyAmount) },
          { label: 'Safe to spend per day', value: formatCurrency(results.safeTakeHomeDailyAmount) },
          { label: 'Keep in your business each week', value: formatCurrency(results.safetyBufferWeeklyAmount) },
          { label: 'Keep in your business each day', value: formatCurrency(results.safetyBufferDailyAmount) },
        ], results.monthlyProfit > 0 ? ['Weekly figures use 52 ÷ 12 weeks per month, and daily figures use 365 ÷ 12 days per month.'] : [
          `Your business is losing about ${formatCurrency(results.lossPerDay)} every day.`,
          `You are currently selling ${results.totalUnitsPerWeek.toLocaleString()} ${config.unitNamePlural} per week.`,
          Number.isFinite(results.requiredUnitsPerWeek) ? `You need about ${Math.ceil(results.requiredUnitsPerWeek).toLocaleString()} ${config.unitNamePlural} per week to break even.` : 'At this price, the business is not yet breaking even.',
          Number.isFinite(results.unitsPerWeekGap) ? `Gap: about ${Math.ceil(results.unitsPerWeekGap).toLocaleString()} more ${config.unitNamePlural} per week.` : 'Focus on increasing sales or price first.',
        ]),
      ],
    });
  };

  const openPricingLesson = (option: PricingOptionBreakdown) => {
    onSeeHow({
      id: `pricing-${option.key}`,
      title: `${option.label} details`,
      formula: `${option.label} uses the same multiplier on every item: x${option.multiplier.toFixed(2)}`,
      userValues: [
        { label: 'Multiplier used', value: option.multiplier, formatted: `x${option.multiplier.toFixed(2)}` },
        { label: 'Average price for this option', value: option.averageSuggestedPrice, formatted: formatCurrency(option.averageSuggestedPrice) },
      ],
      explanation: 'We apply the same percentage change to every current selling price so the new prices stay consistent across your items.',
      analogy: 'timeline',
      visualType: 'equation',
      actionText: 'Close',
      sections: [
        buildSection(
          'Per-item price list',
          option.items.map((item) => ({
            label: item.name,
            value: `Buy ${formatCurrency(item.buyPrice)} | Sell ${formatCurrency(item.suggestedSellPrice)}`,
          })),
        ),
      ],
    });
  };

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0D1B2A_0%,#14532d_52%,#1A7A3C_100%)] px-6 py-7 text-white shadow-[0_24px_80px_rgba(13,27,42,0.18)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-green-200">
              VunaMentor
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight">{businessName}</h2>
            <p className="mt-2 text-base text-white/75">
              A clear view of profit, cash, monthly targets, and where this business feels strong or tight.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/75">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{config.label}</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{location}</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{results.totalUnitsPerWeek.toLocaleString()} {config.unitNamePlural}/week</span>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotPill label="Monthly profit" value={formatCurrency(results.monthlyProfit)} tone={results.monthlyProfit > 0 ? 'positive' : 'alert'} />
          <SnapshotPill label="Estimated cash in hand" value={formatCurrency(results.estimatedCashPosition)} tone={results.estimatedCashPosition > 0 ? 'positive' : 'alert'} />
          <SnapshotPill label="Safe take-home" value={formatCurrency(results.safeTakeHomeAmount)} tone={results.safeTakeHomeAmount > 0 ? 'positive' : 'alert'} />
          <SnapshotPill label={planStatusLabel} value={planStatusValue} />
        </div>
      </div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <Card className="rounded-3xl border-neutral-200 p-8 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">Your main goal right now</p>
              <h3 className="mt-2 text-2xl font-black text-vuna-dark">{results.purposeHeadline}</h3>
              <p className="mt-3 text-base leading-7 text-vuna-slate">{results.purposeSupportMessage}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-2">{paymentTimingLabel}</span>
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-2">
                  Goal: {formatPurposeTag(state.step1_entry.businessPurpose)}
                </span>
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-2">
                  Growth: {state.step1_entry.growthAmbitionPercent}%
                </span>
              </div>
              {results.growthWarningMessage && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {results.growthWarningMessage}
                </div>
              )}
            </div>

            <div className={`rounded-3xl border p-6 ${cashTone}`}>
              <p className="text-sm font-bold uppercase tracking-[0.22em]">Profit versus cash</p>
              <h3 className="mt-2 text-2xl font-black text-vuna-dark">Will money actually be in your hands?</h3>
              <p className="mt-3 text-sm leading-7">{paymentTimingLabel}.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Monthly profit</p>
                  <p className="mt-2 text-2xl font-black text-vuna-dark">{formatCurrency(results.monthlyProfit)}</p>
                  <p className="mt-2 text-sm text-vuna-slate">The business can look healthy here and still feel tight on cash.</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Estimated cash in hand</p>
                  <p className={`mt-2 text-2xl font-black ${results.estimatedCashPosition >= 0 ? 'text-vuna-primary' : 'text-red-800'}`}>{formatCurrency(results.estimatedCashPosition)}</p>
                  <p className="mt-2 text-sm text-vuna-slate">This is the money likely available after normal monthly costs.</p>
                </div>
              </div>
              {results.cashGapMessage && (
                <p className="mt-4 text-sm leading-7">{results.cashGapMessage}</p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.13 }}>
        <Card className="rounded-3xl border-neutral-200 p-8 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">Scenario check</p>
              <h3 className="mt-2 text-2xl font-black text-vuna-dark">How does this look in a normal month versus a bad month?</h3>
              <p className="mt-2 text-vuna-slate">A bad month assumes about 25% fewer sales while your monthly running costs stay the same.</p>
            </div>
            <div className="inline-flex rounded-2xl border border-neutral-200 bg-neutral-50 p-1">
              <button
                type="button"
                data-testid="simple-step4-scenario-normal"
                onClick={() => setScenarioView('normal')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${scenarioView === 'normal' ? 'bg-vuna-dark text-white' : 'text-vuna-slate'}`}
              >
                Normal month
              </button>
              <button
                type="button"
                data-testid="simple-step4-scenario-bad"
                onClick={() => setScenarioView('bad')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${scenarioView === 'bad' ? 'bg-vuna-dark text-white' : 'text-vuna-slate'}`}
              >
                Bad month
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricCard
              label={`${scenarioLabel} sales money`}
              value={formatCurrency(scenarioRevenue)}
              helper="This is the sales money expected in the selected scenario."
            />
            <MetricCard
              label={`${scenarioLabel} profit`}
              value={formatCurrency(scenarioMonthlyProfit)}
              helper="This keeps your monthly running costs the same while changing sales."
              accent={scenarioMonthlyProfit >= 0 ? 'green' : 'neutral'}
            />
            <MetricCard
              label={`${scenarioLabel} cash in hand`}
              value={formatCurrency(scenarioCashPosition)}
              helper="This also reflects when customers usually pay you."
              accent={scenarioCashPosition >= 0 ? 'green' : 'neutral'}
            />
          </div>

          <div className={`mt-5 rounded-[24px] border px-4 py-4 text-sm leading-7 ${scenarioView === 'bad' && scenarioMonthlyProfit <= 0 ? 'border-red-200 bg-red-50 text-red-900' : 'border-neutral-200 bg-neutral-50 text-vuna-slate'}`}>
            {scenarioView === 'normal'
              ? `In a normal month, the business appears to make ${formatCurrency(results.normalMonthMonthlyProfit)} and hold about ${formatCurrency(results.normalMonthEstimatedCashPosition)} in cash after normal monthly costs.`
              : `In a bad month, the business would move to about ${formatCurrency(results.badMonthMonthlyProfit)} profit and about ${formatCurrency(results.badMonthEstimatedCashPosition)} in cash. This helps show how much breathing room you really have.`}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.16 }}>
        <Card className="rounded-3xl border-neutral-200 p-8 shadow-sm">
          <div className="mb-6">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-primary text-sm font-black text-white">1</div>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">Your numbers today</p>
            <h3 className="mt-2 text-2xl font-black text-vuna-dark">What one sale is doing for you</h3>
            <p className="mt-2 text-vuna-slate">These numbers combine the items you sell in a normal week into one easy summary.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Average buying cost across your items"
              value={formatCurrency(results.weightedAvgVariableCost)}
              helper="This is the average amount you spend to buy or produce one item across your normal weekly mix."
              onInfo={openAverageBuyingCostLesson}
            />
            <MetricCard
              label="Average selling price across your items"
              value={formatCurrency(results.weightedAvgSellingPrice)}
              helper="This is the average selling price across the items you move in a normal week."
              onInfo={openAverageSellingPriceLesson}
            />
            <MetricCard
              label="Profit you keep per item sold"
              value={<><CountUp end={Math.round(results.contributionMargin)} duration={2} separator="," />{profitSuffix}</>}
              helper="This is your average profit per item after removing the buying or production cost."
              accent="green"
              onInfo={openAverageProfitLesson}
            />
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.22 }}>
        <Card className="rounded-3xl border-neutral-200 p-8 shadow-sm">
          <div className="mb-6">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-primary text-sm font-black text-white">2</div>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">Monthly target</p>
            <h3 className="mt-2 flex items-center gap-3 text-2xl font-black text-vuna-dark">
              Your monthly sales target
              <InfoButton onClick={openMonthlySalesTargetLesson} label="See how we calculated your monthly sales target" />
            </h3>
            <p className="mt-2 text-vuna-slate">This tells you how many {config.unitNamePlural} you need to sell each month before your monthly running costs are fully covered.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-primary">Your monthly sales target</p>
              <p className="mt-3 text-4xl font-black text-vuna-primary">{formatWholeUnits(results.operatingBreakEvenUnits, config.unitNamePlural)}</p>
              <p className="mt-3 text-sm text-vuna-dark">That is about {formatCurrency(results.operatingBreakEvenRevenue)} in monthly sales, based on your current sales mix.</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-slate">Monthly running costs used</p>
              <p className="mt-3 text-2xl font-black text-vuna-dark">{formatCurrency(results.totalMonthlyFixedCosts)}</p>
              <p className="mt-3 text-sm text-vuna-slate">
                {results.breakEvenWarning || `At your current pace, this target is about ${operatingBreakEvenTime} away.`}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <BreakdownPreview
              title="Your monthly running costs"
              rows={monthlyRunningRows.length > 0 ? monthlyRunningRows : [{ label: 'No monthly costs entered', value: formatCurrency(0) }]}
            />
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.28 }}>
        <Card className="rounded-3xl border-neutral-200 p-8 shadow-sm">
          <div className="mb-6">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-primary text-sm font-black text-white">3</div>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">{planStatusLabel}</p>
            <h3 className="mt-2 flex items-center gap-3 text-2xl font-black text-vuna-dark">
              {showStartupRecovery
                ? 'Time to recover your startup money'
                : results.isAgricultureMode
                  ? 'Will this season leave enough margin?'
                  : 'Will this stock cycle leave enough profit?'}
              {showStartupRecovery && <InfoButton onClick={openPaybackLesson} label="See how we calculated your startup money payback" />}
            </h3>
            <p className="mt-2 text-vuna-slate">
              {showStartupRecovery
                ? 'This uses the startup money you entered plus the cash needed for your first buying cycle.'
                : results.isAgricultureMode
                  ? 'This uses your expected harvest revenue minus seasonal variable costs, including land rent when entered.'
                  : 'This focuses on recurring restock costs, selling prices, and the profit available from the business you already run.'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label={showStartupRecovery ? 'Your startup money' : results.isAgricultureMode ? 'Season costs' : 'Monthly restock cost'}
              value={formatCurrency(showStartupRecovery ? results.totalInitialInvestment : results.isAgricultureMode ? results.totalVariableCosts : results.monthlyRestockCost)}
              helper={showStartupRecovery ? 'Startup costs entered plus the cash needed for the first buying cycle.' : results.isAgricultureMode ? 'All variable crop-season costs used in this Simple Mode farm check.' : 'Money needed to replace stock or work inputs for the next normal month.'}
            />
            <MetricCard
              label={results.isAgricultureMode ? 'Season gross margin' : 'Monthly profit after costs'}
              value={formatCurrency(results.monthlyProfit)}
              helper={results.isAgricultureMode ? 'Expected crop revenue minus season variable costs.' : 'Monthly sales money minus restocking costs and monthly running costs.'}
            />
            <MetricCard
              label={showStartupRecovery ? 'Time to recover your startup money' : 'Safe take-home'}
              value={showStartupRecovery ? paybackTime : formatCurrency(results.safeTakeHomeAmount)}
              helper={showStartupRecovery ? 'This is how long the monthly profit needs to pay back your startup money.' : 'This leaves a 20% buffer inside the business for restocking or the next season.'}
              accent="green"
              onInfo={showStartupRecovery ? openPaybackLesson : openSafeTakeHomeLesson}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <BreakdownPreview
              title={showStartupRecovery ? 'Startup money included' : results.isAgricultureMode ? 'Season costs included' : 'Restock costs included'}
              rows={showStartupRecovery
                ? [
                    ...(startupCostRows.length > 0 ? startupCostRows : [{ label: 'No startup costs entered', value: formatCurrency(0) }]),
                    { label: 'Opening stock or work cash', value: formatCurrency(results.firstStockCost) },
                  ]
                : results.isAgricultureMode
                  ? [
                      { label: 'Field and input costs', value: formatCurrency(results.totalSeed) },
                      { label: 'Operations costs', value: formatCurrency(results.totalFuel) },
                      { label: 'Loss, handling, and transport costs', value: formatCurrency(results.totalProtection) },
                    ]
                  : [{ label: 'Monthly restock or work inputs', value: formatCurrency(results.monthlyRestockCost) }]}
            />
            <BreakdownPreview
              title={results.isAgricultureMode ? 'Land and yield basis' : 'Monthly running costs included'}
              rows={results.isAgricultureMode
                ? [
                    { label: `Area farmed (${state.step1_entry.landUnit})`, value: state.step1_entry.landArea.toLocaleString() },
                    { label: `Expected yield (${state.step1_entry.yieldUnit})`, value: results.monthlySales.toLocaleString() },
                    { label: `Break-even yield (${state.step1_entry.yieldUnit})`, value: Number.isFinite(results.breakEvenYield) ? Math.ceil(results.breakEvenYield).toLocaleString() : 'Add price' },
                  ]
                : monthlyRunningRows.length > 0 ? monthlyRunningRows : [{ label: 'No monthly costs entered', value: formatCurrency(0) }]}
            />
          </div>

          {showStartupRecovery && config.showProductionCosts && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Production materials and packaging are treated as recurring costs to make one item. They are not added again as one-time startup money unless you truly only pay them once.
            </div>
          )}

          {showStartupRecovery && results.startupMoneyWarning && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {results.startupMoneyWarning}
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.34 }}>
        <Card className={`rounded-3xl p-8 shadow-sm ${results.monthlyProfit > 0 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-sm font-bold uppercase tracking-[0.22em] ${results.monthlyProfit > 0 ? 'text-amber-900' : 'text-red-800'}`}>Don&apos;t eat your capital</p>
                <h3 className="mt-2 text-2xl font-black text-vuna-dark">Your safe take-home amount</h3>
              </div>
              <InfoButton onClick={openSafeTakeHomeLesson} label="See how we calculated your safe take-home amount" />
            </div>
          </div>

          {results.monthlyProfit > 0 ? (
            <>
              <p className="text-base leading-7 text-amber-950">
                Your business earns about {formatCurrency(results.monthlyProfit)} profit each month after paying all costs and restocking your goods.
                You can safely take home up to {formatCurrency(results.safeTakeHomeAmount)} this month.
                Keep {formatCurrency(results.safetyBufferAmount)} in the business as your safety buffer.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-amber-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">Safe to spend per week</p>
                  <p className="mt-2 text-xl font-black text-amber-900">{formatCurrency(results.safeTakeHomeWeeklyAmount)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">Safe to spend per day</p>
                  <p className="mt-2 text-xl font-black text-amber-900">{formatCurrency(results.safeTakeHomeDailyAmount)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">Keep in your business each week</p>
                  <p className="mt-2 text-xl font-black text-amber-900">{formatCurrency(results.safetyBufferWeeklyAmount)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">Keep in your business each day</p>
                  <p className="mt-2 text-xl font-black text-amber-900">{formatCurrency(results.safetyBufferDailyAmount)}</p>
                </div>
              </div>

              <p className="mt-5 text-4xl font-black text-amber-900">{formatCurrency(results.safeTakeHomeAmount)}</p>

              <p className="mt-5 text-sm leading-7 text-amber-950">
                Warning: If you take more than this, you are borrowing from your own business.
                Many small businesses fail because the owner takes money before restocking.
                Your stock is your business.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-4 text-red-950">
                <p className="text-base leading-7">
                  Your business is losing about {formatCurrency(results.lossPerDay)} every day. It needs more sales or a better price to cover its monthly running costs.
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-red-200 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-800">Losing each day</p>
                    <p className="mt-2 text-xl font-black text-red-900">{formatCurrency(results.lossPerDay)}</p>
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-800">You are currently selling</p>
                    <p className="mt-2 text-xl font-black text-red-900">{results.totalUnitsPerWeek.toLocaleString()} {config.unitNamePlural}/week</p>
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-800">You need to sell at least</p>
                    <p className="mt-2 text-xl font-black text-red-900">
                      {Number.isFinite(results.requiredUnitsPerWeek) ? `${Math.ceil(results.requiredUnitsPerWeek).toLocaleString()} ${config.unitNamePlural}/week` : 'More sales needed'}
                    </p>
                  </div>
              <div className="rounded-2xl border border-red-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-800">Gap</p>
                  <p className="mt-2 text-xl font-black text-red-900">
                    {Number.isFinite(results.unitsPerWeekGap) ? `${Math.ceil(results.unitsPerWeekGap).toLocaleString()} more ${config.unitNamePlural}/week` : 'Review your price'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-red-200 bg-white/70 p-4">
                  <p className="text-sm font-semibold text-red-900">What to do next</p>
                  <div className="mt-3 space-y-2 text-sm leading-7">
                    <p>1. Try to sell about {Number.isFinite(results.unitsPerWeekGap) ? Math.ceil(results.unitsPerWeekGap).toLocaleString() : 'more'} more {config.unitNamePlural} each week.</p>
                    <p>2. Reduce your monthly running costs below {formatCurrency(Math.max(results.monthlyRevenue - results.monthlyVariableCosts, 0))} if possible.</p>
                    <p>3. Test a selling price above {Number.isFinite(results.breakEvenPriceNeeded) ? formatCurrency(results.breakEvenPriceNeeded) : 'your current level'} if your market can accept it.</p>
                    <p>4. Be careful not to take money out of the business until the business starts covering itself.</p>
                  </div>
                </div>
                <p className="text-base leading-7">
                  At your current pace the business loses {formatCurrency(Math.abs(results.monthlyProfit))} per month.
                </p>
              </div>
              <p className="mt-5 text-4xl font-black text-red-800">{formatCurrency(0)}</p>
            </>
          )}
        </Card>
      </motion.div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.37 }}>
        <Card className="rounded-3xl border-neutral-200 p-8 shadow-sm">
          <button
            type="button"
            onClick={() => setIsSimulatorOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">Decision engine</p>
              <h3 className="mt-2 text-2xl font-black text-vuna-dark">What if I change my price?</h3>
              <p className="mt-2 text-vuna-slate">{config.label} — {results.totalUnitsPerWeek.toLocaleString()} {config.unitNamePlural}/week in your current plan</p>
            </div>
            <div className={`rounded-full border border-neutral-200 p-2 text-vuna-slate transition-transform ${isSimulatorOpen ? 'rotate-180' : ''}`}>
              <ChevronDown className="h-5 w-5" />
            </div>
          </button>

          {isSimulatorOpen && (
            <div className="mt-6 space-y-6">
              <div className="space-y-5">
                <div className="rounded-3xl border border-neutral-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-vuna-dark">Change selling price</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${priceChangePercent >= 0 ? 'text-vuna-primary' : 'text-rose-600'}`}>{formatChangeLabel(priceChangePercent)}</p>
                      <p className="text-lg font-semibold text-vuna-dark">
                        {config.showMultipleItems ? 'Average price' : 'Price'}: {formatCurrency(simulatorDisplayedPrice)}
                      </p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={-20}
                    max={50}
                    step={5}
                    value={priceChangePercent}
                    onChange={(event) => setPriceChangePercent(Number(event.target.value))}
                    style={buildCenteredSliderTrackStyle(priceChangePercent, -20, 50, 0, '#DC2626', '#16A34A')}
                    className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-vuna-dark [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_4px_14px_rgba(13,27,42,0.16)] [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-vuna-dark [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_4px_14px_rgba(13,27,42,0.16)]"
                  />
                  <div className="mt-3 flex justify-between text-xs font-medium text-vuna-slate">
                    <span>-20% ({formatCurrency(results.weightedAvgSellingPrice * 0.8)})</span>
                    <span>0% ({formatCurrency(results.weightedAvgSellingPrice)})</span>
                    <span>+50% ({formatCurrency(results.weightedAvgSellingPrice * 1.5)})</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-vuna-dark">Customers lost due to higher price</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-rose-600">{formatChangeLabel(salesChangePercent)}</p>
                      <p className="text-lg font-semibold text-vuna-dark">
                        Selling: {simulator.totalUnitsPerWeek.toFixed(simulator.totalUnitsPerWeek % 1 === 0 ? 0 : 1)} {config.unitNamePlural}/week
                      </p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={0}
                    step={5}
                    value={salesChangePercent}
                    onChange={(event) => setSalesChangePercent(Number(event.target.value))}
                    style={buildDemandSliderTrackStyle(Math.abs(salesChangePercent), 0, 50, '#DC2626')}
                    className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-vuna-dark [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_4px_14px_rgba(13,27,42,0.16)] [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-vuna-dark [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_4px_14px_rgba(13,27,42,0.16)]"
                  />
                  <div className="mt-3 flex justify-between text-xs font-medium text-vuna-slate">
                    <span>0 lost ({results.totalUnitsPerWeek.toLocaleString()}/wk)</span>
                    <span>25% lost ({(results.totalUnitsPerWeek * 0.75).toFixed(results.totalUnitsPerWeek * 0.75 % 1 === 0 ? 0 : 1)}/wk)</span>
                    <span>50% lost ({(results.totalUnitsPerWeek * 0.5).toFixed(results.totalUnitsPerWeek * 0.5 % 1 === 0 ? 0 : 1)}/wk)</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">Monthly profit</p>
                  <p className="mt-2 text-sm text-vuna-slate">Before: {formatCurrency(results.monthlyProfit)}</p>
                  <p className={`mt-1 text-2xl font-black ${simulator.monthlyProfit >= results.monthlyProfit ? 'text-vuna-primary' : 'text-rose-600'}`}>{formatCurrency(simulator.monthlyProfit)}</p>
                  <p className={`mt-1 text-sm font-medium ${priceChangeDelta >= 0 ? 'text-vuna-primary' : 'text-rose-600'}`}>{formatDeltaLabel(priceChangeDelta, formatCurrency)}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">Safe to spend per day</p>
                  <p className="mt-2 text-sm text-vuna-slate">Before: {formatCurrency(results.safeTakeHomeDailyAmount)}/day</p>
                  <p className={`mt-1 text-2xl font-black ${simulator.safeTakeHomeDailyAmount >= results.safeTakeHomeDailyAmount ? 'text-vuna-primary' : 'text-rose-600'}`}>{formatCurrency(simulator.safeTakeHomeDailyAmount)}/day</p>
                  <p className={`mt-1 text-sm font-medium ${safePerDayDelta >= 0 ? 'text-vuna-primary' : 'text-rose-600'}`}>{formatDeltaLabel(safePerDayDelta, formatCurrency, '/day')}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">{showStartupRecovery ? 'Months to recover startup' : results.isAgricultureMode ? 'Break-even yield' : 'Profit cycle'}</p>
                  <p className="mt-2 text-sm text-vuna-slate">
                    {showStartupRecovery
                      ? `Before: ${formatPaybackMonths(results.investmentPaybackMonths)}`
                      : results.isAgricultureMode
                        ? `Before: ${Number.isFinite(results.breakEvenYield) ? Math.ceil(results.breakEvenYield).toLocaleString() : 'Add price'} ${config.unitNamePlural}`
                        : `Before: ${formatCurrency(results.monthlyProfit)}`}
                  </p>
                  <p className={`mt-1 text-2xl font-black ${showStartupRecovery ? Number.isFinite(simulator.paybackMonths) && simulator.paybackMonths <= results.investmentPaybackMonths ? 'text-vuna-primary' : 'text-rose-600' : 'text-vuna-primary'}`}>
                    {showStartupRecovery
                      ? formatPaybackMonths(simulator.paybackMonths)
                      : results.isAgricultureMode
                        ? `${simulator.operatingBreakEvenUnits.toLocaleString()} ${config.unitNamePlural}`
                        : formatCurrency(simulator.monthlyProfit)}
                  </p>
                  <p className={`mt-1 text-sm font-medium ${paybackDelta <= 0 ? 'text-vuna-primary' : 'text-rose-600'}`}>
                    {Number.isFinite(simulator.paybackMonths) && Number.isFinite(results.investmentPaybackMonths)
                      ? formatPaybackMonths(Math.abs(paybackDelta)).replace(/^/, paybackDelta > 0 ? '+' : '−')
                      : 'No recovery at this price'}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">Break-even items per month</p>
                  <p className="mt-2 text-sm text-vuna-slate">Before: {Math.ceil(results.operatingBreakEvenUnits).toLocaleString()} {config.unitNamePlural}/month</p>
                  <p className={`mt-1 text-2xl font-black ${simulator.operatingBreakEvenUnits <= Math.ceil(results.operatingBreakEvenUnits) ? 'text-vuna-primary' : 'text-rose-600'}`}>{simulator.operatingBreakEvenUnits.toLocaleString()} {config.unitNamePlural}/month</p>
                  <p className={`mt-1 text-sm font-medium ${breakEvenDelta <= 0 ? 'text-vuna-primary' : 'text-rose-600'}`}>
                    {breakEvenDelta === 0 ? 'No change' : `${breakEvenDelta > 0 ? '+' : ''}${breakEvenDelta.toLocaleString()} ${config.unitNamePlural}/month`}
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${simulator.monthlyProfit < 0 ? 'border-red-200 bg-red-50 text-red-900' : simulator.monthlyProfit > results.monthlyProfit ? 'border-green-200 bg-green-50 text-vuna-primary' : 'border-sky-200 bg-sky-50 text-sky-900'}`}>
                {simulator.advice}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.34 }}>
        <Card className="rounded-3xl border-neutral-200 p-8 shadow-sm">
          <div className="mb-6">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-primary text-sm font-black text-white">4</div>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">Pricing ideas</p>
            <h3 className="mt-2 text-2xl font-black text-vuna-dark">Clear price ideas for each item</h3>
            <p className="mt-2 text-vuna-slate">Each option uses one clear multiplier on every selling price, so you can trace every number back to an item you entered.</p>
          </div>

          <div className="space-y-4">
            {results.pricingOptions.map((option) => (
              <div key={option.key} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="grid gap-5 md:grid-cols-[0.95fr_1.35fr] md:items-start">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">{option.label}</p>
                      <p className="mt-2 text-2xl font-black text-vuna-dark">{formatCurrency(option.averageSuggestedPrice)}</p>
                      <p className="mt-1 text-xs font-medium text-vuna-slate">Multiplier used: x{option.multiplier.toFixed(2)}</p>
                      <p className="mt-3 text-sm leading-6 text-vuna-slate">{option.description}</p>
                    </div>
                    <InfoButton onClick={() => openPricingLesson(option)} label={`See ${option.label.toLowerCase()} item prices`} />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-neutral-200">
                    <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 bg-neutral-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">
                      <span>Item</span>
                      <span>Buy</span>
                      <span>Sell</span>
                    </div>
                    {option.items.map((item) => (
                      <div key={item.id} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 border-t border-neutral-200 px-3 py-3 text-sm text-vuna-dark">
                        <span className="font-medium break-words whitespace-normal">{item.name}</span>
                        <span>{formatCurrency(item.buyPrice)}</span>
                        <span>{formatCurrency(item.suggestedSellPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.37 }}>
        <Card className="rounded-3xl border-green-200 bg-green-50 p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-vuna-primary">Spread the word</p>
          <h3 className="mt-2 text-2xl font-black text-vuna-dark">Share on WhatsApp</h3>
          <p className="mt-2 text-sm leading-7 text-vuna-dark">
            Turn your result into a simple WhatsApp message you can send to friends, family, or your Status. Daily survival numbers make the message easy to understand.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <Button
              type="button"
              onClick={onShareWhatsApp}
              size="lg"
              className="w-full rounded-xl bg-vuna-primary py-6 text-lg font-bold text-white hover:bg-vuna-primary/90"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Share on WhatsApp
            </Button>
            <Button
              type="button"
              onClick={onCopyShareText}
              variant="outline"
              size="lg"
              className="w-full rounded-xl border-green-300 py-6 text-lg text-vuna-primary hover:bg-white"
            >
              <Copy className="mr-2 h-5 w-5" />
              Copy to Clipboard
            </Button>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4 pt-8"
      >
        {(actionGateState.saveHint || actionGateState.premiumPdfHint) && (
          <div className="grid gap-3">
            {actionGateState.saveHint && (
              <div data-testid="simple-step4-save-hint" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                {actionGateState.saveHint}
              </div>
            )}
            {actionGateState.premiumPdfHint && (
              <div data-testid="simple-step4-premium-hint" className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-vuna-slate">
                {actionGateState.premiumPdfHint}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button onClick={onBack} variant="outline" size="lg" className="flex-1 rounded-xl border-neutral-300 py-6 text-lg text-vuna-slate hover:bg-neutral-50">
            <RefreshCw className="mr-2 h-5 w-5" />
            Adjust Plan
          </Button>
          <Button data-testid="simple-step4-save-button" onClick={onSavePlan} variant="secondary" size="lg" className="flex-1 rounded-xl bg-neutral-200 py-6 text-lg text-vuna-dark hover:bg-neutral-300">
            <Save className="mr-2 h-5 w-5" />
            {actionGateState.saveLabel}
          </Button>
          <Button data-testid="simple-step4-download-simple-pdf" onClick={onDownloadSimplePdf} variant="secondary" size="lg" className="flex-1 rounded-xl bg-neutral-200 py-6 text-lg text-vuna-dark hover:bg-neutral-300">
            <Download className="mr-2 h-5 w-5" />
            Download Simple PDF
          </Button>
          <Button data-testid="simple-step4-premium-pdf-button" onClick={onGeneratePremiumPdf} disabled={isSharingPdf} variant="secondary" size="lg" className="flex-1 rounded-xl bg-vuna-dark py-6 text-lg text-white hover:bg-vuna-dark/90 disabled:opacity-60">
            <Share2 className="mr-2 h-5 w-5" />
            {isSharingPdf ? 'Preparing Premium PDF...' : actionGateState.premiumPdfLabel}
          </Button>
          <Button size="lg" className="flex-1 rounded-xl bg-vuna-primary py-6 text-lg text-white shadow-lg transition-all hover:bg-vuna-primary/90 hover:shadow-xl">
            Start Tracking in VunaBooks
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {shareFeedback && (
        <div data-testid="wizard-share-feedback" className={`rounded-2xl border p-4 text-sm font-medium ${shareFeedbackTone}`}>
          {shareFeedback.message}
        </div>
      )}
    </div>
  );
}
