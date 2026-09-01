import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';

export function SearchableSelect({
  label,
  required,
  error,
  hint,
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  getOptionLabel = (o) => o.label,
  getOptionValue = (o) => o.value,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  const selected = options.find((o) => getOptionValue(o) === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => getOptionLabel(o).toLowerCase().includes(q));
  }, [options, query, getOptionLabel]);

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="block space-y-1.5" ref={wrapRef}>
      {label && (
        <span className="block text-sm font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            'flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-left text-sm',
            error ? 'border-danger' : 'border-ink-100',
            'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span className={selected ? 'text-ink-900' : 'text-ink-300'}>
            {selected ? getOptionLabel(selected) : placeholder}
          </span>
          <span className="text-ink-300">▾</span>
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-ink-100 bg-white shadow-card">
            <div className="border-b border-ink-100 p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 w-full rounded-md border border-ink-100 px-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            <ul className="max-h-56 overflow-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-ink-500">No matches</li>
              )}
              {filtered.map((o) => {
                const val = getOptionValue(o);
                return (
                  <li key={val}>
                    <button
                      type="button"
                      className={clsx(
                        'w-full px-3 py-2 text-left text-sm hover:bg-brand-50',
                        val === value && 'bg-brand-50 text-brand-700',
                      )}
                      onClick={() => {
                        onChange(val, o);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      {getOptionLabel(o)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {error && <span className="block text-xs text-danger">{error}</span>}
      {hint && !error && <span className="block text-xs text-ink-500">{hint}</span>}
    </div>
  );
}
