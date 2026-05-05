import React from 'react';
import { Button } from './ui/button';
import { ArrowLeft, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import CurrencySelector from './CurrencySelector';

interface Props {
  onBack: () => void;
  onSelectMode: (mode: 'advanced') => void;
  currencyCode: string;
  onCurrencyChange: (currencyCode: string) => void;
}

export default function PricingPage({ onBack, onSelectMode, currencyCode, onCurrencyChange }: Props) {
  const isNeutralCurrency = currencyCode === 'LOCAL';

  return (
    <div className="min-h-screen bg-vuna-bg text-vuna-dark font-sans pb-20">
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" size="sm" className="-ml-2 text-vuna-slate hover:text-vuna-dark">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <CurrencySelector
              value={currencyCode}
              onChange={onCurrencyChange}
              label="Currency"
              className="hidden border border-neutral-200 px-2 py-1 sm:inline-flex"
            />
            <div className="font-bold text-vuna-dark">Vuna<span className="text-vuna-primary">Mentor</span></div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-vuna-dark">Pricing</h1>
          <p className="text-vuna-slate max-w-2xl mx-auto text-lg">
            Unlock the full power of the Vuna Mentor Engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card 1 */}
          <Card className="rounded-3xl shadow-sm border-neutral-200 flex flex-col">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">One-Time Access</CardTitle>
              <CardDescription>Perfect for a single business analysis.</CardDescription>
            </CardHeader>
            <CardContent className="text-center flex-1">
              <div className="my-6">
                <span className="text-4xl font-black text-vuna-dark">Flat one-time fee</span>
                <div className="text-sm text-vuna-slate mt-2">
                  Final checkout pricing is shown in your payment flow.
                </div>
              </div>
              <ul className="space-y-3 text-left max-w-xs mx-auto">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-vuna-primary shrink-0" />
                  <span>Unlimited use of Advanced Mode for one business</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-vuna-primary shrink-0" />
                  <span>Saved to your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-vuna-primary shrink-0" />
                  <span>Professional PDF Export</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={() => onSelectMode('advanced')} className="w-full bg-vuna-dark text-white hover:bg-vuna-dark/90 py-6 text-lg rounded-xl">
                Unlock Advanced
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2 */}
          <Card className="rounded-3xl shadow-md border-vuna-primary relative flex flex-col">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-vuna-primary text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase">
              Best Value
            </div>
            <CardHeader className="text-center pb-2 pt-8">
              <CardTitle className="text-2xl font-bold">VunaBooks Subscription</CardTitle>
              <CardDescription>Everything you need to run your business.</CardDescription>
            </CardHeader>
            <CardContent className="text-center flex-1">
              <div className="my-6">
                <span className="text-vuna-slate font-medium">From </span>
                <span className="text-4xl font-black text-vuna-dark">local pricing</span>
                <span className="block pt-2 text-sm font-medium text-vuna-slate">
                  {isNeutralCurrency
                    ? 'Business planning outputs stay neutral until your market context is available.'
                    : `Business planning outputs will use ${currencyCode} in your market.`}
                </span>
              </div>
              <ul className="space-y-3 text-left max-w-xs mx-auto">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-vuna-bright shrink-0" />
                  <span className="font-bold">Advanced Mode for free</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-vuna-bright shrink-0" />
                  <span>Invoicing & Billing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-vuna-bright shrink-0" />
                  <span>Inventory Management</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-vuna-bright shrink-0" />
                  <span>Payroll & Tax Engine</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => window.open('https://vunabooks.com/pricing', '_blank')}
                className="w-full bg-vuna-primary text-white hover:bg-vuna-primary/90 py-6 text-lg rounded-xl"
              >
                View VunaBooks Plans
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-12 text-center text-vuna-slate text-sm max-w-2xl mx-auto">
          <p>Vuna Mentor Engine is a product of VunaBooks. Subscribers get Advanced Mode included at no extra cost.</p>
        </div>
      </div>
    </div>
  );
}
