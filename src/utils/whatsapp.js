import { business } from '../config/business';
import { formatCurrency, formatDate, formatYards, formatPercent } from './formatters';

function letterhead() {
  return [`*${business.name}*`, business.address, business.phone].filter(Boolean).join('\n');
}

function divider() {
  return '————————————';
}

export function buildSaleReceiptText(data) {
  return [
    letterhead(),
    divider(),
    '*SALE RECEIPT*',
    `Date: ${formatDate(data.date)}`,
    `Shop: ${data.clientName || '—'}`,
    `Salesman: ${data.salesmanName || '—'}`,
    divider(),
    `Item: ${data.itemName || '—'}`,
    `Qty: ${formatYards(data.yards)}`,
    `Rate: ${formatCurrency(data.ratePerYard)} / yd`,
    `Gross: ${formatCurrency(data.grossAmount)}`,
    `Discount: ${formatPercent(data.discountPercent)} (${formatCurrency(data.discountAmount)})`,
    `*Net: ${formatCurrency(data.netAmount)}*`,
    `Payment: ${(data.paymentType || '').toUpperCase()}`,
    divider(),
    'Thank you for your business.',
  ].join('\n');
}

export function buildRecoveryReceiptText(data) {
  return [
    letterhead(),
    divider(),
    '*PAYMENT RECEIPT*',
    `Date: ${formatDate(data.date)}`,
    `Shop: ${data.clientName || '—'}`,
    `Collected by: ${data.salesmanName || '—'}`,
    divider(),
    `Amount: *${formatCurrency(data.amount)}*`,
    `Mode: ${(data.paymentMode || '').toUpperCase()}`,
    divider(),
    'Thank you.',
  ].join('\n');
}

export function buildVendorReceiptText(data) {
  const typeLabel = {
    purchase: 'PURCHASE',
    payment: 'PAYMENT',
    advance: 'ADVANCE',
  }[data.type] || (data.type || '').toUpperCase();

  return [
    letterhead(),
    divider(),
    `*VENDOR ${typeLabel}*`,
    `Date: ${formatDate(data.date)}`,
    `Vendor: ${data.vendorName || '—'}`,
    divider(),
    `Amount: *${formatCurrency(data.amount)}*`,
    divider(),
    'Recorded in ledger.',
  ].join('\n');
}

export function buildReceiptText(type, data) {
  if (type === 'sale') return buildSaleReceiptText(data);
  if (type === 'recovery') return buildRecoveryReceiptText(data);
  if (type === 'vendor') return buildVendorReceiptText(data);
  throw new Error(`Unknown receipt type: ${type}`);
}

/** Digits-only international number, e.g. 923001234567 */
export function normalizeWhatsAppNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppLink(phone, text) {
  const number = normalizeWhatsAppNumber(phone);
  const encoded = encodeURIComponent(text);
  if (number) return `https://wa.me/${number}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

export function openWhatsApp(phone, text) {
  const url = buildWhatsAppLink(phone, text);
  window.open(url, '_blank', 'noopener,noreferrer');
}
