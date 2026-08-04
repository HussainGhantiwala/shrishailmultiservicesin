import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { formatRupees } from '../../../utils/currency';
import { formatDateTime, formatDate, formatTime } from '../../../utils/date';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Bookmark, Clock, CreditCard, Hash, User, Calendar } from 'lucide-react';

export default function ReportTimelineModal({
  isOpen,
  onClose,
  entries = [],
  title = 'Report Chronological Timeline',
}) {
  const [selectedEntry, setSelectedEntry] = useState(null);

  if (!isOpen) return null;

  // Group entries by day
  const groupedByDay = {};
  entries.forEach((entry) => {
    const dayLabel = formatDate(entry.created_at);
    if (!groupedByDay[dayLabel]) groupedByDay[dayLabel] = [];
    groupedByDay[dayLabel].push(entry);
  });

  const getDotColor = (type) => {
    switch (type) {
      case 'credit':
        return 'bg-rose-500 ring-rose-100';
      case 'debit':
        return 'bg-emerald-500 ring-emerald-100';
      case 'adjustment':
        return 'bg-amber-500 ring-amber-100';
      case 'opening_balance':
        return 'bg-blue-500 ring-blue-100';
      default:
        return 'bg-slate-400 ring-slate-100';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        className="max-w-2xl"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close Timeline
          </Button>
        }
      >
        <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-6 font-sans text-xs">
          {Object.keys(groupedByDay).length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No entries found for the selected period timeline.
            </div>
          ) : (
            Object.entries(groupedByDay).map(([day, dayEntries]) => (
              <div key={day} className="space-y-3">
                {/* Day Header */}
                <div className="sticky top-0 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 font-bold text-slate-700 shadow-2xs z-10">
                  <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{day}</span>
                  <span className="text-[10px] font-normal text-slate-500">({dayEntries.length} events)</span>
                </div>

                {/* Vertical Timeline Items */}
                <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-3">
                  {dayEntries.map((entry) => {
                    const isDebit = entry.entry_type === 'debit';
                    const isCredit = entry.entry_type === 'credit' || entry.entry_type === 'opening_balance';

                    return (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className="relative bg-white border border-slate-200 rounded-xl p-3.5 hover:border-brand-primary hover:shadow-xs transition-all cursor-pointer group"
                      >
                        {/* Timeline Bullet Dot */}
                        <div
                          className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full ring-4 ${getDotColor(
                            entry.entry_type
                          )}`}
                        />

                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-[11px] font-bold">
                              {formatTime(entry.created_at)}
                            </span>
                            <span className="font-semibold text-slate-900">{entry.customer_name || 'Customer'}</span>
                          </div>

                          <span
                            className={`font-mono font-bold text-sm ${
                              isDebit ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isDebit ? '-' : '+'}{formatRupees(entry.amount)}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isDebit
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : entry.entry_type === 'adjustment'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {isDebit
                              ? 'Payment Received (-)'
                              : entry.entry_type === 'adjustment'
                              ? 'Adjustment'
                              : 'Amount Given (+)'}
                          </span>

                          {entry.payment_method && (
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-600">
                              {entry.payment_method}
                            </span>
                          )}

                          {entry.reference_no && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                              Ref: {entry.reference_no}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-slate-700 font-medium line-clamp-1">{entry.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Transaction Details Modal */}
      {selectedEntry && (
        <Modal
          isOpen={Boolean(selectedEntry)}
          onClose={() => setSelectedEntry(null)}
          title="Ledger Transaction Details"
          footer={
            <Button variant="secondary" onClick={() => setSelectedEntry(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Customer:</span>
                <strong className="text-slate-900 font-bold text-sm">{selectedEntry.customer_name}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Date & Time:</span>
                <span className="font-mono text-slate-800">{formatDateTime(selectedEntry.created_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Transaction Type:</span>
                <span className="font-bold uppercase text-brand-primary">{selectedEntry.entry_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Payment Method:</span>
                <span className="font-semibold text-slate-800">{selectedEntry.payment_method || 'Cash'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Reference No:</span>
                <span className="font-mono text-slate-800">{selectedEntry.reference_no || '-'}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-700">Amount:</span>
                <span className={selectedEntry.entry_type === 'debit' ? 'text-emerald-600' : 'text-rose-600'}>
                  {formatRupees(selectedEntry.amount)}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium block mb-1">Particulars / Description:</span>
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium">
                {selectedEntry.description}
              </div>
            </div>

            {selectedEntry.notes && (
              <div>
                <span className="text-slate-500 font-medium block mb-1">Notes:</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 italic">
                  {selectedEntry.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
