import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  DatePicker,
  Modal,
  PageHeader,
  ReceiptPreview,
  Select,
  Spinner,
  Table,
} from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate, formatYards } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { SaleForm } from '../components/SaleForm';
import { getTransactions, markReceiptSent } from '../transactionService';
import { createReturn } from '../../returns/returnService';
import { Input, Textarea } from '../../../components/ui';
import { todayKey } from '../../../utils/formatters';
import { useSelector } from 'react-redux';

export function TransactionsListPage() {
  const [searchParams] = useSearchParams();
  const { start, end, setStart, setEnd, inRange } = useDateRangeFilter();
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saleOpen, setSaleOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [retFor, setRetFor] = useState(null);
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '');
  const [salesmanId, setSalesmanId] = useState(searchParams.get('salesmanId') || '');
  const [paymentType, setPaymentType] = useState('');
  const toast = useToast();

  async function reload() {
    setLoading(true);
    const [t, c, s] = await Promise.all([getTransactions(), getClients(), getSalesmen()]);
    setRows(t);
    setClients(c);
    setSalesmen(s);
    setLoading(false);
  }

  useEffect(() => {
    reload().catch((e) => toast(e.message, 'danger'));
  }, []);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => inRange(r.date))
        .filter((r) => !clientId || r.clientId === clientId)
        .filter((r) => !salesmanId || r.salesmanId === salesmanId)
        .filter((r) => !paymentType || r.paymentType === paymentType)
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [rows, inRange, clientId, salesmanId, paymentType],
  );

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Cash and credit transactions against salesman stock."
        actions={<Button onClick={() => setSaleOpen(true)}>+ New Sale</Button>}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <DatePicker mode="range" start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="All shops">
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shopName}
            </option>
          ))}
        </Select>
        <Select value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)} placeholder="All salesmen">
          {salesmen.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} placeholder="All payments">
          <option value="cash">Cash</option>
          <option value="credit">Credit</option>
        </Select>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <Table
          rows={filtered}
          empty="No sales in this range."
          columns={[
            { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
            {
              key: 'clientName',
              header: 'Client',
              render: (r) => (
                <Link className="text-brand-700 hover:underline" to={`/clients/${r.clientId}`}>
                  {r.clientName}
                </Link>
              ),
            },
            { key: 'salesmanName', header: 'Salesman' },
            { key: 'itemName', header: 'Item' },
            { key: 'yards', header: 'Yards', render: (r) => formatYards(r.yards) },
            { key: 'netAmount', header: 'Net', render: (r) => formatCurrency(r.netAmount) },
            {
              key: 'paymentType',
              header: 'Pay',
              render: (r) => <Badge tone={r.paymentType === 'cash' ? 'cash' : 'credit'}>{r.paymentType}</Badge>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <Badge tone={r.status === 'active' ? 'active' : 'returned'}>{r.status}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setReceipt(r)}>
                    Receipt
                  </Button>
                  {r.status !== 'returned' && (
                    <Button size="sm" variant="ghost" onClick={() => setRetFor(r)}>
                      Return
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
      <Modal open={saleOpen} onClose={() => setSaleOpen(false)} title="New sale" size="lg">
        <SaleForm
          initial={{ clientId, salesmanId }}
          onCreated={(txn) => {
            toast('Sale recorded', 'success');
            setSaleOpen(false);
            setReceipt(txn);
            reload();
          }}
        />
      </Modal>
      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="Sale receipt">
        {receipt && (
          <ReceiptPreview
            type="sale"
            data={receipt}
            phone={clients.find((c) => c.id === receipt.clientId)?.contact}
            onSent={() => markReceiptSent(receipt.id)}
          />
        )}
      </Modal>
      <ReturnModal
        txn={retFor}
        onClose={() => setRetFor(null)}
        onDone={() => {
          setRetFor(null);
          reload();
        }}
      />
    </div>
  );
}

function ReturnModal({ txn, onClose, onDone }) {
  const toast = useToast();
  const [yards, setYards] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  if (!txn) return null;
  return (
    <Modal open onClose={onClose} title="Report a return">
      <div className="space-y-3">
        <p className="text-sm text-ink-500">
          {txn.clientName} · {txn.itemName} · sold {formatYards(txn.yards)}
        </p>
        <Input
          label="Yards returned"
          type="number"
          min="0"
          step="0.01"
          value={yards}
          onChange={(e) => setYards(e.target.value)}
        />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await createReturn({
                  originalTransactionId: txn.id,
                  yardsReturned: yards,
                  notes,
                  date: todayKey(),
                });
                toast('Return submitted as pending', 'success');
                onDone();
              } catch (err) {
                toast(err.message, 'danger');
              } finally {
                setSaving(false);
              }
            }}
          >
            Submit return
          </Button>
        </div>
      </div>
    </Modal>
  );
}
