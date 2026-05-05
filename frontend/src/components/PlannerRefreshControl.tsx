import React, { useEffect, useState } from 'react';
import { RefreshCw, Download, WifiOff, X } from 'lucide-react';
import { Button } from './ui/button';

declare global {
  interface Window {
    __plannerUpdateServiceWorker?: (reloadPage?: boolean) => Promise<void>;
  }
}

export default function PlannerRefreshControl() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      setIsDismissed(false);
    };
    const handleOfflineReady = () => {
      setOfflineReady(true);
      setIsDismissed(false);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('planner-update-available', handleUpdateAvailable);
    window.addEventListener('planner-offline-ready', handleOfflineReady);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('planner-update-available', handleUpdateAvailable);
      window.removeEventListener('planner-offline-ready', handleOfflineReady);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleApplyUpdate = async () => {
    setIsApplyingUpdate(true);

    try {
      if (window.__plannerUpdateServiceWorker) {
        await window.__plannerUpdateServiceWorker(true);
        return;
      }

      window.location.reload();
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } catch {
      // Ignore service worker update check failures and fall back to reload.
    }

    window.location.reload();
  };

  useEffect(() => {
    if (!isRefreshing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [isRefreshing]);

  const shouldShowPanel = !isDismissed && (updateAvailable || offlineReady || !isOnline);

  return (
    <>
      {shouldShowPanel && (
        <div className="fixed inset-x-4 bottom-20 z-[110] mx-auto max-w-sm rounded-3xl border border-neutral-200 bg-white/95 p-4 shadow-[0_20px_60px_rgba(13,27,42,0.18)] backdrop-blur md:right-4 md:left-auto">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${updateAvailable ? 'bg-vuna-dark text-white' : !isOnline ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-vuna-primary'}`}>
              {updateAvailable ? <Download className="h-5 w-5" /> : !isOnline ? <WifiOff className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-vuna-dark">
                {updateAvailable
                  ? 'A new planner version is ready'
                  : !isOnline
                    ? 'You are offline'
                    : 'Planner ready for offline use'}
              </p>
              <p className="mt-1 text-sm text-vuna-slate">
                {updateAvailable
                  ? 'Tap update to load the latest version without hunting for a browser refresh.'
                  : !isOnline
                    ? 'Simple Mode still works. When your connection returns, tap Refresh Planner to sync to the latest version.'
                    : 'This planner can keep working even when your connection drops.'}
              </p>
              <div className="mt-3 flex gap-2">
                {updateAvailable ? (
                  <Button onClick={handleApplyUpdate} disabled={isApplyingUpdate} className="bg-vuna-dark text-white hover:bg-vuna-dark/90">
                    {isApplyingUpdate ? 'Updating...' : 'Update Now'}
                  </Button>
                ) : (
                  <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" className="border-neutral-300 text-vuna-dark hover:bg-neutral-50">
                    {isRefreshing ? 'Refreshing...' : 'Refresh Planner'}
                  </Button>
                )}
                <Button onClick={() => setIsDismissed(true)} variant="ghost" className="text-vuna-slate hover:bg-neutral-100">
                  Later
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="rounded-full p-1 text-vuna-slate transition-colors hover:bg-neutral-100"
              aria-label="Dismiss planner update prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[105]">
        <Button
          onClick={updateAvailable ? handleApplyUpdate : handleRefresh}
          disabled={isApplyingUpdate || isRefreshing}
          className={`h-12 rounded-full px-4 shadow-[0_14px_32px_rgba(13,27,42,0.18)] ${updateAvailable ? 'bg-vuna-dark text-white hover:bg-vuna-dark/90' : 'bg-white text-vuna-dark hover:bg-neutral-50 border border-neutral-200'}`}
        >
          {updateAvailable ? (
            <Download className="mr-2 h-4 w-4" />
          ) : (
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          )}
          {updateAvailable ? 'Update Planner' : 'Refresh Planner'}
        </Button>
      </div>
    </>
  );
}
