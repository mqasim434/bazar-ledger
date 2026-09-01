import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Input, PageHeader, Spinner } from '../../../components/ui';
import { searchAll } from '../searchService';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [city, setCity] = useState(params.get('city') || '');
  const [results, setResults] = useState({ clients: [], salesmen: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!q.trim() && !city.trim()) {
      setResults({ clients: [], salesmen: [] });
      return;
    }
    setLoading(true);
    searchAll(q || city, { city })
      .then(setResults)
      .finally(() => setLoading(false));
  }, [q, city]);

  return (
    <div>
      <PageHeader title="Search" subtitle="Shops by name, serial, or city — salesmen by name or area." />
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <Input
          label="Query"
          value={q}
          onChange={(e) => setParams({ q: e.target.value, city })}
        />
        <Input
          label="City filter"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={`Clients (${results.clients.length})`}>
            <ul className="divide-y divide-ink-100">
              {results.clients.length === 0 && <li className="py-4 text-sm text-ink-500">No shops</li>}
              {results.clients.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full py-2 text-left hover:text-brand-700"
                    onClick={() => navigate(`/clients/${c.id}`)}
                  >
                    <span className="font-medium">{c.shopName}</span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {c.serialNumber} · {c.city || '—'} · {c.salesmanName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={`Salesmen (${results.salesmen.length})`}>
            <ul className="divide-y divide-ink-100">
              {results.salesmen.length === 0 && <li className="py-4 text-sm text-ink-500">No salesmen</li>}
              {results.salesmen.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full py-2 text-left hover:text-brand-700"
                    onClick={() => navigate(`/salesmen/${s.id}`)}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {s.area || '—'} · {s.route || '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
