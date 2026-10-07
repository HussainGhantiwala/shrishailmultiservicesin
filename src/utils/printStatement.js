import { formatRupees } from './currency';
import { formatDate, formatDateTime } from './date';

/**
 * Shrishail Multi Services - Statement Printing Engine
 * Generates professional, standard-compliant financial statements
 * adhering strictly to the Independent Financial Ledgers architecture:
 * 1. Individual Customer Statement (Lending Only / Full Account)
 * 2. Consolidated All-Customers Statement (Lending Only / Full Account) for Tally & Accounting Reconciliation
 */

/**
 * Generates HTML for an Individual Customer Statement
 */
export const generateIndividualStatementHTML = ({
  statementType = 'lending', // 'lending' | 'full'
  customer,
  account,
  savingsAccount,
  ledgerEntries = [],
  savingsEntries = [],
  dateRange = {},
}) => {
  const isFull = statementType === 'full';
  const customerName = customer?.name || 'Valued Customer';
  const customerPhone = customer?.phone || 'N/A';
  const accountNumber = account?.account_number || customer?.account_number || 'SMS-ACC';

  const periodStr = dateRange.startDate && dateRange.endDate
    ? `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`
    : 'All Time';

  // ----------------------------------------------------------------------------
  // 1. LENDING DATA CALCULATIONS
  // Excludes any savings entries or savings bill payment settlements from cash received
  // ----------------------------------------------------------------------------
  const filteredLedger = (ledgerEntries || []).filter((e) => {
    if (e.is_deleted) return false;
    if (e.payment_method === 'Customer Savings') return false;
    return true;
  });

  let runningOut = 0;
  let totalGiven = 0;
  let totalCashReceived = 0;
  let totalAdjustment = 0;
  let openingDue = 0;

  const processedLedger = filteredLedger.map((entry) => {
    const amt = Number(entry.amount) || 0;
    let givenAmt = 0;
    let receivedAmt = 0;

    if (entry.entry_type === 'opening_balance') {
      openingDue += amt;
      givenAmt = amt;
      runningOut += amt;
    } else if (entry.entry_type === 'credit') {
      totalGiven += amt;
      givenAmt = amt;
      runningOut += amt;
    } else if (entry.entry_type === 'debit') {
      totalCashReceived += amt;
      receivedAmt = amt;
      runningOut -= amt;
    } else if (entry.entry_type === 'adjustment') {
      totalAdjustment += amt;
      runningOut += amt;
      if (amt >= 0) givenAmt = amt;
      else receivedAmt = Math.abs(amt);
    }

    return {
      ...entry,
      givenAmt,
      receivedAmt,
      runningOut,
    };
  });

  const currentOutstanding = account?.outstanding_balance !== undefined && account?.outstanding_balance !== null
    ? Number(account.outstanding_balance)
    : Math.max(0, runningOut);

  const currentAdvance = account?.advance_balance !== undefined && account?.advance_balance !== null
    ? Number(account.advance_balance)
    : runningOut < 0 ? Math.abs(runningOut) : 0;

  // ----------------------------------------------------------------------------
  // 2. SAVINGS DATA CALCULATIONS
  // ----------------------------------------------------------------------------
  const activeSavings = (savingsEntries || []).filter((s) => !s.is_deleted);

  let runningSavings = 0;
  let openingSavings = 0;
  let totalSavingsDeposited = 0;
  let totalSavingsWithdrawn = 0;
  let totalSavingsUsedBills = 0;

  const processedSavings = activeSavings.map((tx) => {
    const amt = Number(tx.amount) || 0;
    let depAmt = 0;
    let withAmt = 0;

    if (tx.transaction_type === 'OPENING') {
      openingSavings += amt;
      depAmt = amt;
      runningSavings += amt;
    } else if (['DEPOSIT', 'CREDIT'].includes(tx.transaction_type)) {
      totalSavingsDeposited += amt;
      depAmt = amt;
      runningSavings += amt;
    } else if (['WITHDRAWAL', 'DEBIT'].includes(tx.transaction_type)) {
      totalSavingsWithdrawn += amt;
      withAmt = amt;
      runningSavings -= amt;
    } else if (tx.transaction_type === 'BILL_PAYMENT') {
      totalSavingsUsedBills += amt;
      withAmt = amt;
      runningSavings -= amt;
    }

    return {
      ...tx,
      depAmt,
      withAmt,
      runningSavings,
    };
  });

  const currentSavingsBalance = savingsAccount?.savings_balance !== undefined && savingsAccount?.savings_balance !== null
    ? Number(savingsAccount.savings_balance)
    : Math.max(0, runningSavings);

  // ----------------------------------------------------------------------------
  // 3. BILLS / EXPENSES PAID USING SAVINGS
  // ----------------------------------------------------------------------------
  const billPaymentEntries = activeSavings.filter((tx) => tx.transaction_type === 'BILL_PAYMENT');

  const processedBills = billPaymentEntries.map((b) => {
    const paidFromSavings = Number(b.amount) || 0;
    let totalBill = paidFromSavings;
    let remainingToDues = 0;

    if (b.notes) {
      const totalMatch = b.notes.match(/Total Bill:\s*₹?([\d,.]+)/i);
      const remMatch = b.notes.match(/Remaining(?: added to dues| ₹)?:\s*₹?([\d,.]+)/i);
      if (totalMatch) totalBill = parseFloat(totalMatch[1].replace(/,/g, '')) || totalBill;
      if (remMatch) remainingToDues = parseFloat(remMatch[1].replace(/,/g, '')) || 0;
    }

    const cleanDesc = b.description?.replace(/^Savings Used for Bill Payment:\s*/i, '') || 'Customer Expense / Bill';

    return {
      date: formatDate(b.created_at),
      description: cleanDesc,
      reference: b.reference_number || '-',
      totalBill,
      paidFromSavings,
      remainingToDues,
      savingsBalanceAfter: Number(b.balance_after) || 0,
    };
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${isFull ? 'Full Account Statement' : 'Lending Statement'} - ${customerName}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
    }
    .statement-wrapper {
      max-width: 100%;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.5px;
      margin: 0 0 2px 0;
    }
    .brand-address {
      font-size: 11px;
      color: #475569;
      line-height: 1.35;
    }
    .statement-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: ${isFull ? '#eff6ff' : '#f8fafc'};
      color: ${isFull ? '#1d4ed8' : '#334155'};
      border: 1px solid ${isFull ? '#bfdbfe' : '#cbd5e1'};
    }
    .meta-grid {
      display: table;
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .meta-row {
      display: table-row;
    }
    .meta-cell {
      display: table-cell;
      padding: 3px 8px;
      font-size: 11px;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9.5px;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 700;
    }
    .rule-notice {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 10px;
      color: #92400e;
      margin-bottom: 12px;
    }
    .section-title-bar {
      background: #f1f5f9;
      border-left: 3px solid #1e3a8a;
      padding: 5px 10px;
      margin-top: 14px;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-after: avoid;
      break-after: avoid;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    table.data-table thead {
      display: table-header-group;
    }
    table.data-table tfoot {
      display: table-footer-group;
    }
    table.data-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.data-table th {
      background: #1e293b;
      color: #ffffff;
      padding: 5px 6px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #0f172a;
    }
    table.data-table td {
      padding: 4.5px 6px;
      font-size: 10px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .bg-white { background: #ffffff; }
    .bg-alt { background: #f8fafc; }
    .table-total-row td {
      background: #f1f5f9;
      border-top: 2px solid #64748b;
      font-weight: 800;
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-credit { background: #fee2e2; color: #991b1b; }
    .badge-debit { background: #dcfce7; color: #166534; }
    .badge-deposit { background: #dcfce7; color: #166534; }
    .badge-withdrawal { background: #fee2e2; color: #991b1b; }
    .badge-bill { background: #e0e7ff; color: #3730a3; }
    .badge-opening { background: #f1f5f9; color: #334155; }
    .badge-adj { background: #fef3c7; color: #92400e; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-danger { color: #dc2626; }
    .text-success { color: #059669; }
    .text-advance { color: #047857; }
    .text-bold { font-weight: 700; }
    .summary-grid {
      display: flex;
      gap: 12px;
      margin-top: 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .summary-card {
      flex: 1;
      border-radius: 8px;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
    }
    .summary-card.lending {
      border-top: 3px solid #dc2626;
    }
    .summary-card.savings {
      border-top: 3px solid #059669;
    }
    .summary-card h4 {
      margin: 0 0 6px 0;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
    }
    .summary-card .row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 10.5px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .summary-card .row.total {
      border-bottom: none;
      border-top: 1.5px solid #cbd5e1;
      padding-top: 5px;
      margin-top: 3px;
      font-weight: 800;
      font-size: 11.5px;
    }
    .sign-section {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-box {
      width: 42%;
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      text-align: center;
      font-size: 10px;
      color: #475569;
      font-weight: 600;
    }
    .stamp-box {
      width: 14%;
      height: 48px;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .footer-note {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      margin-top: 14px;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="statement-wrapper">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top; width: 65%;">
          <h1 class="brand-title">Shrishail Multi Services</h1>
          <div class="brand-address">
            Kasagi, Akkalkot<br>
            Dist. Solapur, Maharashtra, India<br>
            Contact: +91 98506 67573 &bull; Smsuntnure123@gmail.com
          </div>
        </td>
        <td style="vertical-align: top; text-align: right; width: 35%;">
          <div class="statement-badge">
            ${isFull ? 'Full Account Statement' : 'Lending Statement Only'}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 6px;">
            Generated: <strong>${formatDateTime(new Date())}</strong>
          </div>
        </td>
      </tr>
    </table>

    <!-- Customer Metadata Grid -->
    <div class="meta-grid">
      <div class="meta-row">
        <div class="meta-cell" style="width: 26%;">
          <div class="meta-label">Customer Name</div>
          <div class="meta-val" style="font-size: 12.5px; color: #1e3a8a;">${customerName}</div>
        </div>
        <div class="meta-cell" style="width: 18%;">
          <div class="meta-label">Customer Type</div>
          <div class="meta-val font-semibold" style="color: #2563eb;">${customer?.customer_type?.name || 'Unassigned'}</div>
        </div>
        <div class="meta-cell" style="width: 20%;">
          <div class="meta-label">Account Number</div>
          <div class="meta-val font-mono">${accountNumber}</div>
        </div>
        <div class="meta-cell" style="width: 18%;">
          <div class="meta-label">Phone Number</div>
          <div class="meta-val">${customerPhone}</div>
        </div>
        <div class="meta-cell" style="width: 18%;">
          <div class="meta-label">Statement Period</div>
          <div class="meta-val">${periodStr}</div>
        </div>
      </div>
    </div>

    ${isFull ? `
    <div class="rule-notice">
      <strong>INDEPENDENT FINANCIAL LEDGERS:</strong> Lending/Outstanding dues and Customer Savings are two completely separate financial accounts. Customer savings is held separately and is <strong>never combined</strong> with lending dues.
    </div>
    ` : ''}

    <!-- SECTION A: LENDING / OUTSTANDING LEDGER -->
    <div class="section-title-bar">
      <span>SECTION A — LENDING / OUTSTANDING LEDGER</span>
      <span style="font-size: 10px; font-weight: 600; text-transform: none; color: #475569;">
        Traditional Customer Khata
      </span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 12%;">Date</th>
          <th style="width: 10%; text-align: center;">Type</th>
          <th style="width: 34%;">Description</th>
          <th style="width: 14%;">Ref No</th>
          <th style="width: 15%; text-align: right;">Amount Given (+)</th>
          <th style="width: 15%; text-align: right;">Payment Recd (-)</th>
        </tr>
      </thead>
      <tbody>
        ${processedLedger.length === 0 ? `
          <tr>
            <td colspan="6" style="text-align: center; padding: 14px; color: #64748b;">
              No lending transactions recorded for this period.
            </td>
          </tr>
        ` : processedLedger.map((row, idx) => `
          <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-alt'}">
            <td class="font-mono">${formatDate(row.created_at)}</td>
            <td style="text-align: center;">
              <span class="badge ${
                row.entry_type === 'credit' ? 'badge-credit' :
                row.entry_type === 'debit' ? 'badge-debit' :
                row.entry_type === 'opening_balance' ? 'badge-opening' : 'badge-adj'
              }">
                ${row.entry_type === 'credit' ? 'Given' : row.entry_type === 'debit' ? 'Received' : row.entry_type === 'opening_balance' ? 'Opening' : 'Adj'}
              </span>
            </td>
            <td>${row.description || '-'}</td>
            <td class="font-mono" style="color: #64748b; font-size: 9.5px;">${row.reference_no || '-'}</td>
            <td style="text-align: right;" class="font-mono text-bold ${row.givenAmt > 0 ? 'text-danger' : 'color: #94a3b8;'}">
              ${row.givenAmt > 0 ? formatRupees(row.givenAmt) : '-'}
            </td>
            <td style="text-align: right;" class="font-mono text-bold ${row.receivedAmt > 0 ? 'text-success' : 'color: #94a3b8;'}">
              ${row.receivedAmt > 0 ? formatRupees(row.receivedAmt) : '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="table-total-row">
          <td colspan="4" style="text-align: right; font-weight: 800;">TOTALS:</td>
          <td style="text-align: right;" class="font-mono text-bold text-danger">${formatRupees(totalGiven + openingDue)}</td>
          <td style="text-align: right;" class="font-mono text-bold text-success">${formatRupees(totalCashReceived)}</td>
        </tr>
      </tfoot>
    </table>

    ${isFull ? `
    <!-- SECTION B: SAVINGS LEDGER -->
    <div class="section-title-bar" style="margin-top: 16px;">
      <span>SECTION B — CUSTOMER SAVINGS LEDGER</span>
      <span style="font-size: 10px; font-weight: 600; text-transform: none; color: #475569;">
        Deposits, Withdrawals & Running Savings Balance
      </span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 12%;">Date</th>
          <th style="width: 12%; text-align: center;">Type</th>
          <th style="width: 32%;">Description</th>
          <th style="width: 14%;">Ref No</th>
          <th style="width: 15%; text-align: right;">Deposit (+)</th>
          <th style="width: 15%; text-align: right;">Withdrawal / Bill (-)</th>
        </tr>
      </thead>
      <tbody>
        ${processedSavings.length === 0 ? `
          <tr>
            <td colspan="6" style="text-align: center; padding: 14px; color: #64748b;">
              No savings transactions recorded for this period.
            </td>
          </tr>
        ` : processedSavings.map((row, idx) => `
          <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-alt'}">
            <td class="font-mono">${formatDate(row.created_at)}</td>
            <td style="text-align: center;">
              <span class="badge ${
                row.transaction_type === 'OPENING' ? 'badge-opening' :
                ['DEPOSIT', 'CREDIT'].includes(row.transaction_type) ? 'badge-deposit' :
                row.transaction_type === 'BILL_PAYMENT' ? 'badge-bill' : 'badge-withdrawal'
              }">
                ${row.transaction_type === 'BILL_PAYMENT' ? 'Bill Paid' : row.transaction_type}
              </span>
            </td>
            <td>${row.description || '-'}</td>
            <td class="font-mono" style="color: #64748b; font-size: 9.5px;">${row.reference_number || '-'}</td>
            <td style="text-align: right;" class="font-mono text-bold ${row.depAmt > 0 ? 'text-success' : ''}">
              ${row.depAmt > 0 ? formatRupees(row.depAmt) : '-'}
            </td>
            <td style="text-align: right;" class="font-mono text-bold ${row.withAmt > 0 ? 'text-danger' : ''}">
              ${row.withAmt > 0 ? formatRupees(row.withAmt) : '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="table-total-row">
          <td colspan="4" style="text-align: right; font-weight: 800;">TOTALS:</td>
          <td style="text-align: right;" class="font-mono text-bold text-success">${formatRupees(totalSavingsDeposited + openingSavings)}</td>
          <td style="text-align: right;" class="font-mono text-bold text-danger">${formatRupees(totalSavingsWithdrawn + totalSavingsUsedBills)}</td>
        </tr>
      </tfoot>
    </table>

    ${processedBills.length > 0 ? `
    <!-- SECTION C: BILLS PAID USING SAVINGS -->
    <div class="section-title-bar" style="margin-top: 16px;">
      <span>SECTION C — BILLS / EXPENSES PAID USING SAVINGS</span>
      <span style="font-size: 10px; font-weight: 600; text-transform: none; color: #475569;">
        Explicit Itemization of Savings Utilized
      </span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 12%;">Date</th>
          <th style="width: 28%;">Bill / Expense Description</th>
          <th style="width: 15%; text-align: right;">Total Bill</th>
          <th style="width: 15%; text-align: right;">Paid From Savings</th>
          <th style="width: 15%; text-align: right;">Added to Dues</th>
          <th style="width: 15%;">Ref / Bill No</th>
        </tr>
      </thead>
      <tbody>
        ${processedBills.map((b, idx) => `
          <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-alt'}">
            <td class="font-mono">${b.date}</td>
            <td><strong>${b.description}</strong></td>
            <td style="text-align: right;" class="font-mono font-bold">${formatRupees(b.totalBill)}</td>
            <td style="text-align: right;" class="font-mono font-bold text-success">${formatRupees(b.paidFromSavings)}</td>
            <td style="text-align: right;" class="font-mono ${b.remainingToDues > 0 ? 'font-bold text-danger' : 'color: #94a3b8;'}">
              ${b.remainingToDues > 0 ? formatRupees(b.remainingToDues) : '-'}
            </td>
            <td class="font-mono" style="color: #64748b; font-size: 9.5px;">${b.reference}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="table-total-row">
          <td colspan="2" style="text-align: right; font-weight: 800;">TOTAL BILLS PAID FROM SAVINGS:</td>
          <td style="text-align: right;" class="font-mono font-bold">${formatRupees(processedBills.reduce((s, b) => s + b.totalBill, 0))}</td>
          <td style="text-align: right;" class="font-mono font-bold text-success">${formatRupees(processedBills.reduce((s, b) => s + b.paidFromSavings, 0))}</td>
          <td style="text-align: right;" class="font-mono font-bold text-danger">${formatRupees(processedBills.reduce((s, b) => s + b.remainingToDues, 0))}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    ` : ''}
    ` : ''}

    <!-- Bottom Summaries -->
    <div class="summary-grid">
      <div class="summary-card lending">
        <h4>Lending & Outstanding Summary</h4>
        <div class="row">
          <span>Opening Due (Lending):</span>
          <span class="font-mono">${formatRupees(openingDue)}</span>
        </div>
        <div class="row">
          <span>Total Amount Given:</span>
          <span class="font-mono text-danger">${formatRupees(totalGiven)}</span>
        </div>
        <div class="row">
          <span>Total Cash Payments Received:</span>
          <span class="font-mono text-success">${formatRupees(totalCashReceived)}</span>
        </div>
        ${totalAdjustment !== 0 ? `
        <div class="row">
          <span>Adjustments:</span>
          <span class="font-mono">${formatRupees(totalAdjustment)}</span>
        </div>
        ` : ''}
        <div class="row total">
          <span>${currentAdvance > 0 ? 'Customer Advance / Credit:' : 'Current Outstanding Dues:'}</span>
          <span class="font-mono ${currentAdvance > 0 ? 'text-advance' : 'text-danger'}">
            ${currentAdvance > 0 ? `+${formatRupees(currentAdvance)}` : formatRupees(currentOutstanding)}
          </span>
        </div>
      </div>

      ${isFull ? `
      <div class="summary-card savings">
        <h4>Customer Savings Summary</h4>
        <div class="row">
          <span>Opening Savings Balance:</span>
          <span class="font-mono">${formatRupees(openingSavings)}</span>
        </div>
        <div class="row">
          <span>Total Savings Deposits:</span>
          <span class="font-mono text-success">${formatRupees(totalSavingsDeposited)}</span>
        </div>
        <div class="row">
          <span>Total Savings Withdrawals:</span>
          <span class="font-mono text-danger">${formatRupees(totalSavingsWithdrawn)}</span>
        </div>
        <div class="row">
          <span>Savings Used for Bill Payments:</span>
          <span class="font-mono text-danger">${formatRupees(totalSavingsUsedBills)}</span>
        </div>
        <div class="row total">
          <span>Current Savings Balance Held:</span>
          <span class="font-mono text-success">${formatRupees(currentSavingsBalance)}</span>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Signatures -->
    <div class="sign-section">
      <div class="sign-box">
        Customer Signature<br>
        <span style="font-size: 8.5px; color: #94a3b8;">(${customerName})</span>
      </div>
      <div class="stamp-box">
        Center Stamp
      </div>
      <div class="sign-box">
        Authorized Signatory<br>
        <span style="font-size: 8.5px; color: #94a3b8;">Shrishail Multi Services</span>
      </div>
    </div>

    <!-- Footer Note -->
    <div class="footer-note">
      This is a system-generated official statement from Shrishail Multi Services Khata Management System.
      For inquiries or statement verification, contact support at +91 98506 67573.
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;
};

/**
 * Generates HTML for Consolidated All-Customers Statement (Lending Only / Full Account)
 * Designed specifically for Tally, accounting, reconciliation, and business audit.
 */
export const generateConsolidatedStatementHTML = ({
  statementType = 'lending', // 'lending' | 'full'
  customers = [],
  customerTypeName = '',
  ledgerEntries = [],
  priorLedgerEntries = [],
  savingsEntries = [],
  priorSavingsEntries = [],
  dateRange = {},
}) => {
  const isFull = statementType === 'full';
  const isDateFiltered = Boolean(dateRange.startDate);
  const periodStr = dateRange.startDate && dateRange.endDate
    ? `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`
    : 'All Time';

  // 1. Filter active ledger and savings entries
  const validLedger = (ledgerEntries || []).filter((e) => {
    if (e.is_deleted) return false;
    if (e.payment_method === 'Customer Savings') return false;
    return true;
  });

  const validPriorLedger = (priorLedgerEntries || []).filter((e) => {
    if (e.is_deleted) return false;
    if (e.payment_method === 'Customer Savings') return false;
    return true;
  });

  const validSavings = (savingsEntries || []).filter((s) => !s.is_deleted);
  const validPriorSavings = (priorSavingsEntries || []).filter((s) => !s.is_deleted);

  // Group by customer_id
  const ledgerByCustomer = {};
  validLedger.forEach((e) => {
    if (!ledgerByCustomer[e.customer_id]) ledgerByCustomer[e.customer_id] = [];
    ledgerByCustomer[e.customer_id].push(e);
  });

  const priorLedgerByCustomer = {};
  validPriorLedger.forEach((e) => {
    if (!priorLedgerByCustomer[e.customer_id]) priorLedgerByCustomer[e.customer_id] = [];
    priorLedgerByCustomer[e.customer_id].push(e);
  });

  const savingsByCustomer = {};
  validSavings.forEach((s) => {
    if (!savingsByCustomer[s.customer_id]) savingsByCustomer[s.customer_id] = [];
    savingsByCustomer[s.customer_id].push(s);
  });

  const priorSavingsByCustomer = {};
  validPriorSavings.forEach((s) => {
    if (!priorSavingsByCustomer[s.customer_id]) priorSavingsByCustomer[s.customer_id] = [];
    priorSavingsByCustomer[s.customer_id].push(s);
  });

  // Consolidated Grand Totals
  let grandTotalAmountGiven = 0;
  let grandTotalPaymentsReceived = 0;
  let grandTotalOutstandingDues = 0;
  let grandTotalCustomerCredits = 0;

  let grandTotalOpeningSavings = 0;
  let grandTotalSavingsDeposits = 0;
  let grandTotalSavingsWithdrawals = 0;
  let grandTotalSavingsUsedForBills = 0;
  let grandTotalSavingsHeld = 0;
  let totalCustomersWithSavings = 0;

  // Process customer rows
  const customerRows = customers.map((c, index) => {
    const custId = c.id;
    const custName = c.name || 'Unnamed Customer';
    const custPhone = c.phone || '-';
    const custAccountNo = c.account?.account_number || `SMS-${index + 1001}`;
    const custType = c.customer_type?.name || c.customer_type_name || '';

    const custLedger = ledgerByCustomer[custId] || [];
    const custPrior = priorLedgerByCustomer[custId] || [];

    let custGiven = 0;
    let custReceived = 0;
    let custOpeningDue = 0;

    if (isDateFiltered) {
      let priorG = 0;
      let priorR = 0;
      custPrior.forEach((e) => {
        const amt = Number(e.amount) || 0;
        if (['credit', 'opening_balance'].includes(e.entry_type)) priorG += amt;
        else if (e.entry_type === 'debit') priorR += amt;
        else if (e.entry_type === 'adjustment') {
          if (amt >= 0) priorG += amt;
          else priorR += Math.abs(amt);
        }
      });
      custOpeningDue = priorG - priorR;

      custLedger.forEach((e) => {
        const amt = Number(e.amount) || 0;
        if (e.entry_type === 'credit') custGiven += amt;
        else if (e.entry_type === 'debit') custReceived += amt;
        else if (e.entry_type === 'adjustment') {
          if (amt >= 0) custGiven += amt;
          else custReceived += Math.abs(amt);
        } else if (e.entry_type === 'opening_balance') {
          custOpeningDue += amt;
        }
      });
    } else {
      custLedger.forEach((e) => {
        const amt = Number(e.amount) || 0;
        if (e.entry_type === 'opening_balance') {
          custOpeningDue += amt;
          custGiven += amt;
        } else if (e.entry_type === 'credit') {
          custGiven += amt;
        } else if (e.entry_type === 'debit') {
          custReceived += amt;
        } else if (e.entry_type === 'adjustment') {
          if (amt >= 0) custGiven += amt;
          else custReceived += Math.abs(amt);
        }
      });

      if (custLedger.length === 0 && c.account) {
        custGiven = Number(c.account.total_credit || 0);
        custReceived = Number(c.account.total_debit || 0);
      }
    }

    const netBal = isDateFiltered
      ? custOpeningDue + custGiven - custReceived
      : custGiven - custReceived;

    const custOutstanding = netBal > 0 ? netBal : 0;
    const custCredit = netBal < 0 ? Math.abs(netBal) : 0;

    grandTotalAmountGiven += custGiven;
    grandTotalPaymentsReceived += custReceived;
    grandTotalOutstandingDues += custOutstanding;
    grandTotalCustomerCredits += custCredit;

    // Savings
    let custOpeningSavings = 0;
    let custSavingsDeposits = 0;
    let custSavingsWithdrawals = 0;
    let custSavingsUsedForBills = 0;
    let custSavingsHeld = 0;

    if (isFull) {
      const custSav = savingsByCustomer[custId] || [];
      const custPriorSav = priorSavingsByCustomer[custId] || [];

      if (isDateFiltered) {
        let priorDep = 0;
        let priorWith = 0;
        custPriorSav.forEach((s) => {
          const amt = Number(s.amount) || 0;
          if (['OPENING', 'DEPOSIT', 'CREDIT'].includes(s.transaction_type)) priorDep += amt;
          else if (['WITHDRAWAL', 'DEBIT', 'BILL_PAYMENT'].includes(s.transaction_type)) priorWith += amt;
        });
        custOpeningSavings = priorDep - priorWith;

        custSav.forEach((s) => {
          const amt = Number(s.amount) || 0;
          if (['DEPOSIT', 'CREDIT'].includes(s.transaction_type)) custSavingsDeposits += amt;
          else if (['WITHDRAWAL', 'DEBIT'].includes(s.transaction_type)) custSavingsWithdrawals += amt;
          else if (s.transaction_type === 'BILL_PAYMENT') custSavingsUsedForBills += amt;
          else if (s.transaction_type === 'OPENING') custOpeningSavings += amt;
        });

        custSavingsHeld = Math.max(0, custOpeningSavings + custSavingsDeposits - custSavingsWithdrawals - custSavingsUsedForBills);
      } else {
        custSav.forEach((s) => {
          const amt = Number(s.amount) || 0;
          if (s.transaction_type === 'OPENING') custOpeningSavings += amt;
          else if (['DEPOSIT', 'CREDIT'].includes(s.transaction_type)) custSavingsDeposits += amt;
          else if (['WITHDRAWAL', 'DEBIT'].includes(s.transaction_type)) custSavingsWithdrawals += amt;
          else if (s.transaction_type === 'BILL_PAYMENT') custSavingsUsedForBills += amt;
        });

        custSavingsHeld = c.savings_account?.savings_balance !== undefined && c.savings_account?.savings_balance !== null
          ? Number(c.savings_account.savings_balance)
          : Math.max(0, custOpeningSavings + custSavingsDeposits - custSavingsWithdrawals - custSavingsUsedForBills);
      }

      grandTotalOpeningSavings += custOpeningSavings;
      grandTotalSavingsDeposits += custSavingsDeposits;
      grandTotalSavingsWithdrawals += custSavingsWithdrawals;
      grandTotalSavingsUsedForBills += custSavingsUsedForBills;
      grandTotalSavingsHeld += custSavingsHeld;
      if (custSavingsHeld > 0 || custSavingsDeposits > 0 || custSavingsUsedForBills > 0 || custOpeningSavings > 0) {
        totalCustomersWithSavings++;
      }
    }

    return {
      id: custId,
      name: custName,
      phone: custPhone,
      accountNo: custAccountNo,
      customerType: custType,
      given: custGiven,
      received: custReceived,
      outstanding: custOutstanding,
      credit: custCredit,
      openingSavings: custOpeningSavings,
      savingsDeposits: custSavingsDeposits,
      savingsWithdrawals: custSavingsWithdrawals,
      savingsUsedForBills: custSavingsUsedForBills,
      savingsHeld: custSavingsHeld,
    };
  });

  const netReceivable = grandTotalOutstandingDues - grandTotalCustomerCredits;

  // Process Bill Payments
  let totalBillsAmount = 0;
  let totalPaidFromSavings = 0;
  let totalRemainingAddedToOutstanding = 0;

  const processedAllBills = isFull
    ? validSavings
        .filter((tx) => tx.transaction_type === 'BILL_PAYMENT')
        .map((b) => {
          const paid = Number(b.amount) || 0;
          let totalBill = paid;
          let remToDues = 0;

          if (b.notes) {
            const totalMatch = b.notes.match(/Total Bill:\s*₹?([\d,.]+)/i);
            const remMatch = b.notes.match(/Remaining(?: added to dues| ₹)?:\s*₹?([\d,.]+)/i);
            if (totalMatch) totalBill = parseFloat(totalMatch[1].replace(/,/g, '')) || totalBill;
            if (remMatch) remToDues = parseFloat(remMatch[1].replace(/,/g, '')) || 0;
          }

          totalBillsAmount += totalBill;
          totalPaidFromSavings += paid;
          totalRemainingAddedToOutstanding += remToDues;

          const custName = b.customer?.name || (customers.find((c) => c.id === b.customer_id)?.name) || 'Customer';

          return {
            date: formatDate(b.created_at),
            customerName: custName,
            description: b.description?.replace(/^Savings Used for Bill Payment:\s*/i, '') || 'Customer Expense / Bill',
            reference: b.reference_number || '-',
            totalBill,
            paidFromSavings: paid,
            remainingToDues: remToDues,
          };
        })
    : [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${isFull ? 'All Customers - Full Account Statement' : 'All Customers - Consolidated Lending Statement'}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 10px;
      line-height: 1.35;
    }
    .statement-wrapper {
      max-width: 100%;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.5px;
      margin: 0 0 2px 0;
    }
    .brand-address {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.35;
    }
    .statement-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: ${isFull ? '#eff6ff' : '#f8fafc'};
      color: ${isFull ? '#1d4ed8' : '#334155'};
      border: 1px solid ${isFull ? '#bfdbfe' : '#cbd5e1'};
    }
    .meta-grid {
      display: table;
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 10px;
    }
    .meta-row {
      display: table-row;
    }
    .meta-cell {
      display: table-cell;
      padding: 2px 6px;
      font-size: 10px;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9px;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 700;
    }
    .rule-notice {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 3px solid #f59e0b;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      color: #92400e;
      margin-bottom: 10px;
    }
    .summary-grid {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .summary-card {
      flex: 1;
      border-radius: 6px;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
    }
    .summary-card.lending {
      border-top: 3px solid #dc2626;
    }
    .summary-card.savings {
      border-top: 3px solid #059669;
    }
    .summary-card.bills {
      border-top: 3px solid #2563eb;
    }
    .summary-card h4 {
      margin: 0 0 5px 0;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
    }
    .summary-card .row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 9.5px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .summary-card .row.total {
      border-bottom: none;
      border-top: 1.5px solid #cbd5e1;
      padding-top: 4px;
      margin-top: 2px;
      font-weight: 800;
      font-size: 10.5px;
    }
    .section-title-bar {
      background: #f1f5f9;
      border-left: 3px solid #1e3a8a;
      padding: 5px 8px;
      margin-top: 12px;
      margin-bottom: 6px;
      font-size: 10px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-after: avoid;
      break-after: avoid;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      page-break-inside: auto;
    }
    table.data-table thead {
      display: table-header-group;
    }
    table.data-table tfoot {
      display: table-footer-group;
    }
    table.data-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.data-table th {
      background: #1e293b;
      color: #ffffff;
      padding: 5px 6px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #0f172a;
    }
    table.data-table td {
      padding: 4px 6px;
      font-size: 9.5px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .bg-white { background: #ffffff; }
    .bg-alt { background: #f8fafc; }
    .table-total-row td {
      background: #f1f5f9;
      border-top: 2px solid #64748b;
      font-weight: 800;
      color: #0f172a;
      font-size: 10px;
    }
    .grand-total-callout {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-rose { background: #fee2e2; color: #991b1b; }
    .badge-emerald { background: #dcfce7; color: #166534; }
    .badge-slate { background: #f1f5f9; color: #475569; }
    .badge-indigo { background: #e0e7ff; color: #3730a3; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-rose-600 { color: #e11d48; }
    .text-rose-700 { color: #be123c; }
    .text-rose-800 { color: #9f1239; }
    .text-emerald-600 { color: #16a34a; }
    .text-emerald-700 { color: #15803d; }
    .text-emerald-800 { color: #166534; }
    .text-teal-700 { color: #0f766e; }
    .text-teal-800 { color: #115e59; }
    .text-blue-700 { color: #1d4ed8; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-600 { color: #475569; }
    .text-slate-700 { color: #334155; }
    .text-slate-800 { color: #1e293b; }
    .font-bold { font-weight: 700; }
    .sign-section {
      display: flex;
      justify-content: space-between;
      margin-top: 22px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-box {
      width: 40%;
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      text-align: center;
      font-size: 9px;
      color: #475569;
      font-weight: 600;
    }
    .stamp-box {
      width: 14%;
      height: 44px;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .footer-note {
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 12px;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="statement-wrapper">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top; width: 62%;">
          <h1 class="brand-title">Shrishail Multi Services</h1>
          <div class="brand-address">
            Kasgi, Akkalkot<br>
            Dist. Solapur, Maharashtra, India<br>
            Contact: +91 98506 67573 &bull; Smsuntnure123@gmail.com
          </div>
        </td>
        <td style="vertical-align: top; text-align: right; width: 38%;">
          <div class="statement-badge">
            ${customerTypeName ? `${customerTypeName} — ` : 'All Customers — '}${isFull ? 'Full Account Statement' : 'Lending Statement Only'}
          </div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 5px;">
            Generated: <strong>${formatDateTime(new Date())}</strong>
          </div>
        </td>
      </tr>
    </table>

    <!-- Metadata Grid -->
    <div class="meta-grid">
      <div class="meta-row">
        <div class="meta-cell" style="width: 20%;">
          <div class="meta-label">Report Scope</div>
          <div class="meta-val" style="color: #1e3a8a;">${customers.length} Accounts</div>
        </div>
        <div class="meta-cell" style="width: 20%;">
          <div class="meta-label">Customer Type</div>
          <div class="meta-val" style="font-weight: 700; color: #0284c7;">${customerTypeName || 'All Customer Types'}</div>
        </div>
        <div class="meta-cell" style="width: 20%;">
          <div class="meta-label">Statement Period</div>
          <div class="meta-val">${periodStr}</div>
        </div>
        <div class="meta-cell" style="width: 20%;">
          <div class="meta-label">Statement Type</div>
          <div class="meta-val">${isFull ? 'Full Account (Lending & Savings)' : 'Lending Statement Only'}</div>
        </div>
        <div class="meta-cell" style="width: 20%;">
          <div class="meta-label">Accounting Standard</div>
          <div class="meta-val">Independent Ledgers</div>
        </div>
      </div>
    </div>

    <!-- Notice -->
    <div class="rule-notice">
      <strong>INDEPENDENT FINANCIAL LEDGERS:</strong> Lending/Outstanding Dues and Customer Savings are two completely independent ledgers. Each customer account is maintained separately. Customer savings are held in trust and are <strong>never combined or netted</strong> with outstanding dues.
    </div>

    <!-- Top Consolidated Summaries -->
    <div class="summary-grid">
      <!-- 1. Lending Summary -->
      <div class="summary-card lending">
        <h4>Consolidated Lending Summary</h4>
        <div class="row">
          <span>Total Amount Given:</span>
          <span class="font-mono font-bold text-rose-600">${formatRupees(grandTotalAmountGiven)}</span>
        </div>
        <div class="row">
          <span>Total Payments Received:</span>
          <span class="font-mono font-bold text-emerald-600">${formatRupees(grandTotalPaymentsReceived)}</span>
        </div>
        <div class="row">
          <span>Total Outstanding Dues:</span>
          <span class="font-mono font-bold text-rose-700">${formatRupees(grandTotalOutstandingDues)}</span>
        </div>
        <div class="row">
          <span>Total Customer Credits / Advances:</span>
          <span class="font-mono font-bold text-emerald-700">${formatRupees(grandTotalCustomerCredits)}</span>
        </div>
        <div class="row total">
          <span>Net Receivable:</span>
          <span class="font-mono text-blue-700">${formatRupees(netReceivable)}</span>
        </div>
      </div>

      ${isFull ? `
      <!-- 2. Savings Summary -->
      <div class="summary-card savings">
        <h4>Consolidated Savings Summary</h4>
        <div class="row">
          <span>Total Opening Savings:</span>
          <span class="font-mono">${formatRupees(grandTotalOpeningSavings)}</span>
        </div>
        <div class="row">
          <span>Total Savings Deposits:</span>
          <span class="font-mono font-bold text-emerald-700">${formatRupees(grandTotalSavingsDeposits)}</span>
        </div>
        <div class="row">
          <span>Total Savings Withdrawals:</span>
          <span class="font-mono font-bold text-rose-600">${formatRupees(grandTotalSavingsWithdrawals)}</span>
        </div>
        <div class="row">
          <span>Total Savings Used for Bills:</span>
          <span class="font-mono font-bold text-slate-800">${formatRupees(grandTotalSavingsUsedForBills)}</span>
        </div>
        <div class="row">
          <span>Active Savers:</span>
          <span class="font-mono font-bold text-slate-700">${totalCustomersWithSavings} Customers</span>
        </div>
        <div class="row total">
          <span>Total Savings Currently Held:</span>
          <span class="font-mono text-teal-800">${formatRupees(grandTotalSavingsHeld)}</span>
        </div>
      </div>

      <!-- 3. Bill Payment Summary -->
      <div class="summary-card bills">
        <h4>Bill Payment Summary</h4>
        <div class="row">
          <span>Total Bills / Expenses:</span>
          <span class="font-mono font-bold">${formatRupees(totalBillsAmount)}</span>
        </div>
        <div class="row">
          <span>Total Paid From Savings:</span>
          <span class="font-mono font-bold text-emerald-700">${formatRupees(totalPaidFromSavings)}</span>
        </div>
        <div class="row">
          <span>Added to Outstanding:</span>
          <span class="font-mono font-bold text-rose-600">${formatRupees(totalRemainingAddedToOutstanding)}</span>
        </div>
        <div class="row">
          <span>Total Bill Transactions:</span>
          <span class="font-mono font-bold text-slate-700">${processedAllBills.length} Bills</span>
        </div>
        <div class="row total">
          <span>Savings Utilized Ratio:</span>
          <span class="font-mono text-blue-700">
            ${totalBillsAmount > 0 ? ((totalPaidFromSavings / totalBillsAmount) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- CUSTOMER-WISE BREAKDOWN TABLE -->
    <div class="section-title-bar">
      <span>${isFull ? 'CUSTOMER-WISE ACCOUNT BALANCES BREAKDOWN' : 'CUSTOMER-WISE LENDING & RECONCILIATION BREAKDOWN'}</span>
      <span style="font-size: 9.5px; font-weight: 600; text-transform: none; color: #475569;">
        ${customers.length} Accounts Included
      </span>
    </div>

    ${!isFull ? `
    <!-- Lending Statement Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">#</th>
          <th style="width: 24%;">Customer Name</th>
          <th style="width: 14%;">Account No</th>
          <th style="width: 14%;">Phone</th>
          <th style="width: 11%; text-align: right;">Amount Given</th>
          <th style="width: 11%; text-align: right;">Payments Recd</th>
          <th style="width: 11%; text-align: right;">Outstanding</th>
          <th style="width: 11%; text-align: right;">Credit / Adv</th>
        </tr>
      </thead>
      <tbody>
        ${customerRows.length === 0 ? `
          <tr>
            <td colspan="8" style="text-align: center; padding: 12px; color: #64748b;">
              No customers found in directory.
            </td>
          </tr>
        ` : customerRows.map((r, i) => `
          <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-alt'}">
            <td style="text-align: center; color: #64748b;">${i + 1}</td>
            <td>
              <strong>${r.name}</strong>
              ${r.customerType ? `<span style="font-size: 8px; background: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 3px; margin-left: 4px; font-weight: 600;">${r.customerType}</span>` : ''}
            </td>
            <td class="font-mono text-slate-700">${r.accountNo}</td>
            <td class="font-mono text-slate-600">${r.phone}</td>
            <td style="text-align: right;" class="font-mono font-bold ${r.given > 0 ? 'text-rose-600' : 'text-slate-400'}">
              ${r.given > 0 ? formatRupees(r.given) : '₹0'}
            </td>
            <td style="text-align: right;" class="font-mono font-bold ${r.received > 0 ? 'text-emerald-600' : 'text-slate-400'}">
              ${r.received > 0 ? formatRupees(r.received) : '₹0'}
            </td>
            <td style="text-align: right;" class="font-mono font-bold ${r.outstanding > 0 ? 'text-rose-700' : 'text-slate-400'}">
              ${r.outstanding > 0 ? formatRupees(r.outstanding) : '₹0'}
            </td>
            <td style="text-align: right;" class="font-mono font-bold ${r.credit > 0 ? 'text-emerald-700' : 'text-slate-400'}">
              ${r.credit > 0 ? formatRupees(r.credit) : '₹0'}
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="table-total-row">
          <td colspan="4" style="text-align: right; font-weight: 800;">
            GRAND TOTAL (${customers.length} CUSTOMERS):
          </td>
          <td style="text-align: right;" class="font-mono font-bold text-rose-700">
            ${formatRupees(grandTotalAmountGiven)}
          </td>
          <td style="text-align: right;" class="font-mono font-bold text-emerald-700">
            ${formatRupees(grandTotalPaymentsReceived)}
          </td>
          <td style="text-align: right;" class="font-mono font-bold text-rose-800">
            ${formatRupees(grandTotalOutstandingDues)}
          </td>
          <td style="text-align: right;" class="font-mono font-bold text-emerald-800">
            ${formatRupees(grandTotalCustomerCredits)}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Callout Summary -->
    <div class="grand-total-callout">
      <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; color: #1e3a8a;">
        GRAND TOTAL RECONCILIATION
      </div>
      <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 10.5px;">
        <div>Amount Given: <strong class="font-mono text-rose-600">${formatRupees(grandTotalAmountGiven)}</strong></div>
        <div>Payments Received: <strong class="font-mono text-emerald-600">${formatRupees(grandTotalPaymentsReceived)}</strong></div>
        <div>Outstanding Dues: <strong class="font-mono text-rose-700">${formatRupees(grandTotalOutstandingDues)}</strong></div>
        <div>Customer Credits: <strong class="font-mono text-emerald-700">${formatRupees(grandTotalCustomerCredits)}</strong></div>
        <div style="margin-left: auto;">Net Receivable: <strong class="font-mono text-blue-700" style="font-size: 12px;">${formatRupees(netReceivable)}</strong></div>
      </div>
    </div>
    ` : `
    <!-- Full Account Breakdown Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">#</th>
          <th style="width: 26%;">Customer Name</th>
          <th style="width: 14%;">Account No</th>
          <th style="width: 14%; text-align: right;">Outstanding</th>
          <th style="width: 14%; text-align: right;">Credit / Adv</th>
          <th style="width: 14%; text-align: right;">Savings Held</th>
          <th style="width: 14%; text-align: right;">Savings Used for Bills</th>
        </tr>
      </thead>
      <tbody>
        ${customerRows.length === 0 ? `
          <tr>
            <td colspan="7" style="text-align: center; padding: 12px; color: #64748b;">
              No customers found in directory.
            </td>
          </tr>
        ` : customerRows.map((r, i) => `
          <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-alt'}">
            <td style="text-align: center; color: #64748b;">${i + 1}</td>
            <td>
              <strong>${r.name}</strong>
              <span style="font-size: 8.5px; color: #64748b; margin-left: 4px;">(${r.phone})</span>
              ${r.customerType ? `<span style="font-size: 8px; background: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 3px; margin-left: 4px; font-weight: 600;">${r.customerType}</span>` : ''}
            </td>
            <td class="font-mono text-slate-700">${r.accountNo}</td>
            <td style="text-align: right;" class="font-mono font-bold ${r.outstanding > 0 ? 'text-rose-700' : 'text-slate-400'}">
              ${r.outstanding > 0 ? formatRupees(r.outstanding) : '₹0'}
            </td>
            <td style="text-align: right;" class="font-mono font-bold ${r.credit > 0 ? 'text-emerald-700' : 'text-slate-400'}">
              ${r.credit > 0 ? formatRupees(r.credit) : '₹0'}
            </td>
            <td style="text-align: right;" class="font-mono font-bold ${r.savingsHeld > 0 ? 'text-teal-700' : 'text-slate-400'}">
              ${r.savingsHeld > 0 ? formatRupees(r.savingsHeld) : '₹0'}
            </td>
            <td style="text-align: right;" class="font-mono font-bold ${r.savingsUsedForBills > 0 ? 'text-slate-800' : 'text-slate-400'}">
              ${r.savingsUsedForBills > 0 ? formatRupees(r.savingsUsedForBills) : '₹0'}
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="table-total-row">
          <td colspan="3" style="text-align: right; font-weight: 800;">
            GRAND TOTAL (${customers.length} CUSTOMERS):
          </td>
          <td style="text-align: right;" class="font-mono font-bold text-rose-800">
            ${formatRupees(grandTotalOutstandingDues)}
          </td>
          <td style="text-align: right;" class="font-mono font-bold text-emerald-800">
            ${formatRupees(grandTotalCustomerCredits)}
          </td>
          <td style="text-align: right;" class="font-mono font-bold text-teal-800">
            ${formatRupees(grandTotalSavingsHeld)}
          </td>
          <td style="text-align: right;" class="font-mono font-bold text-slate-900">
            ${formatRupees(grandTotalSavingsUsedForBills)}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Callout Summary for Full Statement -->
    <div class="grand-total-callout">
      <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; margin-bottom: 5px; color: #1e3a8a;">
        GRAND TOTAL SUMMARY
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 10px;">
        <div>Outstanding Dues:<br><strong class="font-mono text-rose-700" style="font-size: 12px;">${formatRupees(grandTotalOutstandingDues)}</strong></div>
        <div>Customer Credits:<br><strong class="font-mono text-emerald-700" style="font-size: 12px;">${formatRupees(grandTotalCustomerCredits)}</strong></div>
        <div>Savings Held:<br><strong class="font-mono text-teal-700" style="font-size: 12px;">${formatRupees(grandTotalSavingsHeld)}</strong></div>
        <div>Savings Used for Bills:<br><strong class="font-mono text-slate-800" style="font-size: 12px;">${formatRupees(grandTotalSavingsUsedForBills)}</strong></div>
      </div>
    </div>
    `}

    ${isFull && processedAllBills.length > 0 ? `
    <!-- BILLS PAID USING SAVINGS SECTION -->
    <div class="section-title-bar">
      <span>BILLS / EXPENSES PAID USING SAVINGS (${processedAllBills.length} BILLS)</span>
      <span style="font-size: 9.5px; font-weight: 600; text-transform: none; color: #475569;">
        Total Paid From Savings: ${formatRupees(totalPaidFromSavings)}
      </span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 10%;">Date</th>
          <th style="width: 20%;">Customer</th>
          <th style="width: 26%;">Bill Description</th>
          <th style="width: 12%;">Ref / Bill No</th>
          <th style="width: 11%; text-align: right;">Total Bill</th>
          <th style="width: 11%; text-align: right;">Paid From Savings</th>
          <th style="width: 10%; text-align: right;">Added to Dues</th>
        </tr>
      </thead>
      <tbody>
        ${processedAllBills.map((b, i) => `
          <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-alt'}">
            <td class="font-mono">${b.date}</td>
            <td><strong>${b.customerName}</strong></td>
            <td>${b.description}</td>
            <td class="font-mono" style="font-size: 9px; color: #64748b;">${b.reference}</td>
            <td style="text-align: right;" class="font-mono">${formatRupees(b.totalBill)}</td>
            <td style="text-align: right;" class="font-mono font-bold text-emerald-700">${formatRupees(b.paidFromSavings)}</td>
            <td style="text-align: right;" class="font-mono ${b.remainingToDues > 0 ? 'font-bold text-rose-600' : 'text-slate-400'}">
              ${b.remainingToDues > 0 ? formatRupees(b.remainingToDues) : '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="table-total-row">
          <td colspan="4" style="text-align: right; font-weight: 800;">TOTALS:</td>
          <td style="text-align: right;" class="font-mono font-bold">${formatRupees(totalBillsAmount)}</td>
          <td style="text-align: right;" class="font-mono font-bold text-emerald-700">${formatRupees(totalPaidFromSavings)}</td>
          <td style="text-align: right;" class="font-mono font-bold text-rose-600">${formatRupees(totalRemainingAddedToOutstanding)}</td>
        </tr>
      </tfoot>
    </table>
    ` : ''}

    ${validLedger.length > 0 ? `
    <!-- DETAILED TRANSACTION LOG (TALLY / AUDIT TRAIL) -->
    <div class="section-title-bar">
      <span>CHRONOLOGICAL TRANSACTION LOG (TALLY / AUDIT TRAIL)</span>
      <span style="font-size: 9.5px; font-weight: 600; text-transform: none; color: #475569;">
        ${validLedger.length} Transaction(s)
      </span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 10%;">Date</th>
          <th style="width: 20%;">Customer</th>
          <th style="width: 10%; text-align: center;">Type</th>
          <th style="width: 26%;">Description</th>
          <th style="width: 12%;">Ref No</th>
          <th style="width: 11%; text-align: right;">Amount Given</th>
          <th style="width: 11%; text-align: right;">Payment Recd</th>
        </tr>
      </thead>
      <tbody>
        ${validLedger.map((e, i) => {
          const amt = Number(e.amount) || 0;
          let given = 0;
          let received = 0;
          if (['credit', 'opening_balance'].includes(e.entry_type)) given = amt;
          else if (e.entry_type === 'debit') received = amt;
          else if (e.entry_type === 'adjustment') {
            if (amt >= 0) given = amt;
            else received = Math.abs(amt);
          }
          const custName = e.customer?.name || (customers.find((c) => c.id === e.customer_id)?.name) || 'Customer';
          return `
            <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-alt'}">
              <td class="font-mono">${formatDate(e.created_at)}</td>
              <td><strong>${custName}</strong></td>
              <td style="text-align: center;">
                <span class="badge ${
                  e.entry_type === 'credit' ? 'badge-rose' :
                  e.entry_type === 'debit' ? 'badge-emerald' :
                  e.entry_type === 'opening_balance' ? 'badge-slate' : 'badge-indigo'
                }">
                  ${e.entry_type === 'credit' ? 'Given' : e.entry_type === 'debit' ? 'Payment' : e.entry_type === 'opening_balance' ? 'Opening' : 'Adj'}
                </span>
              </td>
              <td>${e.description || '-'}</td>
              <td class="font-mono" style="font-size: 9px; color: #64748b;">${e.reference_no || '-'}</td>
              <td style="text-align: right;" class="font-mono font-bold text-rose-600">${given > 0 ? formatRupees(given) : '-'}</td>
              <td style="text-align: right;" class="font-mono font-bold text-emerald-600">${received > 0 ? formatRupees(received) : '-'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
      <tfoot>
        <tr class="table-total-row">
          <td colspan="5" style="text-align: right; font-weight: 800;">PERIOD TRANSACTIONS TOTAL:</td>
          <td style="text-align: right;" class="font-mono font-bold text-rose-700">${formatRupees(grandTotalAmountGiven)}</td>
          <td style="text-align: right;" class="font-mono font-bold text-emerald-700">${formatRupees(grandTotalPaymentsReceived)}</td>
        </tr>
      </tfoot>
    </table>
    ` : ''}

    <!-- Signatures -->
    <div class="sign-section">
      <div class="sign-box">
        Prepared & Verified By<br>
        <span style="font-size: 8px; color: #94a3b8;">Accountant / Data Operator</span>
      </div>
      <div class="stamp-box">
        Center Stamp
      </div>
      <div class="sign-box">
        Authorized Signatory<br>
        <span style="font-size: 8px; color: #94a3b8;">Shrishail Multi Services</span>
      </div>
    </div>

    <!-- Footer Note -->
    <div class="footer-note">
      Consolidated business audit and Tally reconciliation document generated by Shrishail Multi Services Khata Management System.
      For inquiries or statement verification, contact +91 98506 67573 &bull; Smsuntnure123@gmail.com.
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;
};

/**
 * Main dispatcher for Statement HTML Generation
 */
export const generateStatementHTML = (props) => {
  if (props.isAllCustomers || (!props.customer && props.customers?.length > 0)) {
    return generateConsolidatedStatementHTML(props);
  }
  return generateIndividualStatementHTML(props);
};

/**
 * Triggers the browser print dialog with the generated statement HTML
 */
export const printStatement = (statementProps) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to print statements.');
    return;
  }

  const html = generateStatementHTML(statementProps);
  printWindow.document.write(html);
  printWindow.document.close();
};
