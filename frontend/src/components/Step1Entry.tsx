import React from 'react';
import { WizardState, BusinessType, BusinessPurpose, CustomerPaymentTiming, BusinessStatus, LandStatus, LandUnit, SeasonCycle, YieldUnit } from '../types';
import { BUSINESS_TYPE_CONFIG } from '../lib/config';
import { categorizeBusiness } from '../lib/templates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import BusinessTypeSelector from './BusinessTypeSelector';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  onNext: () => void;
  businessType: BusinessType;
  config: typeof BUSINESS_TYPE_CONFIG[BusinessType];
  onBusinessTypeChange: (type: BusinessType) => void;
}

function ChoiceCard({
  title,
  description,
  selected,
  onClick,
  testId,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`group rounded-[26px] border p-4 text-left transition-all duration-200 ${
        selected
          ? 'border-vuna-dark bg-[linear-gradient(135deg,#f4fbf6_0%,#e9f6ee_100%)] shadow-[0_14px_32px_rgba(26,122,60,0.08)]'
          : 'border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_14px_30px_rgba(13,27,42,0.06)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-vuna-dark">{title}</p>
          <p className="mt-2 text-sm leading-6 text-vuna-slate">{description}</p>
        </div>
        <div className={`mt-0.5 h-4 w-4 rounded-full border transition-colors ${selected ? 'border-vuna-primary bg-vuna-primary' : 'border-neutral-300 bg-white group-hover:border-vuna-primary/50'}`} />
      </div>
    </button>
  );
}

export default function Step1Entry({ state, setState, onNext, businessType, config, onBusinessTypeChange }: Props) {
  const { step1_entry } = state;
  const needsWeeklySalesInput = !config.showMultipleItems;
  const isAgricultureMode = businessType === 'agriculture';
  const purposeOptions: Array<{ value: BusinessPurpose; label: string; description: string }> = [
    { value: 'cover_family_needs', label: 'Cover family needs', description: 'Use this if the business must support household needs each month.' },
    { value: 'save_for_something_big', label: 'Save for something big', description: 'Use this if you want the business to help build savings.' },
    { value: 'grow_the_business', label: 'Grow the business', description: 'Use this if you want to expand stock, customers, or output.' },
    { value: 'pay_back_a_loan', label: 'Pay back a loan', description: 'Use this if debt pressure is one of the main concerns.' },
    { value: 'keep_it_running', label: 'Keep it running', description: 'Use this if your main goal is stability and survival.' },
    { value: 'not_sure_yet', label: 'Not sure yet', description: 'Use this if you want the planner to stay general for now.' },
  ];
  const paymentTimingOptions: Array<{ value: CustomerPaymentTiming; label: string; description: string }> = [
    { value: 'immediate', label: 'Straight away', description: 'Customers usually pay at the time of sale.' },
    { value: 'within_week', label: 'Within a week', description: 'Some cash comes in later, but not too far away.' },
    { value: 'within_month', label: 'Within a month', description: 'Sales happen now, but cash may come much later.' },
    { value: 'mixed', label: 'Some now, some later', description: 'Part of the sales money comes immediately and part arrives later.' },
  ];
  const growthOptions: Array<{ value: 0 | 25 | 50; label: string; description: string }> = [
    { value: 0, label: 'Stay steady', description: 'Focus on making the current business work well first.' },
    { value: 25, label: 'Grow by 25%', description: 'Plan for moderate growth with some extra stock or work inputs.' },
    { value: 50, label: 'Grow by 50%', description: 'Plan for aggressive growth that needs more cash up front.' },
  ];
  const landUnitOptions: Array<{ value: LandUnit; label: string }> = [
    { value: 'acre', label: 'Acres' },
    { value: 'hectare', label: 'Hectares' },
    { value: 'plot', label: 'Plots' },
  ];
  const landStatusOptions: Array<{ value: LandStatus; label: string; description: string }> = [
    { value: 'owned', label: 'Own land', description: 'Use this if you farm on land you already control.' },
    { value: 'rented', label: 'Rent or lease land', description: 'Use this if you pay to access land each season.' },
  ];
  const seasonCycleOptions: Array<{ value: SeasonCycle; label: string }> = [
    { value: 1, label: '1 season' },
    { value: 2, label: '2 seasons' },
    { value: 'continuous', label: 'Continuous' },
  ];
  const yieldUnitOptions: Array<{ value: YieldUnit; label: string }> = [
    { value: 'kg', label: 'kg' },
    { value: 'tonne', label: 'tonne' },
    { value: 'bag', label: 'bag' },
    { value: 'litre', label: 'litre' },
    { value: 'unit', label: 'unit' },
  ];

  const setBusinessStatus = (businessStatus: BusinessStatus) => {
    setState((prev) => ({
      ...prev,
      step1_entry: {
        ...prev.step1_entry,
        businessStatus,
      },
    }));
  };

  const setPurpose = (purpose: BusinessPurpose) => {
    setState((prev) => ({
      ...prev,
      step1_entry: {
        ...prev.step1_entry,
        businessPurpose: purpose,
      },
    }));
  };

  const setPaymentTiming = (paymentTiming: CustomerPaymentTiming) => {
    setState((prev) => ({
      ...prev,
      step1_entry: {
        ...prev.step1_entry,
        customerPaymentTiming: paymentTiming,
      },
    }));
  };

  const setGrowthAmbition = (growthAmbitionPercent: 0 | 25 | 50) => {
    setState((prev) => ({
      ...prev,
      step1_entry: {
        ...prev.step1_entry,
        growthAmbitionPercent,
      },
    }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const desc = e.target.value;
    const detectedCategory = categorizeBusiness(desc);
    setState(prev => ({
      ...prev,
      step1_entry: {
        ...prev.step1_entry,
        activityDescription: desc,
        category: detectedCategory
      }
    }));
  };

  const isComplete = isAgricultureMode
    ? step1_entry.activityDescription.length > 2
      && step1_entry.location.length > 2
      && step1_entry.landArea > 0
    : step1_entry.activityDescription.length > 5
      && step1_entry.location.length > 2
      && (!needsWeeklySalesInput || step1_entry.salesPerWeek > 0);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-neutral-200 bg-[linear-gradient(135deg,#0D1B2A_0%,#14324A_42%,#1A7A3C_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(13,27,42,0.14)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-green-200">
              Simple Mode
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {isAgricultureMode ? 'Set up your farm-season plan in a few clear steps' : 'Set up your small-business plan in a few clear steps'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
              {isAgricultureMode
                ? 'This planner works for new and ongoing farms. Use it to judge season costs, expected selling price, gross margin, break-even yield, and whether the next crop cycle looks worth it.'
                : 'This planner is for real small businesses: shops, sellers, makers, service businesses, and wholesalers. We will keep the numbers simple and show what matters most first.'}
            </p>
          </div>
          <div className="grid gap-2 text-sm text-white/75 sm:grid-cols-3 lg:min-w-[340px]">
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">1. Describe the business</div>
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">2. Add your costs and prices</div>
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">3. See profit, cash, and risk</div>
          </div>
        </div>
      </div>

      <Card className="rounded-[30px] border-neutral-200 shadow-sm">
        <CardHeader>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-dark text-sm font-black text-white">1</div>
          <CardTitle className="text-xl text-vuna-dark">What are we planning today?</CardTitle>
          <CardDescription className="text-vuna-slate">Start with whether this is a new business or an ongoing one, then choose the business model and describe the activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-vuna-dark">Business stage</Label>
              <p className="mt-1 text-sm text-vuna-slate">This changes the planner focus. New businesses emphasize startup and launch. Ongoing businesses emphasize restocking, pricing, and this season&apos;s profit.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ChoiceCard
                testId="simple-step1-business-status-new"
                onClick={() => setBusinessStatus('new')}
                selected={step1_entry.businessStatus === 'new'}
                title="New business"
                description="Use this when you are starting from scratch and need startup recovery in the plan."
              />
              <ChoiceCard
                testId="simple-step1-business-status-ongoing"
                onClick={() => setBusinessStatus('ongoing')}
                selected={step1_entry.businessStatus === 'ongoing'}
                title="Ongoing business"
                description="Use this when the business already exists and you want help with pricing, restocking, and this season's profit."
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-vuna-dark">Business model for this plan</Label>
              <p className="text-sm text-vuna-slate mt-1">{config.description}</p>
            </div>
            <BusinessTypeSelector selected={businessType} onSelect={onBusinessTypeChange} variant="compact" showHeader={false} />
          </div>
          <Textarea
            data-testid="simple-step1-description"
            placeholder={isAgricultureMode
              ? 'Describe what you grow. Example: I grow tomatoes on rented land and I want to know if this season will make enough profit at current market prices.'
              : 'Describe what you sell or do. Example: I run a roadside tomato stall. I buy fresh tomatoes each morning and sell them in small quantities.'}
            value={step1_entry.activityDescription}
            onChange={handleDescriptionChange}
            className="min-h-[120px] rounded-[24px] border-neutral-200 bg-neutral-50 text-base leading-7 focus-visible:ring-vuna-primary"
          />
          {step1_entry.category && (
            <div className="mt-4 flex flex-col gap-4 rounded-[24px] border border-green-100 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-vuna-primary font-medium">
                We've categorized this as a <span className="capitalize font-bold">{step1_entry.category}</span> business.
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="category-override" className="text-xs text-vuna-primary whitespace-nowrap">Your business type</Label>
                <select
                  id="category-override"
                  className="text-sm border-green-200 rounded-md bg-white text-vuna-dark py-1 px-2 focus:ring-vuna-primary focus:border-vuna-primary"
                  value={step1_entry.category}
                  onChange={(e) => onBusinessTypeChange(e.target.value as BusinessType)}
                >
                  <option value="agriculture">🌾 Grow & Sell</option>
                  <option value="manufacturing">🏭 Make & Sell</option>
                  <option value="retail">🛒 Buy & Sell</option>
                  <option value="wholesale">📦 Sell Bulk</option>
                  <option value="service">🔧 Do Work</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-neutral-200 shadow-sm">
        <CardHeader>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-dark text-sm font-black text-white">2</div>
          <CardTitle className="text-xl text-vuna-dark">
            {isAgricultureMode ? 'Tell us where and how this season is set up' : 'Tell us where and how fast you will sell'}
          </CardTitle>
          <CardDescription className="text-vuna-slate">
            {isAgricultureMode
              ? 'These details anchor the agriculture math to your land, season cycle, and expected harvest.'
              : 'These details help us organize your roadmap and weekly sales plan.'}
          </CardDescription>
        </CardHeader>
        <CardContent className={`grid gap-6 ${isAgricultureMode ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-vuna-dark">{isAgricultureMode ? 'Where is the farm or market area?' : 'Where will you work from?'}</Label>
            <Input
              data-testid="simple-step1-location"
              placeholder="e.g., Kampala, Nairobi, Lagos..."
              value={step1_entry.location}
              onChange={(e) => setState(prev => ({ ...prev, step1_entry: { ...prev.step1_entry, location: e.target.value } }))}
              className="h-12 rounded-2xl border-neutral-200 bg-neutral-50 text-lg focus-visible:ring-vuna-primary"
            />
          </div>
          {isAgricultureMode ? (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-vuna-dark">Land area</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="2"
                  value={step1_entry.landArea ? String(step1_entry.landArea) : ''}
                  onChange={(e) => setState((prev) => ({
                    ...prev,
                    step1_entry: {
                      ...prev.step1_entry,
                      landArea: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0,
                    },
                  }))}
                  className="h-12 rounded-2xl border-neutral-200 bg-neutral-50 text-lg focus-visible:ring-vuna-primary"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-vuna-dark">Land unit</Label>
                <select
                  value={step1_entry.landUnit}
                  onChange={(e) => setState((prev) => ({
                    ...prev,
                    step1_entry: {
                      ...prev.step1_entry,
                      landUnit: e.target.value as LandUnit,
                    },
                  }))}
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-base text-vuna-dark focus:border-vuna-primary focus:outline-none"
                >
                  {landUnitOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3 md:col-span-2 xl:col-span-3">
                <Label className="text-sm font-semibold text-vuna-dark">Land status</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {landStatusOptions.map((option) => (
                    <div key={option.value}>
                      <ChoiceCard
                        testId={`simple-step1-land-status-${option.value}`}
                        onClick={() => setState((prev) => ({
                          ...prev,
                          step1_entry: {
                            ...prev.step1_entry,
                            landStatus: option.value,
                          },
                        }))}
                        selected={step1_entry.landStatus === option.value}
                        title={option.label}
                        description={option.description}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {step1_entry.landStatus === 'rented' && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-vuna-dark">Land rent per {step1_entry.landUnit}</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={step1_entry.landRentPerUnit ? step1_entry.landRentPerUnit.toLocaleString() : ''}
                    onChange={(e) => setState((prev) => ({
                      ...prev,
                      step1_entry: {
                        ...prev.step1_entry,
                        landRentPerUnit: Number(e.target.value.replace(/\D/g, '')) || 0,
                      },
                    }))}
                    className="h-12 rounded-2xl border-neutral-200 bg-neutral-50 text-lg focus-visible:ring-vuna-primary"
                  />
                </div>
              )}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-vuna-dark">Seasons per year</Label>
                <select
                  value={String(step1_entry.seasonCycle)}
                  onChange={(e) => setState((prev) => ({
                    ...prev,
                    step1_entry: {
                      ...prev.step1_entry,
                      seasonCycle: e.target.value === 'continuous' ? 'continuous' : Number(e.target.value) as SeasonCycle,
                    },
                  }))}
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-base text-vuna-dark focus:border-vuna-primary focus:outline-none"
                >
                  {seasonCycleOptions.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-vuna-dark">Yield unit</Label>
                <select
                  value={step1_entry.yieldUnit}
                  onChange={(e) => setState((prev) => ({
                    ...prev,
                    step1_entry: {
                      ...prev.step1_entry,
                      yieldUnit: e.target.value as YieldUnit,
                    },
                  }))}
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-base text-vuna-dark focus:border-vuna-primary focus:outline-none"
                >
                  {yieldUnitOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </>
          ) : needsWeeklySalesInput ? (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-vuna-dark">How many {config.unitNamePlural} do you expect to sell each week?</Label>
              <p className="text-sm text-vuna-slate">
                Number of {config.unitNamePlural} you expect to sell in a normal week
              </p>
              <Input
                data-testid="simple-step1-sales-per-week"
                type="text"
                inputMode="numeric"
                placeholder="50"
                value={step1_entry.salesPerWeek ? step1_entry.salesPerWeek.toLocaleString() : ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setState(prev => ({ ...prev, step1_entry: { ...prev.step1_entry, salesPerWeek: Number(val) } }))
                }}
                className="h-12 rounded-2xl border-neutral-200 bg-neutral-50 text-lg focus-visible:ring-vuna-primary"
              />
            </div>
          ) : (
            <div className="space-y-3 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
              <Label className="text-sm font-semibold text-vuna-dark">{config.itemLabel}</Label>
              <p className="text-sm text-vuna-slate">
                You will add your {config.unitNamePlural}, prices, and weekly sales volumes in the next step.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-neutral-200 shadow-sm">
        <CardHeader>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-dark text-sm font-black text-white">3</div>
          <CardTitle className="text-xl text-vuna-dark">What does this business need to do for you right now?</CardTitle>
          <CardDescription className="text-vuna-slate">This does not change the math. It changes what we focus on in your result.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {purposeOptions.map((option) => {
              const isSelected = step1_entry.businessPurpose === option.value;
              return (
                <div key={option.value}>
                  <ChoiceCard
                    testId={`simple-step1-purpose-${option.value}`}
                    onClick={() => setPurpose(option.value)}
                    selected={isSelected}
                    title={option.label}
                    description={option.description}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-neutral-200 shadow-sm">
        <CardHeader>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-dark text-sm font-black text-white">4</div>
          <CardTitle className="text-xl text-vuna-dark">When do your customers usually pay you?</CardTitle>
          <CardDescription className="text-vuna-slate">This helps us show the difference between profit on paper and cash in hand.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {paymentTimingOptions.map((option) => {
              const isSelected = step1_entry.customerPaymentTiming === option.value;
              return (
                <div key={option.value}>
                  <ChoiceCard
                    testId={`simple-step1-payment-${option.value}`}
                    onClick={() => setPaymentTiming(option.value)}
                    selected={isSelected}
                    title={option.label}
                    description={option.description}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[30px] border-neutral-200 shadow-sm">
        <CardHeader>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-vuna-dark text-sm font-black text-white">5</div>
          <CardTitle className="text-xl text-vuna-dark">Do you want this business to grow soon?</CardTitle>
          <CardDescription className="text-vuna-slate">Growth needs more stock, supplies, or working cash before the extra sales come in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            {growthOptions.map((option) => {
              const isSelected = step1_entry.growthAmbitionPercent === option.value;
              return (
                <div key={option.value}>
                  <ChoiceCard
                    testId={`simple-step1-growth-${option.value}`}
                    onClick={() => setGrowthAmbition(option.value)}
                    selected={isSelected}
                    title={option.label}
                    description={option.description}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-6">
        <Button
          onClick={onNext}
          data-testid="simple-step1-next"
          disabled={!isComplete}
          size="lg"
          className="w-full sm:w-auto text-lg px-8 h-14 bg-vuna-dark hover:bg-vuna-dark/90 text-white rounded-xl"
        >
          Build My Roadmap
        </Button>
      </div>
    </div>
  );
}
