import { business } from '../config/business';

/**
 * Print an HTML fragment (tables/reports) in a new window.
 * @param {{ title: string, bodyHtml: string, subtitle?: string }} opts
 */
export function printHtml({ title, bodyHtml, subtitle = '' }) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) {
    throw new Error('Pop-up blocked. Allow pop-ups to print.');
  }
  const printedAt = new Date().toLocaleString('en-PK');
  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; color: #1B1F20; margin: 24px; font-size: 13px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #5C6567; margin-bottom: 16px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #E4E6E6; padding: 6px 8px; text-align: left; }
    th { background: #FBF6EF; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin: 12px 0 16px; }
    .stat { border: 1px solid #E4E6E6; border-left: 3px solid #A8662E; padding: 8px 10px; }
    .stat .label { font-size: 10px; text-transform: uppercase; color: #5C6567; }
    .stat .value { font-size: 16px; font-weight: 600; margin-top: 2px; }
    .letterhead { border-bottom: 1px solid #E4E6E6; padding-bottom: 10px; margin-bottom: 12px; }
    .letterhead .biz { font-weight: 700; font-size: 16px; }
    @media print {
      body { margin: 12px; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="letterhead">
    <div class="biz">${escapeHtml(business.name)}</div>
    <div class="meta">${escapeHtml([business.address, business.phone].filter(Boolean).join(' · '))}</div>
  </div>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(subtitle)}${subtitle ? ' · ' : ''}Printed ${escapeHtml(printedAt)}</div>
  ${bodyHtml}
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`);
  win.document.close();
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printTable({ title, subtitle, columns, rows, stats = [] }) {
  const statsHtml = stats.length
    ? `<div class="stats">${stats
        .map(
          (s) =>
            `<div class="stat"><div class="label">${escapeHtml(s.label)}</div><div class="value">${escapeHtml(s.value)}</div></div>`,
        )
        .join('')}</div>`
    : '';
  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const body = rows.length
    ? rows
        .map(
          (row) =>
            `<tr>${columns
              .map((c) => `<td>${escapeHtml(c.value ? c.value(row) : row[c.key])}</td>`)
              .join('')}</tr>`,
        )
        .join('')
    : `<tr><td colspan="${columns.length}">No records</td></tr>`;

  printHtml({
    title,
    subtitle,
    bodyHtml: `${statsHtml}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
  });
}
