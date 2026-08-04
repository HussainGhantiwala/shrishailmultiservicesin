import { useMemo, useState } from 'react';

/**
 * Reusable Search Hook
 * Filter any list by query string across specified keys.
 */
export function useSearch(initialData = [], searchKeys = []) {
  const [query, setQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!query || !query.trim()) return initialData;

    const lowerQuery = query.toLowerCase().trim();

    return initialData.filter((item) => {
      if (searchKeys.length === 0) {
        return JSON.stringify(item).toLowerCase().includes(lowerQuery);
      }

      return searchKeys.some((key) => {
        const val = item[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerQuery);
      });
    });
  }, [initialData, query, searchKeys]);

  return {
    query,
    setQuery,
    filteredData,
    clearSearch: () => setQuery(''),
  };
}
