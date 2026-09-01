import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  SearchableSelect,
  Select,
} from '../../../components/ui';
import { calcDiscountAmount, calcGrossAmount, calcNetAmount } from '../../../utils/calculations';
import { formatCurrency, formatYards, todayKey } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getInventory } from '../../inventory/inventoryService';
import { getSalesmanInventory } from '../../inventory/stockIssueService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { computeSaleAmounts, createTransaction } from '../transactionService';

export function SaleForm({ initial = {}, onCreated }) {
  const profile = useSelector((s) => s.auth.profile);
  const [clients, setClients] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [items, setItems] = useState([]);
  const [bag, setBag] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [creditWarn, setCreditWarn] = useState(false);
  const [form, setForm] = useState({
    clientId: initial.clientId || '',
    salesmanId: initial.salesmanId || '',
    itemId: '',
    yards: '',
    ratePerYard: '',
    discountPercent: 0,
    paymentType: 'cash',
    date: todayKey(),
  });

  useEffect(() => {
    Promise.all([getClients(), getSalesmen({ activeOnly: true }), getInventory()]).then(
      ([c, s, i]) => {
        setClients(c.filter((x) => x.active !== false));
        setSalesmen(s);
        setItems(i);
      },
    );
  }, []);

  const client = clients.find((c) => c.id === form.clientId);
  const item = items.find((i) => i.id === form.itemId);
  const bagRow = bag.find((b) => b.itemId === form.itemId);
  const available = Number(bagRow?.yards || 0);

  useEffect(() => {
    if (!form.clientId || !client) return;
    setForm((f) => ({
      ...f,
      salesmanId: f.salesmanId || client.salesmanId,
      discountPercent: f.discountPercent || client.defaultDiscountPercent || 0,
    }));
  }, [form.clientId, client]);

  useEffect(() => {
    if (!form.salesmanId) {
      setBag([]);
      return;
    }
    getSalesmanInventory(form.salesmanId).then(setBag).catch(() => setBag([]));
  }, [form.salesmanId]);

  useEffect(() => {
    if (item && (form.ratePerYard === '' || form.ratePerYard == null)) {
      setForm((f) => ({ ...f, ratePerYard: item.ratePerYard }));
    }
  }, [item]);

  const gross = calcGrossAmount(form.yards, form.ratePerYard);
  const discount = calcDiscountAmount(gross, form.discountPercent);
  const net = calcNetAmount(gross, discount);

  const overLimit =
    form.paymentType === 'credit' &&
    client?.creditLimitEnabled &&
    Number(client.balance || 0) + net > Number(client.creditLimit || 0);

  async function submit() {
    setError('');
    if (!form.clientId || !form.salesmanId || !form.itemId) {
      setError('Client, salesman, and item are required.');
      return;
    }
    if (Number(form.yards) > available) {
      setError(`Only ${formatYards(available)} in this salesman’s stock.`);
      return;
    }
    if (overLimit && !creditWarn) {
      setCreditWarn(true);
      setError(
        `This credit sale would exceed the shop’s limit of ${formatCurrency(client.creditLimit)}. Submit again to override.`,
      );
      return;
    }
    setSaving(true);
    try {
      const txn = await createTransaction(form, profile?.email);
      onCreated?.(txn);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const itemOptions = useMemo(
    () =>
      bag.map((b) => ({
        value: b.itemId,
        label: `${b.itemName} · ${formatYards(b.yards)} on hand`,
      })),
    [bag],
  );

  return (
    <div className="space-y-3">
      <SearchableSelect
        label="Client"
        required
        value={form.clientId}
        onChange={(id) => setForm({ ...form, clientId: id, salesmanId: '', discountPercent: 0 })}
        options={clients.map((c) => ({
          value: c.id,
          label: `${c.shopName} · ${c.serialNumber}`,
        }))}
      />
      <SearchableSelect
        label="Salesman"
        required
        value={form.salesmanId}
        onChange={(id) => setForm({ ...form, salesmanId: id, itemId: '' })}
        options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
        hint="Auto-fills from the shop, but can be overridden."
      />
      <SearchableSelect
        label="Item"
        required
        value={form.itemId}
        onChange={(id) => {
          const row = bag.find((b) => b.itemId === id);
          const inv = items.find((i) => i.id === id);
          setForm({ ...form, itemId: id, ratePerYard: inv?.ratePerYard || '' });
          void row;
        }}
        options={itemOptions}
        placeholder={form.salesmanId ? 'Select from salesman stock' : 'Pick a salesman first'}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Yards"
          type="number"
          min="0"
          step="0.01"
          value={form.yards}
          hint={form.itemId ? `Available: ${formatYards(available)}` : ''}
          onChange={(e) => setForm({ ...form, yards: e.target.value })}
        />
        <Input
          label="Rate / yard"
          type="number"
          min="0"
          step="0.01"
          value={form.ratePerYard}
          onChange={(e) => setForm({ ...form, ratePerYard: e.target.value })}
        />
        <Input
          label="Discount %"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={form.discountPercent}
          onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
        />
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </div>
      <Select
        label="Payment type"
        value={form.paymentType}
        onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
      >
        <option value="cash">Cash</option>
        <option value="credit">Credit</option>
      </Select>
      <Card accent="gold">
        <div className="grid grid-cols-3 gap-2 text-sm tnum">
          <div>
            <p className="text-xs text-ink-500">Gross</p>
            <p>{formatCurrency(gross)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Discount</p>
            <p>{formatCurrency(discount)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Net</p>
            <p className="font-heading text-lg">{formatCurrency(net)}</p>
          </div>
        </div>
      </Card>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button className="w-full" loading={saving} onClick={submit}>
        Record sale
      </Button>
      {client && (
        <p className="text-xs text-ink-500">
          Current balance {formatCurrency(client.balance)} ·{' '}
          <Link className="text-brand-600" to={`/clients/${client.id}`}>
            open shop
          </Link>
        </p>
      )}
    </div>
  );
}

export { computeSaleAmounts };
