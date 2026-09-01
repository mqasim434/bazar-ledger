import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import { searchAll } from '../searchService';

export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ clients: [], salesmen: [] });
  const debounced = useDebounce(q, 300);
  const navigate = useNavigate();
  const wrap = useRef(null);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults({ clients: [], salesmen: [] });
      return;
    }
    searchAll(debounced)
      .then(setResults)
      .catch(() => setResults({ clients: [], salesmen: [] }));
  }, [debounced]);

  useEffect(() => {
    function onDoc(e) {
      if (!wrap.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function go(path) {
    setOpen(false);
    setQ('');
    navigate(path);
  }

  const empty = results.clients.length === 0 && results.salesmen.length === 0;

  return (
    <div ref={wrap} className="relative max-w-xl">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            navigate(`/search?q=${encodeURIComponent(q)}`);
            setOpen(false);
          }
        }}
        placeholder="Search shops, serials, salesmen…"
        className="h-9 w-full rounded-md border border-ink-100 bg-surface px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {open && q && (
        <div className="absolute z-40 mt-1 w-full rounded-md border border-ink-100 bg-card shadow-card">
          {empty && <p className="px-3 py-4 text-sm text-ink-500">No matches</p>}
          {results.clients.length > 0 && (
            <Group title="Clients">
              {results.clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                  onClick={() => go(`/clients/${c.id}`)}
                >
                  {c.shopName}{' '}
                  <span className="text-ink-500">· {c.serialNumber}</span>
                </button>
              ))}
            </Group>
          )}
          {results.salesmen.length > 0 && (
            <Group title="Salesmen">
              {results.salesmen.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                  onClick={() => go(`/salesmen/${s.id}`)}
                >
                  {s.name} <span className="text-ink-500">· {s.area || '—'}</span>
                </button>
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="border-b border-ink-100 last:border-0">
      <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      {children}
    </div>
  );
}
