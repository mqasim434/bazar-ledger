import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Badge,
  Button,
  DatePicker,
  Modal,
  PageHeader,
  PrintButton,
  ReceiptPreview,
  Select,
  Spinner,
  Table,
} from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useRole } from '../../../hooks/useRole';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { RecoveryForm } from '../components/RecoveryForm';
import {
  confirmBankRecovery,
  getRecoveries,
  markRecoveryReceiptSent,
} from '../recoveryService';

export function RecoveriesListPage() {
  const {
    start,
    end,
    setStart,
    setEnd,
    inRange,
    fromStart,
    setFromStart,
    setThisMonth,
  } = useDateRangeFilter();
  const { isAdmin } = useRole();
  const profile = useSelector((s) => s.auth.profile);
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [clientId, setClientId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [mode, setMode] = useState('');
  const [bankFilter, setBankFilter] = useState('');
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
        .filter((r) => !bankFilter || r.bankStatus === bankFilter)
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [rows, inRange, clientId, salesmanId, mode, bankFilter],
  );

  return (
    <div>
      <PageHeader
        title="Recoveries"
        subtitle="Cash → salesman cash in hand. Bank → salesman bank until office confirms into office bank."
        actions={
          <>
            <PrintButton
              title="Recoveries"
              subtitle={`${fromStart ? 'From start' : formatDate(start)} → ${formatDate(end)}`}
              rows={filtered}
              columns={[
                { header: 'Date', value: (r) => formatDate(r.date) },
                { header: 'Client', value: (r) => r.clientName },
                { header: 'Salesman', value: (r) => r.salesmanName },
                { header: 'Amount', value: (r) => formatCurrency(r.amount) },
                { header: 'Mode', value: (r) => r.paymentMode },
                { header: 'Bank status', value: (r) => r.bankStatus || '—' },
              ]}
            />
            <Button onClick={() => setOpen(true)}>New recovery</Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <DatePicker
          mode="range"
          start={start}
          end={end}
          fromStart={fromStart}
          onStartChange={setStart}
          onEndChange={setEnd}
          onFromStart={setFromStart}
          onThisMonth={setThisMonth}
        />
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
          <option value="bank">Bank</option>
        </Select>
        <Select
          value={bankFilter}
          onChange={(e) => setBankFilter(e.target.value)}
          placeholder="Bank status"
        >
          <option value="pending">Pending confirm</option>
          <option value="confirmed">Confirmed</option>
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
              render: (r) => (
                <Badge tone={r.paymentMode === 'cash' ? 'cash' : 'teal'}>{r.paymentMode}</Badge>
              ),
            },
            {
              key: 'bankStatus',
              header: 'Bank',
              render: (r) =>
                r.paymentMode === 'bank' ? (
                  <Badge tone={r.bankStatus === 'confirmed' ? 'confirmed' : 'pending'}>
                    {r.bankStatus || 'pending'}
                  </Badge>
                ) : (
                  '—'
                ),
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setReceipt(r)}>
                    Receipt
                  </Button>
                  {isAdmin && r.paymentMode === 'bank' && r.bankStatus === 'pending' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await confirmBankRecovery(r.id, profile?.email);
                          toast('Bank recovery confirmed → office bank', 'success');
                          reload();
                        } catch (err) {
                          toast(err.message, 'danger');
                        }
                      }}
                    >
                      Confirm bank
                    </Button>
                  )}
                </div>
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
