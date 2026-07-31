import type { Expense } from '../store/slices/expenseSlice';
// Imported from the palette module rather than the theme barrel: the barrel
// re-exports a .tsx React context, which drags React Native into any consumer
// (including the test runner). This file must stay dependency-light.
import { categories, paymentMethods } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';

export interface ExportRange {
    /** Inclusive start of the export window. */
    start: Date;
    /** Inclusive end of the export window. */
    end: Date;
    /** Human label used in filenames and the PDF heading, e.g. "August 2026". */
    label: string;
}

export interface ExportSummary {
    totalExpense: number;
    totalIncome: number;
    balance: number;
    count: number;
    byCategory: { category: string; label: string; total: number }[];
}

export const labelFor = (key: string) =>
    categories[key as keyof typeof categories]?.label ?? key;

export const methodLabel = (key: string) =>
    paymentMethods[key as keyof typeof paymentMethods]?.label ?? key;

/** Filter to the window and order oldest-first, as a statement would read. */
export function selectForExport(items: Expense[], range: ExportRange): Expense[] {
    return items
        .filter((item) => {
            const d = new Date(item.date);
            return d >= range.start && d <= range.end;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function summarise(rows: Expense[]): ExportSummary {
    let totalExpense = 0;
    let totalIncome = 0;
    const byCategory = new Map<string, number>();

    for (const row of rows) {
        if (row.type === 'expense') {
            totalExpense += row.amount;
            byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.amount);
        } else {
            totalIncome += row.amount;
        }
    }

    return {
        totalExpense,
        totalIncome,
        balance: totalIncome - totalExpense,
        count: rows.length,
        byCategory: [...byCategory.entries()]
            .map(([category, total]) => ({ category, label: labelFor(category), total }))
            .sort((a, b) => b.total - a.total),
    };
}

/**
 * RFC 4180 escaping: wrap in quotes when the value contains a comma, quote or
 * newline, and double any embedded quotes. Without this a description like
 * `Lunch, tip` silently shifts every later column.
 */
export function csvCell(value: string | number): string {
    const s = String(value ?? '');
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export const CSV_HEADERS = [
    'Date',
    'Type',
    'Category',
    'Description',
    'Payment Method',
    'Amount',
    'Recurring',
];

export function toCSV(rows: Expense[]): string {
    const lines = [CSV_HEADERS.join(',')];

    for (const row of rows) {
        lines.push([
            csvCell(new Date(row.date).toISOString().slice(0, 10)),
            csvCell(row.type),
            csvCell(labelFor(row.category)),
            csvCell(row.description),
            csvCell(methodLabel(row.paymentMethod)),
            // Signed so a spreadsheet SUM over the column is meaningful.
            csvCell(row.type === 'expense' ? -row.amount : row.amount),
            csvCell(row.isRecurring ? 'yes' : 'no'),
        ].join(','));
    }

    // Trailing newline so the file ends cleanly for line-based tools.
    return lines.join('\n') + '\n';
}

export const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, (ch) =>
    ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch] as string)
    );

export function toHTML(
    rows: Expense[],
    summary: ExportSummary,
    range: ExportRange,
    currency = 'INR'
): string {
    const rowsHtml = rows
        .map((row) => {
            const isExpense = row.type === 'expense';
            return `
        <tr>
          <td>${new Date(row.date).toLocaleDateString('en-IN')}</td>
          <td>${escapeHtml(labelFor(row.category))}</td>
          <td>${escapeHtml(row.description || '—')}</td>
          <td>${escapeHtml(methodLabel(row.paymentMethod))}</td>
          <td class="amt ${isExpense ? 'out' : 'in'}">
            ${isExpense ? '−' : '+'}${escapeHtml(formatCurrency(row.amount, currency))}
          </td>
        </tr>`;
        })
        .join('');

    const categoryHtml = summary.byCategory
        .map(
            (c) => `
        <tr>
          <td>${escapeHtml(c.label)}</td>
          <td class="amt">${escapeHtml(formatCurrency(c.total, currency))}</td>
        </tr>`
        )
        .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, "Helvetica Neue", Roboto, sans-serif;
      color: #1C1C1E;
      padding: 32px;
      font-size: 12px;
    }
    h1 { font-size: 22px; margin: 0 0 4px; color: #8A64EB; }
    .sub { color: #8E8E93; margin-bottom: 24px; }
    .cards { display: flex; gap: 12px; margin-bottom: 28px; }
    .card {
      flex: 1; border: 1px solid #ECEEF5; border-radius: 10px; padding: 12px 14px;
    }
    .card .k { color: #8E8E93; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
    .card .v { font-size: 17px; font-weight: 700; margin-top: 4px; }
    h2 { font-size: 14px; margin: 24px 0 8px; }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; font-size: 10px; text-transform: uppercase;
      letter-spacing: .4px; color: #8E8E93; border-bottom: 1px solid #ECEEF5;
      padding: 8px 6px;
    }
    td { padding: 7px 6px; border-bottom: 1px solid #F5F6FA; }
    .amt { text-align: right; white-space: nowrap; }
    .out { color: #FF3B30; }
    .in { color: #2E7D32; }
    tfoot td { font-weight: 700; border-top: 2px solid #ECEEF5; border-bottom: none; }
  </style>
</head>
<body>
  <h1>PocketExpense+</h1>
  <div class="sub">Statement for ${escapeHtml(range.label)} &middot; ${summary.count} transaction${summary.count === 1 ? '' : 's'}</div>

  <div class="cards">
    <div class="card"><div class="k">Spent</div><div class="v out">${escapeHtml(formatCurrency(summary.totalExpense, currency))}</div></div>
    <div class="card"><div class="k">Received</div><div class="v in">${escapeHtml(formatCurrency(summary.totalIncome, currency))}</div></div>
    <div class="card"><div class="k">Net</div><div class="v">${escapeHtml(formatCurrency(summary.balance, currency))}</div></div>
  </div>

  ${summary.byCategory.length
            ? `<h2>By category</h2>
  <table><tbody>${categoryHtml}</tbody></table>`
            : ''
        }

  <h2>Transactions</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th class="amt">Amount</th></tr>
    </thead>
    <tbody>${rowsHtml || '<tr><td colspan="5">No transactions in this period.</td></tr>'}</tbody>
    <tfoot>
      <tr><td colspan="4">Net</td><td class="amt">${escapeHtml(formatCurrency(summary.balance, currency))}</td></tr>
    </tfoot>
  </table>
</body>
</html>`;
}
