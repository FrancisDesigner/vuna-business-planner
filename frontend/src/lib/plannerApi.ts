import {
  PLANNER_AUTH_ENDPOINTS,
  PLANNER_BACKEND_ENDPOINTS,
} from './deployment';

const TOKEN_KEYS = {
  access: 'accessToken',
  refresh: 'refreshToken',
  legacy: 'authToken',
} as const;

export interface PlannerAuthProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  company_logo_url: string | null;
  planner_tier: 'free' | 'paid';
  subscription_plan: string | null;
  subscription_status: string | null;
}

export interface PlannerPlanSummary {
  id: string;
  mode: 'simple' | 'advanced' | 'expert';
  name: string;
  business_type: string;
  currency_code: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlannerPlanRecord<
  TInputs = Record<string, unknown>,
  TResult = Record<string, unknown>,
> extends PlannerPlanSummary {
  inputs: TInputs;
  results: TResult;
}

export interface PlannerPlanPayload<
  TInputs = Record<string, unknown>,
  TResult = Record<string, unknown>,
> {
  mode: 'simple' | 'advanced' | 'expert';
  name: string;
  business_type: string;
  currency_code: string;
  inputs: TInputs;
  results: TResult;
}

export interface PlannerAuthResult {
  access: string;
  refresh: string;
  user_id: string;
  role: string;
  name?: string;
}

export interface ExpertValidationPayload {
  initial_investment: number;
  annual_cash_flows: number[];
  discount_rate_percent?: number;
  debt_amount?: number;
  equity_amount?: number;
  cost_of_debt_percent?: number;
  cost_of_equity_percent?: number;
  annual_operating_profit_after_tax?: number;
  final_year_cash_flow?: number;
  long_term_growth_rate_percent?: number;
  terminal_value?: number;
}

export interface ExpertValidationResult {
  engine: string;
  discount_rate_percent: number | null;
  invested_capital: number;
  wacc: number | null;
  roic: number | null;
  return_spread: number | null;
  terminal_value: number;
  npv: number | null;
  irr: number | null;
}

function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.access) || localStorage.getItem(TOKEN_KEYS.legacy);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.refresh);
}

export function clearPlannerAuthTokens(): void {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.legacy);
}

function setTokens(access: string, refresh?: string | null): void {
  localStorage.setItem(TOKEN_KEYS.access, access);
  localStorage.setItem(TOKEN_KEYS.legacy, access);
  if (refresh) {
    localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) {
    return false;
  }

  try {
    const response = await fetch(PLANNER_AUTH_ENDPOINTS.refresh, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) {
      clearPlannerAuthTokens();
      return false;
    }
    const data = await response.json();
    setTokens(data.access, data.refresh || refresh);
    return true;
  } catch {
    return false;
  }
}

async function plannerAuthFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && await refreshAccessToken()) {
    const refreshedToken = getAccessToken();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      response = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  if (response.status === 401) {
    clearPlannerAuthTokens();
  }

  return response;
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export function hasPlannerAuthTokens(): boolean {
  return Boolean(getAccessToken());
}

export async function getPlannerAuthProfile(): Promise<PlannerAuthProfile | null> {
  if (!hasPlannerAuthTokens()) {
    return null;
  }

  try {
    const response = await plannerAuthFetch(PLANNER_AUTH_ENDPOINTS.me);
    if (!response.ok) {
      if (response.status === 401) {
        clearPlannerAuthTokens();
      }
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

export async function loginPlannerUser(email: string, password: string): Promise<PlannerAuthResult> {
  const response = await fetch(PLANNER_AUTH_ENDPOINTS.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const result = await handleJsonResponse<PlannerAuthResult>(response);
  setTokens(result.access, result.refresh);
  return result;
}

export async function registerPlannerUser(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<PlannerAuthResult> {
  const response = await fetch(PLANNER_AUTH_ENDPOINTS.register, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      phone: payload.phone || '',
      role: 'BUSINESS',
    }),
  });
  const result = await handleJsonResponse<PlannerAuthResult>(response);
  setTokens(result.access, result.refresh);
  return result;
}

export async function savePlannerPlan<TInputs, TResult>(
  payload: PlannerPlanPayload<TInputs, TResult>,
): Promise<PlannerPlanRecord<TInputs, TResult>> {
  const response = await plannerAuthFetch(PLANNER_BACKEND_ENDPOINTS.plans, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<PlannerPlanRecord<TInputs, TResult>>(response);
}

export async function requestPlannerPremiumPdf<TInputs, TResult>(
  payload: PlannerPlanPayload<TInputs, TResult>,
): Promise<Blob> {
  const response = await plannerAuthFetch(PLANNER_BACKEND_ENDPOINTS.premiumPdf, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.error || `HTTP ${response.status}`);
  }

  return response.blob();
}

export async function updatePlannerPlan<TInputs, TResult>(
  planId: string,
  payload: PlannerPlanPayload<TInputs, TResult>,
): Promise<PlannerPlanRecord<TInputs, TResult>> {
  const response = await plannerAuthFetch(`${PLANNER_BACKEND_ENDPOINTS.plans}/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<PlannerPlanRecord<TInputs, TResult>>(response);
}

export async function listPlannerPlans(options: {
  mode?: 'simple' | 'advanced' | 'expert';
  limit?: number;
  offset?: number;
} = {}): Promise<PlannerPlanSummary[]> {
  const params = new URLSearchParams();
  if (options.mode) {
    params.set('mode', options.mode);
  }
  if (options.limit) {
    params.set('limit', String(options.limit));
  }
  if (options.offset) {
    params.set('offset', String(options.offset));
  }

  const query = params.toString();
  const response = await plannerAuthFetch(
    query ? `${PLANNER_BACKEND_ENDPOINTS.plans}?${query}` : PLANNER_BACKEND_ENDPOINTS.plans,
  );
  return handleJsonResponse<PlannerPlanSummary[]>(response);
}

export async function getPlannerPlan<TInputs = Record<string, unknown>, TResult = Record<string, unknown>>(
  planId: string,
): Promise<PlannerPlanRecord<TInputs, TResult>> {
  const response = await plannerAuthFetch(`${PLANNER_BACKEND_ENDPOINTS.plans}/${planId}`);
  return handleJsonResponse<PlannerPlanRecord<TInputs, TResult>>(response);
}

export async function validateExpertPlannerCase(
  inputs: ExpertValidationPayload,
): Promise<ExpertValidationResult> {
  const response = await fetch(PLANNER_BACKEND_ENDPOINTS.validate, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'expert',
      inputs,
    }),
  });

  const payload = await handleJsonResponse<{
    mode: 'expert';
    results: ExpertValidationResult;
  }>(response);

  return payload.results;
}
