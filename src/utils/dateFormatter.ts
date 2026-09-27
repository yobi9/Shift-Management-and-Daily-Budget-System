/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standardized Date and Time Formatter
 * 
 * Enforces strict consistency:
 * 1. Unified Gregorian Calendar (التقويم الميلادي المعتمد محاسبياً)
 * 2. Unified Standard Numerals (1, 2, 3... - latn) to prevent mixed Hindi (١٢٣) and Persian numerals.
 * 3. Clear 12-hour AM/PM indicator in Arabic (ص / م).
 */

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ARABIC_DAYS = [
  'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

/**
 * Safely parses any date input (ISO string, Date object, timestamp, or YYYY-MM-DD string)
 */
export function parseDate(input: string | Date | number | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  // Handle YYYY-MM-DD specifically to avoid timezone shifts
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date as YYYY/MM/DD using standard Latin numerals.
 * Example: "2026/09/24"
 */
export function formatDate(input: string | Date | number | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '—';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

/**
 * Formats a date with Arabic day and month names, with standard Latin numerals.
 * Example: "الخميس، 24 سبتمبر 2026"
 */
export function formatDateFull(input: string | Date | number | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '—';

  const dayName = ARABIC_DAYS[d.getDay()];
  const day = d.getDate();
  const monthName = ARABIC_MONTHS[d.getMonth()];
  const year = d.getFullYear();

  return `${dayName}، ${day} ${monthName} ${year}`;
}

/**
 * Formats time in 12-hour format with standard Latin numerals and Arabic AM/PM (ص / م).
 * Example: "01:30 م" or "09:15 ص"
 */
export function formatTime(input: string | Date | number | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '—';

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');

  return `${formattedHours}:${minutes} ${period}`;
}

/**
 * Formats both Date and Time together in a clean single line.
 * Example: "2026/09/24 - 01:30 م"
 */
export function formatDateTime(input: string | Date | number | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '—';

  return `${formatDate(d)} - ${formatTime(d)}`;
}

/**
 * Standardized Currency Formatter
 * Enforces standard Latin numerals (1, 2, 3...) without trailing '.00' decimals.
 * Example: 1850 -> "1,850", 2150 -> "2,150", 0 -> "0"
 */
export function formatCurrency(val: number | null | undefined): string {
  const num = Number(val || 0);
  return new Intl.NumberFormat('ar-SA-u-nu-latn', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

