import React from 'react';
import { Button } from './ui/button';
import { ArrowLeft, Check, Minus } from 'lucide-react';

interface Props {
  onBack: () => void;
  onSelectMode: (mode: 'simple' | 'advanced' | 'expert') => void;
}

export default function FeaturesPage({ onBack, onSelectMode }: Props) {
  return (
    <div className="min-h-screen bg-vuna-bg text-vuna-dark font-sans pb-20">
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" size="sm" className="-ml-2 text-vuna-slate hover:text-vuna-dark">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="font-bold text-vuna-dark">Vuna<span className="text-vuna-primary">Mentor</span></div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-vuna-dark">Features & Capabilities</h1>
          <p className="text-vuna-slate max-w-2xl mx-auto text-lg">
            Choose the right level of analysis for your business stage.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-neutral-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-vuna-bg/50 border-b border-neutral-100">
                  <th className="p-6 font-bold text-vuna-dark w-1/4">Mode</th>
                  <th className="p-6 font-bold text-vuna-dark w-1/3">Free Features</th>
                  <th className="p-6 font-bold text-vuna-dark w-5/12">Advanced Features (Paid/Subscription)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="p-6 align-top">
                    <div className="font-bold text-lg text-vuna-dark">Simple Mode</div>
                    <div className="text-sm text-vuna-slate mt-1">For micro-businesses</div>
                    <Button onClick={() => onSelectMode('simple')} variant="outline" size="sm" className="mt-4 border-vuna-primary text-vuna-primary hover:bg-vuna-primary hover:text-white">Start Free</Button>
                  </td>
                  <td className="p-6 align-top space-y-3">
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-bright shrink-0" /><span>Cost breakdown</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-bright shrink-0" /><span>3 price recommendations</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-bright shrink-0" /><span>Break-even weeks</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-bright shrink-0" /><span>1-page PDF</span></div>
                  </td>
                  <td className="p-6 align-top text-vuna-slate flex items-center justify-center">
                    <Minus className="w-6 h-6 text-neutral-300" />
                  </td>
                </tr>
                <tr className="bg-green-50/30">
                  <td className="p-6 align-top">
                    <div className="font-bold text-lg text-vuna-dark">Advanced Mode</div>
                    <div className="text-sm text-vuna-slate mt-1">For growth-stage</div>
                    <Button onClick={() => onSelectMode('advanced')} className="mt-4 bg-vuna-dark text-white hover:bg-vuna-dark/90">Try Advanced</Button>
                  </td>
                  <td className="p-6 align-top space-y-3">
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-bright shrink-0" /><span>Full 7-section input form</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-bright shrink-0" /><span>Real-time helpers</span></div>
                  </td>
                  <td className="p-6 align-top space-y-3">
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-primary shrink-0" /><span>Loan & interest calculation</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-primary shrink-0" /><span>Depreciation schedules</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-primary shrink-0" /><span>Tax estimation</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-primary shrink-0" /><span>Visual timeline chart</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-primary shrink-0" /><span>12-month profit & loss</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-primary shrink-0" /><span>Three scenarios</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-primary shrink-0" /><span>Professional PDF</span></div>
                  </td>
                </tr>
                <tr>
                  <td className="p-6 align-top">
                    <div className="font-bold text-lg text-vuna-dark">Expert Mode</div>
                    <div className="text-sm text-vuna-slate mt-1">For large investments</div>
                    <Button onClick={() => onSelectMode('expert')} variant="outline" size="sm" className="mt-4">Join Waitlist</Button>
                  </td>
                  <td className="p-6 align-top text-vuna-slate flex items-center justify-center">
                    <Minus className="w-6 h-6 text-neutral-300" />
                  </td>
                  <td className="p-6 align-top space-y-3">
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-slate shrink-0" /><span>Multi-year NPV/IRR</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-slate shrink-0" /><span>Multiple products</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-slate shrink-0" /><span>Working capital</span></div>
                    <div className="flex items-start gap-2"><Check className="w-5 h-5 text-vuna-slate shrink-0" /><span>Investor-ready reports (coming soon)</span></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center text-vuna-slate">
          <p>Advanced Mode is free for all VunaBooks subscribers. Non-subscribers can pay a one-time fee of $13.</p>
        </div>
      </div>
    </div>
  );
}
