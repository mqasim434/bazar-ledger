import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Badge,
  Button,
  DatePicker,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  Table,
  Tabs,
} from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate, formatYards, todayKey } from '../../../utils/formatters';
import { getClientsBySalesman } from '../../clients/clientsService';
import { getCommissions } from '../../commissions/commissionService';
import { getSalesmanExpenses } from '../../expenses/expenseService';
import { getSalesmanInventory } from '../../inventory/stockIssueService';
import { getRecoveries } from '../../recoveries/recoveryService';
import { getTransactions } from '../../transactions/transactionService';
import { getDepositsBySalesman, recordDeposit } from '../depositService';
import { getSalesmanById, updateSalesman, deactivateSalesman } from '../salesmenService';
import { SalesmanForm } from '../components/SalesmanForm';
import { SaleForm } from '../../transactions/components/SaleForm';
import { RecoveryForm } from '../../recoveries/components/RecoveryForm';

export function SalesmanDetailPage() {
  const { id } = useParams();
  const profile = useSelector((s) => s.auth.profile);
  const toast = useToast();
  const [man, setMan] = useState(null);
  const [tab, setTab] = useState('overview');
  const [edit, setEdit] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [date, setDate] = useState(todayKey());
  const [clients, setClients] = useState([]);
  const [bag, setBag] = useState([]);
  const [txns, setTxns] = useState([]);
  const [recs, setRecs] = useState([]);
  const [deps, setDeps] = useState([]);
  const [exps, setExps] = useState([]);
  const [comms, setComms] = useState([]);
  const { start, end, setStart, setEnd, inRange } = useDateRangeFilter();

  async function reload() {
    const s = await getSalesmanById(id);
    setMan(s);
    const [c, b, t, r, d, e, cm] = await Promise.all([
      getClientsBySalesman(id),
      getSalesmanInventory(id),
      getTransactions({ salesmanId: id }),
      getRecoveries({ salesmanId: id }),
      getDepositsBySalesman(id),
      getSalesmanExpenses(id),
      getCommissions(id),
    ]);
    setClients(c);
    setBag(b);
    setTxns(t);
    setRecs(r);
    setDeps(d);
    setExps(e);
    setComms(cm);
  }

  useEffect(() => {
    reload().catch((err) => toast(err.message, 'danger'));
  }, [id]);

  const bagTotal = useMemo(
    () => bag.reduce((sum, r) => sum + Number(r.valueAtCost || 0), 0),
    [bag],
  );

  if (!man) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={man.name}
        subtitle={`${man.area || 'No area'} · ${man.route || 'No route'} · ${man.contact}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEdit(true)}>
              Edit
            </Button>
            <Button variant="secondary" onClick={() => setDepositOpen(true)}>
              Deposit cash
            </Button>
            <Link to={`/stock-issues?salesmanId=${id}`}>
              <Button variant="secondary">Issue stock</Button>
            </Link>
            <Button onClick={() => setSaleOpen(true)}>New sale</Button>
          </>
        }
      />
      <div className="mb-4">
        <Badge tone={man.active ? 'active' : 'inactive'}>{man.active ? 'Active' : 'Inactive'}</Badge>
        <Button
          size="sm"
          variant="ghost"
          className="ml-2"
          onClick={async () => {
            await deactivateSalesman(id, !man.active);
            toast(man.active ? 'Deactivated' : 'Reactivated', 'success');
            reload();
          }}
        >
          {man.active ? 'Deactivate' : 'Reactivate'}
        </Button>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'clients', label: 'Clients' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'transactions', label: 'Transactions' },
          { id: 'recoveries', label: 'Recoveries' },
          { id: 'deposits', label: 'Deposits' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'commission', label: 'Commission' },
        ]}
      />
      <div className="mt-4">
        {tab === 'overview' && (
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Cash in hand" value={formatCurrency(man.cashInHand)} accent="gold" />
            <StatCard label="Total sales" value={formatCurrency(man.totalSales)} accent="teal" />
            <StatCard label="Total recovery" value={formatCurrency(man.totalRecovery)} accent="brand" />
            <StatCard label="Inventory value" value={formatCurrency(man.inventoryValue)} accent="warn" />
            <StatCard
              label="Commission earned"
              value={formatCurrency(man.totalCommissionEarned)}
              accent="success"
            />
            <StatCard
              label="Commission paid"
              value={formatCurrency(man.totalCommissionPaid)}
              accent="default"
            />
          </div>
        )}
        {tab === 'clients' && (
          <Table
            rows={clients}
            empty="No shops linked."
            columns={[
              {
                key: 'shopName',
                header: 'Shop',
                render: (r) => (
                  <Link className="text-brand-700 hover:underline" to={`/clients/${r.id}`}>
                    {r.shopName}
                  </Link>
                ),
              },
              { key: 'serialNumber', header: 'Serial' },
              { key: 'city', header: 'City' },
              {
                key: 'balance',
                header: 'Balance',
                render: (r) => (
                  <span className={Number(r.balance) > 0 ? 'text-danger' : 'text-success'}>
                    {formatCurrency(r.balance)}
                  </span>
                ),
              },
            ]}
          />
        )}
        {tab === 'inventory' && (
          <>
            <p className="mb-2 text-sm text-ink-500">
              Running total {formatCurrency(bagTotal)} (profile says {formatCurrency(man.inventoryValue)})
            </p>
            <Table
              rows={bag}
              empty="No stock issued yet."
              columns={[
                { key: 'itemName', header: 'Item' },
                { key: 'yards', header: 'Yards', render: (r) => formatYards(r.yards) },
                { key: 'valueAtCost', header: 'Value at cost', render: (r) => formatCurrency(r.valueAtCost) },
              ]}
            />
          </>
        )}
        {(tab === 'transactions' || tab === 'recoveries') && (
          <div className="mb-3 max-w-md">
            <DatePicker mode="range" start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
          </div>
        )}
        {tab === 'transactions' && (
          <Table
            rows={txns.filter((r) => inRange(r.date))}
            empty="No sales in range."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'clientName', header: 'Client' },
              { key: 'itemName', header: 'Item' },
              { key: 'netAmount', header: 'Net', render: (r) => formatCurrency(r.netAmount) },
              { key: 'paymentType', header: 'Pay' },
            ]}
          />
        )}
        {tab === 'recoveries' && (
          <>
            <Button className="mb-3" size="sm" onClick={() => setRecOpen(true)}>
              New recovery
            </Button>
            <Table
              rows={recs.filter((r) => inRange(r.date))}
              empty="No recoveries in range."
              columns={[
                { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
                { key: 'clientName', header: 'Client' },
                { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
                { key: 'paymentMode', header: 'Mode' },
              ]}
            />
          </>
        )}
        {tab === 'deposits' && (
          <Table
            rows={deps}
            empty="No deposits yet."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
              { key: 'mode', header: 'Mode' },
            ]}
          />
        )}
        {tab === 'expenses' && (
          <Table
            rows={exps}
            empty="No salesman expenses."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'category', header: 'Category' },
              { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
            ]}
          />
        )}
        {tab === 'commission' && (
          <Table
            rows={comms}
            empty="No commission runs yet."
            columns={[
              {
                key: 'period',
                header: 'Period',
                render: (r) => `${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}`,
              },
              { key: 'earnedAmount', header: 'Earned', render: (r) => formatCurrency(r.earnedAmount) },
              { key: 'paidAmount', header: 'Paid', render: (r) => formatCurrency(r.paidAmount) },
              {
                key: 'remainingBalance',
                header: 'Remaining',
                render: (r) => formatCurrency(r.remainingBalance),
              },
            ]}
          />
        )}
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit salesman">
        <SalesmanForm
          initial={man}
          onCancel={() => setEdit(false)}
          onSubmit={async (data) => {
            await updateSalesman(id, data);
            toast('Saved', 'success');
            setEdit(false);
            reload();
          }}
        />
      </Modal>
      <Modal open={depositOpen} onClose={() => setDepositOpen(false)} title="Deposit cash">
        <div className="space-y-3">
          <p className="text-sm text-ink-500">Cash in hand {formatCurrency(man.cashInHand)}</p>
          <Input
            label="Amount"
            type="number"
            hint={`Max ${formatCurrency(man.cashInHand)}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">Cash to office</option>
            <option value="bank">Bank deposit</option>
          </Select>
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button
            className="w-full"
            onClick={async () => {
              try {
                await recordDeposit({ salesmanId: id, amount, mode, date }, profile?.email);
                toast('Deposit recorded', 'success');
                setDepositOpen(false);
                setAmount('');
                reload();
              } catch (err) {
                toast(err.message, 'danger');
              }
            }}
          >
            Record deposit
          </Button>
        </div>
      </Modal>
      <Modal open={saleOpen} onClose={() => setSaleOpen(false)} title="New sale" size="lg">
        <SaleForm
          initial={{ salesmanId: id }}
          onCreated={() => {
            toast('Sale recorded', 'success');
            setSaleOpen(false);
            reload();
          }}
        />
      </Modal>
      <Modal open={recOpen} onClose={() => setRecOpen(false)} title="New recovery">
        <RecoveryForm
          initial={{ salesmanId: id }}
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
