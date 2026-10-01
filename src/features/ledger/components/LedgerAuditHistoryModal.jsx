import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { ledgerApi } from '../../../services/api/ledger';
import { formatDate, formatTime } from '../../../utils/date';
import { ShieldCheck, Clock, User } from 'lucide-react';

export default function LedgerAuditHistoryModal({ isOpen, onClose, entityId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      ledgerApi.getAuditLogs(entityId).then((res) => {
        setLogs(res.data || []);
        setLoading(false);
      });
    }
  }, [isOpen, entityId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Financial Ledger Audit History"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close Audit History
        </Button>
      }
    >
      <div className="space-y-3 font-sans text-xs">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Complete immutable audit log tracking financial entry mutations.</span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading audit trail logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No audit records found for this entry.</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="text-brand-primary uppercase text-[11px] font-bold">{log.action}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDate(log.created_at)}, {formatTime(log.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Performed by: <strong className="text-slate-800">{log.user_name || 'System Admin'}</strong></span>
                </div>
                {log.reason && (
                  <div className="text-slate-500 italic bg-white p-1.5 rounded border border-slate-100 mt-1">
                    Reason: "{log.reason}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
