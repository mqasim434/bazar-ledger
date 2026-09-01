import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, DatePicker, PageHeader, Spinner, StatCard, Table } from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { getDashboardSummary } from '../dashboardService';

export function DashboardPage() {
  const { start, end, setStart, setEnd, range } = useDateRangeFilter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    getDashboardSummary(range)
      .then(setData)
      .catch((e) => toast(e.message, 'danger'))
      .finally(() => setLoading(false));
  }, [range.start, range.end]);

  if (loading && !data) return <Spinner label="Loading overview…" />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Office cash, credit outstanding, and salesman rollup."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Cash in hand" value={formatCurrency(data.office.cashInHand)} accent="gold" />
        <StatCard label="Cash in bank" value={formatCurrency(data.office.cashInBank)} accent="teal" />
        <StatCard
          label="Credit outstanding"
          value={formatCurrency(data.creditOutstanding)}
          accent={data.creditOutstanding > 0 ? 'danger' : 'success'}
        />
        <StatCard label="Inventory value" value={formatCurrency(data.inventoryValue)} accent="brand" />
        <StatCard label="Vendor owed" value={formatCurrency(data.vendorOwed)} accent="warn" />
      </div>
      <div className="mb-4 max-w-md">
        <DatePicker mode="range" label="Sales / recovery period" start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      </div>
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <StatCard label="Total sales (range)" value={formatCurrency(data.totalSales)} accent="teal" />
        <StatCard label="Total recovery (range)" value={formatCurrency(data.totalRecovery)} accent="gold" />
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
