import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { RecoveryForm } from '../components/RecoveryForm';
import { getRecoveries, markRecoveryReceiptSent } from '../recoveryService';

export function RecoveriesListPage() {
  const { start, end, setStart, setEnd, inRange } = useDateRangeFilter();
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [clientId, setClientId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [mode, setMode] = useState('');
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function reload() {
    setLoading(true);
    const [r, c, s] = await Promise.all([getRecoveries(), getClients(), getSalesmen()]);
    setRows(r);
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
        .filter((r) => !mode || r.paymentMode === mode)
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [rows, inRange, clientId, salesmanId, mode],
  );

  return (
    <div>
      <PageHeader
        title="Recoveries"
        subtitle="Payments collected against shop credit."
        actions={<Button onClick={() => setOpen(true)}>New recovery</Button>}
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
        <Select value={mode} onChange={(e) => setMode(e.target.value)} placeholder="All modes">
          <option value="cash">Cash</option>
          <option value="pos">POS</option>
          <option value="bank">Bank</option>
        </Select>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <Table
          rows={filtered}
          empty="No recoveries in this range."
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
            { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
            {
              key: 'paymentMode',
              header: 'Mode',
              render: (r) => <Badge tone={r.paymentMode === 'cash' ? 'cash' : 'teal'}>{r.paymentMode}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Button size="sm" variant="ghost" onClick={() => setReceipt(r)}>
                  Receipt
                </Button>
              ),
            },
          ]}
        />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New recovery">
        <RecoveryForm
          onCreated={(rec) => {
            toast('Recovery recorded', 'success');
            setOpen(false);
            setReceipt(rec);
            reload();
          }}
        />
      </Modal>
      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="Payment receipt">
        {receipt && (
          <ReceiptPreview
            type="recovery"
            data={receipt}
            phone={clients.find((c) => c.id === receipt.clientId)?.contact}
            onSent={() => markRecoveryReceiptSent(receipt.id)}
          />
        )}
      </Modal>
    </div>
  );
}
