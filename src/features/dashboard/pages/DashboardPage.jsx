import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, DatePicker, PageHeader, Spinner, StatCard, Table } from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { getDashboardSummary } from '../dashboardService';

export function DashboardPage() {
  const {
    start,
    end,
    setStart,
    setEnd,
    range,
    fromStart,
    setFromStart,
    setThisMonth,
  } = useDateRangeFilter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    getDashboardSummary(range)
      .then(setData)
      .catch((e) => toast(e.message, 'danger'))
      .finally(() => setLoading(false));
  }, [range.start, range.end, range.fromStart]);

  if (loading && !data) return <Spinner label="Loading overview…" />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Total credit up top; period figures below with the date filter."
      />

      <div className="mb-5">
        <StatCard
          label="Total credit outstanding"
          value={formatCurrency(data.creditOutstanding)}
          accent={data.creditOutstanding > 0 ? 'danger' : 'success'}
          hint="All shops — current udhar balance"
        />
      </div>

      <div className="mb-4 max-w-md">
        <DatePicker
          mode="range"
          label="Timeline"
          start={start}
          end={end}
          fromStart={fromStart}
          onStartChange={setStart}
          onEndChange={setEnd}
          onFromStart={setFromStart}
          onThisMonth={setThisMonth}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cash in hand"
          value={formatCurrency(data.cashInHand)}
          accent="gold"
          hint={`Office ${formatCurrency(data.officeCashInHand)} + salesmen`}
        />
        <StatCard
          label="Cash in bank"
          value={formatCurrency(data.cashInBank)}
          accent="teal"
          hint={`Office ${formatCurrency(data.officeCashInBank)} + salesmen`}
        />
        <StatCard label="Total sale" value={formatCurrency(data.totalSales)} accent="brand" />
        <StatCard label="Credit sale" value={formatCurrency(data.creditSales)} accent="warn" />
        <StatCard label="Cash sale" value={formatCurrency(data.cashSales)} accent="gold" />
        <StatCard
          label="Commission due"
          value={formatCurrency(data.commissionDue)}
          accent="success"
          hint={
            data.commissionEarnedInRange
              ? `Earned in range ${formatCurrency(data.commissionEarnedInRange)}`
              : undefined
          }
        />
        <StatCard label="Recovery" value={formatCurrency(data.totalRecovery)} accent="teal" />
        <StatCard
          label="Advance"
          value={formatCurrency(data.advanceOutstanding)}
          accent="danger"
          hint={
            data.advanceTaken
              ? `Taken in range ${formatCurrency(data.advanceTaken)}`
              : 'Current salesman advances'
          }
        />
      </div>

      <h2 className="mb-2 font-heading text-lg">Salesmen</h2>
      <Table
        rows={data.salesmanRows}
        empty="No salesmen yet."
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (r) => (
              <Link className="text-brand-700 hover:underline" to={`/salesmen/${r.id}`}>
                {r.name}
              </Link>
            ),
          },
          { key: 'sales', header: 'Sales', render: (r) => formatCurrency(r.sales) },
          { key: 'recovery', header: 'Recovery', render: (r) => formatCurrency(r.recovery) },
          { key: 'cashInHand', header: 'Cash', render: (r) => formatCurrency(r.cashInHand) },
          { key: 'bankInHand', header: 'Bank', render: (r) => formatCurrency(r.bankInHand) },
          {
            key: 'commissionRemaining',
            header: 'Commission due',
            render: (r) => formatCurrency(r.commissionRemaining),
          },
        ]}
      />
      <h2 className="mb-2 mt-8 font-heading text-lg">Recent activity</h2>
      <Table
        rows={data.activity}
        empty="No activity yet."
        columns={[
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
          {
            key: 'kind',
            header: 'Type',
            render: (r) => <Badge tone={r.kind === 'sale' ? 'brand' : 'gold'}>{r.kind}</Badge>,
          },
          {
            key: 'label',
            header: 'Detail',
            render: (r) => (
              <Link className="hover:underline" to={r.href}>
                {r.label}
              </Link>
            ),
          },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
        ]}
      />
    </div>
  );
}
