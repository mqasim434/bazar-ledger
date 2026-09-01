import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  DatePicker,
  Modal,
  PageHeader,
  Spinner,
  StatCard,
  Table,
  Tabs,
} from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatPercent } from '../../../utils/formatters';
import { getClientById } from '../clientsService';
import { ClientForm } from '../components/ClientForm';
import { saveClient } from '../clientsSlice';
import { useDispatch } from 'react-redux';
import { getTransactions } from '../../transactions/transactionService';
import { getRecoveries } from '../../recoveries/recoveryService';
import { getReturns } from '../../returns/returnService';
import { formatDate, formatYards } from '../../../utils/formatters';
import { SaleForm } from '../../transactions/components/SaleForm';
import { RecoveryForm } from '../../recoveries/components/RecoveryForm';

export function ClientDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const dispatch = useDispatch();
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState('transactions');
  const [edit, setEdit] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [txns, setTxns] = useState([]);
  const [recs, setRecs] = useState([]);
  const [rets, setRets] = useState([]);
  const { start, end, setStart, setEnd, inRange } = useDateRangeFilter();

  async function reload() {
    const c = await getClientById(id);
    setClient(c);
    const [t, r, rt] = await Promise.all([
      getTransactions({ clientId: id }),
      getRecoveries({ clientId: id }),
      getReturns({ clientId: id }),
    ]);
    setTxns(t);
    setRecs(r);
    setRets(rt);
  }

  useEffect(() => {
    reload().catch((e) => toast(e.message, 'danger'));
  }, [id]);

  const filteredTx = useMemo(() => txns.filter((r) => inRange(r.date)), [txns, inRange]);
  const filteredRec = useMemo(() => recs.filter((r) => inRange(r.date)), [recs, inRange]);

  if (!client) return <Spinner />;

  const mapsUrl =
    client.gps?.lat != null && client.gps?.lng != null
      ? `https://www.google.com/maps?q=${client.gps.lat},${client.gps.lng}`
      : null;

  return (
    <div>
      <PageHeader
        title={client.shopName}
        subtitle={`Serial ${client.serialNumber} · ${client.ownerName || 'No owner'} · ${client.city || '—'}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEdit(true)}>
              Edit
            </Button>
            <Button variant="secondary" onClick={() => setRecOpen(true)}>
              Recovery
            </Button>
            <Button onClick={() => setSaleOpen(true)}>New sale</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          to={`/salesmen/${client.salesmanId}`}
          className="border-l-[3px] border-brand-500 bg-brand-50 px-2 py-1 text-sm text-brand-700"
        >
          {client.salesmanName}
        </Link>
        <Badge tone={client.active ? 'active' : 'inactive'}>{client.active ? 'Active' : 'Inactive'}</Badge>
        {mapsUrl && (
          <a className="text-sm text-brand-700 hover:underline" href={mapsUrl} target="_blank" rel="noreferrer">
            View on map
          </a>
        )}
        <span className="text-sm text-ink-500">
          Credit limit {client.creditLimitEnabled ? formatCurrency(client.creditLimit) : 'off'} · Default
          discount {formatPercent(client.defaultDiscountPercent)}
        </span>
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <StatCard label="Total purchase" value={formatCurrency(client.totalPurchase)} accent="teal" />
        <StatCard label="Total credit" value={formatCurrency(client.totalCredit)} accent="warn" />
        <StatCard label="Total recovery" value={formatCurrency(client.totalRecovery)} accent="gold" />
        <StatCard
          label="Balance"
          value={formatCurrency(client.balance)}
          accent={Number(client.balance) > 0 ? 'danger' : 'success'}
          hint={Number(client.balance) > 0 ? 'Shop owes this' : 'Settled / advance'}
        />
      </div>
      <div className="mb-4 max-w-md">
        <DatePicker mode="range" start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'transactions', label: 'Transactions' },
          { id: 'recoveries', label: 'Recoveries' },
          { id: 'returns', label: 'Returns' },
        ]}
      />
      <div className="mt-4">
        {tab === 'transactions' && (
          <Table
            rows={filteredTx}
            empty="No sales in this range."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'itemName', header: 'Item' },
              { key: 'yards', header: 'Yards', render: (r) => formatYards(r.yards) },
              { key: 'netAmount', header: 'Net', render: (r) => formatCurrency(r.netAmount) },
              { key: 'paymentType', header: 'Pay' },
              { key: 'status', header: 'Status' },
            ]}
          />
        )}
        {tab === 'recoveries' && (
          <Table
            rows={filteredRec}
            empty="No recoveries in this range."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
              { key: 'paymentMode', header: 'Mode' },
            ]}
          />
        )}
        {tab === 'returns' && (
          <Table
            rows={rets}
            empty="No returns."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'itemName', header: 'Item' },
              { key: 'yardsReturned', header: 'Yards', render: (r) => formatYards(r.yardsReturned) },
              { key: 'status', header: 'Status' },
            ]}
          />
        )}
      </div>
      <Modal open={edit} onClose={() => setEdit(false)} title="Edit client" size="lg">
        <ClientForm
          initial={client}
          onCancel={() => setEdit(false)}
          onSubmit={async (data) => {
            const res = await dispatch(saveClient({ id, data }));
            if (res.error) return toast(res.error.message, 'danger');
            toast('Client updated', 'success');
            setEdit(false);
            reload();
          }}
        />
      </Modal>
      <Modal open={saleOpen} onClose={() => setSaleOpen(false)} title="New sale" size="lg">
        <SaleForm
          initial={{ clientId: id, salesmanId: client.salesmanId }}
          onCreated={() => {
            toast('Sale recorded', 'success');
            setSaleOpen(false);
            reload();
          }}
        />
      </Modal>
      <Modal open={recOpen} onClose={() => setRecOpen(false)} title="New recovery">
        <RecoveryForm
          initial={{ clientId: id, salesmanId: client.salesmanId }}
          onCreated={() => {
            toast('Recovery recorded', 'success');
            setRecOpen(false);
            reload();
          }}
        />
      </Modal>
    </div>
  );
}
