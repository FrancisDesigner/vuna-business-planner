/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Wizard from './components/Wizard';
import LandingPage from './components/LandingPage';
import AdvancedWizard from './components/AdvancedWizard';
import ExpertMode from './components/ExpertMode';
import FeaturesPage from './components/FeaturesPage';
import PricingPage from './components/PricingPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PlannerRefreshControl from './components/PlannerRefreshControl';
import {
  DEFAULT_PLANNER_CURRENCY_CODE,
  PlannerMarketContext,
  applyPlannerCurrencyPreference,
  detectPlannerMarketContext,
  getPreferredPlannerCurrencyCode,
  readStoredPlannerMarketContext,
  storePlannerCurrencyPreference,
  storePlannerMarketContext,
} from './lib/marketContext';

export type AppMode = 'landing' | 'simple' | 'advanced' | 'expert' | 'features' | 'pricing';

export default function App() {
  const [mode, setMode] = useState<AppMode>('landing');
  const [marketContext, setMarketContext] = useState<PlannerMarketContext | null>(() => (
    detectPlannerMarketContext() || readStoredPlannerMarketContext()
  ));
  const [currencyCode, setCurrencyCode] = useState<string>(() => getPreferredPlannerCurrencyCode());

  useEffect(() => {
    const detected = detectPlannerMarketContext();
    const stored = readStoredPlannerMarketContext();
    const resolved = detected || stored;

    if (resolved) {
      setMarketContext(resolved);
      storePlannerMarketContext(resolved);
      applyPlannerCurrencyPreference(resolved);
      setCurrencyCode(getPreferredPlannerCurrencyCode());
    }
  }, []);

  const handleCurrencyChange = (nextCurrencyCode: string) => {
    storePlannerCurrencyPreference(nextCurrencyCode);
    setCurrencyCode(nextCurrencyCode || DEFAULT_PLANNER_CURRENCY_CODE);
  };

  const renderContent = () => {
    if (mode === 'landing') {
      return <LandingPage onSelectMode={setMode} marketContext={marketContext} currencyCode={currencyCode} onCurrencyChange={handleCurrencyChange} />;
    }

    if (mode === 'features') {
      return <FeaturesPage onBack={() => setMode('landing')} onSelectMode={setMode} />;
    }

    if (mode === 'pricing') {
      return <PricingPage onBack={() => setMode('landing')} onSelectMode={setMode} currencyCode={currencyCode} onCurrencyChange={handleCurrencyChange} />;
    }

    if (mode === 'simple') {
      return (
        <div className="min-h-screen bg-vuna-bg flex flex-col">
          <div className="p-4">
            <button onClick={() => setMode('landing')} className="text-vuna-slate hover:text-vuna-dark text-sm font-medium">
              ← Back to Modes
            </button>
          </div>
          <div className="flex-1">
            <Wizard marketContext={marketContext} currencyCode={currencyCode} onCurrencyChange={handleCurrencyChange} />
          </div>
        </div>
      );
    }

    if (mode === 'advanced') {
      return <AdvancedWizard onBack={() => setMode('landing')} onGoToExpert={() => setMode('expert')} marketContext={marketContext} currencyCode={currencyCode} onCurrencyChange={handleCurrencyChange} />;
    }

    if (mode === 'expert') {
      return <ExpertMode onBack={() => setMode('landing')} currencyCode={currencyCode} onCurrencyChange={handleCurrencyChange} marketContext={marketContext} />;
    }

    return null;
  };

  return (
    <>
      {renderContent()}
      <PlannerRefreshControl />
      <PWAInstallPrompt />
    </>
  );
}
