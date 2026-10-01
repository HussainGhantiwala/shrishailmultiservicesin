/**
 * Form & Input Validation Utilities
 */

export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
};

export const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('91'));
};

export const isValidGST = (gst) => {
  if (!gst) return true; // GST is optional for some customers
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(String(gst).toUpperCase());
};

export const isValidAmount = (amount) => {
  const num = Number(amount);
  return !isNaN(num) && num > 0;
};
