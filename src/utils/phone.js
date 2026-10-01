/**
 * Phone Number Utilities
 */

export const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
};

export const formatPhoneNumber = (phone) => {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone || '';
};

export const maskPhoneNumber = (phone) => {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.length < 10) return phone;
  const last4 = cleaned.slice(-4);
  return `+91 ******${last4}`;
};
