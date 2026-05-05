import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { PlannerMarketContext, formatPlannerCurrency, getInvestmentGuidanceLimit } from '../lib/marketContext';

interface Props {
  onBack: () => void;
  currencyCode: string;
  marketContext?: PlannerMarketContext | null;
}

export default function ExpertWaitlist({ onBack, currencyCode, marketContext }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const investmentGuidanceLimit = getInvestmentGuidanceLimit(currencyCode);
  const investmentRanges = [
    { value: 'entry-expert', label: `${formatPlannerCurrency(investmentGuidanceLimit, currencyCode)} - ${formatPlannerCurrency(investmentGuidanceLimit * 5, currencyCode)}` },
    { value: 'growth-expert', label: `${formatPlannerCurrency(investmentGuidanceLimit * 5, currencyCode)} - ${formatPlannerCurrency(investmentGuidanceLimit * 20, currencyCode)}` },
    { value: 'large-expert', label: `${formatPlannerCurrency(investmentGuidanceLimit * 20, currencyCode)} - ${formatPlannerCurrency(investmentGuidanceLimit * 100, currencyCode)}` },
    { value: 'enterprise-expert', label: `${formatPlannerCurrency(investmentGuidanceLimit * 100, currencyCode)}+` },
  ];
  const phonePlaceholder = marketContext?.countryCode === 'KE'
    ? '+254...'
    : marketContext?.countryCode === 'NG'
      ? '+234...'
      : marketContext?.countryCode === 'ZA'
        ? '+27...'
        : marketContext?.countryCode === 'GH'
          ? '+233...'
          : '+...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock submission to Airtable/Google Sheets
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-vuna-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 rounded-3xl border-neutral-200">
          <CheckCircle2 className="w-16 h-16 text-vuna-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-vuna-dark mb-2">You're on the list!</h2>
          <p className="text-vuna-slate mb-8">
            Thank you for your interest in Expert Mode. We'll notify you as soon as it's ready.
          </p>
          <Button onClick={onBack} variant="outline" className="w-full border-neutral-300 text-vuna-slate hover:bg-neutral-50 rounded-xl">
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vuna-bg py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6 -ml-4 text-vuna-slate hover:text-vuna-dark hover:bg-neutral-200/50">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        
        <Card className="border-neutral-200 shadow-lg rounded-3xl">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold text-vuna-dark">Expert Mode Waitlist</CardTitle>
            <CardDescription className="text-lg mt-2 text-vuna-slate">
              For complex structures, multi-product models, and investments over {formatPlannerCurrency(investmentGuidanceLimit, currencyCode)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-vuna-dark">Full Name *</Label>
                <Input id="name" required placeholder="Jane Doe" className="focus-visible:ring-vuna-primary" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-vuna-dark">Email Address *</Label>
                <Input id="email" type="email" required placeholder="jane@example.com" className="focus-visible:ring-vuna-primary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-vuna-dark">Phone Number (Optional)</Label>
                <Input id="phone" type="tel" placeholder={phonePlaceholder} className="focus-visible:ring-vuna-primary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType" className="text-vuna-dark">Business Type *</Label>
                <Input id="businessType" required placeholder="e.g., Manufacturing Plant, Hotel" className="focus-visible:ring-vuna-primary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investmentSize" className="text-vuna-dark">Investment Size Range *</Label>
                <select 
                  id="investmentSize" 
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vuna-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a range...</option>
                  {investmentRanges.map((range) => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryNeed" className="text-vuna-dark">Primary Need *</Label>
                <select 
                  id="primaryNeed" 
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vuna-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select primary need...</option>
                  <option value="bank_loan">Bank Loan Application</option>
                  <option value="equity_investors">Pitching to Equity Investors</option>
                  <option value="internal_planning">Internal Strategic Planning</option>
                  <option value="grant_application">Grant Application</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Button type="submit" className="w-full text-lg py-6 bg-vuna-dark hover:bg-vuna-dark/90 text-white rounded-xl" disabled={loading}>
                {loading ? 'Submitting...' : 'Join Waitlist'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
