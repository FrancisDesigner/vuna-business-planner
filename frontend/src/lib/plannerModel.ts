export type PlannerMode = 'simple' | 'advanced' | 'expert';

export type PlannerMetricKey =
  | 'revenue'
  | 'variable_costs'
  | 'fixed_costs'
  | 'profit'
  | 'cash_position'
  | 'invested_capital'
  | 'debt_cost'
  | 'benchmark_rate'
  | 'interest_coverage'
  | 'roic'
  | 'wacc'
  | 'return_spread'
  | 'npv'
  | 'irr'
  | 'terminal_value'
  | 'reinvestment_need'
  | 'owner_distribution';

export type PlannerMetricValueFormat = 'currency' | 'percent' | 'ratio' | 'integer' | 'text';

export interface PlannerMetricThreshold {
  severity: 'info' | 'warning' | 'danger';
  comparator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
  value: number;
  message: string;
}

export interface PlannerMetricPresentation {
  label: string;
  shortExplanation: string;
  warningThresholds?: PlannerMetricThreshold[];
  valueFormat: PlannerMetricValueFormat;
}

export interface PlannerMetricDefinition {
  key: PlannerMetricKey;
  formulaSource: 'shared_engine';
  dependsOn: PlannerMetricKey[];
  displayByMode: Partial<Record<PlannerMode, PlannerMetricPresentation>>;
  hiddenByDefaultInModes?: PlannerMode[];
}

export interface SharedPlannerInputs {
  currencyCode: string;
  countryCode?: string;
  paymentTiming?: 'immediate' | 'within_week' | 'within_month' | 'mixed';
  totalRevenue?: number;
  variableCosts?: number;
  fixedCosts?: number;
  investedCapital?: number;
  loanAmount?: number;
  annualInterestRate?: number;
  annualDebtService?: number;
  targetGrowthRate?: number;
  ownerDistributionPreference?: 'reinvest' | 'balanced' | 'take_home';
}

export interface PlannerMetricWarning {
  metric: PlannerMetricKey;
  severity: 'info' | 'warning' | 'danger';
  message: string;
}

export interface SharedPlannerOutputs {
  metrics: Partial<Record<PlannerMetricKey, number | null>>;
  explanations: Partial<Record<PlannerMetricKey, string>>;
  warnings: PlannerMetricWarning[];
  unavailableMetrics: PlannerMetricKey[];
}

export interface PlannerModeDefinition {
  mode: PlannerMode;
  primaryUser: string;
  primaryQuestion: string;
  requiredInputs: string[];
  supportedMetrics: PlannerMetricKey[];
  hiddenMetrics: PlannerMetricKey[];
  capabilityRequirements: {
    requiresBackend: boolean;
    requiresAuth: boolean;
    requiresPaidTier: boolean;
  };
}

function createPresentation(
  label: string,
  shortExplanation: string,
  valueFormat: PlannerMetricValueFormat,
  warningThresholds?: PlannerMetricThreshold[],
): PlannerMetricPresentation {
  return {
    label,
    shortExplanation,
    valueFormat,
    warningThresholds,
  };
}

export const PLANNER_METRIC_REGISTRY: Record<PlannerMetricKey, PlannerMetricDefinition> = {
  revenue: {
    key: 'revenue',
    formulaSource: 'shared_engine',
    dependsOn: [],
    displayByMode: {
      simple: createPresentation('Sales money', 'This is the money your business brings in before costs.', 'currency'),
      advanced: createPresentation('Revenue', 'Total money earned from sales before costs.', 'currency'),
      expert: createPresentation('Revenue', 'Top-line operating inflow before any operating deductions.', 'currency'),
    },
  },
  variable_costs: {
    key: 'variable_costs',
    formulaSource: 'shared_engine',
    dependsOn: [],
    displayByMode: {
      simple: createPresentation('Restock cost', 'These costs rise when you sell more.', 'currency'),
      advanced: createPresentation('Variable costs', 'Costs that move with sales volume.', 'currency'),
      expert: createPresentation('Variable costs', 'Volume-linked operating costs.', 'currency'),
    },
  },
  fixed_costs: {
    key: 'fixed_costs',
    formulaSource: 'shared_engine',
    dependsOn: [],
    displayByMode: {
      simple: createPresentation('Monthly bills', 'These are costs you still face even in a slow month.', 'currency'),
      advanced: createPresentation('Fixed costs', 'Costs that stay even when sales change.', 'currency'),
      expert: createPresentation('Fixed costs', 'Operating costs that do not vary materially with sales volume.', 'currency'),
    },
  },
  profit: {
    key: 'profit',
    formulaSource: 'shared_engine',
    dependsOn: ['revenue', 'variable_costs', 'fixed_costs'],
    displayByMode: {
      simple: createPresentation('Profit', 'What is left after covering your business costs.', 'currency'),
      advanced: createPresentation('Profit', 'Operating surplus after variable and fixed costs.', 'currency'),
      expert: createPresentation('Profit', 'Operating earnings available for tax, debt, reinvestment, and distribution decisions.', 'currency'),
    },
  },
  cash_position: {
    key: 'cash_position',
    formulaSource: 'shared_engine',
    dependsOn: ['profit', 'debt_cost'],
    displayByMode: {
      simple: createPresentation(
        'Cash in hand',
        'This helps show whether you may have enough money available to keep operating.',
        'currency',
      ),
      advanced: createPresentation('Cash position', 'Profit adjusted for timing and financing pressure.', 'currency'),
      expert: createPresentation('Cash position', 'Available cash after timing, financing, and operating adjustments.', 'currency'),
    },
  },
  invested_capital: {
    key: 'invested_capital',
    formulaSource: 'shared_engine',
    dependsOn: [],
    displayByMode: {
      advanced: createPresentation('Invested capital', 'The owner and lender money tied up in the business.', 'currency'),
      expert: createPresentation('Invested capital', 'Capital employed in the business for return analysis.', 'currency'),
    },
    hiddenByDefaultInModes: ['simple'],
  },
  debt_cost: {
    key: 'debt_cost',
    formulaSource: 'shared_engine',
    dependsOn: [],
    displayByMode: {
      advanced: createPresentation('Debt cost', 'What it costs to service borrowed money.', 'currency'),
      expert: createPresentation('Debt cost', 'Financing cost associated with debt capital.', 'currency'),
    },
    hiddenByDefaultInModes: ['simple'],
  },
  benchmark_rate: {
    key: 'benchmark_rate',
    formulaSource: 'shared_engine',
    dependsOn: [],
    displayByMode: {
      advanced: createPresentation('Benchmark rate', 'A comparison rate for judging whether this business earns enough.', 'percent'),
      expert: createPresentation('Benchmark rate', 'Reference hurdle rate used for return and discounting decisions.', 'percent'),
    },
    hiddenByDefaultInModes: ['simple'],
  },
  interest_coverage: {
    key: 'interest_coverage',
    formulaSource: 'shared_engine',
    dependsOn: ['profit', 'debt_cost'],
    displayByMode: {
      advanced: createPresentation(
        'Debt safety',
        'Shows how many times the business can cover its interest cost.',
        'ratio',
        [
          { severity: 'danger', comparator: 'lt', value: 1.5, message: 'A small drop in sales could make debt difficult to service.' },
          { severity: 'warning', comparator: 'lt', value: 3, message: 'Debt is manageable, but there is limited room for a bad month.' },
        ],
      ),
      expert: createPresentation('Interest coverage', 'Operating earnings divided by interest cost.', 'ratio'),
    },
    hiddenByDefaultInModes: ['simple'],
  },
  roic: {
    key: 'roic',
    formulaSource: 'shared_engine',
    dependsOn: ['profit', 'invested_capital'],
    displayByMode: {
      advanced: createPresentation('Return on investment', 'Shows how hard the business is making your capital work.', 'percent'),
      expert: createPresentation('ROIC', 'Return on invested capital.', 'percent'),
    },
    hiddenByDefaultInModes: ['simple'],
  },
  wacc: {
    key: 'wacc',
    formulaSource: 'shared_engine',
    dependsOn: ['debt_cost', 'benchmark_rate', 'invested_capital'],
    displayByMode: {
      expert: createPresentation('WACC', 'Blended cost of equity and debt capital.', 'percent'),
    },
    hiddenByDefaultInModes: ['simple', 'advanced'],
  },
  return_spread: {
    key: 'return_spread',
    formulaSource: 'shared_engine',
    dependsOn: ['roic', 'wacc'],
    displayByMode: {
      expert: createPresentation('Return spread', 'ROIC minus cost of capital.', 'percent'),
    },
    hiddenByDefaultInModes: ['simple', 'advanced'],
  },
  npv: {
    key: 'npv',
    formulaSource: 'shared_engine',
    dependsOn: ['benchmark_rate'],
    displayByMode: {
      expert: createPresentation('NPV', 'Net value created above the required return.', 'currency'),
    },
    hiddenByDefaultInModes: ['simple', 'advanced'],
  },
  irr: {
    key: 'irr',
    formulaSource: 'shared_engine',
    dependsOn: ['npv'],
    displayByMode: {
      expert: createPresentation('IRR', 'Internal rate of return for the investment.', 'percent'),
    },
    hiddenByDefaultInModes: ['simple', 'advanced'],
  },
  terminal_value: {
    key: 'terminal_value',
    formulaSource: 'shared_engine',
    dependsOn: ['npv', 'benchmark_rate'],
    displayByMode: {
      expert: createPresentation('Terminal value', 'Estimated present value of cash flows beyond the forecast window.', 'currency'),
    },
    hiddenByDefaultInModes: ['simple', 'advanced'],
  },
  reinvestment_need: {
    key: 'reinvestment_need',
    formulaSource: 'shared_engine',
    dependsOn: ['profit', 'cash_position'],
    displayByMode: {
      simple: createPresentation('Money to put back', 'The business may need some money left inside to keep growing.', 'currency'),
      advanced: createPresentation('Reinvestment need', 'Profit that should stay in the business to support growth.', 'currency'),
      expert: createPresentation('Reinvestment need', 'Capital retention required to sustain planned growth.', 'currency'),
    },
  },
  owner_distribution: {
    key: 'owner_distribution',
    formulaSource: 'shared_engine',
    dependsOn: ['profit', 'reinvestment_need'],
    displayByMode: {
      simple: createPresentation('Safe take-home', 'What may be safer to take home after protecting the business.', 'currency'),
      advanced: createPresentation('Owner distribution', 'What may be available to take out after reinvestment needs.', 'currency'),
      expert: createPresentation('Owner distribution', 'Private-business distribution capacity after retention needs.', 'currency'),
    },
  },
};

const SIMPLE_SUPPORTED_METRICS: PlannerMetricKey[] = [
  'revenue',
  'variable_costs',
  'fixed_costs',
  'profit',
  'cash_position',
  'reinvestment_need',
  'owner_distribution',
];

const ADVANCED_SUPPORTED_METRICS: PlannerMetricKey[] = [
  ...SIMPLE_SUPPORTED_METRICS,
  'invested_capital',
  'debt_cost',
  'benchmark_rate',
  'interest_coverage',
  'roic',
];

const EXPERT_SUPPORTED_METRICS: PlannerMetricKey[] = [
  ...ADVANCED_SUPPORTED_METRICS,
  'wacc',
  'return_spread',
  'npv',
  'irr',
  'terminal_value',
];

export const PLANNER_MODE_DEFINITIONS: Record<PlannerMode, PlannerModeDefinition> = {
  simple: {
    mode: 'simple',
    primaryUser: 'Small-business owner or operator',
    primaryQuestion: 'Is this small business making money and will it have enough cash to keep going?',
    requiredInputs: ['revenue', 'costs', 'payment timing'],
    supportedMetrics: SIMPLE_SUPPORTED_METRICS,
    hiddenMetrics: ['invested_capital', 'debt_cost', 'benchmark_rate', 'interest_coverage', 'roic', 'wacc', 'return_spread', 'npv', 'irr', 'terminal_value'],
    capabilityRequirements: {
      requiresBackend: false,
      requiresAuth: false,
      requiresPaidTier: false,
    },
  },
  advanced: {
    mode: 'advanced',
    primaryUser: 'Growing small-business owner or operational manager',
    primaryQuestion: 'Is this business efficient, safe with debt, and worth the capital tied up in it?',
    requiredInputs: ['revenue', 'fixed costs', 'variable costs', 'investment', 'loan inputs if any'],
    supportedMetrics: ADVANCED_SUPPORTED_METRICS,
    hiddenMetrics: ['wacc', 'return_spread', 'npv', 'irr', 'terminal_value'],
    capabilityRequirements: {
      requiresBackend: false,
      requiresAuth: true,
      requiresPaidTier: true,
    },
  },
  expert: {
    mode: 'expert',
    primaryUser: 'Finance-literate operator, investor, analyst, or advisor',
    primaryQuestion: 'Does this business clear its cost of capital and what is the investment worth?',
    requiredInputs: ['advanced inputs', 'benchmark assumptions', 'cash-flow horizon'],
    supportedMetrics: EXPERT_SUPPORTED_METRICS,
    hiddenMetrics: [],
    capabilityRequirements: {
      requiresBackend: true,
      requiresAuth: true,
      requiresPaidTier: true,
    },
  },
};

export function getPlannerMetricDefinition(metric: PlannerMetricKey): PlannerMetricDefinition {
  return PLANNER_METRIC_REGISTRY[metric];
}

export function getPlannerModeDefinition(mode: PlannerMode): PlannerModeDefinition {
  return PLANNER_MODE_DEFINITIONS[mode];
}

function compareThreshold(actualValue: number, threshold: PlannerMetricThreshold): boolean {
  switch (threshold.comparator) {
    case 'lt':
      return actualValue < threshold.value;
    case 'lte':
      return actualValue <= threshold.value;
    case 'gt':
      return actualValue > threshold.value;
    case 'gte':
      return actualValue >= threshold.value;
    case 'eq':
      return actualValue === threshold.value;
    default:
      return false;
  }
}

export function buildSharedPlannerOutputs(
  mode: PlannerMode,
  metrics: Partial<Record<PlannerMetricKey, number | null>>,
  extraWarnings: PlannerMetricWarning[] = [],
): SharedPlannerOutputs {
  const modeDefinition = getPlannerModeDefinition(mode);
  const explanations: Partial<Record<PlannerMetricKey, string>> = {};
  const warnings: PlannerMetricWarning[] = [...extraWarnings];
  const unavailableMetrics: PlannerMetricKey[] = [];

  for (const metricKey of modeDefinition.supportedMetrics) {
    const metricDefinition = getPlannerMetricDefinition(metricKey);
    const metricValue = metrics[metricKey];
    const presentation = metricDefinition.displayByMode[mode];

    if (presentation) {
      explanations[metricKey] = presentation.shortExplanation;
    }

    if (metricValue === undefined || metricValue === null) {
      unavailableMetrics.push(metricKey);
      continue;
    }

    for (const threshold of presentation?.warningThresholds ?? []) {
      if (compareThreshold(metricValue, threshold)) {
        warnings.push({
          metric: metricKey,
          severity: threshold.severity,
          message: threshold.message,
        });
      }
    }
  }

  return {
    metrics,
    explanations,
    warnings,
    unavailableMetrics,
  };
}
