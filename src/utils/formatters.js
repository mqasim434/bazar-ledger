import { format, parseISO, isValid } from 'date-fns';

/**
 * Money convention (locked for the whole app):
 * All money fields are stored as PKR numbers rounded to 2 decimal places.
 * Never mix integers-as-paisa with rupee floats. Use roundMoney() in calculations.js
 * before every write.
 */
export function formatCurrency(value, { withSymbol = true, digits } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return withSymbol ? 'Rs 0' : '0';
  const fractionDigits = digits ?? (Number.isInteger(n) ? 0 : 2);
  const formatted = n.toLocaleString('en-PK', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `Rs ${formatted}` : formatted;
}

export function formatYards(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0 yd';
  const formatted = n.toLocaleString('en-PK', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} yd`;
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  if (!value) return '—';
  let date;
  if (typeof value === 'string') {
    date = parseISO(value.length === 10 ? `${value}T00:00:00` : value);
  } else if (value?.toDate) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value?.seconds === 'number') {
    date = new Date(value.seconds * 1000);
  } else {
    date = new Date(value);
  }
  if (!isValid(date)) return '—';
  return format(date, pattern);
}

export function formatDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (!isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
}

export function todayKey() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}%`;
}

export function formatPhone(value) {
  if (!value) return '—';
  return String(value).trim();
}
