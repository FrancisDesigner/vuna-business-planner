import { PLANNER_CURRENCY_OPTIONS } from '../lib/marketContext';

interface Props {
  value: string;
  onChange: (currencyCode: string) => void;
  label?: string;
  variant?: 'light' | 'dark';
  className?: string;
}

export default function CurrencySelector({
  value,
  onChange,
  label = 'Currency',
  variant = 'light',
  className = '',
}: Props) {
  const selectClass = variant === 'dark'
    ? 'border-white/25 bg-white/10 text-white focus-visible:ring-white/70 [&_option]:text-vuna-dark'
    : 'border-neutral-200 bg-white text-vuna-dark focus-visible:ring-vuna-primary';
  const labelClass = variant === 'dark' ? 'text-white/70' : 'text-vuna-slate';

  return (
    <label className={`inline-flex items-center gap-2 rounded-full ${variant === 'dark' ? 'bg-white/10' : 'bg-white'} ${className}`}>
      <span className={`whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] ${labelClass}`}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid="planner-currency-select"
        className={`h-9 max-w-[12rem] rounded-full border px-3 text-sm font-bold outline-none transition focus-visible:ring-2 ${selectClass}`}
        aria-label={label}
      >
        {PLANNER_CURRENCY_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.code === 'LOCAL' ? option.label : `${option.code} - ${option.label}`}
          </option>
        ))}
      </select>
    </label>
  );
}
