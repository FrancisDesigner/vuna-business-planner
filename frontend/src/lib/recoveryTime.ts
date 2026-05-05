function pluralize(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

export function formatMonthsAndDays(decimalMonths: number): string {
  if (!Number.isFinite(decimalMonths)) {
    return 'Not achievable at this price';
  }

  if (decimalMonths <= 0) {
    return '0 days';
  }

  let wholeMonths = Math.floor(decimalMonths);
  let remainingDays = Math.round((decimalMonths - wholeMonths) * 30);

  if (remainingDays === 30) {
    wholeMonths += 1;
    remainingDays = 0;
  }

  if (wholeMonths === 0) {
    return pluralize(remainingDays, 'day');
  }

  if (remainingDays === 0) {
    return pluralize(wholeMonths, 'month');
  }

  return `${pluralize(wholeMonths, 'month')} and ${pluralize(remainingDays, 'day')}`;
}

export function formatRecoveryTime(days: number): string {
  if (!Number.isFinite(days)) {
    return 'not achievable at this price';
  }

  if (days < 1) {
    return 'less than a day';
  }

  if (days < 30) {
    return pluralize(Math.ceil(days), 'day');
  }

  return formatMonthsAndDays(days / 30);
}

export function formatPaybackMonths(months: number): string {
  return formatMonthsAndDays(months);
}

export function weeksToDays(weeks: number): number {
  if (!Number.isFinite(weeks)) {
    return Number.POSITIVE_INFINITY;
  }

  return weeks * 7;
}
