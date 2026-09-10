/**
 * All business math lives here as pure functions.
 * Never inline discount / balance / commission math in components.
 */

export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function roundYards(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function calcGrossAmount(yards, ratePerYard) {
  return roundMoney(roundYards(yards) * Number(ratePerYard || 0));
}

export function calcDiscountAmount(gross, percent) {
  return roundMoney(Number(gross || 0) * (Number(percent || 0) / 100));
}

/**
 * Auto cash discount when selling below the given/list rate.
 * discountCash = max(0, (givenRate - soldRate) * yards)
 * Gross is always at the given (list) rate; net = gross - discountCash.
 */
export function calcCashDiscountFromRate(yards, givenRatePerYard, soldRatePerYard) {
  const given = Number(givenRatePerYard || 0);
  const sold = Number(soldRatePerYard || 0);
  const qty = roundYards(yards);
  if (given <= 0 || sold >= given) return 0;
  return roundMoney((given - sold) * qty);
}

export function computeSaleFromRates({ yards, givenRatePerYard, soldRatePerYard }) {
  const qty = roundYards(yards);
  const given = Number(givenRatePerYard || 0);
  const sold = Number(soldRatePerYard ?? given);
  const grossAmount = roundMoney(qty * given);
  const discountAmount = calcCashDiscountFromRate(qty, given, sold);
  const netAmount = calcNetAmount(grossAmount, discountAmount);
  const discountPercent =
    grossAmount > 0 ? roundMoney((discountAmount / grossAmount) * 100) : 0;
  return {
    yards: qty,
    givenRatePerYard: given,
    ratePerYard: sold,
    grossAmount,
    discountAmount,
    discountPercent,
    netAmount,
  };
}

export function calcNetAmount(gross, discount) {
  return roundMoney(Number(gross || 0) - Number(discount || 0));
}

export function calcStockValue(stockYards, costPricePerYard) {
  return roundMoney(roundYards(stockYards) * Number(costPricePerYard || 0));
}

/**
 * @param {number} basisAmount - total sales/recovery amount, or total yards when type is flat_per_yard
 * @param {{ type: 'percentage' | 'flat_per_yard', rate: number }} rule
 */
export function calcCommission(basisAmount, rule) {
  const amount = Number(basisAmount || 0);
  const rate = Number(rule?.rate || 0);
  if (rule?.type === 'flat_per_yard') {
    return roundMoney(amount * rate);
  }
  return roundMoney(amount * (rate / 100));
}

export function calcReturnedProportion(yardsReturned, originalYards) {
  const original = Number(originalYards || 0);
  if (original <= 0) return 0;
  return Number(yardsReturned || 0) / original;
}

export function calcProportionalAmount(originalAmount, yardsReturned, originalYards) {
  return roundMoney(Number(originalAmount || 0) * calcReturnedProportion(yardsReturned, originalYards));
}
