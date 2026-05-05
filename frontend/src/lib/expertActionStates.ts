import type { PlannerAuthState } from './deployment';

export interface ExpertActionState {
  buttonLabel: string;
  helperMessage: string;
  disabled: boolean;
}

interface ExpertActionStateOptions {
  authState: PlannerAuthState;
  isOnline: boolean;
  hasFreshValidatedResult: boolean;
}

export function getExpertSaveActionState(
  options: ExpertActionStateOptions,
): ExpertActionState {
  if (!options.hasFreshValidatedResult) {
    return {
      buttonLabel: 'Save Case',
      helperMessage: 'Run Expert validation first so the saved case matches the latest assumptions.',
      disabled: true,
    };
  }

  if (!options.isOnline) {
    return {
      buttonLabel: 'Save Case',
      helperMessage: 'Go online to save this Expert case to your VunaBooks account.',
      disabled: true,
    };
  }

  if (options.authState === 'anonymous') {
    return {
      buttonLabel: 'Save Case',
      helperMessage: 'Sign in to save this case. Expert save stays outside admin control and uses your own account.',
      disabled: false,
    };
  }

  if (options.authState === 'signed_in_free') {
    return {
      buttonLabel: 'Save Case',
      helperMessage: 'Expert save is part of the paid planner tier.',
      disabled: false,
    };
  }

  return {
    buttonLabel: 'Save Case',
    helperMessage: 'Backend save is ready for this validated Expert case.',
    disabled: false,
  };
}

export function getExpertLoadActionState(
  options: Omit<ExpertActionStateOptions, 'hasFreshValidatedResult'>,
): ExpertActionState {
  if (!options.isOnline) {
    return {
      buttonLabel: 'Load Saved',
      helperMessage: 'Go online to load saved Expert cases.',
      disabled: true,
    };
  }

  if (options.authState === 'anonymous') {
    return {
      buttonLabel: 'Load Saved',
      helperMessage: 'Sign in to load Expert cases from your own VunaBooks account.',
      disabled: false,
    };
  }

  if (options.authState === 'signed_in_free') {
    return {
      buttonLabel: 'Load Saved',
      helperMessage: 'Saved Expert cases are available on the paid planner tier.',
      disabled: false,
    };
  }

  return {
    buttonLabel: 'Load Saved',
    helperMessage: 'Load the latest backend-saved Expert case.',
    disabled: false,
  };
}

export function getExpertPdfActionState(
  options: ExpertActionStateOptions,
): ExpertActionState {
  const preferredLabel = options.isOnline && options.authState === 'signed_in_paid'
    ? 'Authoritative PDF'
    : 'Local PDF';

  if (!options.hasFreshValidatedResult) {
    return {
      buttonLabel: preferredLabel,
      helperMessage: 'Run Expert validation again before generating a report.',
      disabled: true,
    };
  }

  if (options.isOnline && options.authState === 'signed_in_paid') {
    return {
      buttonLabel: 'Authoritative PDF',
      helperMessage: 'Railway will revalidate the case in Python before generating the report.',
      disabled: false,
    };
  }

  if (!options.isOnline && options.authState === 'signed_in_paid') {
    return {
      buttonLabel: 'Local PDF',
      helperMessage: 'Offline fallback is active. The browser will generate the report until Railway is reachable again.',
      disabled: false,
    };
  }

  return {
    buttonLabel: 'Local PDF',
    helperMessage: 'The browser can generate the report now. Paid online users also get the backend-authoritative version.',
    disabled: false,
  };
}
