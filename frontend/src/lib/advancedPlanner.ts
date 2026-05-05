import type { AdvancedCalculationResult } from './advancedCalculator';
import type { PlannerPlanPayload } from './plannerApi';
import type { AdvancedFormState } from '../types/advanced';

export interface AdvancedStoredInputs extends AdvancedFormState {
  saved_from: 'advanced_mode';
}

export interface AdvancedStoredResults extends AdvancedCalculationResult {
  saved_from: 'advanced_mode';
}

export function buildAdvancedPlanPayload(
  form: AdvancedFormState,
  results: AdvancedCalculationResult,
  currencyCode: string,
): PlannerPlanPayload<AdvancedStoredInputs, AdvancedStoredResults> {
  return {
    mode: 'advanced',
    name: form.businessName.trim() || 'Advanced Business Case',
    business_type: form.industry || 'Advanced Business',
    currency_code: currencyCode,
    inputs: {
      ...form,
      saved_from: 'advanced_mode',
    },
    results: {
      ...results,
      saved_from: 'advanced_mode',
    },
  };
}

export function hydrateAdvancedFormFromStoredInputs(
  inputs: Partial<AdvancedStoredInputs>,
  fallback: AdvancedFormState,
): AdvancedFormState {
  const { saved_from: _savedFrom, ...storedInputs } = inputs;

  return {
    ...fallback,
    ...storedInputs,
  };
}
