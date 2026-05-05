import React, { useEffect, useState } from 'react';
import { WizardState, CalculationResult, LessonCard, BusinessType } from '../types';
import { BUSINESS_TYPE_CONFIG } from '../lib/config';
import { formatPlannerCurrency, isNeutralPlannerCurrencyCode } from '../lib/marketContext';
import { formatPaybackMonths, formatRecoveryTime } from '../lib/recoveryTime';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { HelpCircle, Info } from 'lucide-react';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  onSeeHow: (lesson: LessonCard) => void;
  onNext: () => void;
  onBack: () => void;
  results: CalculationResult;
  businessType: BusinessType;
  config: typeof BUSINESS_TYPE_CONFIG[BusinessType];
}

interface PricingOption {
  key: 'low' | 'medium' | 'high';
  label: string;
  hint: string;
  description: string;
  price: number;
}

function StrategySnapshot({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-white">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/72">{helper}</p>
    </div>
  );
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const priceToSliderValue = (price: number, min: number, max: number): number => {
  if (max <= min) {
    return 0;
  }

  return Math.round(((clamp(price, min, max) - min) / (max - min)) * 1000);
};

const sliderValueToPrice = (value: number, min: number, max: number): number => {
  if (max <= min) {
    return min;
  }

  return Math.round(min + ((max - min) * value) / 1000);
};

export default function Step3Strategy({ state, setState, onSeeHow, onNext, onBack, results, businessType, config }: Props) {
  const { step3_strategy, isExpertMode } = state;
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const isAgricultureMode = businessType === 'agriculture';
  const isMultiItemMode = config.showMultipleItems;
  const lowPrice = Math.round(results.survivalPrice);
  const mediumPrice = Math.round(results.businessPrice);
  const highPrice = Math.round(results.growthPrice);
  const hasSelectedPrice = Number.isFinite(step3_strategy.selectedPrice) && step3_strategy.selectedPrice > 0;
  const selectedPrice = hasSelectedPrice ? step3_strategy.selectedPrice : mediumPrice;
  const draftPrice = isEditingPrice && priceInput !== '' ? Number(priceInput) : selectedPrice;
  const sliderMin = 0;
  const sliderMax = Math.max(
    highPrice,
    Math.round(results.growthPrice * 1.35),
    draftPrice,
    Math.round(results.unitBaseCost * 1.5),
    mediumPrice,
  );
  const sliderValue = priceToSliderValue(draftPrice, sliderMin, sliderMax);
  const operatingBreakEvenTime = formatRecoveryTime(results.recoveryDays);
  const investmentPaybackTime = formatPaybackMonths(results.investmentPaybackMonths);
  const profitPerItem = results.selectedPrice - results.unitBaseCost;
  const formatCurrency = (value: number): string => formatPlannerCurrency(value, state.currencyCode);
  const showCurrencyCode = !isNeutralPlannerCurrencyCode(state.currencyCode) && (priceInput.length > 0 || selectedPrice > 0);
  const statusCopy = state.step1_entry.businessStatus === 'new'
    ? {
        recoveryLabel: 'Startup recovery',
        recoveryHelper: 'How long your current plan needs to recover startup money.',
      }
    : {
        recoveryLabel: 'Profit check',
        recoveryHelper: 'For ongoing businesses, focus on this cycle\'s profit and restocking room.',
      };

  useEffect(() => {
    if (!isAgricultureMode && !isMultiItemMode && step3_strategy.selectedPrice === 0 && mediumPrice > 0) {
      setState((prev) => ({
        ...prev,
        step3_strategy: { ...prev.step3_strategy, selectedPrice: mediumPrice },
      }));
    }
  }, [isAgricultureMode, isMultiItemMode, mediumPrice, setState, step3_strategy.selectedPrice]);

  useEffect(() => {
    if (!isEditingPrice) {
      setPriceInput(selectedPrice > 0 ? selectedPrice.toLocaleString() : '');
    }
  }, [isEditingPrice, selectedPrice]);

  const updateSelectedPrice = (nextPrice: number) => {
    setState((prev) => ({
      ...prev,
      step3_strategy: { ...prev.step3_strategy, selectedPrice: nextPrice },
    }));
  };

  const commitTypedPrice = () => {
    if (priceInput === '') {
      setPriceInput(selectedPrice > 0 ? selectedPrice.toLocaleString() : mediumPrice.toLocaleString());
      return;
    }

    updateSelectedPrice(Number(priceInput));
  };

  const pricingOptions: PricingOption[] = [
    {
      key: 'low',
      label: 'Low Price',
      hint: 'slower recovery',
      description: 'This price is easier for more customers to accept. You may sell faster, but it will take longer to recover your startup money.',
      price: lowPrice,
    },
    {
      key: 'medium',
      label: 'Medium Price',
      hint: 'balanced',
      description: 'This price gives a balance between customer demand and profit. It may help you grow steadily while recovering your money at a reasonable pace.',
      price: mediumPrice,
    },
    {
      key: 'high',
      label: 'High Price',
      hint: 'faster recovery',
      description: 'This price gives more profit on each sale. You may recover your startup money faster, but some customers may not be willing to pay it.',
      price: highPrice,
    },
  ];

  const activeOptionKey = pricingOptions.reduce((closest, option) => {
    const closestDistance = Math.abs(closest.price - selectedPrice);
    const optionDistance = Math.abs(option.price - selectedPrice);
    return optionDistance < closestDistance ? option : closest;
  }, pricingOptions[0]).key;

  const getPricingFeedback = () => {
    if (results.totalUnitsPerWeek <= 0) {
      return {
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
        message: `Add your weekly ${config.unitNamePlural} so we can estimate recovery time clearly.`,
      };
    }

    if (results.selectedPrice < results.unitBaseCost) {
      return {
        tone: 'border-red-200 bg-red-50 text-red-700',
        message: 'This price is below your cost. You will lose money on each sale.',
      };
    }

    if (results.selectedPrice < results.survivalPrice) {
      return {
        tone: 'border-orange-200 bg-orange-50 text-orange-800',
        message: 'This profit is small. It may take longer to cover monthly costs and recover your startup money.',
      };
    }

    return {
      tone: 'border-green-200 bg-green-50 text-vuna-primary',
      message: 'This price gives you room to make profit.',
    };
  };

  const pricingFeedback = getPricingFeedback();

  const liveMetrics = [
    {
      label: isMultiItemMode ? 'Average selling price across your items' : 'Selling price',
      description: isMultiItemMode ? 'Your average selling price across all items' : 'Your chosen selling price',
      value: formatCurrency(results.selectedPrice),
    },
    {
      label: isMultiItemMode ? 'Profit you keep per item sold' : 'Profit you keep per item sold',
      description: isMultiItemMode ? 'Your average profit per item across the things you sell' : 'Profit from one sale',
      value: formatCurrency(profitPerItem),
    },
    {
      label: 'Your monthly sales target',
      description: 'Sales needed each month to cover your monthly running costs',
      value: Number.isFinite(results.operatingBreakEvenUnits)
        ? `${Math.ceil(results.operatingBreakEvenUnits).toLocaleString()} ${config.unitNamePlural}`
        : 'Not achievable',
    },
    {
      label: 'Time to recover your startup money',
      description: 'Time to recover your startup money',
      value: investmentPaybackTime,
    },
  ];

  if (isAgricultureMode) {
    const updateAgricultureField = (
      field: 'expectedYield' | 'expectedPrice' | 'byProductRevenue',
      value: number,
    ) => {
      setState((prev) => ({
        ...prev,
        step3_strategy: {
          ...prev.step3_strategy,
          [field]: value,
        },
      }));
    };
    const handleAgricultureNumberInput = (
      field: 'expectedYield' | 'expectedPrice' | 'byProductRevenue',
      rawValue: string,
      allowDecimal = false,
    ) => {
      const normalized = allowDecimal
        ? rawValue.replace(/[^0-9.]/g, '')
        : rawValue.replace(/\D/g, '');
      updateAgricultureField(field, Number(normalized) || 0);
    };
    const yieldUnit = state.step1_entry.yieldUnit;
    const landUnit = state.step1_entry.landUnit;
    const grossMarginTone = results.grossMargin >= 0
      ? 'border-green-200 bg-green-50 text-vuna-primary'
      : 'border-red-200 bg-red-50 text-red-700';

    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-neutral-200 bg-[linear-gradient(135deg,#0D1B2A_0%,#14324A_45%,#1A7A3C_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(13,27,42,0.14)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-green-200">
                Step 3
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Enter expected harvest and selling price</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                We compare your season costs with expected yield and price to calculate gross margin, cost of production, break-even yield, and safe take-home.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
              <StrategySnapshot label="Cost per yield unit" value={formatCurrency(results.costOfProductionPerUnit)} helper={`Total season costs divided by expected ${yieldUnit}.`} />
              <StrategySnapshot label="Gross margin" value={formatCurrency(results.grossMargin)} helper="Expected revenue minus variable season costs." />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[30px] border-neutral-200 shadow-sm">
          <CardContent className="p-6 space-y-8">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-vuna-dark">Expected yield ({yieldUnit})</Label>
                <input
                  data-testid="simple-step3-agriculture-yield"
                  type="text"
                  inputMode="numeric"
                  value={step3_strategy.expectedYield ? String(step3_strategy.expectedYield) : ''}
                  onInput={(event) => handleAgricultureNumberInput('expectedYield', event.currentTarget.value)}
                  onChange={(event) => handleAgricultureNumberInput('expectedYield', event.target.value)}
                  onBlur={(event) => handleAgricultureNumberInput('expectedYield', event.currentTarget.value)}
                  placeholder="1200"
                  className="h-12 rounded-2xl border-neutral-200 bg-neutral-50 text-lg focus-visible:ring-vuna-primary"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-vuna-dark">Expected selling price per {yieldUnit}</Label>
                <input
                  data-testid="simple-step3-agriculture-price"
                  type="text"
                  inputMode="numeric"
                  value={step3_strategy.expectedPrice ? step3_strategy.expectedPrice.toLocaleString() : ''}
                  onInput={(event) => handleAgricultureNumberInput('expectedPrice', event.currentTarget.value)}
                  onChange={(event) => handleAgricultureNumberInput('expectedPrice', event.target.value)}
                  onBlur={(event) => handleAgricultureNumberInput('expectedPrice', event.currentTarget.value)}
                  placeholder="2500"
                  className="h-12 rounded-2xl border-neutral-200 bg-neutral-50 text-lg focus-visible:ring-vuna-primary"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-vuna-dark">By-product revenue</Label>
                <input
                  data-testid="simple-step3-agriculture-byproduct"
                  type="text"
                  inputMode="numeric"
                  value={step3_strategy.byProductRevenue ? step3_strategy.byProductRevenue.toLocaleString() : ''}
                  onInput={(event) => handleAgricultureNumberInput('byProductRevenue', event.currentTarget.value)}
                  onChange={(event) => handleAgricultureNumberInput('byProductRevenue', event.target.value)}
                  onBlur={(event) => handleAgricultureNumberInput('byProductRevenue', event.currentTarget.value)}
                  placeholder="0"
                  className="h-12 rounded-2xl border-neutral-200 bg-neutral-50 text-lg focus-visible:ring-vuna-primary"
                />
              </div>
            </div>

            <div className={`rounded-2xl border p-4 ${grossMarginTone}`}>
              <p className="text-sm font-semibold">
                {results.grossMargin >= 0
                  ? `This season shows an estimated gross margin of ${formatCurrency(results.grossMargin)}.`
                  : `This season loses about ${formatCurrency(Math.abs(results.grossMargin))} at the numbers entered.`}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-slate">Gross margin per {landUnit}</p>
                <p className="mt-3 text-2xl font-black text-vuna-dark">{formatCurrency(results.grossMarginPerLandUnit)}</p>
                <p className="mt-2 text-sm text-vuna-slate">Profit after variable costs divided by land area.</p>
              </div>
              <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-slate">Cost of production</p>
                <p className="mt-3 text-2xl font-black text-vuna-dark">{formatCurrency(results.costOfProductionPerUnit)}</p>
                <p className="mt-2 text-sm text-vuna-slate">Season costs divided by expected yield.</p>
              </div>
              <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-slate">Break-even yield</p>
                <p className="mt-3 text-2xl font-black text-vuna-dark">
                  {Number.isFinite(results.breakEvenYield) ? `${Math.ceil(results.breakEvenYield).toLocaleString()} ${yieldUnit}` : 'Add price'}
                </p>
                <p className="mt-2 text-sm text-vuna-slate">Minimum harvest needed to cover season costs.</p>
              </div>
              <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-slate">Break-even price</p>
                <p className="mt-3 text-2xl font-black text-vuna-dark">
                  {Number.isFinite(results.breakEvenPricePerUnit) ? formatCurrency(results.breakEvenPricePerUnit) : 'Add yield'}
                </p>
                <p className="mt-2 text-sm text-vuna-slate">Minimum price per {yieldUnit} needed to cover costs.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack} size="lg" className="text-lg px-8 h-14 border-neutral-300 text-vuna-slate hover:bg-neutral-50 rounded-xl">Back</Button>
          <Button data-testid="simple-step3-next" onClick={onNext} size="lg" className="text-lg px-8 h-14 bg-vuna-dark hover:bg-vuna-dark/90 text-white rounded-xl">
            Next: Your Results & Plan
          </Button>
        </div>
      </div>
    );
  }

  if (isMultiItemMode) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-neutral-200 bg-[linear-gradient(135deg,#0D1B2A_0%,#14324A_45%,#1A7A3C_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(13,27,42,0.14)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-green-200">
                Step 3
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Review how your pricing mix behaves</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                We combine the things you sell into one simple view so you can see your average profit, your monthly target, and how fast you recover your startup money.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
              <StrategySnapshot label="Average profit per item" value={formatCurrency(results.wacm)} helper="Your blended average after combining the items you sell." />
              <StrategySnapshot label={statusCopy.recoveryLabel} value={state.step1_entry.businessStatus === 'new' ? investmentPaybackTime : formatCurrency(results.monthlyProfit)} helper={statusCopy.recoveryHelper} />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[30px] border-neutral-200 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="rounded-[24px] border border-green-200 bg-green-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vuna-primary">Average profit per item</p>
              <h3 className="mt-2 text-2xl font-bold text-vuna-dark">{formatCurrency(results.wacm)}</h3>
              <p className="mt-2 text-sm text-vuna-slate">
                This is the average profit you keep from one item after we blend the things you sell in a normal week.
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${pricingFeedback.tone}`}>
              <p className="text-sm font-semibold">{pricingFeedback.message}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {liveMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-slate">{metric.label}</p>
                  <p className="mt-3 text-2xl font-black text-vuna-dark">{metric.value}</p>
                  <p className="mt-2 text-sm text-vuna-slate">{metric.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {state.step1_entry.businessStatus === 'new'
                ? `Your monthly sales target is about ${operatingBreakEvenTime}. Startup-money recovery is about ${investmentPaybackTime}. If you want to change the mix, go back and edit individual item prices.`
                : `Your monthly sales target is about ${operatingBreakEvenTime}. Because this is an ongoing business, use this step mainly to test restocking costs, selling prices, and profit.`}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack} size="lg" className="text-lg px-8 h-14 border-neutral-300 text-vuna-slate hover:bg-neutral-50 rounded-xl">Back</Button>
          <Button data-testid="simple-step3-next" onClick={onNext} size="lg" className="text-lg px-8 h-14 bg-vuna-dark hover:bg-vuna-dark/90 text-white rounded-xl">Next: Your Results & Plan</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-neutral-200 bg-[linear-gradient(135deg,#0D1B2A_0%,#14324A_45%,#1A7A3C_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(13,27,42,0.14)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-green-200">
              Step 3
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Choose a price that customers can accept and the business can survive</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
              Test a low, medium, or high price and see how it changes your profit, sales target, and startup recovery. The goal is not just a high price. The goal is a workable business.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            <StrategySnapshot label="True cost" value={formatCurrency(results.unitBaseCost)} helper={`What it costs to make or buy one ${config.unitNameSingular}.`} />
            <StrategySnapshot label={statusCopy.recoveryLabel} value={state.step1_entry.businessStatus === 'new' ? investmentPaybackTime : formatCurrency(results.monthlyProfit)} helper={statusCopy.recoveryHelper} />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[30px] border-neutral-200 shadow-sm">
        <CardContent className="p-6 space-y-8">
          <div className="flex flex-col gap-3 rounded-[24px] bg-vuna-dark p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-200">True Cost</p>
                <h3 className="mt-2 text-2xl font-bold">{formatCurrency(results.unitBaseCost)}</h3>
                <p className="mt-2 max-w-2xl text-sm text-neutral-300">
                  This is your real cost for one {config.unitNameSingular}. You can test different prices above it and see how your profit, monthly sales target, and startup-money recovery change.
                </p>
              </div>
              {!isExpertMode && (
                <button
                  type="button"
                  onClick={() => onSeeHow({
                    id: 'base-cost',
                    title: config.unitCostLabel,
                    formula: isMultiItemMode ? 'Total weekly cost / total units per week' : 'Total Production Costs / Batch Yield',
                    userValues: isMultiItemMode
                      ? [
                          { label: config.weeklyCostLabel, value: results.weeklyCost, formatted: formatCurrency(results.weeklyCost) },
                          { label: `Total ${config.unitsPerWeekLabel.toLowerCase()}`, value: results.totalUnitsPerWeek, formatted: results.totalUnitsPerWeek.toLocaleString() },
                        ]
                      : [
                          { label: 'Total Production', value: results.totalSeed, formatted: results.totalSeed.toLocaleString() },
                          { label: 'Batch Yield', value: state.step2_buckets.batchYield || 1, formatted: (state.step2_buckets.batchYield || 1).toLocaleString() },
                        ],
                    explanation: isMultiItemMode
                      ? 'This is your average cost for one item or service after combining everything you sell in a normal week.'
                      : 'This is the true cost of making one item before you decide how much profit to add.',
                    analogy: 'If you go below this number, you are paying customers to take your product.',
                    visualType: 'equation',
                    actionText: 'Understood',
                  })}
                  className="inline-flex items-center gap-1 text-sm font-medium text-green-200 hover:text-white"
                >
                  <HelpCircle className="w-4 h-4" />
                  See How
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {pricingOptions.map((option) => {
              const isActive = activeOptionKey === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setIsEditingPrice(false);
                    updateSelectedPrice(option.price);
                  }}
                  className={`rounded-[24px] border p-5 text-left transition-all ${isActive
                    ? 'border-vuna-primary bg-[linear-gradient(135deg,#f4fbf6_0%,#e8f5ed_100%)] shadow-[0_16px_34px_rgba(26,122,60,0.08)]'
                    : 'border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_12px_26px_rgba(13,27,42,0.06)]'
                    }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vuna-primary">{option.hint}</p>
                  <h3 className="mt-2 text-xl font-bold text-vuna-dark">{option.label}</h3>
                  <p className="mt-2 text-2xl font-black text-vuna-dark">{formatCurrency(option.price)}</p>
                  <p className="mt-3 text-sm leading-6 text-vuna-slate">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Label className="text-lg font-semibold text-vuna-dark">Try different prices and see what happens</Label>
                <p className="mt-1 text-sm text-vuna-slate">
                  Move the slider or type a price to explore the trade-off between customer friendliness, profit, your monthly sales target, and startup-money recovery speed.
                </p>
              </div>
              <div className="relative w-full sm:max-w-[220px]">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={isEditingPrice ? priceInput : (selectedPrice ? selectedPrice.toLocaleString() : '')}
                  onFocus={() => {
                    setIsEditingPrice(true);
                    setPriceInput(selectedPrice > 0 ? String(selectedPrice) : '');
                  }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPriceInput(value);

                    if (value !== '') {
                      updateSelectedPrice(Number(value));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitTypedPrice();
                      setIsEditingPrice(false);
                      e.currentTarget.blur();
                    }

                    if (e.key === 'Escape') {
                      setPriceInput(selectedPrice > 0 ? String(selectedPrice) : String(mediumPrice));
                      setIsEditingPrice(false);
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={() => {
                    commitTypedPrice();
                    setIsEditingPrice(false);
                  }}
                  className={`h-14 rounded-2xl border-neutral-200 bg-white text-2xl font-bold focus-visible:ring-vuna-primary ${showCurrencyCode ? 'pr-14' : 'pr-4'}`}
                />
                {showCurrencyCode && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-vuna-slate">{state.currencyCode}</span>
                )}
              </div>
            </div>

            <div className="mt-8">
              <Slider
                min={0}
                max={1000}
                step={1}
                value={[sliderValue]}
                onValueChange={(value) => {
                  setIsEditingPrice(false);
                  updateSelectedPrice(sliderValueToPrice(value[0] ?? 0, sliderMin, sliderMax));
                }}
                className="w-full"
              />

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {pricingOptions.map((option) => (
                  <button
                    key={`anchor-${option.key}`}
                    type="button"
                    onClick={() => {
                      setIsEditingPrice(false);
                      updateSelectedPrice(option.price);
                    }}
                    className={`rounded-xl border px-3 py-2 transition ${activeOptionKey === option.key ? 'border-vuna-primary/20 bg-white shadow-sm' : 'border-transparent hover:border-neutral-200 hover:bg-white'}`}
                  >
                    <p className="text-sm font-semibold text-vuna-dark">{option.label.replace(' Price', '')}</p>
                    <p className="text-xs text-vuna-slate">{option.hint}</p>
                    <p className="mt-1 text-xs font-medium text-vuna-primary">{formatCurrency(option.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${pricingFeedback.tone}`}>
            <p className="text-sm font-semibold">{pricingFeedback.message}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {liveMetrics.map((metric) => (
              <div key={metric.label} className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-slate">{metric.label}</p>
                <p className="mt-3 text-2xl font-black text-vuna-dark">{metric.value}</p>
                <p className="mt-2 text-sm text-vuna-slate">{metric.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-vuna-primary" />
              <p className="text-sm leading-6 text-vuna-dark">
                Your monthly sales target tells you when your monthly running costs are covered. Time to recover your startup money tells you when your original startup money has been recovered. Keep an eye on both whenever your costs change.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} size="lg" className="text-lg px-8 h-14 border-neutral-300 text-vuna-slate hover:bg-neutral-50 rounded-xl">Back</Button>
        <Button
          onClick={onNext}
          data-testid="simple-step3-next"
          disabled={results.selectedPrice < results.unitBaseCost && !isExpertMode}
          size="lg"
          className="text-lg px-8 h-14 bg-vuna-dark hover:bg-vuna-dark/90 text-white rounded-xl"
        >
          Next: Your Results & Plan
        </Button>
      </div>
    </div>
  );
}
