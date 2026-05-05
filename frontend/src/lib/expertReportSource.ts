import type { PlannerAuthState } from './deployment';

export type ExpertReportSource = 'backend_authoritative' | 'local_fallback';

export interface ExpertReportSourceStatus {
  recommendedSource: ExpertReportSource;
  readinessLabel: string;
  readinessMessage: string;
  helperMessage: string;
  recommendedSourceLabel: string;
  lastGeneratedLabel: string;
}

interface ExpertReportSourceStatusOptions {
  authState: PlannerAuthState;
  isOnline: boolean;
  hasFreshValidatedResult: boolean;
  lastGeneratedSource: ExpertReportSource | null;
}

export function getExpertReportSourceLabel(source: ExpertReportSource | null): string {
  if (source === 'backend_authoritative') {
    return 'Backend authoritative';
  }

  if (source === 'local_fallback') {
    return 'Local fallback';
  }

  return 'Not generated yet';
}

export function getExpertReportSourceStatus(
  options: ExpertReportSourceStatusOptions,
): ExpertReportSourceStatus {
  const lastGeneratedLabel = getExpertReportSourceLabel(options.lastGeneratedSource);

  if (!options.hasFreshValidatedResult) {
    const recommendedSource = options.isOnline && options.authState === 'signed_in_paid'
      ? 'backend_authoritative'
      : 'local_fallback';

    return {
      recommendedSource,
      readinessLabel: 'Validation required first',
      readinessMessage:
        'Run Expert validation again before generating a report so the document matches the current assumptions.',
      helperMessage:
        'The planner does not trust stale Expert outputs. It only generates reports from a fresh validated case.',
      recommendedSourceLabel: getExpertReportSourceLabel(recommendedSource),
      lastGeneratedLabel,
    };
  }

  if (options.isOnline && options.authState === 'signed_in_paid') {
    return {
      recommendedSource: 'backend_authoritative',
      readinessLabel: 'Backend authoritative PDF ready',
      readinessMessage:
        'This case can be turned into a Railway-generated report that is revalidated by Python before download.',
      helperMessage:
        'Authoritative means backend-validated, not manually controlled by a Vuna admin panel.',
      recommendedSourceLabel: 'Backend authoritative',
      lastGeneratedLabel,
    };
  }

  if (!options.isOnline && options.authState === 'signed_in_paid') {
    return {
      recommendedSource: 'local_fallback',
      readinessLabel: 'Local fallback active while offline',
      readinessMessage:
        'Your paid account is eligible for the backend report, but the browser will generate the PDF until Railway is reachable again.',
      helperMessage:
        'The local report keeps Expert Mode usable offline, then the backend authoritative path resumes when you are online.',
      recommendedSourceLabel: 'Local fallback',
      lastGeneratedLabel,
    };
  }

  return {
    recommendedSource: 'local_fallback',
    readinessLabel: 'Local fallback ready',
    readinessMessage:
      'The browser can generate the Expert PDF now. The backend authoritative version needs an online paid planner account.',
    helperMessage:
      'This keeps the planner independent and usable without admin intervention, while paid online users get the stricter backend report.',
    recommendedSourceLabel: 'Local fallback',
    lastGeneratedLabel,
  };
}
