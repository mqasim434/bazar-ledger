import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate, formatYards } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { SaleForm } from '../components/SaleForm';
import { getTransactions, markReceiptSent } from '../transactionService';
import { ReturnForm } from '../../returns/components/ReturnForm';

export function TransactionsListPage() {
  const [searchParams] = useSearchParams();
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
        subtitle="Cash and credit transactions. Discount auto-calcs when sold rate is below given rate."
        actions={
          <>
            <PrintButton
              title="Sales"
              subtitle={`${fromStart ? 'From start' : formatDate(start)} → ${formatDate(end)}`}
              columns={[
                { header: 'Date', value: (r) => formatDate(r.date) },
                { header: 'Client', value: (r) => r.clientName },
                { header: 'Salesman', value: (r) => r.salesmanName },
                { header: 'Item', value: (r) => r.itemName },
                { header: 'Yards', value: (r) => formatYards(r.yards) },
                { header: 'Net', value: (r) => formatCurrency(r.netAmount) },
                { header: 'Pay', value: (r) => r.paymentType },
              ]}
              rows={filtered}
            />
            <Button onClick={() => setSaleOpen(true)}>+ New Sale</Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
      <Modal open={Boolean(retFor)} onClose={() => setRetFor(null)} title="Report a return" size="lg">
        {retFor && (
          <ReturnForm
            initial={{
              originalTransactionId: retFor.id,
              clientId: retFor.clientId,
              yardsReturned: '',
            }}
            onCancel={() => setRetFor(null)}
            onCreated={() => {
              toast('Return submitted as pending', 'success');
              setRetFor(null);
              reload();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
