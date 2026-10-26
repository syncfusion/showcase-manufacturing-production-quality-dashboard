// One formatting module for every number and date the app shows. Each place has its form:
//   KPI card value, chart axis  -> compactMoney: $6.89M, $12.4M, $1.2B (full value below a million)
//   tooltip, Grid cell, Pivot   -> money: $1,691,064     counts -> count: 12,500
//   ratio                       -> percent: 39.8%        months -> monthLabel: Sep 2026
// KPI cards and axes use compact figures; tooltips, Grid cells and Pivot totals use full figures
// with separators, so a value is never shown as raw digits.
// Erasable TypeScript only (no enums), so Node's type stripping can run the tests directly.

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fixed = (digits: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Full money with separators: tooltips, Grid and Pivot cells, sentences. $1,691,064 */
export const money = (value: number): string => usd.format(value);

/** Counts with separators. 12,500 */
export const count = (value: number): string => whole.format(value);

/** A ratio (0.398) as a percentage. 39.8% */
export const percent = (ratio: number, digits = 1): string =>
  new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: digits }).format(ratio);

/**
 * Money in millions or billions with three significant figures: KPI cards and chart axes. $6.89M,
 * $12.4M, $125M, $1.2B. Values under a million stay full ($845,200). Intl rounds the decimal value, so
 * 2,295,000 reads $2.30M (toFixed(2) gives 2.29).
 */
export function compactMoney(value: number): string {
  const sign = value < 0 ? '-' : '', absolute = Math.abs(value);
  if (absolute >= 1e9) return `${sign}$${fixed(absolute >= 1e10 ? 0 : 1).format(absolute / 1e9)}B`;
  if (absolute >= 1e6) return `${sign}$${fixed(absolute < 1e7 ? 2 : absolute < 1e8 ? 1 : 0).format(absolute / 1e6)}M`;
  return money(value);
}

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** 'YYYY-MM' as a chart or preset label. Sep 2026 */
export const monthLabel = (month: string): string => monthFormat.format(new Date(`${month}-01T00:00:00Z`));

/** A date in prose and tooltips. Sep 15, 2026 */
export const dateLabel = (date: Date): string => dayFormat.format(date);

/** Display format for Syncfusion date pickers (format="..."): en-US. */
export const DATE_FORMAT = 'MM/dd/yyyy';

/** Syncfusion format strings for Grid columns (format=) and Pivot formatSettings. */
export const SYNCFUSION_FORMATS = { money: 'C0', count: 'N0', percent: 'P1' } as const;
