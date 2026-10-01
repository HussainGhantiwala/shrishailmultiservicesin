/**
 * Currency Utility Functions for Shrishail Multi Services
 */

export const formatCurrency = (amount, symbol = '₹') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${symbol} 0.00`;
  }
  const numericAmount = Number(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Math.abs(numericAmount));

  const prefix = numericAmount < 0 ? `- ${symbol} ` : `${symbol} `;
  return `${prefix}${formatted}`;
};

export const formatRupees = (amount) => {
  return formatCurrency(amount, '₹');
};

export const parseCurrency = (formattedString) => {
  if (formattedString === null || formattedString === undefined || formattedString === '') return 0;
  if (typeof formattedString === 'number') return isNaN(formattedString) ? 0 : formattedString;
  const cleaned = formattedString.toString().replace(/[^0-9.-]+/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
