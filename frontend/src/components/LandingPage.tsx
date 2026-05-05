import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { ArrowRight, TrendingUp, Calculator, Target, FileText, Brain, Zap, ChevronDown } from 'lucide-react';
import { AppMode } from '../App';
import { DEFAULT_PLANNER_CURRENCY_CODE, PlannerMarketContext, formatPlannerCompactCurrency } from '../lib/marketContext';
import CurrencySelector from './CurrencySelector';

interface Props {
  onSelectMode: (mode: AppMode) => void;
  marketContext?: PlannerMarketContext | null;
  currencyCode: string;
  onCurrencyChange: (currencyCode: string) => void;
}

/* ── Intersection observer hook ── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold, rootMargin: '0px 0px -10% 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ── Feature card with slide-in ── */
function FeatureCard({ icon, title, desc, index }: { icon: React.ReactNode; title: string; desc: string; index: number }) {
  const { ref, inView } = useInView(0.15);
  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-500"
      style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(32px)', transitionDelay: `${index * 100}ms` }}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-vuna-primary to-green-400 rounded-xl flex items-center justify-center mb-5 text-white">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-vuna-dark mb-2">{title}</h3>
      <p className="text-vuna-slate text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function SampleOutputPreview({ currencyCode }: { currencyCode: string }) {
  const { ref, inView } = useInView(0.1);
  const [activeMode, setActiveMode] = useState<'simple' | 'advanced'>('simple');
  const rows = [
    {
      metric: 'Suggested price',
      simple: formatPlannerCompactCurrency(4800, currencyCode),
      advanced: formatPlannerCompactCurrency(5200, currencyCode),
      simpleInsight: 'A quick starting price for a first decision',
      advancedInsight: 'Balanced margin with room for growth',
    },
    {
      metric: 'Profit per unit',
      simple: formatPlannerCompactCurrency(1550, currencyCode),
      advanced: formatPlannerCompactCurrency(1880, currencyCode),
      simpleInsight: 'A fast view after direct cost only',
      advancedInsight: 'After direct cost and deeper planning checks',
    },
    {
      metric: 'Break-even time',
      simple: '11 weeks',
      advanced: '9 weeks',
      simpleInsight: 'Easy target for a normal sales week',
      advancedInsight: 'Sharper target from richer cost inputs',
    },
    {
      metric: '12-month outlook',
      simple: formatPlannerCompactCurrency(8400000, currencyCode),
      advanced: formatPlannerCompactCurrency(11600000, currencyCode),
      simpleInsight: 'A plain one-year picture',
      advancedInsight: 'A fuller projection with more detail',
    },
  ];

  return (
    <section ref={ref} className="relative -mt-16 z-10 max-w-6xl mx-auto px-4">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_32px_120px_rgba(13,27,42,0.18)] transition-all duration-700"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(28px)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-green-50 via-white to-emerald-50" />
        <div className="absolute right-6 top-6 h-20 w-20 rounded-full bg-green-100/70 blur-2xl" />
        <div className="relative px-6 py-6 md:px-8 md:py-8">
          <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-vuna-primary">
                Sample Output
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-vuna-dark">See the kind of answer VunaMentor gives you</h3>
              <p className="mt-2 max-w-2xl text-sm text-vuna-slate">
                Switch between Simple Mode and Advanced Mode to preview one answer style at a time in your local market currency.
              </p>
            </div>
            <div className="inline-flex rounded-2xl bg-vuna-bg p-1.5">
              <button
                type="button"
                onClick={() => setActiveMode('simple')}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${activeMode === 'simple' ? 'bg-white text-vuna-dark shadow-sm' : 'text-vuna-slate'}`}
              >
                Simple Mode
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('advanced')}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${activeMode === 'advanced' ? 'bg-white text-vuna-dark shadow-sm' : 'text-vuna-slate'}`}
              >
                Advanced Mode
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
            <div className="grid grid-cols-[1.15fr_1fr_1.1fr] border-b border-neutral-200 bg-neutral-50/80 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-vuna-slate md:px-6">
              <div>Metric</div>
              <div>{activeMode === 'simple' ? 'Simple Mode' : 'Advanced Mode'}</div>
              <div>Insight</div>
            </div>
            {rows.map((row, index) => (
              <div
                key={row.metric}
                className="grid grid-cols-[1.15fr_1fr_1.1fr] items-center border-b border-neutral-100 px-4 py-4 text-sm last:border-b-0 md:px-6"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateX(0)' : 'translateX(18px)',
                  transition: `opacity 520ms ease, transform 520ms ease`,
                  transitionDelay: `${180 + index * 110}ms`,
                }}
              >
                <div className="pr-4">
                  <p className="font-bold text-vuna-dark">{row.metric}</p>
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1.5 font-bold ${activeMode === 'simple' ? 'bg-green-50 text-vuna-primary' : 'bg-vuna-dark text-white'}`}>
                    {activeMode === 'simple' ? row.simple : row.advanced}
                  </span>
                </div>
                <div className="pl-2 text-vuna-slate">{activeMode === 'simple' ? row.simpleInsight : row.advancedInsight}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage({ onSelectMode, marketContext, currencyCode, onCurrencyChange }: Props) {
  const [scrollY, setScrollY] = useState(0);
  const selectedCurrencyCode = currencyCode || DEFAULT_PLANNER_CURRENCY_CODE;

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-vuna-bg flex flex-col font-sans overflow-x-hidden">

      {/* ── Navigation ── */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-neutral-200 fixed w-full z-50 top-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/vuna-logo-color.png" alt="VunaBooks" className="h-9 w-auto object-contain" />
            <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-vuna-primary">
              Mentor
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => onSelectMode('features')} variant="ghost" className="text-sm font-medium text-vuna-slate hover:text-vuna-primary hidden sm:flex">Features</Button>
            <Button onClick={() => onSelectMode('pricing')} variant="ghost" className="text-sm font-medium text-vuna-slate hover:text-vuna-primary hidden sm:flex">Pricing</Button>
            <CurrencySelector
              value={selectedCurrencyCode}
              onChange={onCurrencyChange}
              label="Currency"
              className="hidden border border-neutral-200 px-2 py-1 sm:inline-flex"
            />
            <Button onClick={() => onSelectMode('simple')} className="bg-vuna-dark hover:bg-vuna-dark/90 text-white rounded-xl text-sm">
              Check my business now
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-36 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #14532d 50%, #1A7A3C 100%)' }}>
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
          <div
            className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-white/6 blur-[160px]"
            style={{ transform: `translateY(${scrollY * 0.08}px)` }}
          />
          <div
            className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-green-300/10 blur-[120px]"
            style={{ transform: `translateY(${-scrollY * 0.05}px)` }}
          />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-green-200 text-sm font-semibold mb-8 backdrop-blur-sm">
              <Zap className="w-4 h-4" /> Find out in 5 minutes if your business is feeding you or fooling you
            </div>

            {marketContext && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-sm">
                <span>{marketContext.flag}</span>
                <span>{marketContext.countryName} detected. You can change currency.</span>
              </div>
            )}

            <div className="mb-8 flex justify-center sm:hidden">
              <CurrencySelector
                value={selectedCurrencyCode}
                onChange={onCurrencyChange}
                label="Currency"
                variant="dark"
                className="border border-white/20 px-3 py-2 backdrop-blur-sm"
              />
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white tracking-tight leading-[1.02] max-w-5xl mx-auto">
              You might be eating your business without knowing
            </h1>

            <div className="mt-6 space-y-3 text-lg sm:text-xl text-white/78 leading-relaxed max-w-3xl mx-auto">
              <p>Many small businesses are running at a loss without noticing.</p>
              <p>Is your business lying to you?</p>
              <p>Find out if your kiosk is making or losing money in 5 minutes.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <Button onClick={() => onSelectMode('simple')} size="lg" className="bg-white text-vuna-dark hover:bg-white/90 text-lg h-14 px-10 rounded-xl font-bold shadow-xl shadow-black/20">
                Check my business now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button onClick={() => onSelectMode('advanced')} variant="ghost" size="lg" className="border border-white/30 bg-transparent text-lg h-14 px-10 rounded-xl text-white hover:bg-white/10 hover:text-white">
                Explore Advanced
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto text-left">
              <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-200/80">Outcome</p>
                <p className="mt-2 text-white font-semibold">Know if you are making money before the business eats you.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-200/80">Clarity</p>
                <p className="mt-2 text-white font-semibold">See the price, margin, and daily take-home that actually keep you alive.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-200/80">Action</p>
                <p className="mt-2 text-white font-semibold">Leave with a plan you can explain to yourself, your partner, or your lender.</p>
              </div>
            </div>

            <div className="mt-14 transition-opacity duration-300" style={{ opacity: Math.max(0.15, 1 - scrollY / 300) }}>
              <ChevronDown className="w-6 h-6 text-white/40 mx-auto animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      <SampleOutputPreview currencyCode={selectedCurrencyCode} />

      {/* ── What You Get ── */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-vuna-dark tracking-tight mb-4">A mentor, not a spreadsheet</h2>
            <p className="text-lg text-vuna-slate">Answer a few questions. Get a clear picture of your business — costs, pricing, profit, and a roadmap you can actually follow.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard index={0} icon={<Calculator className="w-6 h-6" />} title="Smart Cost Estimates" desc="Tell us what you need to buy or build. We calculate your break-even point and suggest the right price." />
            <FeatureCard index={1} icon={<Target className="w-6 h-6" />} title="Scenario Planning" desc="See how your business performs under pessimistic, realistic, and optimistic conditions." />
            <FeatureCard index={2} icon={<TrendingUp className="w-6 h-6" />} title="Visual Timelines" desc="Interactive charts showing exactly when you'll recover your investment and turn profitable." />
            <FeatureCard index={3} icon={<FileText className="w-6 h-6" />} title="PDF Reports" desc="Export a clean, professional business plan — ready for investors, partners, or banks." />
            <FeatureCard index={4} icon={<Brain className="w-6 h-6" />} title="Plain English Insights" desc="No accounting jargon. Clear explanations that tell you what your numbers actually mean." />
            <FeatureCard index={5} icon={<Zap className="w-6 h-6" />} title="Advanced & Expert Modes" desc="Depreciation schedules, loan amortization, NPV/IRR — for when you need serious analysis." />
          </div>
        </div>
      </section>

      {/* ── Choose Your Path ── */}
      <section className="py-24 bg-gradient-to-b from-white to-vuna-bg">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-vuna-dark tracking-tight">Choose your path</h2>
            <p className="text-xl text-vuna-slate max-w-2xl mx-auto">Select the right level of analysis for where you are right now.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Simple */}
            <div className="relative overflow-hidden border-2 border-vuna-primary hover:shadow-xl transition-all flex flex-col rounded-3xl bg-white">
              <div className="absolute top-0 right-0 bg-vuna-primary text-white px-4 py-1 text-xs font-bold rounded-bl-xl">FREE</div>
              <div className="p-8 flex-1 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-vuna-dark mb-1">Simple Mode</h3>
                  <p className="text-vuna-slate text-sm">Quick estimate for beginners.</p>
                </div>
                <ul className="space-y-3 text-vuna-slate font-medium mb-8 flex-1">
                  <li className="flex items-center gap-2">✓ 3 simple questions</li>
                  <li className="flex items-center gap-2">✓ Basic break-even analysis</li>
                  <li className="flex items-center gap-2">✓ Plain English explanations</li>
                  <li className="flex items-center gap-2">✓ PDF Export</li>
                </ul>
                <Button onClick={() => onSelectMode('simple')} className="w-full bg-vuna-primary hover:bg-vuna-primary/90 text-white text-lg py-6 rounded-xl">
                  Start Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Advanced */}
            <div className="relative overflow-hidden border-2 border-vuna-dark hover:shadow-xl transition-all flex flex-col transform md:-translate-y-4 shadow-lg rounded-3xl bg-white">
              <div className="p-8 flex-1 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-vuna-dark mb-1">Advanced Mode</h3>
                  <p className="text-vuna-slate text-sm">Professional analysis for serious entrepreneurs.</p>
                </div>
                <ul className="space-y-3 text-vuna-slate font-medium mb-8 flex-1">
                  <li className="flex items-center gap-2">✓ Depreciation & Loan schedules</li>
                  <li className="flex items-center gap-2">✓ Tax impact analysis</li>
                  <li className="flex items-center gap-2">✓ Visual Timeline Charts</li>
                  <li className="flex items-center gap-2">✓ 3-Scenario Projections</li>
                  <li className="flex items-center gap-2">✓ Save & Restore progress</li>
                </ul>
                <Button onClick={() => onSelectMode('advanced')} className="w-full bg-vuna-dark hover:bg-vuna-dark/90 text-white text-lg py-6 rounded-xl">
                  Explore Advanced <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Expert */}
            <div className="relative overflow-hidden border-2 border-neutral-200 bg-white flex flex-col opacity-90 rounded-3xl">
              <div className="absolute top-0 right-0 bg-neutral-200 text-vuna-slate px-4 py-1 text-xs font-bold rounded-bl-xl flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> COMING SOON
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-vuna-slate mb-1">Expert Mode</h3>
                  <p className="text-vuna-slate text-sm">For complex structures and large investments.</p>
                </div>
                <ul className="space-y-3 text-vuna-slate font-medium mb-8 flex-1">
                  <li className="flex items-center gap-2">✓ Multi-product modeling</li>
                  <li className="flex items-center gap-2">✓ Working capital calculation</li>
                  <li className="flex items-center gap-2">✓ NPV & IRR analysis</li>
                  <li className="flex items-center gap-2">✓ Investor pitch ready</li>
                </ul>
                <Button onClick={() => onSelectMode('expert')} variant="outline" className="w-full text-lg py-6 border-neutral-300 text-vuna-slate hover:bg-neutral-50 rounded-xl">
                  Notify Me
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-vuna-dark border-t border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/vuna-logo-white.png" alt="VunaBooks Mentor" className="h-8 w-auto object-contain" />
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-green-200">
              Mentor
            </span>
          </div>
          <p className="text-white/40 text-sm">© 2026 VunaBooks. Built for entrepreneurs everywhere.</p>
        </div>
      </footer>
    </div>
  );
}
