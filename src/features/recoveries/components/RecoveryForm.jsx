import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Input, SearchableSelect, Select } from '../../../components/ui';
import { formatCurrency, todayKey } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { createRecovery } from '../recoveryService';

export function RecoveryForm({ initial = {}, onCreated }) {
  const profile = useSelector((s) => s.auth.profile);
  const [clients, setClients] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [form, setForm] = useState({
    clientId: initial.clientId || '',
    salesmanId: initial.salesmanId || '',
    amount: '',
    paymentMode: 'cash',
    date: todayKey(),
  });
  const [confirmOver, setConfirmOver] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getClients(), getSalesmen({ activeOnly: true })]).then(([c, s]) => {
      setClients(c.filter((x) => x.active !== false));
      setSalesmen(s);
    });
  }, []);

  const client = clients.find((c) => c.id === form.clientId);
  useEffect(() => {
    if (client && !form.salesmanId) {
      setForm((f) => ({ ...f, salesmanId: client.salesmanId }));
    }
  }, [client, form.salesmanId]);

  const over = client && Number(form.amount) > Number(client.balance || 0);

  async function submit() {
    setError('');
    if (!form.clientId || !form.salesmanId || !form.amount) {
      setError('Client, salesman, and amount are required.');
      return;
    }
    if (over && !confirmOver) {
      setConfirmOver(true);
      setError(
        `This exceeds the client’s current balance of ${formatCurrency(client.balance)} — submit again to proceed (advance payment).`,
      );
      return;
    }
    setSaving(true);
    try {
      const rec = await createRecovery(form, profile?.email);
      onCreated?.(rec);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <SearchableSelect
        label="Client"
        required
        value={form.clientId}
        onChange={(id) => setForm({ ...form, clientId: id, salesmanId: '' })}
        options={clients.map((c) => ({
          value: c.id,
          label: `${c.shopName} · bal ${formatCurrency(c.balance)}`,
        }))}
      />
      <SearchableSelect
        label="Salesman"
        required
        value={form.salesmanId}
        onChange={(id) => setForm({ ...form, salesmanId: id })}
        options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
      />
      <Input
        label="Amount (Rs)"
        type="number"
        min="0"
        step="0.01"
        value={form.amount}
        hint={client ? `Outstanding: ${formatCurrency(client.balance)}` : ''}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
      />
      <Select
        label="Payment mode"
        value={form.paymentMode}
        onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
        hint={
          form.paymentMode === 'bank'
            ? 'Goes to salesman bank balance until office confirms.'
            : 'Goes to salesman cash in hand.'
        }
      >
        <option value="cash">Cash (salesman cash in hand)</option>
        <option value="bank">Bank (salesman bank — pending office confirm)</option>
      </Select>
      <Input
        label="Date"
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button className="w-full" loading={saving} onClick={submit}>
        Record recovery
      </Button>
    </div>
  );
}
