import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Button,
  Card,
  Input,
  PageHeader,
  SearchableSelect,
  Select,
  Spinner,
  Table,
  Textarea,
} from '../../../components/ui';
import { formatCurrency, formatDate, formatYards } from '../../../utils/formatters';
import { useToast } from '../../../hooks/useToast';
import { getInventory } from '../inventoryService';
import { getStockIssues, issueStock } from '../stockIssueService';
import { getSalesmen } from '../../salesmen/salesmenService';

export function StockIssuePage() {
  const [searchParams] = useSearchParams();
  const profile = useSelector((s) => s.auth.profile);
  const toast = useToast();
  const [salesmen, setSalesmen] = useState([]);
  const [items, setItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    salesmanId: searchParams.get('salesmanId') || '',
    itemId: '',
    yards: '',
    notes: '',
  });
  const [filterSalesman, setFilterSalesman] = useState('');
  const [filterItem, setFilterItem] = useState('');

  async function reload() {
    setLoading(true);
    const [s, i, h] = await Promise.all([getSalesmen({ activeOnly: true }), getInventory(), getStockIssues()]);
    setSalesmen(s);
    setItems(i);
    setIssues(h.sort((a, b) => String(b.date?.seconds || b.date).localeCompare(String(a.date?.seconds || a.date))));
    setLoading(false);
  }

  useEffect(() => {
    reload().catch((err) => toast(err.message, 'danger'));
  }, []);

  const selectedItem = items.find((i) => i.id === form.itemId);
  const available = Number(selectedItem?.stockYards || 0);
  const over = Number(form.yards) > available;

  const filteredIssues = useMemo(
    () =>
      issues.filter((row) => {
        if (filterSalesman && row.salesmanId !== filterSalesman) return false;
        if (filterItem && row.itemId !== filterItem) return false;
        return true;
      }),
    [issues, filterSalesman, filterItem],
  );

  return (
    <div>
      <PageHeader title="Issue stock" subtitle="Move yards from office stock into a salesman’s bag." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="New issue">
          <div className="space-y-3">
            <SearchableSelect
              label="Salesman"
              required
              value={form.salesmanId}
              onChange={(id) => setForm({ ...form, salesmanId: id })}
              options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
            />
            <SearchableSelect
              label="Item"
              required
              value={form.itemId}
              onChange={(id) => setForm({ ...form, itemId: id })}
              options={items.map((i) => ({
                value: i.id,
                label: `${i.itemName} · ${formatYards(i.stockYards)}`,
              }))}
            />
            <Input
              label="Yards"
              type="number"
              min="0"
              step="0.01"
              value={form.yards}
              error={over ? `Only ${formatYards(available)} available` : ''}
              hint={selectedItem ? `Available: ${formatYards(available)}` : ''}
              onChange={(e) => setForm({ ...form, yards: e.target.value })}
            />
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <Button
              className="w-full"
              disabled={over || !form.salesmanId || !form.itemId || !form.yards}
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await issueStock({ ...form, issuedBy: profile?.email });
                  toast('Stock issued', 'success');
                  setForm({ ...form, yards: '', notes: '' });
                  await reload();
                } catch (err) {
                  toast(err.message, 'danger');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Issue stock
            </Button>
          </div>
        </Card>
        <div className="lg:col-span-3">
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <Select
              value={filterSalesman}
              onChange={(e) => setFilterSalesman(e.target.value)}
              placeholder="All salesmen"
            >
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={filterItem} onChange={(e) => setFilterItem(e.target.value)} placeholder="All items">
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.itemName}
                </option>
              ))}
            </Select>
          </div>
          {loading ? (
            <Spinner />
          ) : (
            <Table
              rows={filteredIssues}
              empty="No stock issues yet."
              columns={[
                { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
                { key: 'salesmanName', header: 'Salesman' },
                { key: 'itemName', header: 'Item' },
                { key: 'yards', header: 'Yards', render: (r) => formatYards(r.yards) },
                { key: 'valueAtCost', header: 'Value', render: (r) => formatCurrency(r.valueAtCost) },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
