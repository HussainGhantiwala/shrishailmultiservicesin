import React from 'react';

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  iconBg = 'bg-blue-50 text-blue-600',
  className = '',
}) {
  return (
    <div className={`bg-white p-4 rounded-xl border border-slate-200 shadow-xs ${className}`}>
      <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
        <span>{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-md ${iconBg}`}>
            {React.isValidElement(Icon) ? Icon : <Icon className="w-4 h-4" />}
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {(trend || subtitle) && (
        <div className="mt-1 text-[11px] flex items-center gap-1">
          {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
