import { useEffect, useState } from 'react';
import {
  Button,
  Input,
  SearchableSelect,
  Textarea,
} from '../../../components/ui';
import { formatYards, todayKey } from '../../../utils/formatters';
import { getTransactions } from '../../transactions/transactionService';
import { createReturn } from '../returnService';

export function ReturnForm({ initial = {}, onCreated, onCancel }) {
  const [txns, setTxns] = useState([]);
  const [txnId, setTxnId] = useState(initial.originalTransactionId || '');
  const [yards, setYards] = useState(initial.yardsReturned || '');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayKey());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTransactions(
      initial.clientId
        ? { clientId: initial.clientId }
        : initial.salesmanId
          ? { salesmanId: initial.salesmanId }
          : {},
    )
      .then((rows) =>
        setTxns(
          rows
            .filter((r) => r.status !== 'returned')
            .sort((a, b) => String(b.date).localeCompare(String(a.date))),
        ),
      )
      .catch(() => setTxns([]));
  }, [initial.clientId, initial.salesmanId]);

  const selected = txns.find((t) => t.id === txnId);
  const remain = selected
    ? Number(selected.yards || 0) - Number(selected.returnedYards || 0)
    : 0;

  async function submit() {
    setError('');
    if (!txnId) {
      setError('Select the original sale.');
      return;
    }
    if (!yards || Number(yards) <= 0) {
      setError('Yards returned must be greater than zero.');
      return;
    }
    setSaving(true);
    try {
      const ret = await createReturn({
        originalTransactionId: txnId,
        yardsReturned: yards,
        notes,
        date,
      });
      onCreated?.(ret);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <SearchableSelect
        label="Original sale"
        required
        value={txnId}
        onChange={setTxnId}
        options={txns.map((t) => ({
          value: t.id,
          label: `${t.date} · ${t.clientName} · ${t.itemName} · ${formatYards(t.yards)} · ${t.paymentType}`,
        }))}
        placeholder="Search sale…"
      />
      {selected && (
        <p className="text-xs text-ink-500">
          Remaining returnable: {formatYards(remain)} (already returned{' '}
          {formatYards(selected.returnedYards || 0)})
        </p>
      )}
      <Input
        label="Yards returned"
        type="number"
        min="0"
        step="0.01"
        required
        value={yards}
        onChange={(e) => setYards(e.target.value)}
      />
      <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button loading={saving} onClick={submit}>
          Submit return
        </Button>
      </div>
    </div>
  );
}
