import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DatePicker, PageHeader, SearchableSelect, Select, Spinner, StatCard, Table } from '../../../components/ui';
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { downloadCsv, toCsv } from '../../../utils/csvExport';
import { formatCurrency, formatYards } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getInventory } from '../../inventory/inventoryService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { getAreaReport, getClientReport, getItemReport, getSalesmanReport } from '../reportService';

export function ReportsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { start, end, setStart, setEnd, range } = useDateRangeFilter();
  const [type, setType] = useState('salesman');
  const [entityId, setEntityId] = useState('');
  const [clients, setClients] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [items, setItems] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getClients(), getSalesmen(), getInventory()]).then(([c, s, i]) => {
      setClients(c);
      setSalesmen(s);
      setItems(i);
    });
  }, []);

  const areas = [...new Set(salesmen.map((s) => s.area).filter(Boolean))];

  async function run() {
    setLoading(true);
    try {
      if (type === 'client') setReport(await getClientReport(entityId, range));
      else if (type === 'salesman') setReport(await getSalesmanReport(entityId, range));
      else if (type === 'area') setReport(await getAreaReport(entityId, range));
      else setReport(await getItemReport(entityId, range));
    } catch (err) {
      toast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!report) return;
    if (type === 'client' || type === 'salesman') {
      downloadCsv(
        `${type}-report`,
        toCsv(report.transactions || [], [
          { header: 'Date', value: (r) => r.date },
          { header: 'Item', value: (r) => r.itemName },
          { header: 'Yards', value: (r) => r.yards },
          { header: 'Net', value: (r) => r.netAmount },
        ]),
      );
    } else if (type === 'area') {
      downloadCsv(
        'area-report',
        toCsv(report.rows, [
          { header: 'Salesman', value: (r) => r.name },
          { header: 'Sales', value: (r) => r.sales },
          { header: 'Recovery', value: (r) => r.recovery },
        ]),
      );
    } else {
      downloadCsv(
        'item-report',
        toCsv(report.rows, [
          { header: 'Date', value: (r) => r.date },
          { header: 'Client', value: (r) => r.clientName },
          { header: 'Yards', value: (r) => r.yards },
          { header: 'Net', value: (r) => r.netAmount },
        ]),
      );
    }
  }

  const entityOptions =
    type === 'client'
      ? clients.map((c) => ({ value: c.id, label: c.shopName }))
      : type === 'salesman'
        ? salesmen.map((s) => ({ value: s.id, label: s.name }))
        : type === 'area'
          ? areas.map((a) => ({ value: a, label: a }))
          : items.map((i) => ({ value: i.id, label: i.itemName }));

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Client, salesman, area, and item cuts. Confirm with the business if more filters are needed."
        actions={
          <>
            <Button variant="secondary" disabled={!report} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button onClick={run} disabled={!entityId}>
              Run report
            </Button>
          </>
        }
      />
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Select label="Report type" value={type} onChange={(e) => { setType(e.target.value); setEntityId(''); setReport(null); }}>
          <option value="client">Client</option>
          <option value="salesman">Salesman</option>
          <option value="area">Area</option>
          <option value="item">Item</option>
        </Select>
        <SearchableSelect
          label="Entity"
          value={entityId}
          onChange={setEntityId}
          options={entityOptions}
        />
        <DatePicker mode="range" label="Period" start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      </div>
      {loading && <Spinner />}
      {report && type === 'salesman' && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <StatCard label="Sales" value={formatCurrency(report.totals.sales)} accent="teal" />
            <StatCard label="Recovery" value={formatCurrency(report.totals.recovery)} accent="gold" />
            <StatCard label="Expenses" value={formatCurrency(report.totals.expenses)} accent="warn" />
            <StatCard label="Deposits" value={formatCurrency(report.totals.deposits)} accent="brand" />
          </div>
          <Table
            rows={report.transactions}
            empty="No sales in range."
            onRowClick={() => navigate(`/salesmen/${report.salesman.id}`)}
            columns={[
              { key: 'date', header: 'Date' },
              { key: 'clientName', header: 'Client' },
              { key: 'itemName', header: 'Item' },
              { key: 'netAmount', header: 'Net', render: (r) => formatCurrency(r.netAmount) },
            ]}
          />
        </>
      )}
      {report && type === 'client' && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <StatCard label="Sales" value={formatCurrency(report.totals.sales)} accent="teal" />
            <StatCard label="Recovery" value={formatCurrency(report.totals.recovery)} accent="gold" />
            <StatCard label="Returned yards" value={formatYards(report.totals.returnedYards)} accent="warn" />
          </div>
          <Table
            rows={report.transactions}
            empty="No sales in range."
            columns={[
              { key: 'date', header: 'Date' },
              { key: 'itemName', header: 'Item' },
              { key: 'yards', header: 'Yards', render: (r) => formatYards(r.yards) },
              { key: 'netAmount', header: 'Net', render: (r) => formatCurrency(r.netAmount) },
            ]}
          />
        </>
      )}
      {report && type === 'area' && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <StatCard label="Sales" value={formatCurrency(report.totals.sales)} accent="teal" />
            <StatCard label="Recovery" value={formatCurrency(report.totals.recovery)} accent="gold" />
          </div>
          <Table
            rows={report.rows}
            columns={[
              { key: 'name', header: 'Salesman' },
              { key: 'sales', header: 'Sales', render: (r) => formatCurrency(r.sales) },
              { key: 'recovery', header: 'Recovery', render: (r) => formatCurrency(r.recovery) },
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
              { key: 'date', header: 'Date' },
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
