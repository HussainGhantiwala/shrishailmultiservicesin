import React from 'react';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'No entries match your search criteria.',
  onRowClick,
  className = '',
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-xs text-slate-500">
        <LoadingSpinner size="lg" />
        <span className="mt-3 font-semibold">Loading data...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${onRowClick ? 'hover:bg-slate-50 cursor-pointer' : 'hover:bg-slate-50/50'}`}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row, rowIndex) : row[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
