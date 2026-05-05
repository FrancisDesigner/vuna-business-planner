import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Download,
  FolderOpen,
  Loader2,
  Save,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import ExpertWaitlist from './ExpertWaitlist';
import CurrencySelector from './CurrencySelector';
import { formatPlannerCurrency, PlannerMarketContext, storePlannerCurrencyPreference } from '../lib/marketContext';
import {
  buildExpertCaseSnapshot,
  buildExpertPlanPayload,
  buildExpertValidationPayload,
  DEFAULT_EXPERT_FORM_STATE,
  getExpertVerdict,
  hydrateExpertFormFromStoredInputs,
  parseExpertNumber,
  restoreExpertFormState,
  type ExpertFormState,
  type ExpertStoredInputs,
  type ExpertStoredResults,
} from '../lib/expertPlanner';
import {
  buildExpertDashboardInsights,
  EXPERT_AFRICA_REGIONAL_BENCHMARKS,
  EXPERT_PRIVATE_BUSINESS_HURDLE_LABEL,
} from '../lib/expertInsights';
import { buildExpertCapitalStructureInsights } from '../lib/expertCapitalStructure';
import { generateExpertPDF, getExpertPDFFileName } from '../lib/expertPdf';
import {
  getExpertLoadActionState,
  getExpertPdfActionState,
  getExpertSaveActionState,
} from '../lib/expertActionStates';
import {
  getExpertReportSourceStatus,
  type ExpertReportSource,
} from '../lib/expertReportSource';
import {
  getPlannerAuthProfile,
  getPlannerPlan,
  hasPlannerAuthTokens,
  listPlannerPlans,
  requestPlannerPremiumPdf,
  savePlannerPlan,
  updatePlannerPlan,
  validateExpertPlannerCase,
  type ExpertValidationResult,
  type PlannerAuthProfile,
} from '../lib/plannerApi';
import { getPlannerCapabilityDecision, type PlannerAuthState } from '../lib/deployment';

const PlannerAuthDialog = lazy(() => import('./PlannerAuthDialog'));

interface Props {
  onBack: () => void;
  currencyCode: string;
  onCurrencyChange?: (currencyCode: string) => void;
  marketContext?: PlannerMarketContext | null;
}

type ExpertFeedback = {
  tone: 'success' | 'warning' | 'error';
  message: string;
} | null;

type ExpertDeferredAction = 'save_case' | 'load_case';
type PlannerAuthScreen = 'register' | 'login';

const EXPERT_DRAFT_STORAGE_KEY = 'vuna_expert_form';

function formatPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(2)}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }

  return `${value >= 0 ? '+' : '-'}${Math.abs(value * 100).toFixed(2)}%`;
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExpertMode({ onBack, currencyCode, onCurrencyChange, marketContext }: Props) {
  const [activeTab, setActiveTab] = useState<'validator' | 'waitlist'>('validator');
  const [form, setForm] = useState<ExpertFormState>(DEFAULT_EXPERT_FORM_STATE);
  const [result, setResult] = useState<ExpertValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ExpertFeedback>(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSavedCase, setIsLoadingSavedCase] = useState(false);
  const [authProfile, setAuthProfile] = useState<PlannerAuthProfile | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [lastValidatedSignature, setLastValidatedSignature] = useState<string | null>(null);
  const [lastGeneratedPdfSource, setLastGeneratedPdfSource] = useState<ExpertReportSource | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authDialogScreen, setAuthDialogScreen] = useState<PlannerAuthScreen>('register');
  const [pendingAuthAction, setPendingAuthAction] = useState<ExpertDeferredAction | null>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem(EXPERT_DRAFT_STORAGE_KEY);
    if (!savedDraft) {
      return;
    }

    try {
      setForm(restoreExpertFormState(JSON.parse(savedDraft)));
    } catch {
      localStorage.removeItem(EXPERT_DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(EXPERT_DRAFT_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

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

  const validationSignature = useMemo(
    () => JSON.stringify(buildExpertValidationPayload(form)),
    [form],
  );
  const resultIsStale = Boolean(result && lastValidatedSignature !== validationSignature);
  const verdict = useMemo(() => getExpertVerdict(resultIsStale ? null : result), [result, resultIsStale]);
  const dashboardInsights = useMemo(
    () => (result && !resultIsStale ? buildExpertDashboardInsights(form, result) : null),
    [form, result, resultIsStale],
  );
  const capitalStructureInsights = useMemo(() => {
    if (!result || resultIsStale || !form.useCapitalStructure) {
      return null;
    }

    return buildExpertCapitalStructureInsights({
      debtAmount: parseExpertNumber(form.debtAmount),
      equityAmount: parseExpertNumber(form.equityAmount),
      annualOperatingProfit: parseExpertNumber(form.annualOperatingProfitAfterTax),
      costOfDebtPercent: parseExpertNumber(form.costOfDebtPercent),
      costOfEquityPercent: parseExpertNumber(form.costOfEquityPercent),
    });
  }, [form, result, resultIsStale]);

  const updateField = (field: keyof ExpertFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
    setLastGeneratedPdfSource(null);
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

  const isBackendReachable = (): boolean => {
    if (typeof navigator === 'undefined') {
      return true;
    }

    return navigator.onLine;
  };

  const openAuthDialogForAction = (
    action: ExpertDeferredAction,
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

  const handleRunValidation = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const validated = await validateExpertPlannerCase(buildExpertValidationPayload(form));
      setResult(validated);
      setLastValidatedSignature(validationSignature);
      setFeedback({
        tone: 'success',
        message: 'Python validated this Expert case successfully. You can now save it or export a snapshot.',
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to validate this expert case.');
      setResult(null);
      setLastValidatedSignature(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCase = async (profileOverride?: PlannerAuthProfile | null) => {
    if (!result || resultIsStale) {
      setFeedback({
        tone: 'warning',
        message: 'Run Expert validation again before saving so the backend result matches the current assumptions.',
      });
      return;
    }

    if (!isBackendReachable()) {
      setFeedback({
        tone: 'warning',
        message: 'Go online to save Expert cases to your VunaBooks account.',
      });
      return;
    }

    const latestProfile = await getLatestAuthProfile(profileOverride);
    const authState = getPlannerAuthState(latestProfile);

    if (authState === 'anonymous') {
      openAuthDialogForAction('save_case');
      return;
    }

    const decision = getPlannerCapabilityDecision('expert_mode', authState, true);
    if (!decision.allowed) {
      setFeedback({
        tone: 'warning',
        message: authState === 'signed_in_free'
          ? 'Expert case saving is part of the paid planner tier. Sign in with a paid VunaBooks account to keep backend-validated cases.'
          : (decision.message || 'Expert case saving is not available right now.'),
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildExpertPlanPayload(form, result, currencyCode);
      const saved = savedPlanId
        ? await updatePlannerPlan<ExpertStoredInputs, ExpertStoredResults>(savedPlanId, payload)
        : await savePlannerPlan<ExpertStoredInputs, ExpertStoredResults>(payload);

      setSavedPlanId(saved.id);
      setFeedback({
        tone: 'success',
        message: `Saved "${saved.name}" to your VunaBooks account.`,
      });
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'We could not save this Expert case right now.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadLatestSavedCase = async (profileOverride?: PlannerAuthProfile | null) => {
    if (!isBackendReachable()) {
      setFeedback({
        tone: 'warning',
        message: 'Go online to load saved Expert cases.',
      });
      return;
    }

    const latestProfile = await getLatestAuthProfile(profileOverride);
    const authState = getPlannerAuthState(latestProfile);

    if (authState === 'anonymous') {
      openAuthDialogForAction('load_case', 'login');
      return;
    }

    const decision = getPlannerCapabilityDecision('expert_mode', authState, true);
    if (!decision.allowed) {
      setFeedback({
        tone: 'warning',
        message: authState === 'signed_in_free'
          ? 'Saved Expert cases are available on the paid planner tier.'
          : (decision.message || 'Expert case loading is not available right now.'),
      });
      return;
    }

    setIsLoadingSavedCase(true);

    try {
      const plans = await listPlannerPlans({ mode: 'expert', limit: 1 });
      if (plans.length === 0) {
        setFeedback({
          tone: 'warning',
          message: 'No saved Expert cases were found on this account yet.',
        });
        return;
      }

      const latestPlan = await getPlannerPlan<ExpertStoredInputs, ExpertStoredResults>(plans[0].id);
      const hydratedForm = hydrateExpertFormFromStoredInputs(latestPlan.inputs);

      setForm(hydratedForm);
      setResult(latestPlan.results);
      setSavedPlanId(latestPlan.id);
      setLastValidatedSignature(JSON.stringify(buildExpertValidationPayload(hydratedForm)));
      setError(null);
      setFeedback({
        tone: 'success',
        message: `Loaded "${latestPlan.name}" from your VunaBooks account.`,
      });
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'We could not load your saved Expert case right now.',
      });
    } finally {
      setIsLoadingSavedCase(false);
    }
  };

  const handleExportSnapshot = () => {
    const snapshot = buildExpertCaseSnapshot(form, resultIsStale ? null : result, currencyCode);
    const safeName = (form.caseName.trim() || 'expert_case').replace(/[^a-z0-9_-]+/gi, '_');

    downloadJsonFile(`${safeName}_expert_case.json`, snapshot);
    setFeedback({
      tone: resultIsStale
        ? 'warning'
        : 'success',
      message: resultIsStale
        ? 'Exported the current Expert assumptions. The validated result was left out because the inputs changed after the last Python run.'
        : 'Exported a full Expert case snapshot with inputs and the latest backend-validated result.',
    });
  };

  const handleGenerateExpertPdf = async () => {
    if (!result || resultIsStale || !dashboardInsights) {
      setFeedback({
        tone: 'warning',
        message: 'Run Expert validation again before generating the report so the PDF matches the current assumptions.',
      });
      return;
    }

    setIsGeneratingPdf(true);
    setFeedback(null);

    try {
      const authState = getPlannerAuthState();
      const fileName = getExpertPDFFileName(form.caseName || 'Expert_Case');

      if (isBackendReachable() && authState === 'signed_in_paid') {
        const pdfBlob = await requestPlannerPremiumPdf(
          buildExpertPlanPayload(form, result, currencyCode),
        );
        downloadBlobFile(pdfBlob, fileName);
        setLastGeneratedPdfSource('backend_authoritative');
        setFeedback({
          tone: 'success',
          message: 'Your backend-authoritative Expert PDF was generated and downloaded from Railway.',
        });
      } else {
        generateExpertPDF({
          form,
          result,
          currencyCode,
          dashboardInsights,
          capitalStructureInsights,
        });
        setLastGeneratedPdfSource('local_fallback');
        setFeedback({
          tone: 'success',
          message: authState === 'signed_in_paid'
            ? 'Your Expert PDF was generated locally because the backend is offline right now.'
            : 'Your Expert PDF was generated locally. Sign in with a paid planner account when online for the backend-authoritative version.',
        });
      }
    } catch (caught) {
      setFeedback({
        tone: 'error',
        message: caught instanceof Error ? caught.message : 'We could not generate the Expert PDF right now.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleAuthenticated = async (profile: PlannerAuthProfile) => {
    setAuthProfile(profile);
    setIsAuthDialogOpen(false);

    const actionToResume = pendingAuthAction;
    setPendingAuthAction(null);

    if (actionToResume === 'save_case') {
      await handleSaveCase(profile);
      return;
    }

    if (actionToResume === 'load_case') {
      await handleLoadLatestSavedCase(profile);
    }
  };

  const feedbackToneStyles = feedback?.tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : feedback?.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-green-200 bg-green-50 text-green-800';
  const currentAuthState = getPlannerAuthState();
  const backendReachable = isBackendReachable();
  const hasFreshValidatedResult = Boolean(result && !resultIsStale);
  const saveActionState = getExpertSaveActionState({
    authState: currentAuthState,
    isOnline: backendReachable,
    hasFreshValidatedResult,
  });
  const loadActionState = getExpertLoadActionState({
    authState: currentAuthState,
    isOnline: backendReachable,
  });
  const pdfActionState = getExpertPdfActionState({
    authState: currentAuthState,
    isOnline: backendReachable,
    hasFreshValidatedResult,
  });
  const reportSourceStatus = getExpertReportSourceStatus({
    authState: currentAuthState,
    isOnline: backendReachable,
    hasFreshValidatedResult,
    lastGeneratedSource: lastGeneratedPdfSource,
  });

  const handleCurrencyChange = (nextCurrencyCode: string) => {
    storePlannerCurrencyPreference(nextCurrencyCode);
    onCurrencyChange?.(nextCurrencyCode);
  };

  return (
    <div className="min-h-screen bg-vuna-bg py-10 px-4">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Button onClick={onBack} variant="ghost" className="-ml-4 text-vuna-slate hover:text-vuna-dark hover:bg-neutral-200/50">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <CurrencySelector
            value={currencyCode}
            onChange={handleCurrencyChange}
            label="Currency"
            className="border border-neutral-200 px-2 py-1"
          />
        </div>

        <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vuna-primary">Expert Mode</p>
              <h1 className="text-3xl font-black text-vuna-dark md:text-5xl">Backend-validated investment analysis for serious business decisions.</h1>
              <p className="text-base leading-8 text-vuna-slate md:text-lg">
                Expert Mode now lets you validate, save, reload, and export serious investment cases while keeping Python as the finance authority behind NPV, IRR, WACC, terminal value, and return spread.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={() => void handleSaveCase()}
                  disabled={loading || isSaving || saveActionState.disabled}
                  className="w-full rounded-xl bg-vuna-dark text-white hover:bg-vuna-dark/90"
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saveActionState.buttonLabel}
                </Button>
                <p className="text-sm leading-6 text-vuna-slate">{saveActionState.helperMessage}</p>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleLoadLatestSavedCase()}
                  disabled={isLoadingSavedCase || loadActionState.disabled}
                  className="w-full rounded-xl border-neutral-300 text-vuna-slate hover:bg-neutral-50"
                >
                  {isLoadingSavedCase ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                  {loadActionState.buttonLabel}
                </Button>
                <p className="text-sm leading-6 text-vuna-slate">{loadActionState.helperMessage}</p>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleGenerateExpertPdf()}
                  disabled={loading || isGeneratingPdf || pdfActionState.disabled}
                  className="w-full rounded-xl border-neutral-300 text-vuna-slate hover:bg-neutral-50"
                >
                  {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  {pdfActionState.buttonLabel}
                </Button>
                <p className="text-sm leading-6 text-vuna-slate">{pdfActionState.helperMessage}</p>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportSnapshot}
                  className="w-full rounded-xl border-neutral-300 text-vuna-slate hover:bg-neutral-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Snapshot
                </Button>
                <p className="text-sm leading-6 text-vuna-slate">
                  Export the current assumptions now. Fresh validated results are only included when the case is not stale.
                </p>
              </div>
            </div>
          </div>
        </div>

        {feedback && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${feedbackToneStyles}`}>
            {feedback.message}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'validator' | 'waitlist')} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white p-1 shadow-sm">
            <TabsTrigger value="validator" className="rounded-xl">Expert Validator</TabsTrigger>
            <TabsTrigger value="waitlist" className="rounded-xl">Rollout Waitlist</TabsTrigger>
          </TabsList>

          <TabsContent value="validator" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="rounded-3xl border-neutral-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-vuna-dark">Investment Validation</CardTitle>
                  <CardDescription className="text-vuna-slate">
                    Build a 5-year investment case, then let the backend Python engine return the trusted Expert outputs before you save or export them.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRunValidation} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-vuna-dark">Case or business name</Label>
                        <Input value={form.caseName} onChange={(event) => updateField('caseName', event.target.value)} className="focus-visible:ring-vuna-primary" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-vuna-dark">Industry</Label>
                        <Input value={form.industry} onChange={(event) => updateField('industry', event.target.value)} className="focus-visible:ring-vuna-primary" placeholder="Manufacturing, agriculture, retail, services..." />
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-vuna-dark">Annual revenue (optional)</Label>
                        <Input value={form.annualRevenue} onChange={(event) => updateField('annualRevenue', event.target.value)} className="focus-visible:ring-vuna-primary" placeholder="Use this to compare DCF against rough market multiples." />
                      </div>
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-6 text-vuna-slate">
                        Enter annual revenue only if you want the Expert dashboard to show a rough market-value range beside the DCF value.
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-vuna-dark">Initial investment</Label>
                        <Input value={form.initialInvestment} onChange={(event) => updateField('initialInvestment', event.target.value)} className="focus-visible:ring-vuna-primary" />
                      </div>
                      {!form.useCapitalStructure && (
                        <div className="space-y-2">
                          <Label className="text-vuna-dark">Discount rate (%)</Label>
                          <Input value={form.discountRatePercent} onChange={(event) => updateField('discountRatePercent', event.target.value)} className="focus-visible:ring-vuna-primary" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-vuna-dark">Annual cash flows</Label>
                      <div className="grid gap-4 md:grid-cols-5">
                        {(['year1', 'year2', 'year3', 'year4', 'year5'] as const).map((yearKey, index) => (
                          <div key={yearKey} className="space-y-2">
                            <Label className="text-xs uppercase tracking-[0.18em] text-vuna-slate">Year {index + 1}</Label>
                            <Input value={form[yearKey]} onChange={(event) => updateField(yearKey, event.target.value)} className="focus-visible:ring-vuna-primary" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={form.useCapitalStructure}
                          onChange={(event) => updateField('useCapitalStructure', event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-neutral-300 text-vuna-primary focus:ring-vuna-primary"
                        />
                        <span className="space-y-1">
                          <span className="block font-semibold text-vuna-dark">Build hurdle rate from capital structure</span>
                          <span className="block text-sm leading-6 text-vuna-slate">
                            Use debt and equity funding inputs so the backend computes WACC and compares it to the business return spread.
                          </span>
                        </span>
                      </label>

                      {form.useCapitalStructure && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-vuna-dark">Debt amount</Label>
                            <Input value={form.debtAmount} onChange={(event) => updateField('debtAmount', event.target.value)} className="focus-visible:ring-vuna-primary" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-vuna-dark">Equity amount</Label>
                            <Input value={form.equityAmount} onChange={(event) => updateField('equityAmount', event.target.value)} className="focus-visible:ring-vuna-primary" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-vuna-dark">Cost of debt (%)</Label>
                            <Input value={form.costOfDebtPercent} onChange={(event) => updateField('costOfDebtPercent', event.target.value)} className="focus-visible:ring-vuna-primary" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-vuna-dark">Cost of equity (%)</Label>
                            <Input value={form.costOfEquityPercent} onChange={(event) => updateField('costOfEquityPercent', event.target.value)} className="focus-visible:ring-vuna-primary" />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-vuna-dark">Annual operating profit after tax</Label>
                            <Input value={form.annualOperatingProfitAfterTax} onChange={(event) => updateField('annualOperatingProfitAfterTax', event.target.value)} className="focus-visible:ring-vuna-primary" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={form.useTerminalValue}
                          onChange={(event) => updateField('useTerminalValue', event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-neutral-300 text-vuna-primary focus:ring-vuna-primary"
                        />
                        <span className="space-y-1">
                          <span className="block font-semibold text-vuna-dark">Include terminal value</span>
                          <span className="block text-sm leading-6 text-vuna-slate">
                            Use this when the business should still have meaningful value after year 5. The backend will calculate terminal value from the final-year cash flow and long-term growth rate.
                          </span>
                        </span>
                      </label>
                      {form.useTerminalValue && (
                        <div className="mt-4 max-w-xs space-y-2">
                          <Label className="text-vuna-dark">Long-term growth rate (%)</Label>
                          <Input value={form.longTermGrowthRatePercent} onChange={(event) => updateField('longTermGrowthRatePercent', event.target.value)} className="focus-visible:ring-vuna-primary" />
                        </div>
                      )}
                    </div>

                    {resultIsStale && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Inputs changed after the last Python run. Validate again before saving or trusting the current result.
                      </div>
                    )}

                    {error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full rounded-xl bg-vuna-dark py-6 text-lg text-white hover:bg-vuna-dark/90">
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running backend validation...</> : 'Run Expert Validation'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-3xl border-neutral-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-vuna-dark">Expert Case Status</CardTitle>
                    <CardDescription className="text-vuna-slate">
                      This summary follows the latest backend-validated result, not just the browser state.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-sm text-vuna-slate">Case</p>
                      <p className="mt-1 text-lg font-bold text-vuna-dark">{form.caseName || DEFAULT_EXPERT_FORM_STATE.caseName}</p>
                      <p className="mt-2 text-sm text-vuna-slate">{form.industry || DEFAULT_EXPERT_FORM_STATE.industry}</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-sm text-vuna-slate">Current verdict</p>
                      <p className="mt-1 text-lg font-bold text-vuna-dark">{verdict.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-vuna-slate">{verdict.summary}</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-vuna-slate">
                      {savedPlanId
                        ? 'This case is linked to a saved Expert record in your VunaBooks account.'
                        : 'This case is still a local draft until you save it to your account.'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-neutral-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-vuna-dark">Report Source</CardTitle>
                    <CardDescription className="text-vuna-slate">
                      Expert reports can come from the browser or from Railway. This shows which path is active for the current case.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`rounded-2xl border p-4 ${
                      reportSourceStatus.recommendedSource === 'backend_authoritative'
                        ? 'border-green-200 bg-green-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}>
                      <p className="text-sm text-vuna-slate">Ready now</p>
                      <p className="mt-1 text-lg font-bold text-vuna-dark">{reportSourceStatus.readinessLabel}</p>
                      <p className="mt-2 text-sm leading-6 text-vuna-slate">{reportSourceStatus.readinessMessage}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-sm text-vuna-slate">Preferred source</p>
                        <p className="mt-1 text-lg font-bold text-vuna-dark">{reportSourceStatus.recommendedSourceLabel}</p>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-sm text-vuna-slate">Last generated</p>
                        <p className="mt-1 text-lg font-bold text-vuna-dark">{reportSourceStatus.lastGeneratedLabel}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm leading-6 text-vuna-slate">
                      {reportSourceStatus.helperMessage}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-neutral-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-vuna-dark">What Python Is Checking</CardTitle>
                    <CardDescription className="text-vuna-slate">
                      This reduces drift between what the browser previews and what the backend will later save, validate, or export.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm leading-7 text-vuna-slate">
                    <p><span className="font-semibold text-vuna-dark">Now:</span> NPV, IRR, discount-rate handling, terminal value, WACC, ROIC, return spread, saved Expert cases, and exportable case snapshots.</p>
                    <p><span className="font-semibold text-vuna-dark">Now also:</span> parity-tested Expert math and backend-authoritative PDF delivery for paid online users.</p>
                    <p><span className="font-semibold text-vuna-dark">Next:</span> final premium-flow hardening and broader end-to-end product verification.</p>
                    <p><span className="font-semibold text-vuna-dark">Why this matters:</span> Simple and Advanced stay cheap and fast in the browser, while Expert gets a backend authority layer before premium outputs are trusted.</p>
                  </CardContent>
                </Card>

                {result && (
                  <Card className={`rounded-3xl shadow-sm ${resultIsStale ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-vuna-dark">
                        <CheckCircle2 className={`h-5 w-5 ${resultIsStale ? 'text-amber-600' : 'text-vuna-primary'}`} />
                        {resultIsStale ? 'Validated Result Needs Refresh' : 'Validated Expert Result'}
                      </CardTitle>
                      <CardDescription className="text-vuna-slate">
                        {resultIsStale ? 'These numbers are from the previous validation run.' : 'Returned by the backend Python validation engine.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/70 bg-white p-4">
                          <p className="text-sm text-vuna-slate">NPV</p>
                          <p className={`mt-2 text-2xl font-black ${((result.npv ?? 0) >= 0) ? 'text-vuna-primary' : 'text-red-600'}`}>
                            {result.npv === null ? 'N/A' : formatPlannerCurrency(result.npv, currencyCode)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4">
                          <p className="text-sm text-vuna-slate">IRR</p>
                          <p className="mt-2 text-2xl font-black text-vuna-dark">{formatPercent(result.irr)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4">
                          <p className="text-sm text-vuna-slate">Discount rate</p>
                          <p className="mt-2 text-2xl font-black text-vuna-dark">
                            {result.discount_rate_percent === null ? 'N/A' : `${result.discount_rate_percent.toFixed(2)}%`}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4">
                          <p className="text-sm text-vuna-slate">Terminal value</p>
                          <p className="mt-2 text-2xl font-black text-vuna-dark">{formatPlannerCurrency(result.terminal_value ?? 0, currencyCode)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4">
                          <p className="text-sm text-vuna-slate">WACC</p>
                          <p className="mt-2 text-2xl font-black text-vuna-dark">{formatPercent(result.wacc)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4">
                          <p className="text-sm text-vuna-slate">ROIC</p>
                          <p className="mt-2 text-2xl font-black text-vuna-dark">{formatPercent(result.roic)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4">
                          <p className="text-sm text-vuna-slate">Return spread</p>
                          <p className={`mt-2 text-2xl font-black ${(result.return_spread ?? 0) >= 0 ? 'text-vuna-primary' : 'text-red-600'}`}>
                            {formatPercent(result.return_spread)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4">
                          <p className="text-sm text-vuna-slate">Invested capital</p>
                          <p className="mt-2 text-2xl font-black text-vuna-dark">{formatPlannerCurrency(result.invested_capital ?? 0, currencyCode)}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white p-4 text-sm leading-7 text-vuna-slate">
                        Engine: <span className="font-semibold text-vuna-dark">{result.engine}</span>
                        {result.npv !== null && (
                          <>
                            {' '}• Verdict:{' '}
                            <span className={`font-semibold ${result.npv >= 0 ? 'text-vuna-primary' : 'text-red-600'}`}>
                              {result.npv >= 0 ? 'This investment appears value-creating at the chosen hurdle rate.' : 'This investment does not yet clear the chosen hurdle rate.'}
                            </span>
                          </>
                        )}
                        {result.return_spread !== null && (
                          <>
                            {' '}• Spread:{' '}
                            <span className={`font-semibold ${result.return_spread >= 0 ? 'text-vuna-primary' : 'text-red-600'}`}>
                              {result.return_spread >= 0 ? 'The business is earning above its cost of capital.' : 'The business is earning below its cost of capital.'}
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {dashboardInsights && (
                  <>
                    <Card className="rounded-3xl border-neutral-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-vuna-dark">Decision Dashboard</CardTitle>
                        <CardDescription className="text-vuna-slate">
                          This is the Expert readout the spec calls for: headline spread, hurdle context, valuation view, and regional comparison.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className={`rounded-3xl border p-5 ${
                          dashboardInsights.headlineTone === 'positive'
                            ? 'border-green-200 bg-green-50'
                            : dashboardInsights.headlineTone === 'negative'
                              ? 'border-red-200 bg-red-50'
                              : 'border-neutral-200 bg-neutral-50'
                        }`}>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">{dashboardInsights.headlineLabel}</p>
                          <p className={`mt-2 text-4xl font-black ${
                            dashboardInsights.headlineTone === 'positive'
                              ? 'text-vuna-primary'
                              : dashboardInsights.headlineTone === 'negative'
                                ? 'text-red-600'
                                : 'text-vuna-dark'
                          }`}>
                            {formatSignedPercent(dashboardInsights.headlineValue)}
                          </p>
                          <p className="mt-3 text-sm leading-7 text-vuna-slate">{dashboardInsights.headlineMessage}</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <p className="text-sm text-vuna-slate">{EXPERT_PRIVATE_BUSINESS_HURDLE_LABEL}</p>
                            <p className="mt-2 text-2xl font-black text-vuna-dark">{formatPercent(dashboardInsights.hurdleBaselineRate)}</p>
                            <p className="mt-3 text-sm leading-7 text-vuna-slate">{dashboardInsights.hurdleMessage}</p>
                          </div>
                          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <p className="text-sm text-vuna-slate">Regional context</p>
                            <p className="mt-2 text-2xl font-black text-vuna-dark">
                              {Math.round(EXPERT_AFRICA_REGIONAL_BENCHMARKS.positiveSpreadShare * 100)}%
                            </p>
                            <p className="mt-3 text-sm leading-7 text-vuna-slate">{dashboardInsights.regionalContextMessage}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-neutral-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-vuna-dark">Valuation View</CardTitle>
                        <CardDescription className="text-vuna-slate">
                          DCF is treated as the serious value estimate. Revenue multiple is shown only as a rough market check when revenue is available.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <p className="text-sm text-vuna-slate">DCF intrinsic value</p>
                            <p className="mt-2 text-2xl font-black text-vuna-dark">
                              {dashboardInsights.dcfIntrinsicValue === null ? 'N/A' : formatPlannerCurrency(dashboardInsights.dcfIntrinsicValue, currencyCode)}
                            </p>
                            <p className="mt-3 text-sm leading-7 text-vuna-slate">{dashboardInsights.dcfMessage}</p>
                          </div>

                          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <p className="text-sm text-vuna-slate">Revenue multiple range</p>
                            <p className="mt-2 text-2xl font-black text-vuna-dark">
                              {dashboardInsights.revenueMultipleRange
                                ? `${formatPlannerCurrency(dashboardInsights.revenueMultipleRange.low, currencyCode)} - ${formatPlannerCurrency(dashboardInsights.revenueMultipleRange.high, currencyCode)}`
                                : 'Add annual revenue'}
                            </p>
                            <p className="mt-3 text-sm leading-7 text-vuna-slate">
                              {dashboardInsights.revenueMultipleMessage || 'Revenue multiples are rough market references. They are less reliable than DCF but useful for negotiation framing.'}
                            </p>
                          </div>
                        </div>

                        {(dashboardInsights.valuationBridgeMessage || dashboardInsights.terminalDependencyMessage) && (
                          <div className="grid gap-4 md:grid-cols-2">
                            {dashboardInsights.valuationBridgeMessage && (
                              <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm leading-7 text-vuna-slate">
                                {dashboardInsights.valuationBridgeMessage}
                              </div>
                            )}
                            {dashboardInsights.terminalDependencyMessage && (
                              <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm leading-7 text-vuna-slate">
                                {dashboardInsights.terminalDependencyMessage}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-neutral-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-vuna-dark">Assumptions and Benchmarks</CardTitle>
                        <CardDescription className="text-vuna-slate">
                          Finance output is only as good as the assumptions underneath it. This panel makes those assumptions visible.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="overflow-hidden rounded-2xl border border-neutral-200">
                          <table className="w-full text-sm">
                            <thead className="bg-neutral-50 text-left text-vuna-slate">
                              <tr>
                                <th className="px-4 py-3 font-semibold">Metric</th>
                                <th className="px-4 py-3 font-semibold">This Case</th>
                                <th className="px-4 py-3 font-semibold">Africa & Middle East Avg</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dashboardInsights.benchmarkRows.map((row) => (
                                <tr key={row.metric} className="border-t border-neutral-200">
                                  <td className="px-4 py-3 font-medium text-vuna-dark">{row.metric}</td>
                                  <td className="px-4 py-3 text-vuna-dark">{formatPercent(row.thisBusiness)}</td>
                                  <td className="px-4 py-3 text-vuna-slate">{formatPercent(row.regionalAverage)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="grid gap-3">
                          {dashboardInsights.assumptions.map((assumption) => (
                            <div key={assumption.label} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-semibold text-vuna-dark">{assumption.label}</p>
                                <p className="text-sm font-semibold text-vuna-primary">{assumption.value}</p>
                              </div>
                              {assumption.helper && (
                                <p className="mt-2 text-sm leading-6 text-vuna-slate">{assumption.helper}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {dashboardInsights.capitalMixMessage && (
                          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm leading-7 text-vuna-slate">
                            {dashboardInsights.capitalMixMessage}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {capitalStructureInsights && (
                      <Card className="rounded-3xl border-neutral-200 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-vuna-dark">Capital Structure Module</CardTitle>
                          <CardDescription className="text-vuna-slate">
                            This shows how financing mix changes WACC, what your current coverage implies, and whether the business has room to borrow more safely.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className={`rounded-2xl border p-5 ${
                            capitalStructureInsights.verdictStatus === 'room_to_borrow'
                              ? 'border-green-200 bg-green-50'
                              : capitalStructureInsights.verdictStatus === 'too_much_debt'
                                ? 'border-red-200 bg-red-50'
                                : 'border-amber-200 bg-amber-50'
                          }`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vuna-slate">Debt Capacity Verdict</p>
                            <p className="mt-2 text-lg font-black text-vuna-dark">{capitalStructureInsights.verdictMessage}</p>
                            <p className="mt-3 text-sm leading-7 text-vuna-slate">{capitalStructureInsights.counterintuitiveLesson}</p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <p className="text-sm text-vuna-slate">Current debt share</p>
                              <p className="mt-2 text-2xl font-black text-vuna-dark">{(capitalStructureInsights.currentDebtShare * 100).toFixed(0)}%</p>
                            </div>
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <p className="text-sm text-vuna-slate">Coverage ratio</p>
                              <p className="mt-2 text-2xl font-black text-vuna-dark">
                                {capitalStructureInsights.currentCoverageRatio === null ? 'N/A' : `${capitalStructureInsights.currentCoverageRatio.toFixed(2)}x`}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <p className="text-sm text-vuna-slate">Synthetic rating</p>
                              <p className="mt-2 text-2xl font-black text-vuna-dark">{capitalStructureInsights.currentRating}</p>
                            </div>
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                              <p className="text-sm text-vuna-slate">Lowest WACC zone</p>
                              <p className="mt-2 text-2xl font-black text-vuna-dark">{(capitalStructureInsights.optimalDebtShare * 100).toFixed(0)}%</p>
                              <p className="mt-2 text-sm text-vuna-slate">
                                {capitalStructureInsights.optimalWacc === null ? 'N/A' : `${(capitalStructureInsights.optimalWacc * 100).toFixed(2)}% WACC`}
                              </p>
                            </div>
                          </div>

                          <div className="h-[320px] w-full rounded-2xl border border-neutral-200 bg-white p-3">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={capitalStructureInsights.curve.map((point) => ({
                                  ...point,
                                  debtShareLabel: `${Math.round(point.debtShare * 100)}%`,
                                  waccPercent: point.wacc !== null ? point.wacc * 100 : null,
                                  debtCostPercentValue: point.debtCostPercent,
                                }))}
                                margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" opacity={0.45} />
                                <XAxis dataKey="debtShareLabel" label={{ value: 'Debt share of total capital', position: 'insideBottom', offset: -10 }} />
                                <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} />
                                <Tooltip
                                  formatter={(value: number, name: string) => [
                                    `${value.toFixed(2)}%`,
                                    name === 'waccPercent' ? 'WACC' : 'Debt cost',
                                  ]}
                                  labelFormatter={(label) => `Debt share: ${label}`}
                                />
                                <Line type="monotone" dataKey="waccPercent" name="WACC" stroke="#1A7A3C" strokeWidth={3} dot />
                                <Line type="monotone" dataKey="debtCostPercentValue" name="Debt cost" stroke="#0D1B2A" strokeWidth={2} dot={false} strokeDasharray="6 4" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-7 text-vuna-slate">
                              Your current blended WACC is {capitalStructureInsights.currentWacc === null ? 'N/A' : `${(capitalStructureInsights.currentWacc * 100).toFixed(2)}%`}. The curve above shows how it can fall or rise as debt becomes a larger share of total capital.
                            </div>
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-7 text-vuna-slate">
                              This module uses a synthetic rating equivalent from coverage behavior, so it should be read as debt-capacity guidance, not a bank credit approval.
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="waitlist">
            <ExpertWaitlist onBack={() => setActiveTab('validator')} currencyCode={currencyCode} marketContext={marketContext} />
          </TabsContent>
        </Tabs>
      </div>

      <Suspense fallback={null}>
        <PlannerAuthDialog
          open={isAuthDialogOpen}
          onOpenChange={setIsAuthDialogOpen}
          initialScreen={authDialogScreen}
          intentLabel={pendingAuthAction === 'save_case' ? 'save your Expert case' : 'load your Expert case'}
          onAuthenticated={handleAuthenticated}
        />
      </Suspense>
    </div>
  );
}
