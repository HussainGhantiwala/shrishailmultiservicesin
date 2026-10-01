import React from 'react';

export default function Card({ children, className = '', header, footer, ...props }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden ${className}`} {...props}>
      {header && <div className="p-4 border-b border-slate-200">{header}</div>}
      <div className="p-4 sm:p-5">{children}</div>
      {footer && <div className="p-3 bg-slate-50 border-t border-slate-100">{footer}</div>}
    </div>
  );
}
