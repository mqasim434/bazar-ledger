import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Button,
  DatePicker,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  Table,
} from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate, todayKey } from '../../../utils/formatters';
import { getSalesmen } from '../salesmenService';
import { getAllDeposits, recordDeposit } from '../depositService';

export function DepositsListPage() {
  const profile = useSelector((s) => s.auth.profile);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [salesmen, setSalesmen] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [date, setDate] = useState(todayKey());
  const [depositSalesmanId, setDepositSalesmanId] = useState('');
  const {
    start,
    end,
    setStart,
    setEnd,
    inRange,
    fromStart,
    setFromStart,
    setThisMonth,
  } = useDateRangeFilter({ fromStart: true });

  async function reload() {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([getSalesmen(), getAllDeposits()]);
      setSalesmen(s);
      setDeposits(d.sort((a, b) => String(b.date).localeCompare(String(a.date))));
    } catch (err) {
      toast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    return deposits.filter((r) => {
      if (!inRange(r.date)) return false;
      if (salesmanFilter && r.salesmanId !== salesmanFilter) return false;
      return true;
    });
  }, [deposits, inRange, salesmanFilter]);

  const totalInRange = useMemo(
    () => filtered.reduce((s, r) => s + Number(r.amount || 0), 0),
    [filtered],
  );

  const salesmanSummary = useMemo(() => {
    return salesmen
      .map((s) => {
        const his = filtered.filter((d) => d.salesmanId === s.id);
        const last = his[0];
        const total = his.reduce((sum, d) => sum + Number(d.amount || 0), 0);
        return {
          id: s.id,
          name: s.name,
          cashInHand: s.cashInHand || 0,
          bankInHand: s.bankInHand || 0,
          depositCount: his.length,
          depositTotal: total,
          lastDepositAmount: last?.amount || 0,
          lastDepositDate: last?.date || null,
        };
      })
      .filter((r) => !salesmanFilter || r.id === salesmanFilter)
      .sort((a, b) => b.depositTotal - a.depositTotal);
  }, [salesmen, filtered, salesmanFilter]);

  const selectedMan = salesmen.find((s) => s.id === depositSalesmanId);

  if (loading && !salesmen.length) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Deposits"
        subtitle="Salesman accounts — cash/bank on hand and deposits to office."
        actions={
          <Button
            onClick={() => {
              setDepositSalesmanId(salesmanFilter || salesmen[0]?.id || '');
              setOpen(true);
            }}
          >
            Record deposit
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="max-w-md flex-1">
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
        </div>
        <Select
          label="Salesman"
          value={salesmanFilter}
          onChange={(e) => setSalesmanFilter(e.target.value)}
        >
          <option value="">All salesmen</option>
          {salesmen.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Deposits in range" value={formatCurrency(totalInRange)} accent="teal" />
        <StatCard
          label="Salesmen cash held"
          value={formatCurrency(salesmen.reduce((s, m) => s + Number(m.cashInHand || 0), 0))}
          accent="gold"
        />
        <StatCard
          label="Salesmen bank held"
          value={formatCurrency(salesmen.reduce((s, m) => s + Number(m.bankInHand || 0), 0))}
          accent="brand"
        />
      </div>

      <h2 className="mb-2 font-heading text-lg">Salesman accounts</h2>
      <Table
        rows={salesmanSummary}
        empty="No salesmen."
        columns={[
          {
            key: 'name',
            header: 'Salesman',
            render: (r) => (
              <Link className="text-brand-700 hover:underline" to={`/salesmen/${r.id}`}>
                {r.name}
              </Link>
            ),
          },
          { key: 'cashInHand', header: 'Cash in hand', render: (r) => formatCurrency(r.cashInHand) },
          { key: 'bankInHand', header: 'Bank in hand', render: (r) => formatCurrency(r.bankInHand) },
          {
            key: 'lastDeposit',
            header: 'Last deposit',
            render: (r) =>
              r.lastDepositDate
                ? `${formatCurrency(r.lastDepositAmount)} · ${formatDate(r.lastDepositDate)}`
                : '—',
          },
          {
            key: 'depositTotal',
            header: 'Deposits (range)',
            render: (r) => formatCurrency(r.depositTotal),
          },
          { key: 'depositCount', header: 'Count' },
        ]}
      />

      <h2 className="mb-2 mt-8 font-heading text-lg">Deposit history</h2>
      <Table
        rows={filtered}
        empty="No deposits in this range."
        columns={[
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
          {
            key: 'salesmanName',
            header: 'Salesman',
            render: (r) =>
              r.salesmanId ? (
                <Link className="text-brand-700 hover:underline" to={`/salesmen/${r.salesmanId}`}>
                  {r.salesmanName}
                </Link>
              ) : (
                r.salesmanName
              ),
          },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
          { key: 'mode', header: 'Mode' },
          { key: 'receivedBy', header: 'Received by', render: (r) => r.receivedBy || '—' },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Deposit to office">
        <div className="space-y-3">
          <Select
            label="Salesman"
            value={depositSalesmanId}
            onChange={(e) => setDepositSalesmanId(e.target.value)}
          >
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {selectedMan && (
            <p className="text-sm text-ink-500">
              Cash {formatCurrency(selectedMan.cashInHand)} · Bank{' '}
              {formatCurrency(selectedMan.bankInHand)}
            </p>
          )}
          <Select label="From / mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">Cash in hand → office cash</option>
            <option value="bank">Bank in hand → office bank</option>
          </Select>
          <Input
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button
            className="w-full"
            onClick={async () => {
              try {
                await recordDeposit(
                  { salesmanId: depositSalesmanId, amount, mode, date },
                  profile?.email,
                );
                toast('Deposit recorded', 'success');
                setOpen(false);
                setAmount('');
                reload();
              } catch (err) {
                toast(err.message, 'danger');
              }
            }}
          >
            Save deposit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
