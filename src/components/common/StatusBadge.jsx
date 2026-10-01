import React from 'react';

export default function StatusBadge({ status, label, type = 'neutral' }) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    danger: 'bg-rose-100 text-rose-800 border-rose-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[type] || styles.neutral}`}>
      {label || status}
    </span>
  );
}
