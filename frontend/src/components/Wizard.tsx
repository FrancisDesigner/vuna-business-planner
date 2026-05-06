import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WizardState, CalculationResult, LessonCard, BusinessType } from '../types';
import { BUSINESS_TYPE_CONFIG } from '../lib/config';
import { DEFAULT_PLANNER_CURRENCY_CODE, PlannerMarketContext, formatPlannerCurrency, getPreferredPlannerCurrencyCode, storePlannerCurrencyPreference } from '../lib/marketContext';
import Step1Entry from './Step1Entry';
import Step2Buckets from './Step2Buckets';
import Step3Strategy from './Step3Strategy';
import Step4Vision, { type ActionGateState } from './Step4Vision';
import LessonModal from './LessonModal';
import CurrencySelector from './CurrencySelector';
import { generatePDF, generatePDFBlob, getPDFFileName } from '../lib/pdfGenerator';
import { calculateRoadmap } from '../lib/calculator';
import {
  getPlannerCapabilityDecision,
  type PlannerAuthState,
  type PlannerCapability,
  PLANNER_PREMIUM_TESTING_BYPASS,
} from '../lib/deployment';
import {
  getPlannerAuthProfile,
  getPlannerPlan,
  hasPlannerAuthTokens,
  listPlannerPlans,
  requestPlannerPremiumPdf,
  savePlannerPlan,
  updatePlannerPlan,
  type PlannerPlanPayload,
  type PlannerAuthProfile,
} from '../lib/plannerApi';

type ShareFeedback = {
  tone: 'success' | 'warning' | 'error';
  message: string;
} | null;

const PLANNER_SHARE_URL = 'https://plan.vunabooks.com';

type PlannerDeferredAction = 'save_plan' | 'download_pdf' | 'share_pdf';
type PlannerAuthScreen = 'register' | 'login';

interface Props {
  marketContext?: PlannerMarketContext | null;
  currencyCode?: string;
  onCurrencyChange?: (currencyCode: string) => void;
}

const PlannerAuthDialog = lazy(() => import('./PlannerAuthDialog'));

const initialState: WizardState = {
  currentStep: 1,
  completedSteps: [],
  isExpertMode: false,
  currencyCode: getPreferredPlannerCurrencyCode(),
  marketCountryName: '',
  step1_entry: {
    businessStatus: 'new',
    activityDescription: '',
    category: null,
    location: '',
    salesPerWeek: 0,
    landUnit: 'acre',
    landStatus: 'owned',
    landArea: 1,
    landRentPerUnit: 0,
    seasonCycle: 1,
    yieldUnit: 'kg',
    businessPurpose: 'cover_family_needs',
    customerPaymentTiming: 'immediate',
    growthAmbitionPercent: 0,
  },
  step2_buckets: {
    seedCosts: [],
    foundationCosts: [],
    fuelCosts: [],
    protectionCosts: [],
    stockRefillFrequency: 'weekly',
    purchasesPerWeek: 5,
    sellingDaysPerWeek: 6,
    costPerPurchase: 0,
    bulkPurchaseCost: 0,
    bulkLifespanMonths: 1,
    purchaseEventsPerMonth: 1,
    averagePurchaseAmount: 0,
    batchYield: 1,
    items: [
      {
        id: 'item-1',
        name: '',
        buyingPrice: 0,
        sellingPrice: 0,
        unitsPerWeek: 0,
      },
    ],
  },
  step3_strategy: {
    selectedPrice: 0,
    expectedYield: 0,
    expectedPrice: 0,
    byProductRevenue: 0,
  },
  step4_vision: {
    pdfGenerated: false,
  },
};

export default function Wizard({ marketContext, currencyCode, onCurrencyChange }: Props) {
  const [state, setState] = useState<WizardState>(initialState);
  const [businessType, setBusinessType] = useState<BusinessType>('manufacturing');
  const [activeLesson, setActiveLesson] = useState<LessonCard | null>(null);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback>(null);
  const [authProfile, setAuthProfile] = useState<PlannerAuthProfile | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [isLoadingSavedPlan, setIsLoadingSavedPlan] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authDialogScreen, setAuthDialogScreen] = useState<PlannerAuthScreen>('register');
  const [pendingAuthAction, setPendingAuthAction] = useState<PlannerDeferredAction | null>(null);

  const currentConfig = BUSINESS_TYPE_CONFIG[businessType];

  useEffect(() => {
    if (!marketContext) return;

    setState((prev) => ({
      ...prev,
      currencyCode: currencyCode || (prev.currencyCode === DEFAULT_PLANNER_CURRENCY_CODE ? marketContext.currencyCode : prev.currencyCode),
      marketCountryName: prev.marketCountryName || marketContext.countryName,
      step1_entry: {
        ...prev.step1_entry,
        location: prev.step1_entry.location || marketContext.countryName,
      },
    }));
  }, [marketContext, currencyCode]);

  useEffect(() => {
    if (!currencyCode) return;
    setState((prev) => ({
      ...prev,
      currencyCode,
    }));
  }, [currencyCode]);

  const handleCurrencyChange = (nextCurrencyCode: string) => {
    storePlannerCurrencyPreference(nextCurrencyCode);
    setState((prev) => ({
      ...prev,
      currencyCode: nextCurrencyCode,
    }));
    onCurrencyChange?.(nextCurrencyCode);
  };

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

  const results = useMemo<CalculationResult>(() => {
    return calculateRoadmap(state, businessType);
  }, [state, businessType]);

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

  const handleNext = () => {
    if (state.currentStep < 4) {
      const nextStep = state.currentStep + 1;
      setState(prev => ({
        ...prev,
        currentStep: nextStep as 1 | 2 | 3 | 4,
        completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
      }));
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      const prevStep = state.currentStep - 1;
      setState(prev => ({ ...prev, currentStep: prevStep as 1 | 2 | 3 | 4 }));
    }
  };

  const getActionIntentLabel = (action: PlannerDeferredAction): string => {
    switch (action) {
      case 'save_plan':
        return 'save your business plan';
      case 'download_pdf':
        return 'download your PDF report';
      case 'share_pdf':
        return 'share your PDF report';
      default:
        return 'continue';
    }
  };

  const openAuthDialogForAction = (
    action: PlannerDeferredAction,
    screen: PlannerAuthScreen = 'register',
  ) => {
    setPendingAuthAction(action);
    setAuthDialogScreen(screen);
    setShareFeedback(null);
    setIsAuthDialogOpen(true);
  };

  const closeAuthDialog = (open: boolean) => {
    setIsAuthDialogOpen(open);
    if (!open) {
      setPendingAuthAction(null);
    }
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

  const buildActionGateState = (): ActionGateState => {
    const authState = getPlannerAuthState();
    const backendReachable = isBackendReachable();
    const saveDecision = getPlannerCapabilityDecision('save_plan', authState, backendReachable);
    const premiumPdfDecision = getPlannerCapabilityDecision('premium_pdf', authState, backendReachable);

    let saveLabel = 'Save Plan';
    if (!saveDecision.allowed) {
      if (!backendReachable) {
        saveLabel = 'Go Online to Save Plan';
      } else {
        saveLabel = 'Upgrade to Save Plan';
      }
    }

    let premiumPdfLabel = 'Generate Premium PDF';
    if (!premiumPdfDecision.allowed) {
      if (!backendReachable) {
        premiumPdfLabel = 'Go Online for Premium PDF';
      } else if (authState === 'anonymous') {
        premiumPdfLabel = 'Sign In for Premium PDF';
      } else {
        premiumPdfLabel = 'Upgrade for Premium PDF';
      }
    }

    return {
      saveLabel,
      saveHint: saveDecision.allowed ? null : (saveDecision.message || null),
      premiumPdfLabel,
      premiumPdfHint: premiumPdfDecision.allowed ? null : (premiumPdfDecision.message || null),
    };
  };

  const buildPlannerPayload = (): PlannerPlanPayload => {
    const businessName = state.step1_entry.activityDescription || 'My Business';
    return {
      mode: 'simple',
      name: `${businessName} Plan - ${new Date().toISOString().slice(0, 10)}`,
      business_type: businessType,
      currency_code: state.currencyCode,
      inputs: state,
      results,
    };
  };

  const handleDownloadSimplePdf = () => {
    generatePDF(state, results, businessType);
    setShareFeedback({
      tone: 'success',
      message: 'Your Simple Mode PDF was generated in the browser and downloaded to your device.',
    });
    setState(prev => ({ ...prev, step4_vision: { ...prev.step4_vision, pdfGenerated: true } }));
  };

  const buildWhatsAppShareText = (): string => {
    const businessLabel = `${currentConfig.title.toLowerCase()} business`;
    const currency = (value: number) => formatPlannerCurrency(value, state.currencyCode);
    const badMonthSummary = `Bad month check: ${currency(results.badMonthMonthlyProfit)} profit and ${currency(results.badMonthEstimatedCashPosition)} cash`;

    if (results.monthlyProfit > 0) {
      return [
        `My ${businessLabel} numbers — checked on VunaMentor:`,
        '',
        `Main goal: ${results.purposeHeadline}`,
        `Monthly profit: ${currency(results.monthlyProfit)}`,
        `Estimated cash in hand: ${currency(results.estimatedCashPosition)}`,
        `Safe to spend per day: ${currency(results.safeTakeHomeDailyAmount)}`,
        `Startup recovery: ${Number.isFinite(results.investmentPaybackMonths) ? formatPaybackMonths(results.investmentPaybackMonths) : 'not yet'}`,
        `My sales target: ${Math.ceil(results.operatingBreakEvenUnits).toLocaleString()} ${currentConfig.unitNamePlural}/month`,
        badMonthSummary,
        ...(results.cashGapMessage ? [`Cash warning: ${results.cashGapMessage}`] : []),
        '',
        'Check your business before you eat your business.',
        `Check yours: ${PLANNER_SHARE_URL}`,
      ].join('\n');
    }

    return [
      `My ${businessLabel} check — VunaMentor:`,
      '',
      `My business is losing ${currency(results.lossPerDay)} every day`,
      `I need to sell ${Math.ceil(results.unitsPerWeekGap).toLocaleString()} more ${currentConfig.unitNamePlural} per week to break even`,
      `Estimated cash in hand: ${currency(results.estimatedCashPosition)}`,
      badMonthSummary,
      '',
      'Most businesses run at a loss without knowing.',
      `Check yours: ${PLANNER_SHARE_URL}`,
    ].join('\n');
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  };

  const handleCopyShareText = async () => {
    try {
      await copyTextToClipboard(buildWhatsAppShareText());
      setShareFeedback({
        tone: 'success',
        message: 'Your VunaMentor share text was copied. You can paste it into WhatsApp, Status, or SMS.',
      });
    } catch {
      setShareFeedback({
        tone: 'error',
        message: 'We could not copy your share text right now.',
      });
    }
  };

  const handleShareOnWhatsApp = async () => {
    const message = buildWhatsAppShareText();
    const encodedMessage = encodeURIComponent(message);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!isMobile) {
      await handleCopyShareText();
      return;
    }

    window.location.href = `whatsapp://send?text=${encodedMessage}`;
    window.setTimeout(() => {
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
    }, 500);

    setShareFeedback({
      tone: 'success',
      message: 'We opened WhatsApp with your VunaMentor message. If the app does not open, the web share page will load next.',
    });
  };

  const downloadPdfBlob = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const runGuardedAction = async (
    action: PlannerDeferredAction,
    capability: PlannerCapability,
    execute: () => Promise<void>,
    profileOverride?: PlannerAuthProfile | null,
  ): Promise<void> => {
    const latestProfile = await getLatestAuthProfile(profileOverride);
    const authState = getPlannerAuthState(latestProfile);
    const decision = getPlannerCapabilityDecision(capability, authState, isBackendReachable());

    if (!decision.allowed) {
      if (decision.requiresAuth && authState === 'anonymous' && isBackendReachable()) {
        openAuthDialogForAction(action);
        return;
      }

      setShareFeedback({
        tone: 'warning',
        message: decision.message || 'This action is not available right now.',
      });
      return;
    }

    await execute();
  };

  const handleExportPDF = async (profileOverride?: PlannerAuthProfile | null) => {
    await runGuardedAction('download_pdf', 'premium_pdf', async () => {
      try {
        const businessName = state.step1_entry.activityDescription || 'My Business';
        const pdfBlob = PLANNER_PREMIUM_TESTING_BYPASS
          ? generatePDFBlob(state, results, businessType)
          : await requestPlannerPremiumPdf(buildPlannerPayload());
        downloadPdfBlob(pdfBlob, getPDFFileName(businessName));
        setShareFeedback({
          tone: 'success',
          message: 'Your premium PDF was generated and downloaded to your device.',
        });
        setState(prev => ({ ...prev, step4_vision: { ...prev.step4_vision, pdfGenerated: true } }));
      } catch (error) {
        setShareFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'We could not generate your premium PDF right now.',
        });
      }
    }, profileOverride);
  };

  const handleExportPdfClick = () => {
    void handleExportPDF();
  };

  const handleSharePDF = async (profileOverride?: PlannerAuthProfile | null) => {
    await runGuardedAction('share_pdf', 'premium_pdf', async () => {
      try {
        setIsSharingPdf(true);
        setShareFeedback(null);
        const businessName = state.step1_entry.activityDescription || 'My Business';
        const fileName = getPDFFileName(businessName);
        const pdfBlob = PLANNER_PREMIUM_TESTING_BYPASS
          ? generatePDFBlob(state, results, businessType)
          : await requestPlannerPremiumPdf(buildPlannerPayload());
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (!navigator.share || !navigator.canShare || !navigator.canShare({ files: [pdfFile] })) {
          downloadPdfBlob(pdfBlob, fileName);
          setShareFeedback({
            tone: 'warning',
            message: 'This device cannot share PDF files directly, so we downloaded the validated premium PDF instead.',
          });
          setState(prev => ({ ...prev, step4_vision: { ...prev.step4_vision, pdfGenerated: true } }));
          return;
        }

        await navigator.share({
          title: `${businessName} Business Plan`,
          text: 'Here is my VunaMentor premium PDF report.',
          files: [pdfFile],
        });
        setShareFeedback({
          tone: 'success',
          message: 'The premium PDF was shared as a real file, so people can open it directly from WhatsApp.',
        });
        setState(prev => ({ ...prev, step4_vision: { ...prev.step4_vision, pdfGenerated: true } }));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setShareFeedback({
            tone: 'warning',
            message: 'Sharing was cancelled. You can still save the PDF and send it as a file attachment.',
          });
        } else {
          setShareFeedback({
            tone: 'error',
            message: error instanceof Error ? error.message : 'We could not prepare your premium PDF right now.',
          });
        }
      } finally {
        setIsSharingPdf(false);
      }
    }, profileOverride);
  };

  const handleSavePlan = async (profileOverride?: PlannerAuthProfile | null) => {
    await runGuardedAction('save_plan', 'save_plan', async () => {
      const payload = buildPlannerPayload();

      try {
        const savedPlan = savedPlanId
          ? await updatePlannerPlan(savedPlanId, payload)
          : await savePlannerPlan(payload);

        setSavedPlanId(savedPlan.id);
        setShareFeedback({
          tone: 'success',
          message: 'Your Simple Mode plan was saved to your VunaBooks account.',
        });
      } catch (error) {
        setShareFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'We could not save your plan right now.',
        });
      }
    }, profileOverride);
  };

  const handleSavePlanClick = () => {
    void handleSavePlan();
  };

  const handleResumeAfterAuth = async (profile: PlannerAuthProfile) => {
    setAuthProfile(profile);
    setIsAuthDialogOpen(false);

    const actionToResume = pendingAuthAction;
    setPendingAuthAction(null);

    if (!actionToResume) {
      return;
    }

    if (actionToResume === 'save_plan') {
      await handleSavePlan(profile);
      return;
    }

    if (actionToResume === 'download_pdf') {
      await handleExportPDF(profile);
      return;
    }

    await handleSharePDF(profile);
  };

  const handleShareClick = async () => {
    await handleSharePDF();
  };

  const handleLoadLatestPlan = () => {
    void (async () => {
      if (!isBackendReachable()) {
        setShareFeedback({
          tone: 'warning',
          message: 'Simple Mode still works here in your browser. Go online to load a saved plan.',
        });
        return;
      }

      setIsLoadingSavedPlan(true);
      try {
        const plans = await listPlannerPlans({ mode: 'simple', limit: 1 });
        if (plans.length === 0) {
          setShareFeedback({
            tone: 'warning',
            message: 'No saved Simple Mode plans were found on your account yet.',
          });
          return;
        }

        const latestPlan = await getPlannerPlan<WizardState, CalculationResult>(plans[0].id);
        setState(latestPlan.inputs);
        setBusinessType(latestPlan.business_type as BusinessType);
        setSavedPlanId(latestPlan.id);
        setShareFeedback({
          tone: 'success',
          message: `Loaded "${latestPlan.name}" from your VunaBooks account.`,
        });
      } catch (error) {
        setShareFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'We could not load your saved plan right now.',
        });
      } finally {
        setIsLoadingSavedPlan(false);
      }
    })();
  };

  const steps = [
    { id: 1, title: 'Start', subtitle: 'About Your Business' },
    { id: 2, title: 'Costs', subtitle: 'Your Business Costs' },
    { id: 3, title: 'Price', subtitle: 'Set Your Selling Price' },
    { id: 4, title: 'Vision', subtitle: 'Your Results & Plan' },
  ];
  const progressWidth = ((state.currentStep - 1) / (steps.length - 1)) * 100;
  const actionGateState = buildActionGateState();

  return (
    <div className="min-h-screen bg-vuna-bg text-vuna-dark font-sans pb-20">
      {/* Progress Indicator */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 shadow-sm px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <img src="/vuna-logo-color.png" alt="VunaBooks Mentor" className="h-8 w-auto object-contain" />
              <span className="rounded-full border border-green-100 bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-vuna-primary">
                Mentor
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getPlannerAuthState() === 'signed_in_paid' && (
                <button
                  type="button"
                  onClick={handleLoadLatestPlan}
                  disabled={isLoadingSavedPlan}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-vuna-slate hover:bg-neutral-50 disabled:opacity-60"
                >
                  <span>{isLoadingSavedPlan ? 'Loading...' : 'Load Saved'}</span>
                </button>
              )}
              <CurrencySelector
                value={state.currencyCode}
                onChange={handleCurrencyChange}
                label="Currency"
                className="border border-neutral-200 px-2 py-1"
              />
              <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-vuna-primary">
                <span>{currentConfig.icon}</span>
                <span>This plan: {currentConfig.title}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-neutral-200 rounded-full" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-vuna-primary rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progressWidth}%` }}
            />
            {steps.map((step) => {
              const isClickable = step.id < state.currentStep || state.completedSteps.includes(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (isClickable) {
                      setState(prev => ({ ...prev, currentStep: step.id as 1 | 2 | 3 | 4 }));
                    }
                  }}
                  className={`relative z-10 flex flex-col items-center gap-1 focus:outline-none ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                    }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${state.currentStep >= step.id ? 'bg-vuna-primary text-white' : 'bg-neutral-200 text-vuna-slate'
                      }`}
                  >
                    {state.currentStep > step.id ? '✓' : step.id}
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-wider hidden sm:block ${state.currentStep >= step.id ? 'text-vuna-primary' : 'text-vuna-slate'
                    }`}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {state.currentStep === 1 && (
              <Step1Entry
                state={state}
                setState={setState}
                onNext={handleNext}
                businessType={businessType}
                config={currentConfig}
                onBusinessTypeChange={(type) => {
                  setBusinessType(type);
                  setState((prev) => ({
                    ...prev,
                    step1_entry: {
                      ...prev.step1_entry,
                      category: type,
                    },
                  }));
                }}
              />
            )}
            {state.currentStep === 2 && (
              <Step2Buckets state={state} setState={setState} onSeeHow={setActiveLesson} onNext={handleNext} onBack={handleBack} businessType={businessType} config={currentConfig} />
            )}
            {state.currentStep === 3 && (
              <Step3Strategy state={state} setState={setState} onSeeHow={setActiveLesson} onNext={handleNext} onBack={handleBack} results={results} businessType={businessType} config={currentConfig} />
            )}
            {state.currentStep === 4 && (
              <Step4Vision
                state={state}
                setState={setState}
                onSeeHow={setActiveLesson}
                onBack={handleBack}
                onSavePlan={handleSavePlanClick}
                onDownloadSimplePdf={handleDownloadSimplePdf}
                onGeneratePremiumPdf={handleShareClick}
                onShareWhatsApp={() => { void handleShareOnWhatsApp(); }}
                onCopyShareText={() => { void handleCopyShareText(); }}
                isSharingPdf={isSharingPdf}
                shareFeedback={shareFeedback}
                actionGateState={actionGateState}
                results={results}
                businessType={businessType}
                config={currentConfig}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <LessonModal lesson={activeLesson} onClose={() => setActiveLesson(null)} />
      {isAuthDialogOpen && (
        <Suspense fallback={null}>
          <PlannerAuthDialog
            open={isAuthDialogOpen}
            onOpenChange={closeAuthDialog}
            initialScreen={authDialogScreen}
            intentLabel={pendingAuthAction ? getActionIntentLabel(pendingAuthAction) : 'continue'}
            onAuthenticated={handleResumeAfterAuth}
          />
        </Suspense>
      )}
    </div>
  );
}
import { formatPaybackMonths } from '../lib/recoveryTime';
