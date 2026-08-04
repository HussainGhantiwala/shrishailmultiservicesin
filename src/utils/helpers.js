/**
 * General Helper Utilities
 */

export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  return array.reduce((result, currentValue) => {
    const groupKey = currentValue[key] || 'Uncategorized';
    (result[groupKey] = result[groupKey] || []).push(currentValue);
    return result;
  }, {});
};

export const sortByField = (array, field, ascending = true) => {
  if (!Array.isArray(array)) return [];
  return [...array].sort((a, b) => {
    const valA = a[field] ?? '';
    const valB = b[field] ?? '';
    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;
  });
};
