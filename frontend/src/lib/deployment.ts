export type PlannerDeploymentTarget =
  | 'local'
  | 'vercel-simple'
  | 'railway-preview'
  | 'railway-production';

export type PlannerMode = 'simple' | 'advanced' | 'expert';

export type PlannerAuthState = 'anonymous' | 'signed_in_free' | 'signed_in_paid';

export type PlannerCapability =
  | 'simple_calculation'
  | 'save_plan'
  | 'premium_pdf'
  | 'advanced_mode'
  | 'expert_mode'
  | 'cross_sell_vunabooks';

export interface PlannerCapabilityDecision {
  allowed: boolean;
  requiresBackend: boolean;
  requiresAuth: boolean;
  requiresPaidTier: boolean;
  offlineSafe: boolean;
  message?: string;
}

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';
const DEFAULT_APP_URL = 'http://localhost:3000';

export const PLANNER_API_BASE_URL =
  import.meta.env.VITE_VUNABOOKS_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_BASE_URL;

export const PLANNER_APP_URL =
  import.meta.env.VITE_PLANNER_APP_URL ||
  import.meta.env.APP_URL ||
  DEFAULT_APP_URL;

export const PLANNER_DEPLOYMENT_TARGET = (
  import.meta.env.VITE_PLANNER_DEPLOYMENT_TARGET || 'local'
) as PlannerDeploymentTarget;

export const PLANNER_PREMIUM_TESTING_BYPASS =
  import.meta.env.DEV || import.meta.env.VITE_PLANNER_PREMIUM_TESTING_BYPASS === 'true';

export const PLANNER_AUTH_ENDPOINTS = {
  register: `${PLANNER_API_BASE_URL}/auth/register/`,
  login: `${PLANNER_API_BASE_URL}/auth/login/`,
  refresh: `${PLANNER_API_BASE_URL}/auth/token/refresh/`,
  me: `${PLANNER_API_BASE_URL}/auth/me/`,
} as const;

export const PLANNER_BACKEND_ENDPOINTS = {
  plans: `${PLANNER_API_BASE_URL}/planner/plans`,
  premiumPdf: `${PLANNER_API_BASE_URL}/planner/premium-pdf`,
  validate: `${PLANNER_API_BASE_URL}/planner/validate`,
  waitlist: `${PLANNER_API_BASE_URL}/planner/waitlist/`,
} as const;

export const PLANNER_GATE_MESSAGES = {
  savePlan: 'Upgrade to save this plan to your VunaBooks account. Simple Mode still works in your browser without backend saving.',
  backendUnavailable:
    "Simple Mode still works here in your browser. Sign in when you're online to save your plan.",
  premiumPdf: 'Sign in or upgrade to generate your premium Break-Even PDF.',
  advancedMode: 'Upgrade to unlock Advanced Mode and save richer planner outputs.',
  expertMode: 'Upgrade to unlock Expert Mode or join the waitlist.',
} as const;

export function isPlannerBackendRequired(capability: PlannerCapability): boolean {
  return capability !== 'simple_calculation';
}

export function getPlannerCapabilityDecision(
  capability: PlannerCapability,
  authState: PlannerAuthState,
  backendReachable: boolean
): PlannerCapabilityDecision {
  if (capability === 'simple_calculation') {
    return {
      allowed: true,
      requiresBackend: false,
      requiresAuth: false,
      requiresPaidTier: false,
      offlineSafe: true,
    };
  }

  if (!backendReachable) {
    return {
      allowed: false,
      requiresBackend: true,
      requiresAuth: capability !== 'expert_mode',
      requiresPaidTier: capability === 'premium_pdf' || capability === 'advanced_mode' || capability === 'expert_mode',
      offlineSafe: false,
      message: PLANNER_GATE_MESSAGES.backendUnavailable,
    };
  }

  if (capability === 'save_plan') {
    return authState === 'signed_in_paid'
      ? {
          allowed: true,
          requiresBackend: true,
          requiresAuth: true,
          requiresPaidTier: true,
          offlineSafe: false,
        }
      : {
          allowed: false,
          requiresBackend: true,
          requiresAuth: false,
          requiresPaidTier: true,
          offlineSafe: false,
          message: PLANNER_GATE_MESSAGES.savePlan,
        };
  }

  if (capability === 'premium_pdf' || capability === 'advanced_mode') {
    if (capability === 'premium_pdf' && PLANNER_PREMIUM_TESTING_BYPASS) {
      return {
        allowed: true,
        requiresBackend: false,
        requiresAuth: false,
        requiresPaidTier: false,
        offlineSafe: true,
      };
    }

    return authState === 'signed_in_paid'
      ? {
          allowed: true,
          requiresBackend: true,
          requiresAuth: true,
          requiresPaidTier: true,
          offlineSafe: false,
        }
      : {
          allowed: false,
          requiresBackend: true,
          requiresAuth: true,
          requiresPaidTier: true,
          offlineSafe: false,
          message: capability === 'premium_pdf'
            ? PLANNER_GATE_MESSAGES.premiumPdf
            : PLANNER_GATE_MESSAGES.advancedMode,
        };
  }

  if (capability === 'expert_mode') {
    return authState === 'signed_in_paid'
      ? {
          allowed: true,
          requiresBackend: true,
          requiresAuth: true,
          requiresPaidTier: true,
          offlineSafe: false,
        }
      : {
          allowed: false,
          requiresBackend: true,
          requiresAuth: false,
          requiresPaidTier: true,
          offlineSafe: false,
          message: PLANNER_GATE_MESSAGES.expertMode,
        };
  }

  return authState === 'anonymous'
    ? {
        allowed: false,
        requiresBackend: true,
        requiresAuth: true,
        requiresPaidTier: false,
        offlineSafe: false,
        message: PLANNER_GATE_MESSAGES.savePlan,
      }
    : {
        allowed: true,
        requiresBackend: true,
        requiresAuth: true,
        requiresPaidTier: false,
        offlineSafe: false,
      };
}
