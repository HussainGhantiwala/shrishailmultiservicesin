import { formatRupees } from './currency';
import { formatDate, formatDateTime } from './date';

/**
 * Shrishail Multi Services - Statement Printing Engine
 * Generates highly professional, standard-compliant financial statements
 * adhering strictly to the Independent Financial Ledgers architecture:
 * 1. Lending Statement Only
 * 2. Full Account Statement (Separated Sections A, B, C; NEVER combined balance)
 */

export const generateStatementHTML = ({
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
    // Exclude savings settlements from cash receipts
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

  // Authoritative current balances
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

  // HTML Generation starts here
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${isFull ? 'Full Account Statement' : 'Lending Statement'} - ${customerName}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
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
      padding: 10px 14px;
      margin-bottom: 14px;
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
    .section-title-bar {
      background: #f1f5f9;
      border-left: 4px solid #2563eb;
      padding: 6px 10px;
      margin: 16px 0 8px 0;
      font-size: 11.5px;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title-bar.savings {
      border-left-color: #059669;
      background: #ecfdf5;
      color: #065f46;
    }
    .section-title-bar.bills {
      border-left-color: #d97706;
      background: #fffbeb;
      color: #92400e;
    }
    .rule-notice {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 10px;
      color: #854d0e;
      margin-bottom: 12px;
    }
    .stats-summary-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    .stat-pill {
      flex: 1;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }
    .stat-pill .label {
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
    }
    .stat-pill .value {
      font-size: 12px;
      font-weight: 800;
      font-family: monospace;
      margin-top: 2px;
    }
    .stat-pill .value.due { color: #dc2626; }
    .stat-pill .value.paid { color: #16a34a; }
    .stat-pill .value.savings { color: #059669; }
    .stat-pill .value.blue { color: #2563eb; }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10.5px;
    }
    table.data-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    table.data-table td {
      padding: 5.5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    table.data-table tr:nth-child(even) {
      background: #fafafa;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: monospace; }
    .text-danger { color: #dc2626; font-weight: 700; }
    .text-success { color: #16a34a; font-weight: 700; }
    .text-purple { color: #9333ea; font-weight: 700; }

    .bottom-summary-grid {
      display: flex;
      gap: 12px;
      margin-top: 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
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
      margin-top: 28px;
      page-break-inside: avoid;
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
            Contact: +91 74163 98023 / +91 98230 11223 &bull; info@shrishailmultiservices.in
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
        <div class="meta-cell" style="width: 32%;">
          <div class="meta-label">Customer Name</div>
          <div class="meta-val" style="font-size: 12.5px; color: #1e3a8a;">${customerName}</div>
        </div>
        <div class="meta-cell" style="width: 25%;">
          <div class="meta-label">Account Number</div>
          <div class="meta-val font-mono">${accountNumber}</div>
        </div>
        <div class="meta-cell" style="width: 23%;">
          <div class="meta-label">Phone Number</div>
          <div class="meta-val">${customerPhone}</div>
        </div>
        <div class="meta-cell" style="width: 20%;">
          <div class="meta-label">Statement Period</div>
          <div class="meta-val">${periodStr}</div>
        </div>
      </div>
    </div>

    ${isFull ? `
    <!-- Rule Notice for Full Account Statement -->
    <div class="rule-notice">
      <strong>INDEPENDENT FINANCIAL LEDGERS:</strong> Lending/Outstanding dues and Customer Savings are two completely separate financial accounts. Customer savings is held separately and is <strong>never combined</strong> with lending dues.
    </div>
    ` : ''}

    <!-- ==================================================================== -->
    <!-- SECTION A: LENDING / OUTSTANDING LEDGER -->
    <!-- ==================================================================== -->
    <div class="section-title-bar">
      <span>SECTION A — LENDING / OUTSTANDING LEDGER</span>
      <span style="font-size: 10px; font-weight: 600; text-transform: none; color: #475569;">
        Current Dues: <strong class="font-mono text-danger">${formatRupees(currentOutstanding)}</strong>
        ${currentAdvance > 0 ? ` &bull; Advance: <strong class="font-mono text-success">${formatRupees(currentAdvance)}</strong>` : ''}
      </span>
    </div>

    <!-- Stats Summary Bar for Lending -->
    <div class="stats-summary-bar">
      <div class="stat-pill">
        <div class="label">Opening Due</div>
        <div class="value font-mono">${formatRupees(openingDue)}</div>
      </div>
      <div class="stat-pill">
        <div class="label">Total Amount Given</div>
        <div class="value due font-mono">+${formatRupees(totalGiven)}</div>
      </div>
      <div class="stat-pill">
        <div class="label">Cash/UPI Payments</div>
        <div class="value paid font-mono">-${formatRupees(totalCashReceived)}</div>
      </div>
      <div class="stat-pill">
        <div class="label">Current Outstanding</div>
        <div class="value due font-mono">${formatRupees(currentOutstanding)}</div>
      </div>
      ${currentAdvance > 0 ? `
      <div class="stat-pill">
        <div class="label">Customer Advance</div>
        <div class="value paid font-mono">${formatRupees(currentAdvance)}</div>
      </div>
      ` : ''}
    </div>

    <!-- Lending Transactions Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 14%;">Date & Time</th>
          <th style="width: 14%;">Ref No</th>
          <th>Particulars / Description</th>
          <th style="width: 13%;">Payment Method</th>
          <th style="width: 13%;" class="text-right">Amount Given (+)</th>
          <th style="width: 13%;" class="text-right">Payment Recd (-)</th>
          <th style="width: 15%;" class="text-right">Running Outstanding</th>
        </tr>
      </thead>
      <tbody>
        ${processedLedger.length === 0 ? `
        <tr>
          <td colspan="7" class="text-center" style="padding: 12px; color: #64748b;">
            No lending transactions found in this statement period.
          </td>
        </tr>
        ` : processedLedger.map((row) => `
        <tr>
          <td>${formatDateTime(row.created_at)}</td>
          <td class="font-mono">${row.reference_no || '-'}</td>
          <td>
            <strong>${row.description || 'Transaction'}</strong>
            ${row.notes ? `<div style="font-size: 9px; color: #64748b;">${row.notes}</div>` : ''}
          </td>
          <td>${row.payment_method === 'Other' ? (row.other_payment_method || 'Other') : (row.payment_method || 'Cash')}</td>
          <td class="text-right font-mono ${row.givenAmt > 0 ? 'text-danger' : ''}">
            ${row.givenAmt > 0 ? `+${formatRupees(row.givenAmt)}` : '-'}
          </td>
          <td class="text-right font-mono ${row.receivedAmt > 0 ? 'text-success' : ''}">
            ${row.receivedAmt > 0 ? `-${formatRupees(row.receivedAmt)}` : '-'}
          </td>
          <td class="text-right font-mono" style="font-weight: 700; color: ${row.runningOut > 0 ? '#dc2626' : '#0f172a'};">
            ${formatRupees(row.runningOut)}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    ${isFull ? `
    <!-- ==================================================================== -->
    <!-- SECTION B: CUSTOMER SAVINGS LEDGER -->
    <!-- ==================================================================== -->
    <div class="section-title-bar savings">
      <span>SECTION B — CUSTOMER SAVINGS LEDGER</span>
      <span style="font-size: 10px; font-weight: 600; text-transform: none; color: #065f46;">
        Current Savings Held: <strong class="font-mono">${formatRupees(currentSavingsBalance)}</strong>
      </span>
    </div>

    <!-- Stats Summary Bar for Savings -->
    <div class="stats-summary-bar">
      <div class="stat-pill">
        <div class="label">Opening Savings</div>
        <div class="value savings font-mono">${formatRupees(openingSavings)}</div>
      </div>
      <div class="stat-pill">
        <div class="label">Total Deposited</div>
        <div class="value savings font-mono">+${formatRupees(totalSavingsDeposited)}</div>
      </div>
      <div class="stat-pill">
        <div class="label">Total Withdrawn</div>
        <div class="value purple font-mono">-${formatRupees(totalSavingsWithdrawn)}</div>
      </div>
      <div class="stat-pill">
        <div class="label">Used for Bills</div>
        <div class="value due font-mono">-${formatRupees(totalSavingsUsedBills)}</div>
      </div>
      <div class="stat-pill">
        <div class="label">Current Savings</div>
        <div class="value savings font-mono">${formatRupees(currentSavingsBalance)}</div>
      </div>
    </div>

    <!-- Savings Transactions Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 14%;">Date & Time</th>
          <th style="width: 14%;">Ref No</th>
          <th>Description / Particulars</th>
          <th style="width: 13%;">Transaction Type</th>
          <th style="width: 13%;" class="text-right">Deposit (+)</th>
          <th style="width: 13%;" class="text-right">Withdrawn / Used (-)</th>
          <th style="width: 15%;" class="text-right">Running Savings</th>
        </tr>
      </thead>
      <tbody>
        ${processedSavings.length === 0 ? `
        <tr>
          <td colspan="7" class="text-center" style="padding: 12px; color: #64748b;">
            No savings transactions found for this customer.
          </td>
        </tr>
        ` : processedSavings.map((row) => `
        <tr>
          <td>${formatDateTime(row.created_at)}</td>
          <td class="font-mono">${row.reference_number || '-'}</td>
          <td>
            <strong>${row.description || 'Savings Transaction'}</strong>
            ${row.notes ? `<div style="font-size: 9px; color: #64748b;">${row.notes}</div>` : ''}
          </td>
          <td>
            <span style="font-weight: 700; color: ${
              row.transaction_type === 'BILL_PAYMENT' ? '#d97706' :
              row.transaction_type === 'OPENING' ? '#2563eb' :
              ['DEPOSIT', 'CREDIT'].includes(row.transaction_type) ? '#059669' : '#9333ea'
            };">
              ${row.transaction_type}
            </span>
          </td>
          <td class="text-right font-mono ${row.depAmt > 0 ? 'text-success' : ''}">
            ${row.depAmt > 0 ? `+${formatRupees(row.depAmt)}` : '-'}
          </td>
          <td class="text-right font-mono ${row.withAmt > 0 ? 'text-danger' : ''}">
            ${row.withAmt > 0 ? `-${formatRupees(row.withAmt)}` : '-'}
          </td>
          <td class="text-right font-mono text-success" style="font-weight: 700;">
            ${formatRupees(row.runningSavings)}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- ==================================================================== -->
    <!-- SECTION C: BILLS / EXPENSES PAID USING SAVINGS -->
    <!-- ==================================================================== -->
    <div class="section-title-bar bills">
      <span>SECTION C — BILLS / EXPENSES PAID USING SAVINGS</span>
      <span style="font-size: 10px; font-weight: 600; text-transform: none; color: #92400e;">
        Total Paid from Savings: <strong class="font-mono">${formatRupees(totalSavingsUsedBills)}</strong>
      </span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 13%;">Date</th>
          <th>Bill / Expense Particulars</th>
          <th style="width: 14%;">Bill / Ref No</th>
          <th style="width: 14%;" class="text-right">Bill Amount</th>
          <th style="width: 15%;" class="text-right">Paid From Savings</th>
          <th style="width: 16%;" class="text-right">Added to Dues</th>
          <th style="width: 14%;" class="text-right">Savings After</th>
        </tr>
      </thead>
      <tbody>
        ${processedBills.length === 0 ? `
        <tr>
          <td colspan="7" class="text-center" style="padding: 12px; color: #64748b;">
            No customer bills or expenses paid using savings in this period.
          </td>
        </tr>
        ` : processedBills.map((b) => `
        <tr>
          <td>${b.date}</td>
          <td><strong>${b.description}</strong></td>
          <td class="font-mono">${b.reference}</td>
          <td class="text-right font-mono" style="font-weight: 700;">${formatRupees(b.totalBill)}</td>
          <td class="text-right font-mono text-success">-${formatRupees(b.paidFromSavings)}</td>
          <td class="text-right font-mono ${b.remainingToDues > 0 ? 'text-danger' : ''}">
            ${b.remainingToDues > 0 ? `+${formatRupees(b.remainingToDues)}` : '₹0.00'}
          </td>
          <td class="text-right font-mono text-success">${formatRupees(b.savingsBalanceAfter)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- Bottom Consolidated Summary (Separated, Never Combined) -->
    <div class="bottom-summary-grid">
      <!-- Box 1: Lending Summary -->
      <div class="summary-card lending">
        <h4>Lending / Outstanding Summary</h4>
        <div class="row">
          <span>Opening Due Balance:</span>
          <span class="font-mono">${formatRupees(openingDue)}</span>
        </div>
        <div class="row">
          <span>Total Amount Given (Lending):</span>
          <span class="font-mono text-danger">+${formatRupees(totalGiven)}</span>
        </div>
        <div class="row">
          <span>Total Cash/UPI Payments Received:</span>
          <span class="font-mono text-success">-${formatRupees(totalCashReceived)}</span>
        </div>
        ${totalAdjustment !== 0 ? `
        <div class="row">
          <span>Adjustments:</span>
          <span class="font-mono">${formatRupees(totalAdjustment)}</span>
        </div>
        ` : ''}
        ${currentAdvance > 0 ? `
        <div class="row">
          <span>Customer Advance / Credit:</span>
          <span class="font-mono text-success">${formatRupees(currentAdvance)}</span>
        </div>
        ` : ''}
        <div class="row total">
          <span>Current Outstanding Dues:</span>
          <span class="font-mono text-danger">${formatRupees(currentOutstanding)}</span>
        </div>
      </div>

      ${isFull ? `
      <!-- Box 2: Savings Summary -->
      <div class="summary-card savings">
        <h4>Customer Savings Summary</h4>
        <div class="row">
          <span>Initial Opening Savings:</span>
          <span class="font-mono">${formatRupees(openingSavings)}</span>
        </div>
        <div class="row">
          <span>Total Savings Deposited:</span>
          <span class="font-mono text-success">+${formatRupees(totalSavingsDeposited)}</span>
        </div>
        <div class="row">
          <span>Total Cash Withdrawals:</span>
          <span class="font-mono text-danger">-${formatRupees(totalSavingsWithdrawn)}</span>
        </div>
        <div class="row">
          <span>Total Savings Used for Bills:</span>
          <span class="font-mono text-danger">-${formatRupees(totalSavingsUsedBills)}</span>
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
      For inquiries or statement verification, contact support at +91 74163 98023.
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
