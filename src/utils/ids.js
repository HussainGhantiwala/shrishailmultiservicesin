/**
 * Unique Identifier Generation Utilities
 */

export const generateTxnId = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${randomNum}`;
};

export const generateCustomerId = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `CUST-${randomNum}`;
};

export const generateUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
