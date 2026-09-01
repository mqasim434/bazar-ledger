export function Table({ columns, rows, empty, keyField = 'id', onRowClick, sticky = true }) {
  return (
    <div className="overflow-x-auto rounded-md border border-ink-100 bg-card">
      <table className="min-w-full border-collapse text-sm">
        <thead className={sticky ? 'sticky top-0 z-10' : ''}>
          <tr className="border-b border-ink-100 bg-brand-50 text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-3 py-2.5 font-heading text-xs font-semibold uppercase tracking-wide text-ink-700"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-12 text-center text-ink-500">
                {empty || 'No records yet.'}
              </td>
            </tr>
          )}
          {rows.map((row, idx) => (
            <tr
              key={row[keyField] ?? idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-ink-100 last:border-0 ${
                onRowClick ? 'cursor-pointer hover:bg-brand-50/60' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2.5 align-middle text-ink-900 tnum">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
