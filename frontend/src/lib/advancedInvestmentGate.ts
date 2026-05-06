export function getEffectiveAdvancedInvestmentForGate(input: {
  investmentSize?: number;
  equipmentCost?: number;
}): number {
  return Math.max(input.investmentSize || 0, input.equipmentCost || 0);
}

export function shouldGateAdvancedInvestment(input: {
  investmentSize?: number;
  equipmentCost?: number;
  investmentGuidanceLimit: number;
}): boolean {
  return getEffectiveAdvancedInvestmentForGate(input) > input.investmentGuidanceLimit;
}
