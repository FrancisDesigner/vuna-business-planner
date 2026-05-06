import React, { useEffect } from 'react';
import { WizardState, LessonCard, CostItem, BusinessType, BusinessLineItem, CostCategory, StockRefillFrequency } from '../types';
import { BUSINESS_TYPE_CONFIG } from '../lib/config';
import { formatPlannerCurrency } from '../lib/marketContext';
import { INDUSTRY_TEMPLATES } from '../lib/templates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  onSeeHow: (lesson: LessonCard) => void;
  onNext: () => void;
  onBack: () => void;
  businessType: BusinessType;
  config: typeof BUSINESS_TYPE_CONFIG[BusinessType];
}

type CostBucketKey = 'seedCosts' | 'foundationCosts' | 'fuelCosts' | 'protectionCosts';

const inferFoundationCostCategory = (name: string): CostCategory => {
  const normalized = name.toLowerCase();

  if (
    normalized.includes('rent') ||
    normalized.includes('salary') ||
    normalized.includes('staff') ||
    normalized.includes('operator') ||
    normalized.includes('security') ||
    normalized.includes('workspace')
  ) {
    return 'monthly';
  }

  return 'one-time';
};

const createLineItem = (index: number): BusinessLineItem => ({
  id: `item-${Date.now()}-${index}`,
  name: '',
  buyingPrice: 0,
  sellingPrice: 0,
  unitsPerWeek: 0,
});

const sumUnits = (items: BusinessLineItem[]): number =>
  items.reduce((sum, item) => sum + item.unitsPerWeek, 0);

const purchaseCycleOptions: Array<{ value: StockRefillFrequency; label: string; helper: string }> = [
  { value: 'daily', label: 'Daily', helper: 'Small purchases made on most selling days.' },
  { value: 'weekly', label: 'Weekly', helper: 'A normal weekly restock or input run.' },
  { value: 'biweekly', label: 'Every 2 weeks', helper: 'A larger purchase that covers about two weeks.' },
  { value: 'monthly', label: 'Monthly', helper: 'Enough stock or inputs for a full month.' },
  { value: 'bulk', label: 'Bulk', helper: 'A large reorder that lasts several months.' },
  { value: 'irregular', label: 'Irregular', helper: 'Purchases happen only when stock or supplies run low.' },
];

function StepSnapshot({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-white">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

export default function Step2Buckets({ state, setState, onSeeHow, onNext, onBack, businessType, config }: Props) {
  const { step1_entry, step2_buckets } = state;
  const category = step1_entry.category ?? businessType;
  const isAgricultureMode = businessType === 'agriculture';
  const templates = INDUSTRY_TEMPLATES[category];
  const manufacturingRecurringKeywords = ['raw', 'material', 'packag', 'carton', 'box', 'ingredient', 'labour', 'labor'];
  const misclassifiedManufacturingCosts = config.showProductionCosts
    ? step2_buckets.foundationCosts.filter((item) => (
        item.costCategory === 'one-time' &&
        manufacturingRecurringKeywords.some((keyword) => item.name.toLowerCase().includes(keyword))
      ))
    : [];
  const totalSeedCost = step2_buckets.seedCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalFoundationCost = step2_buckets.foundationCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalRunningCost = step2_buckets.fuelCosts.reduce((sum, item) => sum + item.amount, 0)
    + step2_buckets.protectionCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalItemsTracked = config.showMultipleItems ? step2_buckets.items.length : 1;

  useEffect(() => {
    setState((prev) => {
      const nextBuckets = { ...prev.step2_buckets };
      let didChange = false;

      if (prev.step2_buckets.foundationCosts.length === 0) {
        nextBuckets.foundationCosts = templates.defaultFoundation.map((name, index) => ({
          id: `found-${index}`,
          name,
          amount: 0,
          costCategory: inferFoundationCostCategory(name),
        }));
        didChange = true;
      }

      if (prev.step2_buckets.fuelCosts.length === 0) {
        nextBuckets.fuelCosts = templates.defaultFuel.map((name, index) => ({ id: `fuel-${index}`, name, amount: 0, costCategory: 'monthly' }));
        didChange = true;
      }

      if (prev.step2_buckets.protectionCosts.length === 0) {
        nextBuckets.protectionCosts = templates.defaultProtection.map((name, index) => ({ id: `prot-${index}`, name, amount: 0, costCategory: 'monthly' }));
        didChange = true;
      }

      if ((config.showProductionCosts || businessType === 'agriculture') && prev.step2_buckets.seedCosts.length === 0) {
        nextBuckets.seedCosts = templates.defaultSeeds.map((name, index) => ({ id: `seed-${index}`, name, amount: 0, costCategory: 'one-time' }));
        didChange = true;
      }

      if (config.showMultipleItems && prev.step2_buckets.items.length === 0) {
        nextBuckets.items = [createLineItem(1)];
        didChange = true;
      }

      if (!didChange) {
        return prev;
      }

      return {
        ...prev,
        step2_buckets: nextBuckets,
      };
    });
  }, [businessType, config.showMultipleItems, config.showProductionCosts, templates.defaultFoundation, templates.defaultFuel, templates.defaultProtection, templates.defaultSeeds, setState]);

  const updateSalesPerWeek = (items: BusinessLineItem[]) => {
    setState((prev) => ({
      ...prev,
      step1_entry: {
        ...prev.step1_entry,
        salesPerWeek: config.showMultipleItems ? sumUnits(items) : prev.step1_entry.salesPerWeek,
      },
      step2_buckets: {
        ...prev.step2_buckets,
        items,
      },
    }));
  };

  const updateStockRefillFrequency = (stockRefillFrequency: StockRefillFrequency) => {
    setState((prev) => ({
      ...prev,
      step2_buckets: {
        ...prev.step2_buckets,
        stockRefillFrequency: stockRefillFrequency === 'as-needed' ? 'irregular' : stockRefillFrequency,
      },
    }));
  };

  const updatePurchaseCycleNumber = (
    field: 'purchasesPerWeek' | 'sellingDaysPerWeek' | 'costPerPurchase' | 'bulkPurchaseCost' | 'bulkLifespanMonths' | 'purchaseEventsPerMonth' | 'averagePurchaseAmount',
    value: number,
  ) => {
    setState((prev) => ({
      ...prev,
      step2_buckets: {
        ...prev.step2_buckets,
        [field]: value,
      },
    }));
  };

  const renderCycleNumberInput = (
    field: 'purchasesPerWeek' | 'sellingDaysPerWeek' | 'costPerPurchase' | 'bulkPurchaseCost' | 'bulkLifespanMonths' | 'purchaseEventsPerMonth' | 'averagePurchaseAmount',
    label: string,
    helper: string,
    placeholder: string,
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-vuna-dark">{label}</Label>
      <Input
        type="text"
        inputMode="numeric"
        value={step2_buckets[field] ? Number(step2_buckets[field]).toLocaleString() : ''}
        onChange={(e) => updatePurchaseCycleNumber(field, Number(e.target.value.replace(/\D/g, '')))}
        placeholder={placeholder}
        className="border-neutral-200 bg-white focus-visible:ring-vuna-primary"
      />
      <p className="text-xs leading-5 text-vuna-slate">{helper}</p>
    </div>
  );

  const renderPurchaseCycleDetails = () => {
    const selectedCycle = step2_buckets.stockRefillFrequency === 'as-needed'
      ? 'irregular'
      : step2_buckets.stockRefillFrequency;

    if (selectedCycle === 'daily') {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          {renderCycleNumberInput('purchasesPerWeek', 'Buying days per week', 'How many days you normally buy stock or inputs.', '5')}
          {renderCycleNumberInput('sellingDaysPerWeek', 'Selling days per week', 'Used to describe the cycle; sales still come from your item prices and volumes.', '6')}
          {renderCycleNumberInput('costPerPurchase', 'Cash spent per buying day', 'Leave blank to estimate it from your weekly stock or production cost.', '50,000')}
        </div>
      );
    }

    if (selectedCycle === 'bulk') {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {renderCycleNumberInput('bulkPurchaseCost', 'Cash needed at reorder', 'The full amount you need when the bulk purchase happens.', '1,200,000')}
          {renderCycleNumberInput('bulkLifespanMonths', 'Months the bulk purchase lasts', 'Used for reserve planning. We never divide by less than one month.', '3')}
        </div>
      );
    }

    if (selectedCycle === 'irregular') {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {renderCycleNumberInput('purchaseEventsPerMonth', 'Purchases per month', 'Your best estimate of how many purchase events happen in a normal month.', '2')}
          {renderCycleNumberInput('averagePurchaseAmount', 'Average purchase amount', 'Leave blank to estimate it from your monthly stock or production cost.', '250,000')}
        </div>
      );
    }

    return null;
  };

  const handleCostChange = (bucket: CostBucketKey, id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      step2_buckets: {
        ...prev.step2_buckets,
        [bucket]: prev.step2_buckets[bucket].map(item => item.id === id ? { ...item, amount } : item)
      }
    }));
  };

  const handleNameChange = (bucket: CostBucketKey, id: string, name: string) => {
    setState(prev => ({
      ...prev,
      step2_buckets: {
        ...prev.step2_buckets,
        [bucket]: prev.step2_buckets[bucket].map((item) => {
          if (item.id !== id) {
            return item;
          }

          return { ...item, name };
        }),
      }
    }));
  };

  const handleCostCategoryChange = (bucket: CostBucketKey, id: string, costCategory: CostCategory) => {
    setState((prev) => ({
      ...prev,
      step2_buckets: {
        ...prev.step2_buckets,
        [bucket]: prev.step2_buckets[bucket].map((item) => item.id === id ? { ...item, costCategory } : item),
      },
    }));
  };

  const addCost = (bucket: CostBucketKey) => {
    setState(prev => ({
      ...prev,
      step2_buckets: {
        ...prev.step2_buckets,
        [bucket]: [...prev.step2_buckets[bucket], {
          id: `${bucket}-${Date.now()}`,
          name: '',
          amount: 0,
          costCategory: bucket === 'foundationCosts' ? 'monthly' : bucket === 'seedCosts' ? 'one-time' : 'monthly',
        }]
      }
    }));
  };

  const removeCost = (bucket: CostBucketKey, id: string) => {
    setState(prev => ({
      ...prev,
      step2_buckets: {
        ...prev.step2_buckets,
        [bucket]: prev.step2_buckets[bucket].filter(item => item.id !== id)
      }
    }));
  };

  const updateItem = (id: string, field: keyof Omit<BusinessLineItem, 'id'>, value: string | number) => {
    const nextItems = step2_buckets.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    updateSalesPerWeek(nextItems);
  };

  const addItem = () => {
    updateSalesPerWeek([...step2_buckets.items, createLineItem(step2_buckets.items.length + 1)]);
  };

  const removeItem = (id: string) => {
    if (step2_buckets.items.length === 1) {
      return;
    }

    updateSalesPerWeek(step2_buckets.items.filter((item) => item.id !== id));
  };

  const renderBucket = (
    title: string,
    description: string,
    bucketKey: CostBucketKey,
    items: CostItem[],
    showCategoryToggle = false,
  ) => (
    <Card className="mb-6 rounded-[30px] border-neutral-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-black text-vuna-dark">{title}</CardTitle>
        <CardDescription className="text-vuna-slate">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className={`rounded-[24px] border border-neutral-200 bg-neutral-50 p-4 gap-3 ${showCategoryToggle ? 'grid md:grid-cols-[1.5fr_1fr_1fr_auto] items-center' : 'flex items-center'}`}>
            <div className="flex-1 min-w-0">
              <Input
                data-testid={`simple-step2-${bucketKey}-name-${item.id}`}
                value={item.name}
                onChange={(e) => handleNameChange(bucketKey, item.id, e.target.value)}
                placeholder="New Cost"
                className="border-neutral-200 bg-white focus-visible:ring-vuna-primary"
              />
            </div>
            {showCategoryToggle && (
              <div className="grid grid-cols-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                <button
                  type="button"
                  onClick={() => handleCostCategoryChange(bucketKey, item.id, 'monthly')}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${item.costCategory === 'monthly' ? 'bg-white text-vuna-dark shadow-sm' : 'text-vuna-slate'}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => handleCostCategoryChange(bucketKey, item.id, 'one-time')}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${item.costCategory === 'one-time' ? 'bg-white text-vuna-dark shadow-sm' : 'text-vuna-slate'}`}
                >
                  One-Time
                </button>
              </div>
            )}
            <div className={showCategoryToggle ? 'w-full' : 'w-1/3'}>
              <Input
                data-testid={`simple-step2-${bucketKey}-amount-${item.id}`}
                type="text"
                inputMode="numeric"
                value={item.amount ? item.amount.toLocaleString() : ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  handleCostChange(bucketKey, item.id, Number(val));
                }}
                className="pr-10 border-neutral-200 bg-white focus-visible:ring-vuna-primary"
                placeholder="0"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeCost(bucketKey, item.id)} className="text-neutral-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => addCost(bucketKey)} className="w-full mt-2 border-dashed border-vuna-primary text-vuna-primary hover:bg-green-50">
          <Plus className="w-4 h-4 mr-2" /> Add Cost
        </Button>
      </CardContent>
    </Card>
  );

  const renderMultiItemTable = () => (
    <Card className="rounded-[30px] border-neutral-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-black text-vuna-dark">{config.costSectionLabel}</CardTitle>
        <CardDescription className="text-vuna-slate">{config.costExplanation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="hidden rounded-[24px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-vuna-slate md:grid md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto] md:gap-3">
          <span>{config.entryNameLabel}</span>
          <span>{config.unitCostLabel}</span>
          <span>{config.sellingPriceLabel}</span>
          <span>{config.marginLabel}</span>
          <span>{config.unitsPerWeekLabel}</span>
          <span />
        </div>

        {step2_buckets.items.map((item) => {
          const margin = item.sellingPrice - item.buyingPrice;

          return (
            <div key={item.id} className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4 md:grid md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto] md:items-center md:gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-vuna-slate md:hidden">{config.entryNameLabel}</Label>
                <Input
                  data-testid={`simple-step2-item-name-${item.id}`}
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  placeholder={config.showStockPurchase ? 'Tomatoes' : 'Haircut'}
                  className="border-neutral-200 bg-white focus-visible:ring-vuna-primary"
                />
              </div>

              <div className="space-y-2 mt-4 md:mt-0">
                <Label className="text-xs uppercase tracking-wide text-vuna-slate md:hidden">{config.unitCostLabel}</Label>
                <Input
                  data-testid={`simple-step2-buying-price-${item.id}`}
                  type="text"
                  inputMode="numeric"
                  value={item.buyingPrice ? item.buyingPrice.toLocaleString() : ''}
                  onChange={(e) => updateItem(item.id, 'buyingPrice', Number(e.target.value.replace(/\D/g, '')))}
                  placeholder="0"
                  className="border-neutral-200 bg-white focus-visible:ring-vuna-primary"
                />
              </div>

              <div className="space-y-2 mt-4 md:mt-0">
                <Label className="text-xs uppercase tracking-wide text-vuna-slate md:hidden">{config.sellingPriceLabel}</Label>
                <Input
                  data-testid={`simple-step2-selling-price-${item.id}`}
                  type="text"
                  inputMode="numeric"
                  value={item.sellingPrice ? item.sellingPrice.toLocaleString() : ''}
                  onChange={(e) => updateItem(item.id, 'sellingPrice', Number(e.target.value.replace(/\D/g, '')))}
                  placeholder="0"
                  className="border-neutral-200 bg-white focus-visible:ring-vuna-primary"
                />
              </div>

              <div className="space-y-2 mt-4 md:mt-0">
                <Label className="text-xs uppercase tracking-wide text-vuna-slate md:hidden">{config.marginLabel}</Label>
                <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${margin >= 0 ? 'border-green-200 bg-green-50 text-vuna-primary' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {formatPlannerCurrency(margin, state.currencyCode)}
                </div>
              </div>

              <div className="space-y-2 mt-4 md:mt-0">
                <Label className="text-xs uppercase tracking-wide text-vuna-slate md:hidden">{config.unitsPerWeekLabel}</Label>
                <Input
                  data-testid={`simple-step2-units-per-week-${item.id}`}
                  type="text"
                  inputMode="numeric"
                  value={item.unitsPerWeek ? item.unitsPerWeek.toLocaleString() : ''}
                  onChange={(e) => updateItem(item.id, 'unitsPerWeek', Number(e.target.value.replace(/\D/g, '')))}
                  placeholder="0"
                  className="focus-visible:ring-vuna-primary"
                />
              </div>

              <div className="mt-4 flex justify-end md:mt-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  disabled={step2_buckets.items.length === 1}
                  className="text-neutral-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full border-dashed border-vuna-primary text-vuna-primary hover:bg-green-50">
          <Plus className="w-4 h-4 mr-2" /> Add {config.unitNameSingular}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-neutral-200 bg-[linear-gradient(135deg,#0D1B2A_0%,#14324A_45%,#1A7A3C_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(13,27,42,0.14)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-green-200">
              Step 2
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {isAgricultureMode ? 'Add the seasonal field costs that make this crop plan real' : 'Add the costs and weekly numbers that make this business real'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
              {isAgricultureMode
                ? 'Use these costs for the season you are planning. We will combine them with your expected yield and selling price to show gross margin and break-even targets.'
                : 'We use these figures to estimate break-even, pricing pressure, and whether the business has enough room to survive a difficult month.'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[480px]">
            <StepSnapshot label={isAgricultureMode ? 'Season stage' : 'Items tracked'} value={isAgricultureMode ? step1_entry.businessStatus === 'new' ? 'New farm plan' : 'Ongoing season plan' : `${totalItemsTracked}`} />
            <StepSnapshot label={isAgricultureMode ? 'Field & input costs' : 'Production or stock cost'} value={formatPlannerCurrency(totalSeedCost, state.currencyCode)} />
            <StepSnapshot label={isAgricultureMode ? 'Extra season costs' : 'Foundation costs'} value={formatPlannerCurrency(totalFoundationCost, state.currencyCode)} />
            <StepSnapshot label={isAgricultureMode ? 'Operations & risk costs' : 'Monthly running costs'} value={formatPlannerCurrency(totalRunningCost, state.currencyCode)} />
          </div>
        </div>
      </div>

      {config.showMultipleItems ? renderMultiItemTable() : renderBucket(
        config.costSectionLabel,
        config.costExplanation,
        'seedCosts',
        step2_buckets.seedCosts,
      )}

      {!isAgricultureMode && (config.showProductionCosts || config.showStockPurchase) && (
        <Card className="border-neutral-200 shadow-sm mb-6 rounded-3xl bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-vuna-dark">How often do you buy materials or stock?</CardTitle>
            <CardDescription className="text-vuna-slate">
              This captures your buying rhythm. Monthly profit still comes from your prices, costs, and sales volume; this cycle controls how much opening cash you need for stock or work inputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {purchaseCycleOptions.map((option) => {
                const currentCycle = step2_buckets.stockRefillFrequency === 'as-needed'
                  ? 'irregular'
                  : step2_buckets.stockRefillFrequency;
                const selected = currentCycle === option.value;
                return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateStockRefillFrequency(option.value)}
                  aria-pressed={selected}
                  className={`rounded-2xl border-2 p-4 text-left transition-all ${
                    selected
                      ? 'border-vuna-primary bg-vuna-primary text-white shadow-[0_14px_36px_rgba(32,129,87,0.24)]'
                      : 'border-neutral-200 bg-neutral-50 text-vuna-dark hover:border-vuna-primary/45 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-bold ${selected ? 'text-white' : 'text-vuna-dark'}`}>{option.label}</p>
                      <p className={`mt-2 text-sm leading-6 ${selected ? 'text-white/85' : 'text-vuna-slate'}`}>{option.helper}</p>
                    </div>
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-black ${
                        selected
                          ? 'border-white/70 bg-white text-vuna-primary'
                          : 'border-neutral-300 bg-white text-neutral-400'
                      }`}
                    >
                      {selected ? '✓' : ''}
                    </span>
                  </div>
                </button>
                );
              })}
            </div>
            {renderPurchaseCycleDetails()}
          </CardContent>
        </Card>
      )}

      {config.showBatchYield && (
        <Card className="border-neutral-200 shadow-sm mb-6 bg-green-50/50 rounded-3xl">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label htmlFor="batchYield" className="text-base font-semibold text-vuna-dark">
                Batch Yield
              </Label>
              <p className="text-sm text-vuna-slate">
                How many total {config.unitNamePlural} you produce from one batch. We divide your total production costs by this number.
              </p>
              <Input
                id="batchYield"
                type="text"
                inputMode="numeric"
                value={step2_buckets.batchYield ? step2_buckets.batchYield.toLocaleString() : ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setState(prev => ({
                    ...prev,
                    step2_buckets: {
                      ...prev.step2_buckets,
                      batchYield: Number(val)
                    }
                  }))
                }}
                className="max-w-xs text-lg focus-visible:ring-vuna-primary"
                placeholder="200"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {!isAgricultureMode && renderBucket(
        'Foundation Costs',
        'Tag each cost as monthly or one-time so we can separate operating break-even from startup recovery correctly.',
        'foundationCosts',
        step2_buckets.foundationCosts,
        true,
      )}

      {isAgricultureMode && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm leading-7 text-vuna-dark">
          Add only the seasonal costs you expect for this crop cycle. Land rent belongs here only if you are renting land for this season. Long-term machinery value and tax details stay out of Simple Mode for now.
        </div>
      )}

      {config.showProductionCosts && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950">
          <p className="font-semibold">Manufacturing tip</p>
          <p className="mt-2">
            Only put true one-time setup costs here, like equipment, moulds, buckets, or registration.
            Do not put raw materials, packaging, or direct labour in one-time startup costs.
            Those belong in your production costs so we can work out the real cost to make one unit.
          </p>
        </div>
      )}

      {misclassifiedManufacturingCosts.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-900">
          <p className="font-semibold">Check these one-time costs</p>
          <p className="mt-2">
            These look like recurring production costs, not one-time setup:
            {' '}
            {misclassifiedManufacturingCosts.map((item) => item.name || 'Unnamed cost').join(', ')}.
            Move them into Production Costs if you buy them again while making more units.
          </p>
        </div>
      )}

      {renderBucket(
        'Daily Running Costs',
        'Money you keep spending to run the business each month.',
        'fuelCosts',
        step2_buckets.fuelCosts,
      )}

      {renderBucket(
        'Possible Losses / Waste',
        'Money you may lose from spoilage, damage, complaints, or slow days.',
        'protectionCosts',
        step2_buckets.protectionCosts,
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} size="lg" className="text-lg px-8 h-14 border-neutral-300 text-vuna-slate hover:bg-neutral-50 rounded-xl">Back</Button>
        <Button data-testid="simple-step2-next" onClick={onNext} size="lg" className="text-lg px-8 h-14 bg-vuna-dark hover:bg-vuna-dark/90 text-white rounded-xl">
          {isAgricultureMode ? 'Next: Yield & Price' : 'Next: Pricing'}
        </Button>
      </div>
    </div>
  );
}
