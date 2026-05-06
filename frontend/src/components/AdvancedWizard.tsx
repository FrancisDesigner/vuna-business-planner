import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdvancedCostBehavior, AdvancedFormState } from '../types/advanced';
import { calculateAdvancedRoadmap, AdvancedCalculationResult } from '../lib/advancedCalculator';
import { advancedFormSchema, saveAdvancedFormIfValid } from '../lib/advancedFormSchema';
import { shouldGateAdvancedInvestment } from '../lib/advancedInvestmentGate';
import { ADVANCED_PURCHASE_CYCLE_BRIDGE_NOTE } from '../lib/advancedPurchaseCycleBridge';
import {
  buildAdvancedPlanPayload,
  hydrateAdvancedFormFromStoredInputs,
  type AdvancedStoredInputs,
  type AdvancedStoredResults,
} from '../lib/advancedPlanner';
import {
  getPlannerAuthProfile,
  getPlannerPlan,
  hasPlannerAuthTokens,
  listPlannerPlans,
  savePlannerPlan,
  updatePlannerPlan,
  type PlannerAuthProfile,
} from '../lib/plannerApi';
import { getPlannerCapabilityDecision, type PlannerAuthState } from '../lib/deployment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { ArrowLeft, Lock, Download, AlertTriangle, Save, Upload, Cloud, FolderOpen, Loader2 } from 'lucide-react';
import AdvancedResults from './AdvancedResults';
import { DEFAULT_PLANNER_CURRENCY_CODE, PlannerMarketContext, formatPlannerCurrency, getInvestmentGuidanceLimit, isNeutralPlannerCurrencyCode, storePlannerCurrencyPreference } from '../lib/marketContext';
import CurrencySelector from './CurrencySelector';

const PlannerAuthDialog = lazy(() => import('./PlannerAuthDialog'));

const defaultValues: AdvancedFormState = {
  businessName: '', location: '', industry: '', investmentSize: 0,
  rawMaterials: 0, directLabor: 0, packaging: 0, otherVariable: 0, batchYield: 1,
  equipmentCost: 0, depreciationMethod: 'straight-line', usefulLife: 5, salvageValue: 0,
  monthlyRent: 0, monthlySalaries: 0, monthlyOtherFixed: 0,
  utilities: 0, utilitiesBehavior: 'fixed',
  transport: 0, transportBehavior: 'fixed',
  marketing: 0, marketingBehavior: 'fixed',
  otherOperating: 0, otherOperatingBehavior: 'fixed',
  loanAmount: 0, annualInterestRate: 0, loanTermMonths: 0,
  taxRate: 25,
  unitsPerWeek: 0, sellingPrice: 0, growthTargetPercent: 0,
};

const growthTargetOptions = [
  { value: 0, label: 'Stay steady', helper: 'Protect profit and cash first.' },
  { value: 15, label: 'Grow 15%', helper: 'Small growth that may need extra stock or working cash.' },
  { value: 30, label: 'Grow 30%', helper: 'Strong growth that needs clear reinvestment planning.' },
  { value: 50, label: 'Grow 50%', helper: 'Aggressive growth that can strain cash.' },
] as const;

const ADVANCED_UNLOCK_STORAGE_KEY = 'vuna_advanced_unlocked';
const LEGACY_ADVANCED_PAYMENT_STORAGE_KEY = 'vuna_payment_status';

interface Props {
  onBack: () => void;
  onGoToExpert: () => void;
  marketContext?: PlannerMarketContext | null;
  currencyCode?: string;
  onCurrencyChange?: (currencyCode: string) => void;
}

type AdvancedFeedback = {
  tone: 'success' | 'warning' | 'error';
  message: string;
} | null;

type AdvancedDeferredAction = 'save_advanced' | 'load_advanced';
type PlannerAuthScreen = 'register' | 'login';

const sectionNav = [
  { id: 'profile', label: 'Profile' },
  { id: 'variable-costs', label: 'Production Costs' },
  { id: 'fixed-costs', label: 'Fixed Costs' },
  { id: 'operating-costs', label: 'Operating Costs' },
  { id: 'financing', label: 'Financing' },
  { id: 'tax', label: 'Tax' },
  { id: 'sales-pricing', label: 'Sales & Pricing' },
] as const;

const costBehaviorOptions: Array<{
  value: AdvancedCostBehavior;
  label: string;
  helper: string;
}> = [
  { value: 'fixed', label: 'Fixed', helper: 'This cost usually stays the same even when sales change.' },
  { value: 'variable', label: 'Variable', helper: 'This cost usually increases when sales increase.' },
  { value: 'mixed', label: 'Mixed', helper: 'Part of this cost is fixed, and part changes with sales.' },
];

function CostBehaviorSelector({
  name,
  label,
  value,
  setValue,
}: {
  name: 'utilitiesBehavior' | 'transportBehavior' | 'marketingBehavior' | 'otherOperatingBehavior';
  label: string;
  value: AdvancedCostBehavior;
  setValue: ReturnType<typeof useForm<AdvancedFormState>>['setValue'];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-vuna-dark">{label} behavior</Label>
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-2">
        {costBehaviorOptions.map((option) => (
          <button
            key={`${name}-${option.value}`}
            type="button"
            onClick={() => setValue(name, option.value, { shouldDirty: true })}
            className={`rounded-xl px-3 py-3 text-left text-xs transition-colors ${
              value === option.value
                ? 'bg-white text-vuna-dark shadow-sm ring-1 ring-vuna-primary/15'
                : 'text-vuna-slate hover:bg-white/80'
            }`}
          >
            <p className="font-semibold">{option.label}</p>
            <p className="mt-1 leading-5">{option.helper}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// Helper for formatted inputs
const NumberInput = ({
  name,
  label,
  placeholder = '0',
  watch,
  setValue,
  errors,
  currencyCode,
}: {
  name: keyof AdvancedFormState;
  label: string;
  placeholder?: string;
  watch: ReturnType<typeof useForm<AdvancedFormState>>['watch'];
  setValue: ReturnType<typeof useForm<AdvancedFormState>>['setValue'];
  errors: ReturnType<typeof useForm<AdvancedFormState>>['formState']['errors'];
  currencyCode: string;
}) => {
  const value = watch(name) as number;
  const [displayValue, setDisplayValue] = useState(value ? value.toLocaleString() : '');
  const showCurrencyCode = !isNeutralPlannerCurrencyCode(currencyCode) && (displayValue.length > 0 || value > 0);

  useEffect(() => {
    setDisplayValue(value ? value.toLocaleString() : '');
  }, [value]);

  return (
    <div className="space-y-2">
      <Label className="text-vuna-dark">{label}</Label>
      <div className="relative">
        <Input 
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={(e) => {
            setDisplayValue(e.target.value);
            const val = e.target.value.replace(/\D/g, '');
            setValue(name, Number(val), { shouldValidate: true, shouldDirty: true });
          }}
          onBlur={() => {
            setDisplayValue(value ? value.toLocaleString() : '');
          }}
          placeholder={placeholder}
          className={showCurrencyCode ? 'pl-12 focus-visible:ring-vuna-primary' : 'focus-visible:ring-vuna-primary'}
        />
        {showCurrencyCode && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vuna-slate text-sm">{currencyCode}</span>
        )}
      </div>
      {errors[name] && <p className="text-red-500 text-xs">{errors[name]?.message}</p>}
    </div>
  );
};

export default function AdvancedWizard({ onBack, onGoToExpert, marketContext, currencyCode: selectedCurrencyCode, onCurrencyChange }: Props) {
  const [isAdvancedUnlocked, setIsAdvancedUnlocked] = useState(false);
  const [results, setResults] = useState<AdvancedCalculationResult | null>(null);
  const [authProfile, setAuthProfile] = useState<PlannerAuthProfile | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AdvancedFeedback>(null);
  const [isSavingToAccount, setIsSavingToAccount] = useState(false);
  const [isLoadingFromAccount, setIsLoadingFromAccount] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authDialogScreen, setAuthDialogScreen] = useState<PlannerAuthScreen>('register');
  const [pendingAuthAction, setPendingAuthAction] = useState<AdvancedDeferredAction | null>(null);
  const currencyCode = selectedCurrencyCode || marketContext?.currencyCode || DEFAULT_PLANNER_CURRENCY_CODE;
  const investmentGuidanceLimit = getInvestmentGuidanceLimit(currencyCode);
  const locationOptions = Array.from(new Set([
    marketContext?.countryName,
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Uganda',
    'Kenya',
    'Tanzania',
    'Rwanda',
    'Nigeria',
    'India',
    'South Africa',
    'Ghana',
    'United States',
    'United Kingdom',
    'Other',
  ].filter(Boolean))) as string[];

  const { register, control, handleSubmit, setValue, getValues, reset, watch, formState: { errors } } = useForm<AdvancedFormState>({
    resolver: zodResolver(advancedFormSchema),
    defaultValues,
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vuna_advanced_form');
    if (saved) {
      try {
        reset({ ...defaultValues, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Failed to parse saved form');
      }
    }
    const unlockedStatus = localStorage.getItem(ADVANCED_UNLOCK_STORAGE_KEY)
      || localStorage.getItem(LEGACY_ADVANCED_PAYMENT_STORAGE_KEY);
    if (unlockedStatus === 'true') {
      setIsAdvancedUnlocked(true);
    }
  }, [reset]);

  useEffect(() => {
    if (!marketContext) return;

    const currentLocation = watch('location');
    if (!currentLocation) {
      setValue('location', marketContext.countryName, { shouldDirty: currentLocation !== marketContext.countryName });
    }
  }, [marketContext, setValue, watch]);

  useEffect(() => {
    let cancelled = false;

    async function hydratePlannerAuth() {
      if (!hasPlannerAuthTokens()) {
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }

      const profile = await getPlannerAuthProfile();
      if (!cancelled) {
        setAuthProfile(profile);
      }
    }

    void hydratePlannerAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save
  const formValues = watch();
  useEffect(() => {
    const timer = setTimeout(() => {
      const validForm = saveAdvancedFormIfValid(localStorage, 'vuna_advanced_form', formValues);

      if (isAdvancedUnlocked && validForm) {
        // Recalculate while the local Advanced preview is unlocked.
        setResults(calculateAdvancedRoadmap(validForm));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formValues, isAdvancedUnlocked]);

  // Investment Cap Check
  const handleCurrencyChange = (nextCurrencyCode: string) => {
    storePlannerCurrencyPreference(nextCurrencyCode);
    onCurrencyChange?.(nextCurrencyCode);
  };

  if (shouldGateAdvancedInvestment({
    investmentSize: formValues.investmentSize,
    equipmentCost: formValues.equipmentCost,
    investmentGuidanceLimit,
  })) {
    return (
      <div className="min-h-screen bg-vuna-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-red-200 rounded-3xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-vuna-dark mb-4">Investment Cap Exceeded</h2>
          <p className="text-vuna-slate mb-8">
            This tool is for simple business structures with investments up to {formatPlannerCurrency(investmentGuidanceLimit, currencyCode)}. For larger projects, please join our Expert waitlist.
          </p>
          <div className="space-y-3">
            <Button onClick={onGoToExpert} className="w-full bg-vuna-dark hover:bg-vuna-dark/90 text-white rounded-xl">Join Expert Waitlist</Button>
            <Button onClick={() => setValue('investmentSize', investmentGuidanceLimit)} variant="outline" className="w-full border-neutral-300 text-vuna-slate hover:bg-neutral-50 rounded-xl">Adjust Investment</Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleUnlockAdvancedPreview = () => {
    const parsed = advancedFormSchema.safeParse(getValues());
    if (!parsed.success) {
      alert('Please fill all required fields correctly before proceeding.');
      return;
    }

    setTimeout(() => {
      localStorage.setItem(ADVANCED_UNLOCK_STORAGE_KEY, 'true');
      localStorage.removeItem(LEGACY_ADVANCED_PAYMENT_STORAGE_KEY);
      setIsAdvancedUnlocked(true);
      setResults(calculateAdvancedRoadmap(parsed.data));
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 1000);
  };

  const isBackendReachable = (): boolean => {
    if (typeof navigator === 'undefined') {
      return true;
    }

    return navigator.onLine;
  };

  const getPlannerAuthState = (profile: PlannerAuthProfile | null = authProfile): PlannerAuthState => {
    if (profile?.planner_tier === 'paid') {
      return 'signed_in_paid';
    }

    if (profile || hasPlannerAuthTokens()) {
      return 'signed_in_free';
    }

    return 'anonymous';
  };

  const openAuthDialogForAction = (
    action: AdvancedDeferredAction,
    screen: PlannerAuthScreen = 'register',
  ) => {
    setPendingAuthAction(action);
    setAuthDialogScreen(screen);
    setFeedback(null);
    setIsAuthDialogOpen(true);
  };

  const getLatestAuthProfile = async (
    profileOverride?: PlannerAuthProfile | null,
  ): Promise<PlannerAuthProfile | null> => {
    if (profileOverride !== undefined) {
      return profileOverride;
    }

    if (authProfile) {
      return authProfile;
    }

    if (!hasPlannerAuthTokens() || !isBackendReachable()) {
      return null;
    }

    const latestProfile = await getPlannerAuthProfile();
    setAuthProfile(latestProfile);
    return latestProfile;
  };

  const handleSaveToAccount = async (profileOverride?: PlannerAuthProfile | null) => {
    const currentResults = results || calculateAdvancedRoadmap(getValues());

    if (!isAdvancedUnlocked) {
      setFeedback({
        tone: 'warning',
        message: 'Unlock the local Advanced preview before saving the full Advanced case to your VunaBooks account.',
      });
      return;
    }

    if (!isBackendReachable()) {
      setFeedback({
        tone: 'warning',
        message: 'Advanced still autosaves on this device. Go online to save this case to your VunaBooks account.',
      });
      return;
    }

    const latestProfile = await getLatestAuthProfile(profileOverride);
    const authState = getPlannerAuthState(latestProfile);

    if (authState === 'anonymous') {
      openAuthDialogForAction('save_advanced');
      return;
    }

    const decision = getPlannerCapabilityDecision('advanced_mode', authState, true);
    if (!decision.allowed) {
      setFeedback({
        tone: 'warning',
        message: authState === 'signed_in_free'
          ? 'Advanced cloud save is part of the paid planner tier. Your local Advanced draft is still safe on this device.'
          : (decision.message || 'Advanced cloud save is not available right now.'),
      });
      return;
    }

    setIsSavingToAccount(true);
    setFeedback(null);

    try {
      const payload = buildAdvancedPlanPayload(getValues(), currentResults, currencyCode);
      const saved = savedPlanId
        ? await updatePlannerPlan<AdvancedStoredInputs, AdvancedStoredResults>(savedPlanId, payload)
        : await savePlannerPlan<AdvancedStoredInputs, AdvancedStoredResults>(payload);

      setSavedPlanId(saved.id);
      setResults(currentResults);
      setFeedback({
        tone: 'success',
        message: `Saved "${saved.name}" to your VunaBooks account.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'We could not save this Advanced case right now.',
      });
    } finally {
      setIsSavingToAccount(false);
    }
  };

  const handleLoadLatestFromAccount = async (profileOverride?: PlannerAuthProfile | null) => {
    if (!isBackendReachable()) {
      setFeedback({
        tone: 'warning',
        message: 'Go online to load saved Advanced cases.',
      });
      return;
    }

    const latestProfile = await getLatestAuthProfile(profileOverride);
    const authState = getPlannerAuthState(latestProfile);

    if (authState === 'anonymous') {
      openAuthDialogForAction('load_advanced', 'login');
      return;
    }

    const decision = getPlannerCapabilityDecision('advanced_mode', authState, true);
    if (!decision.allowed) {
      setFeedback({
        tone: 'warning',
        message: authState === 'signed_in_free'
          ? 'Saved Advanced cases are available on the paid planner tier.'
          : (decision.message || 'Advanced case loading is not available right now.'),
      });
      return;
    }

    setIsLoadingFromAccount(true);
    setFeedback(null);

    try {
      const plans = await listPlannerPlans({ mode: 'advanced', limit: 1 });
      if (plans.length === 0) {
        setFeedback({
          tone: 'warning',
          message: 'No saved Advanced cases were found on this account yet.',
        });
        return;
      }

      const latestPlan = await getPlannerPlan<AdvancedStoredInputs, AdvancedStoredResults>(plans[0].id);
      const hydratedForm = hydrateAdvancedFormFromStoredInputs(latestPlan.inputs, defaultValues);
      const recalculatedResults = calculateAdvancedRoadmap(hydratedForm);

      reset(hydratedForm);
      setResults(recalculatedResults);
      setSavedPlanId(latestPlan.id);
      setIsAdvancedUnlocked(true);
      localStorage.setItem(ADVANCED_UNLOCK_STORAGE_KEY, 'true');
      localStorage.removeItem(LEGACY_ADVANCED_PAYMENT_STORAGE_KEY);
      localStorage.setItem('vuna_advanced_form', JSON.stringify(hydratedForm));
      setFeedback({
        tone: 'success',
        message: `Loaded "${latestPlan.name}" from your VunaBooks account.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'We could not load your saved Advanced case right now.',
      });
    } finally {
      setIsLoadingFromAccount(false);
    }
  };

  const handleAuthenticated = async (profile: PlannerAuthProfile) => {
    setAuthProfile(profile);
    setIsAuthDialogOpen(false);

    const actionToResume = pendingAuthAction;
    setPendingAuthAction(null);

    if (actionToResume === 'save_advanced') {
      await handleSaveToAccount(profile);
      return;
    }

    if (actionToResume === 'load_advanced') {
      await handleLoadLatestFromAccount(profile);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to clear all data?')) {
      localStorage.removeItem('vuna_advanced_form');
      localStorage.removeItem(ADVANCED_UNLOCK_STORAGE_KEY);
      localStorage.removeItem(LEGACY_ADVANCED_PAYMENT_STORAGE_KEY);
      reset(defaultValues);
      setIsAdvancedUnlocked(false);
      setResults(null);
      setSavedPlanId(null);
      setFeedback(null);
    }
  };

  const handleSaveFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getValues()));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "vuna_advanced_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        reset({ ...defaultValues, ...json });
      } catch (err) {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  // Real-time calculations for free view
  const currentUnitBaseCost = (formValues.rawMaterials + formValues.directLabor + formValues.packaging + formValues.otherVariable) / (formValues.batchYield || 1);
  const scrollToSection = (sectionId: (typeof sectionNav)[number]['id']) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const feedbackToneStyles = feedback?.tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : feedback?.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-green-200 bg-green-50 text-green-800';

  return (
    <div className="min-h-screen bg-vuna-bg pb-24">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" size="sm" className="-ml-2 text-vuna-slate hover:text-vuna-dark hover:bg-neutral-100">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <CurrencySelector
              value={currencyCode}
              onChange={handleCurrencyChange}
              label="Currency"
              className="hidden border border-neutral-200 px-2 py-1 sm:inline-flex"
            />
            <Button
              onClick={() => void handleSaveToAccount()}
              variant="outline"
              size="sm"
              title="Save Advanced case to VunaBooks"
              disabled={isSavingToAccount}
              className="border-neutral-300 text-vuna-slate hover:bg-neutral-50"
            >
              {isSavingToAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => void handleLoadLatestFromAccount()}
              variant="outline"
              size="sm"
              title="Load latest Advanced case"
              disabled={isLoadingFromAccount}
              className="border-neutral-300 text-vuna-slate hover:bg-neutral-50"
            >
              {isLoadingFromAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
            </Button>
            <Button onClick={handleSaveFile} variant="outline" size="sm" title="Save to file" className="border-neutral-300 text-vuna-slate hover:bg-neutral-50"><Save className="w-4 h-4" /></Button>
            <Label htmlFor="restore-file" className="cursor-pointer">
              <div className="flex items-center justify-center h-9 px-3 rounded-md border border-neutral-300 bg-background hover:bg-neutral-50 text-vuna-slate text-sm font-medium">
                <Upload className="w-4 h-4" />
              </div>
              <input id="restore-file" type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
            </Label>
            <Button onClick={handleReset} variant="ghost" size="sm" className="text-red-500 hover:bg-red-50">Reset</Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl md:text-5xl font-black text-vuna-dark">Advanced Business Analysis</h1>
          <div className="flex justify-center sm:hidden">
            <CurrencySelector
              value={currencyCode}
              onChange={handleCurrencyChange}
              label="Currency"
              className="border border-neutral-200 px-2 py-1"
            />
          </div>
          <p className="text-vuna-slate max-w-2xl mx-auto">
            Use this for a growing small business where you know your costs, selling price, production volume, and loan details. The results are estimates to help you understand profit, cash flow, debt safety, and return on investment.
          </p>
          <p className="text-sm text-vuna-slate max-w-2xl mx-auto">
            For large investments or complex businesses, use Expert Mode when available.
          </p>
        </div>

        {feedback && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${feedbackToneStyles}`}>
            {feedback.message}
          </div>
        )}

        <div className="sticky top-[72px] z-40 -mt-4">
          <div className="rounded-2xl border border-neutral-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sectionNav.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-vuna-slate transition-colors hover:border-vuna-primary hover:bg-green-50 hover:text-vuna-primary"
                >
                  {index + 1}. {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form className="space-y-8">
          {/* Section 1 */}
          <Card id="profile" className="scroll-mt-36 rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-vuna-dark">1. Business Profile</CardTitle>
              <CardDescription className="text-vuna-slate">Tell us what business we are analysing.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-vuna-dark">Business Name</Label>
                <Input {...register('businessName')} placeholder="My Business" className="focus-visible:ring-vuna-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-vuna-dark">Location</Label>
                <select {...register('location')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vuna-primary">
                  {locationOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-vuna-dark">Business type / industry</Label>
                <select {...register('industry')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vuna-primary">
                  <option value="">Select...</option>
                  <option value="Retail">Retail</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Services">Services</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <NumberInput name="investmentSize" label="Total money you plan to invest" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
                <p className="text-xs leading-5 text-vuna-slate">
                  Include money for equipment, setup, and any other capital you are putting into the business. Do not include normal monthly expenses here.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card id="variable-costs" className="scroll-mt-36 rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-vuna-dark">2. Production or Stock Costs</CardTitle>
              <CardDescription className="text-vuna-slate">These are costs that increase when you produce or sell more.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput name="rawMaterials" label="Raw materials or stock bought" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              <NumberInput name="directLabor" label="Direct labour for production or selling" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              <NumberInput name="packaging" label="Packaging" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              <NumberInput name="otherVariable" label="Other costs that change with production or sales" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              <div className="space-y-2 md:col-span-2 bg-vuna-primary/10 p-4 rounded-xl">
                <Label className="text-vuna-dark">How many units come from this batch?</Label>
                <Input 
                  type="number" 
                  {...register('batchYield', { valueAsNumber: true })} 
                  min="1"
                  className="max-w-xs focus-visible:ring-vuna-primary"
                />
                <p className="text-sm text-vuna-primary mt-2 font-medium">
                  Estimated cost for one unit: {formatPlannerCurrency(currentUnitBaseCost, currencyCode)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 3 */}
          <Card id="fixed-costs" className="scroll-mt-36 rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-vuna-dark">3. Fixed Costs</CardTitle>
              <CardDescription className="text-vuna-slate">These are costs you usually pay even when sales are low.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-neutral-200 rounded-xl bg-neutral-50/50">
                <div className="space-y-2">
                  <NumberInput name="equipmentCost" label="Equipment Cost" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
                  <p className="text-xs leading-5 text-vuna-slate">Money spent on machines, tools, or equipment.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-vuna-dark">Depreciation Method</Label>
                  <select {...register('depreciationMethod')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vuna-primary">
                    <option value="straight-line">Straight-line</option>
                    <option value="declining-balance">Declining balance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-vuna-dark">Useful Life (years)</Label>
                  <Input type="number" {...register('usefulLife', { valueAsNumber: true })} min="1" className="focus-visible:ring-vuna-primary" />
                </div>
                <NumberInput name="salvageValue" label="Expected value after useful life" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              </div>
              <NumberInput name="monthlyRent" label="Monthly Rent" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              <NumberInput name="monthlySalaries" label="Monthly admin salaries" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              <NumberInput name="monthlyOtherFixed" label="Other monthly fixed costs" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
            </CardContent>
          </Card>

          {/* Section 4 */}
          <Card id="operating-costs" className="scroll-mt-36 rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-vuna-dark">4. Operating Costs</CardTitle>
              <CardDescription className="text-vuna-slate">These are regular costs for running the business. For each cost, choose whether it stays the same, changes with sales, or is partly both.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
                <NumberInput name="utilities" label="Utilities" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
                <CostBehaviorSelector name="utilitiesBehavior" label="Utilities" value={formValues.utilitiesBehavior} setValue={setValue} />
              </div>
              <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
                <NumberInput name="transport" label="Transport / Logistics" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
                <CostBehaviorSelector name="transportBehavior" label="Transport / Logistics" value={formValues.transportBehavior} setValue={setValue} />
              </div>
              <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
                <NumberInput name="marketing" label="Marketing" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
                <CostBehaviorSelector name="marketingBehavior" label="Marketing" value={formValues.marketingBehavior} setValue={setValue} />
              </div>
              <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
                <NumberInput name="otherOperating" label="Other Operating Costs" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
                <CostBehaviorSelector name="otherOperatingBehavior" label="Other Operating Costs" value={formValues.otherOperatingBehavior} setValue={setValue} />
              </div>
            </CardContent>
          </Card>

          {/* Section 5 */}
          <Card id="financing" className="scroll-mt-36 rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-vuna-dark">5. Financing</CardTitle>
              <CardDescription className="text-vuna-slate">Enter loan details only if this business has a loan. Leave as 0 if there is no loan.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <NumberInput name="loanAmount" label="Loan Amount" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              <div className="space-y-2">
                <Label className="text-vuna-dark">Annual interest rate (%)</Label>
                <Input type="number" step="0.1" {...register('annualInterestRate', { valueAsNumber: true })} className="focus-visible:ring-vuna-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-vuna-dark">Loan Term (months)</Label>
                <Input type="number" {...register('loanTermMonths', { valueAsNumber: true })} className="focus-visible:ring-vuna-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Section 6 */}
          <Card id="tax" className="scroll-mt-36 rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-vuna-dark">6. Tax</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-xs">
                <Label className="text-vuna-dark">Tax Rate (%)</Label>
                <Input type="number" {...register('taxRate', { valueAsNumber: true })} className="focus-visible:ring-vuna-primary" />
                <p className="text-xs text-vuna-slate mt-1">
                  This is only a simplified estimate. Actual tax can depend on your country, business type, deductions, and tax rules.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <p className="text-amber-800 text-sm font-medium flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  Working capital note: This mode gives an estimate, but it does not fully calculate stock timing, customer credit, or supplier credit. If your business holds a lot of stock or sells on credit, keep extra cash available.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 7 */}
          <Card id="sales-pricing" className="scroll-mt-36 rounded-3xl border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-vuna-dark">7. Sales and Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-vuna-dark">Units sold in a normal week</Label>
                  <Input type="number" {...register('unitsPerWeek', { valueAsNumber: true })} className="focus-visible:ring-vuna-primary" />
                  <p className="text-xs leading-5 text-vuna-slate">
                    {ADVANCED_PURCHASE_CYCLE_BRIDGE_NOTE}
                  </p>
                </div>
                <NumberInput name="sellingPrice" label="Selling Price per Unit" watch={watch} setValue={setValue} errors={errors} currencyCode={currencyCode} />
              </div>

              <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
                <div>
                  <p className="text-sm font-semibold text-vuna-dark">Growth target for the next year</p>
                  <p className="mt-1 text-sm text-vuna-slate">This helps show how much profit may need to stay in the business instead of being taken home.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  {growthTargetOptions.map((option) => {
                    const selected = formValues.growthTargetPercent === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setValue('growthTargetPercent', option.value, { shouldDirty: true, shouldValidate: true })}
                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                          selected
                            ? 'border-vuna-primary bg-white text-vuna-dark shadow-sm'
                            : 'border-neutral-200 bg-white/70 text-vuna-slate hover:border-vuna-primary/40'
                        }`}
                      >
                        <p className="font-semibold">{option.label}</p>
                        <p className="mt-2 text-xs leading-5">{option.helper}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time helpers */}
              <div className="bg-neutral-100 p-4 rounded-xl space-y-2 text-sm">
                <p className="font-semibold text-vuna-dark">Suggested Price Ranges:</p>
                <ul className="space-y-1 text-vuna-slate">
                  <li>Minimum Price (Covers costs): {formatPlannerCurrency(currentUnitBaseCost * 1.2, currencyCode)}</li>
                  <li>Standard Price (Balanced profit and competitiveness): {formatPlannerCurrency(currentUnitBaseCost * 2.0, currencyCode)}</li>
                  <li>High Price (Higher margin, may reduce demand): {formatPlannerCurrency(currentUnitBaseCost * 3.0, currencyCode)}</li>
                </ul>
              </div>
              
              {formValues.sellingPrice > 0 && formValues.sellingPrice < currentUnitBaseCost && (
                <p className="text-red-600 font-medium text-sm">Selling price is below cost. This will result in losses.</p>
              )}
            </CardContent>
          </Card>
        </form>

        {/* Paywall / Results */}
        {!isAdvancedUnlocked ? (
          <div className="mt-12 text-center space-y-6 bg-vuna-primary/10 border-2 border-vuna-primary/20 p-8 rounded-3xl">
            <Lock className="w-12 h-12 text-vuna-primary mx-auto" />
            <h3 className="text-2xl font-bold text-vuna-dark">Show Advanced Analysis</h3>
            <p className="text-vuna-slate max-w-md mx-auto">
              Generate the full Advanced roadmap on this device. Cloud save and reload use your VunaBooks paid planner account when you are online.
            </p>
            <Button onClick={handleUnlockAdvancedPreview} size="lg" className="w-full max-w-md text-lg py-6 bg-vuna-primary hover:bg-vuna-primary/90 text-white rounded-xl">
              Show Advanced Analysis
            </Button>
          </div>
        ) : (
          <div className="mt-12">
            {results && <AdvancedResults results={results} state={formValues} currencyCode={currencyCode} />}
          </div>
        )}
      </div>
      <Suspense fallback={null}>
        <PlannerAuthDialog
          open={isAuthDialogOpen}
          onOpenChange={setIsAuthDialogOpen}
          initialScreen={authDialogScreen}
          intentLabel={pendingAuthAction === 'load_advanced' ? 'load your saved Advanced case' : 'save your Advanced case'}
          onAuthenticated={handleAuthenticated}
        />
      </Suspense>
    </div>
  );
}
