import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 z-[100] flex items-start gap-4 animate-in slide-in-from-bottom-10">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-vuna-dark">
        <img src="/vuna-logo-white.png" alt="" className="h-8 w-auto object-contain" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-vuna-dark">Install VunaMentor</h3>
        <p className="text-sm text-vuna-slate mb-3">Add to your home screen for offline access and a better experience.</p>
        <div className="flex gap-2">
          <Button onClick={handleInstallClick} className="bg-vuna-primary hover:bg-vuna-primary/90 text-white flex-1">
            Install App
          </Button>
          <Button onClick={() => setShowPrompt(false)} variant="outline" className="px-3">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
