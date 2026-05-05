import React from 'react';
import { BUSINESS_TYPE_CONFIG, BusinessType } from '../lib/config';

interface Props {
  selected: BusinessType;
  onSelect: (type: BusinessType) => void;
  variant?: 'cards' | 'compact';
  showHeader?: boolean;
}

export default function BusinessTypeSelector({
  selected,
  onSelect,
  variant = 'cards',
  showHeader = true,
}: Props) {
  const types = Object.keys(BUSINESS_TYPE_CONFIG) as BusinessType[];
  const isCompact = variant === 'compact';

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-vuna-dark mb-2">Select Your Business Type</h2>
          <p className="text-vuna-slate">This helps us show you the right words.</p>
        </div>
      )}

      <div className={isCompact ? 'grid grid-cols-2 xl:grid-cols-5 gap-3' : 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3'}>
        {types.map((type) => {
          const config = BUSINESS_TYPE_CONFIG[type];
          const isSelected = selected === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              data-testid={`business-type-${type}`}
              className={`flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-vuna-primary bg-green-50 shadow-md'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
              } ${isCompact ? 'min-h-[116px] rounded-2xl border p-4' : 'rounded-2xl border-2 p-5'} `}
            >
              <span className={isCompact ? 'text-2xl mb-2' : 'text-3xl mb-2'}>{config.icon}</span>
              <span className={`font-bold mb-0.5 ${isSelected ? 'text-vuna-primary' : 'text-vuna-dark'} ${isCompact ? 'text-sm' : 'text-sm'}`}>
                {config.title}
              </span>
              <span className={`font-semibold uppercase tracking-wider text-vuna-primary mb-1 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                {config.subtitle}
              </span>
              <span className={`text-vuna-slate leading-tight ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                {config.examples}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
