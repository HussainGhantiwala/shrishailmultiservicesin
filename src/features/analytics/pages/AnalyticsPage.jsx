import React, { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../../../services/api/analytics';
import { dashboardApi } from '../../../services/api/dashboard';
import { PageHeader, Card, LoadingSpinner, EmptyState } from '../../../components/common';
import { formatRupees } from '../../../utils/currency';
import { formatDateTime } from '../../../utils/date';
import { supabase } from '../../../lib/supabase';
import { TrendingUp, Users, CreditCard, BarChart3, ArrowUpRight, ArrowDownRight, PiggyBank, Receipt, ShieldCheck } from 'lucide-react';

const AnalyticsPage = () => {
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [customerStats, setCustomerStats] = useState(null);
  const [savingsStats, setSavingsStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState(6);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [trendData, statsData, savingsData] = await Promise.all([
        analyticsApi.getMonthlyTrend(selectedMonths),
        analyticsApi.getCustomerStatistics(),
        analyticsApi.getSavingsAnalytics(selectedMonths)
      ]);
      setMonthlyTrend(trendData || []);
      setCustomerStats(statsData || null);
      setSavingsStats(savingsData || null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonths]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = dashboardApi.subscribeToChanges(() => {
      fetchData();
    });
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchData]);

  if (loading && (!monthlyTrend.length || !customerStats)) {
    return (
      <div className="flex flex-col h-full bg-slate-50 font-sans p-6">
        <PageHeader title="Business Analytics & Growth" description="Live revenue trends, customer insights, and payment analysis." />
        <div className="flex-1 flex justify-center items-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error && !monthlyTrend.length && !customerStats) {
    return (
      <div className="flex flex-col h-full bg-slate-50 font-sans p-6">
        <PageHeader title="Business Analytics & Growth" description="Live revenue trends, customer insights, and payment analysis." />
        <EmptyState title="Error Loading Analytics" description={error} icon={BarChart3} />
      </div>
    );
  }

  const maxTrendValue = Math.max(
    ...monthlyTrend.map(t => Math.max(t.total_credit || 0, t.total_debit || 0)),
    1 // prevent division by zero
  );

  const paymentMethods = customerStats?.payment_method_distribution || [];
  const grandTotalPayment = paymentMethods.reduce((acc, curr) => acc + (curr.total || 0), 0) || 1;

  const methodColors = ['bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500'];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans p-4 sm:p-6 space-y-6">
      <PageHeader title="Business Analytics & Growth" description="Live revenue trends, customer insights, and payment analysis." />

      {/* Monthly Revenue Trend */}
      <Card className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-800">Monthly Revenue Trend</h2>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {[3, 6, 12].map(months => (
              <button
                key={months}
                onClick={() => setSelectedMonths(months)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${selectedMonths === months ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {months} Months
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          {!monthlyTrend.length ? (
            <div className="py-8 text-center text-slate-500 text-sm">No trend data available.</div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-64 mt-4 px-2 sm:px-6">
              {monthlyTrend.map((data, index) => {
                const creditHeight = ((data.total_credit || 0) / maxTrendValue) * 100;
                const debitHeight = ((data.total_debit || 0) / maxTrendValue) * 100;
                const isNetPositive = (data.net || 0) >= 0;

                return (
                  <div key={index} className="flex flex-col items-center flex-1 group">
                    <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] sm:text-xs font-medium flex items-center gap-1">
                      {isNetPositive ? (
                        <span className="text-emerald-600 flex items-center"><ArrowUpRight className="w-3 h-3" />{formatRupees(data.net)}</span>
                      ) : (
                        <span className="text-rose-600 flex items-center"><ArrowDownRight className="w-3 h-3" />{formatRupees(Math.abs(data.net))}</span>
                      )}
                    </div>
                    <div className="flex items-end gap-1 w-full max-w-[40px] justify-center h-48 border-b border-slate-200">
                      <div
                        className="w-full max-w-[16px] bg-rose-400 rounded-t-md hover:bg-rose-500 transition-colors"
                        style={{ height: `${Math.max(creditHeight, 1)}%` }}
                        title={`Amount Given: ${formatRupees(data.total_credit)}`}
                      ></div>
                      <div
                        className="w-full max-w-[16px] bg-emerald-400 rounded-t-md hover:bg-emerald-500 transition-colors"
                        style={{ height: `${Math.max(debitHeight, 1)}%` }}
                        title={`Payment Received: ${formatRupees(data.total_debit)}`}
                      ></div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 font-medium">
                      {data.month}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-400 rounded-sm"></div>
              <span className="text-xs text-slate-600 font-medium">Amount Given (+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
              <span className="text-xs text-slate-600 font-medium">Payment Received (-)</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Outstanding Customers */}
        <Card className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden flex flex-col h-full">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-semibold text-slate-800">Top Outstanding Customers</h2>
          </div>
          <div className="p-0 flex-1 overflow-x-auto">
            {!customerStats?.top_outstanding?.length ? (
              <div className="p-6 text-center text-slate-500 text-sm">No outstanding customers found.</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-xs text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerStats.top_outstanding.map((cust, idx) => (
                    <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-medium">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{cust.name}</div>
                        <div className="text-xs text-slate-500">{cust.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600">
                        {formatRupees(cust.outstanding_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Top Paying Customers */}
        <Card className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden flex flex-col h-full">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-800">Top Paying Customers</h2>
          </div>
          <div className="p-0 flex-1 overflow-x-auto">
            {!customerStats?.top_paying?.length ? (
              <div className="p-6 text-center text-slate-500 text-sm">No payment data found.</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 text-xs text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium text-right">Total Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerStats.top_paying.map((cust, idx) => (
                    <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-medium">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{cust.name}</div>
                        <div className="text-xs text-slate-500">{cust.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {formatRupees(cust.total_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Payment Method Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Amount Given by Payment Method */}
        <Card className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-semibold text-slate-800">Amount Given by Payment Method</h2>
          </div>
          <div className="p-4 sm:p-5">
            {!(customerStats?.credit_method_distribution || []).length ? (
              <div className="py-6 text-center text-slate-500 text-sm">No credit transaction records found.</div>
            ) : (
              <div className="space-y-4">
                {(customerStats?.credit_method_distribution || []).map((method, index) => {
                  const creditTotal = (customerStats?.credit_method_distribution || []).reduce((acc, m) => acc + Number(m.total || 0), 0) || 1;
                  const percentage = Math.min(100, Math.max(0, ((method.total || 0) / creditTotal) * 100));
                  return (
                    <div key={method.method} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700">{method.method || 'Cash'} ({method.count} txns)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-600">{formatRupees(method.total)}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Payments Received by Payment Method */}
        <Card className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-800">Payments Received by Payment Method</h2>
          </div>
          <div className="p-4 sm:p-5">
            {!(customerStats?.debit_method_distribution || []).length ? (
              <div className="py-6 text-center text-slate-500 text-sm">No payment settlement records found.</div>
            ) : (
              <div className="space-y-4">
                {(customerStats?.debit_method_distribution || []).map((method, index) => {
                  const debitTotal = (customerStats?.debit_method_distribution || []).reduce((acc, m) => acc + Number(m.total || 0), 0) || 1;
                  const percentage = Math.min(100, Math.max(0, ((method.total || 0) / debitTotal) * 100));
                  return (
                    <div key={method.method} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700">{method.method || 'Cash'} ({method.count} txns)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">{formatRupees(method.total)}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Customer Savings Analytics Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <PiggyBank className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-800">Customer Savings Analytics</h2>
        </div>

        {/* Monthly Savings Movement Trend */}
        <Card className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Monthly Savings Flow</h3>
                <p className="text-xs text-slate-500">Deposits vs Withdrawals vs Used for Bill Payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                Total Held: {formatRupees(savingsStats?.total_savings || 0)}
              </div>
              <div className="text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                Active Savers: {savingsStats?.active_savers || 0}
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {!(savingsStats?.monthly_trend || []).length ? (
              <div className="py-8 text-center text-slate-500 text-sm">No monthly savings activity recorded in this period.</div>
            ) : (
              <div className="flex items-end justify-between gap-2 h-64 mt-4 px-2 sm:px-6">
                {(savingsStats?.monthly_trend || []).map((m, idx) => {
                  const maxVal = Math.max(
                    ...savingsStats.monthly_trend.map(t => Math.max(t.deposits || 0, t.withdrawals || 0, t.bill_payments || 0)),
                    1
                  );
                  const depHeight = ((m.deposits || 0) / maxVal) * 100;
                  const withHeight = ((m.withdrawals || 0) / maxVal) * 100;
                  const billHeight = ((m.bill_payments || 0) / maxVal) * 100;

                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group">
                      <div className="flex items-end gap-1 w-full max-w-[50px] justify-center h-48 border-b border-slate-200">
                        <div
                          style={{ height: `${depHeight}%` }}
                          title={`Deposits: ${formatRupees(m.deposits)}`}
                          className="w-1/3 bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all"
                        />
                        <div
                          style={{ height: `${withHeight}%` }}
                          title={`Withdrawals: ${formatRupees(m.withdrawals)}`}
                          className="w-1/3 bg-purple-500 hover:bg-purple-600 rounded-t transition-all"
                        />
                        <div
                          style={{ height: `${billHeight}%` }}
                          title={`Bill Payments: ${formatRupees(m.bill_payments)}`}
                          className="w-1/3 bg-amber-500 hover:bg-amber-600 rounded-t transition-all"
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs text-slate-500 mt-2 font-medium truncate max-w-full">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-6 mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                <span className="text-xs text-slate-600 font-medium">Savings Deposits (+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                <span className="text-xs text-slate-600 font-medium">Savings Withdrawals (-)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
                <span className="text-xs text-slate-600 font-medium">Used for Bill Payments</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 2-Column Grid: Top Savers & Recent Withdrawals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Savers */}
          <Card className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden flex flex-col h-full">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-800">Top Customers by Savings</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Highest Vault Balances</span>
            </div>
            <div className="p-0 flex-1 overflow-x-auto">
              {!savingsStats?.top_savers?.length ? (
                <div className="p-6 text-center text-slate-500 text-sm">No customer savings accounts found.</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-xs text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-medium">Rank</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium text-right">Savings Balance</th>
                      <th className="px-4 py-3 font-medium text-right">Total Deposited</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {savingsStats.top_savers.map((cust, idx) => (
                      <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 font-medium">#{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{cust.name}</div>
                          <div className="text-xs text-slate-500">{cust.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 font-mono">
                          {formatRupees(cust.savings_balance)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-500 font-mono">
                          {formatRupees(cust.total_deposited || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Recent Withdrawals and Bill Payments */}
          <Card className="rounded-xl shadow-xs border border-slate-200 bg-white overflow-hidden flex flex-col h-full">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-semibold text-slate-800">Recent Withdrawals & Bill Usages</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Latest Savings Outflows</span>
            </div>
            <div className="p-0 flex-1 overflow-x-auto">
              {!savingsStats?.recent_withdrawals?.length ? (
                <div className="p-6 text-center text-slate-500 text-sm">No recent withdrawals or bill payments recorded.</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-xs text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {savingsStats.recent_withdrawals.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{item.customer_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{formatDateTime(item.created_at)}</div>
                        </td>
                        <td className="px-4 py-3">
                          {item.transaction_type === 'BILL_PAYMENT' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              Bill Payment
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
                              Withdrawal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600 font-mono">
                          -{formatRupees(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600 font-mono">
                          {formatRupees(item.balance_after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
