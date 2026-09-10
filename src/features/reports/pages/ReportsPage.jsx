import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DatePicker,
  PageHeader,
  PrintButton,
  SearchableSelect,
  Select,
  Spinner,
  StatCard,
  Table,
} from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate, formatYards } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getInventory } from '../../inventory/inventoryService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { getVendors } from '../../vendors/vendorService';
import {
  getAreaReport,
  getClientReport,
  getItemReport,
  getOfficeReport,
  getSalesmanReport,
  getVendorReport,
} from '../reportService';

export function ReportsPage() {
  const toast = useToast();
  const navigate = useNavigate();
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
  const [type, setType] = useState('office');
  const [entityId, setEntityId] = useState('');
  const [clients, setClients] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getClients(), getSalesmen(), getInventory(), getVendors()]).then(
      ([c, s, i, v]) => {
        setClients(c);
        setSalesmen(s);
        setItems(i);
        setVendors(v);
      },
    );
  }, []);

  const areas = [...new Set(salesmen.map((s) => s.area).filter(Boolean))];

  async function run() {
    if (type !== 'office' && !entityId) {
      toast('Select an entity first', 'warn');
      return;
    }
    setLoading(true);
    try {
      if (type === 'client') setReport(await getClientReport(entityId, range));
      else if (type === 'salesman' || type === 'weekly') setReport(await getSalesmanReport(entityId, range));
      else if (type === 'area') setReport(await getAreaReport(entityId, range));
      else if (type === 'item') setReport(await getItemReport(entityId, range));
      else if (type === 'vendor') setReport(await getVendorReport(entityId, range));
      else setReport(await getOfficeReport(range));
    } catch (err) {
      toast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  const periodLabel = fromStart ? `From start → ${formatDate(end)}` : `${formatDate(start)} → ${formatDate(end)}`;

  const entityOptions =
    type === 'client'
      ? clients.map((c) => ({ value: c.id, label: c.shopName }))
      : type === 'salesman' || type === 'weekly'
        ? salesmen.map((s) => ({ value: s.id, label: s.name }))
        : type === 'area'
          ? areas.map((a) => ({ value: a, label: a }))
          : type === 'vendor'
            ? vendors.map((v) => ({ value: v.id, label: v.name }))
            : type === 'item'
              ? items.map((i) => ({ value: i.id, label: i.itemName }))
              : [];

  function printPayload() {
    if (!report) return null;
    if (type === 'office') {
      return {
        title: 'Office report',
        subtitle: periodLabel,
        stats: [
          { label: 'Total sale', value: formatCurrency(report.totals.sales) },
          { label: 'Cash sale', value: formatCurrency(report.totals.cashSales) },
          { label: 'Credit sale', value: formatCurrency(report.totals.creditSales) },
          { label: 'Recovery', value: formatCurrency(report.totals.recovery) },
          { label: 'Expense', value: formatCurrency(report.totals.expense) },
        ],
        columns: [
          { header: 'Date', value: (r) => formatDate(r.date) },
          { header: 'Client', value: (r) => r.clientName },
          { header: 'Type', value: (r) => r.paymentType },
          { header: 'Net', value: (r) => formatCurrency(r.netAmount) },
        ],
        rows: report.transactions,
      };
    }
    if (type === 'client') {
      return {
        title: `Client account — ${report.client?.shopName}`,
        subtitle: periodLabel,
        stats: [
          { label: 'Cash sales', value: formatCurrency(report.totals.cashSales) },
          { label: 'Credit sales', value: formatCurrency(report.totals.creditSales) },
          { label: 'Recovery', value: formatCurrency(report.totals.recovery) },
          { label: 'Balance', value: formatCurrency(report.totals.balance) },
        ],
        columns: [
          { header: 'Date', value: (r) => formatDate(r.date) },
          { header: 'Kind', value: (r) => r.kind },
          { header: 'Detail', value: (r) => r.detail },
          { header: 'Mode', value: (r) => r.paymentMode },
          { header: 'Amount', value: (r) => formatCurrency(r.amount) },
        ],
        rows: report.ledger,
      };
    }
    if (type === 'salesman' || type === 'weekly') {
      return {
        title: `${type === 'weekly' ? 'Weekly' : 'Salesman'} report — ${report.salesman?.name}`,
        subtitle: periodLabel,
        stats: [
          { label: 'Cash sales', value: formatCurrency(report.totals.cashSales) },
          { label: 'Credit sales', value: formatCurrency(report.totals.creditSales) },
          { label: 'Recovery', value: formatCurrency(report.totals.recovery) },
          { label: 'Commission', value: formatCurrency(report.totals.commissionEarned) },
          { label: 'Deposits', value: formatCurrency(report.totals.deposits) },
          { label: 'Advances taken', value: formatCurrency(report.totals.advancesTaken) },
          { label: 'Credit outstanding', value: formatCurrency(report.totals.totalCreditOutstanding) },
        ],
        columns: [
          { header: 'Shop', value: (r) => r.shopName },
          { header: 'Serial', value: (r) => r.serialNumber },
          { header: 'City', value: (r) => r.city || '—' },
          { header: 'Balance', value: (r) => formatCurrency(r.balance) },
        ],
        rows: report.clients,
      };
    }
    if (type === 'area') {
      return {
        title: `Area report — ${report.area}`,
        subtitle: periodLabel,
        stats: [
          { label: 'Sales', value: formatCurrency(report.totals.sales) },
          { label: 'Recovery', value: formatCurrency(report.totals.recovery) },
          { label: 'Credit outstanding', value: formatCurrency(report.totals.creditOutstanding) },
        ],
        columns: [
          { header: 'Shop', value: (r) => r.shopName },
          { header: 'Salesman', value: (r) => r.salesmanName },
          { header: 'City', value: (r) => r.city || '—' },
          { header: 'Balance', value: (r) => formatCurrency(r.balance) },
        ],
        rows: report.clients,
      };
    }
    if (type === 'vendor') {
      return {
        title: `Vendor — ${report.vendor?.name}`,
        subtitle: periodLabel,
        stats: [
          { label: 'Purchase', value: formatCurrency(report.totals.purchase) },
          { label: 'Payment', value: formatCurrency(report.totals.payment) },
          { label: 'Advance', value: formatCurrency(report.totals.advance) },
        ],
        columns: [
          { header: 'Date', value: (r) => formatDate(r.date) },
          { header: 'Type', value: (r) => r.type },
          { header: 'Amount', value: (r) => formatCurrency(r.amount) },
        ],
        rows: report.rows,
      };
    }
    if (type === 'item') {
      return {
        title: `Item — ${report.item?.itemName}`,
        subtitle: periodLabel,
        stats: [
          { label: 'Yards', value: formatYards(report.totals.yards) },
          { label: 'Revenue', value: formatCurrency(report.totals.revenue) },
        ],
        columns: [
          { header: 'Date', value: (r) => formatDate(r.date) },
          { header: 'Client', value: (r) => r.clientName },
          { header: 'Yards', value: (r) => formatYards(r.yards) },
          { header: 'Net', value: (r) => formatCurrency(r.netAmount) },
        ],
        rows: report.rows,
      };
    }
    return null;
  }

  const print = printPayload();

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Office, client, salesman, weekly, area, vendor, and item cuts — with print."
        actions={
          <>
            {print && (
              <PrintButton
                title={print.title}
                subtitle={print.subtitle}
                columns={print.columns}
                rows={print.rows}
                stats={print.stats}
              />
            )}
            <Button onClick={run} disabled={type !== 'office' && !entityId}>
              Run report
            </Button>
          </>
        }
      />
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Select
          label="Report type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setEntityId('');
            setReport(null);
          }}
        >
          <option value="office">Office overview</option>
          <option value="client">Client full account</option>
          <option value="salesman">Salesman-wise</option>
          <option value="weekly">Weekly salesman</option>
          <option value="area">Area (clients + balances)</option>
          <option value="vendor">Vendor by duration</option>
          <option value="item">Item</option>
        </Select>
        {type !== 'office' ? (
          <SearchableSelect
            label="Entity"
            value={entityId}
            onChange={setEntityId}
            options={entityOptions}
          />
        ) : (
          <div />
        )}
        <DatePicker
          mode="range"
          label="Period"
          start={start}
          end={end}
          fromStart={fromStart}
          onStartChange={setStart}
          onEndChange={setEnd}
          onFromStart={setFromStart}
          onThisMonth={setThisMonth}
        />
      </div>
      {loading && <Spinner />}

      {report && type === 'office' && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-5">
            <StatCard label="Total sale" value={formatCurrency(report.totals.sales)} accent="teal" />
            <StatCard label="Cash sale" value={formatCurrency(report.totals.cashSales)} accent="gold" />
            <StatCard label="Credit sale" value={formatCurrency(report.totals.creditSales)} accent="danger" />
            <StatCard label="Recovery" value={formatCurrency(report.totals.recovery)} accent="brand" />
            <StatCard label="Expense" value={formatCurrency(report.totals.expense)} accent="warn" />
          </div>
          <Table
            rows={report.transactions}
            empty="No sales in range."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'clientName', header: 'Client' },
              { key: 'paymentType', header: 'Pay' },
              { key: 'netAmount', header: 'Net', render: (r) => formatCurrency(r.netAmount) },
            ]}
          />
        </>
      )}

      {report && type === 'client' && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <StatCard label="Cash sales" value={formatCurrency(report.totals.cashSales)} accent="gold" />
            <StatCard label="Credit sales" value={formatCurrency(report.totals.creditSales)} accent="danger" />
            <StatCard label="Recovery" value={formatCurrency(report.totals.recovery)} accent="teal" />
            <StatCard label="Balance" value={formatCurrency(report.totals.balance)} accent="brand" />
          </div>
          <Table
            rows={report.ledger}
            empty="No activity in range."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'kind', header: 'Type' },
              { key: 'detail', header: 'Detail' },
              { key: 'paymentMode', header: 'Mode' },
              { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
            ]}
          />
        </>
      )}

      {report && (type === 'salesman' || type === 'weekly') && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            <StatCard label="Cash sales" value={formatCurrency(report.totals.cashSales)} accent="gold" />
            <StatCard label="Credit sales" value={formatCurrency(report.totals.creditSales)} accent="danger" />
            <StatCard label="Recovery" value={formatCurrency(report.totals.recovery)} accent="teal" />
            <StatCard label="Commission" value={formatCurrency(report.totals.commissionEarned)} accent="brand" />
            <StatCard label="Deposits given" value={formatCurrency(report.totals.deposits)} accent="success" />
            <StatCard label="Advances taken" value={formatCurrency(report.totals.advancesTaken)} accent="warn" />
            <StatCard
              label="Customers’ credit"
              value={formatCurrency(report.totals.totalCreditOutstanding)}
              accent="danger"
            />
          </div>
          <h3 className="mb-2 font-heading text-base">Customers & remaining balances</h3>
          <Table
            rows={report.clients}
            empty="No clients linked."
            onRowClick={(r) => navigate(`/clients/${r.id}`)}
            columns={[
              { key: 'shopName', header: 'Shop' },
              { key: 'serialNumber', header: 'Serial' },
              { key: 'city', header: 'City', render: (r) => r.city || '—' },
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
        </>
      )}

      {report && type === 'area' && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <StatCard label="Sales" value={formatCurrency(report.totals.sales)} accent="teal" />
            <StatCard label="Recovery" value={formatCurrency(report.totals.recovery)} accent="gold" />
            <StatCard
              label="Credit outstanding"
              value={formatCurrency(report.totals.creditOutstanding)}
              accent="danger"
            />
          </div>
          <h3 className="mb-2 font-heading text-base">Clients in area</h3>
          <Table
            rows={report.clients}
            empty="No clients in this area."
            columns={[
              { key: 'shopName', header: 'Shop' },
              { key: 'salesmanName', header: 'Salesman' },
              { key: 'city', header: 'City', render: (r) => r.city || '—' },
              {
                key: 'balance',
                header: 'Balance',
                render: (r) => formatCurrency(r.balance),
              },
            ]}
          />
        </>
      )}

      {report && type === 'vendor' && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <StatCard label="Purchase" value={formatCurrency(report.totals.purchase)} accent="danger" />
            <StatCard label="Payment" value={formatCurrency(report.totals.payment)} accent="teal" />
            <StatCard label="Advance" value={formatCurrency(report.totals.advance)} accent="gold" />
          </div>
          <Table
            rows={report.rows}
            empty="No vendor transactions in range."
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'type', header: 'Type' },
              { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
            ]}
          />
        </>
      )}

      {report && type === 'item' && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <StatCard label="Yards sold" value={formatYards(report.totals.yards)} accent="brand" />
            <StatCard label="Revenue" value={formatCurrency(report.totals.revenue)} accent="teal" />
          </div>
          <Table
            rows={report.rows}
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'clientName', header: 'Client' },
              { key: 'salesmanName', header: 'Salesman' },
              { key: 'yards', header: 'Yards', render: (r) => formatYards(r.yards) },
              { key: 'netAmount', header: 'Net', render: (r) => formatCurrency(r.netAmount) },
            ]}
          />
        </>
      )}
    </div>
  );
}
