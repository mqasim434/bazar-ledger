import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Input, Modal, PageHeader, Select, Spinner, Table } from '../../../components/ui';
import { formatCurrency } from '../../../utils/formatters';
import { useToast } from '../../../hooks/useToast';
import { useSalesmen } from '../useSalesmen';
import { SalesmanForm } from '../components/SalesmanForm';

export function SalesmenListPage() {
  const { filtered, areas, status, filters, load, create, setFilters } = useSalesmen();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Salesmen"
        subtitle="Routes, cash in hand, and linked shops."
        actions={<Button onClick={() => setOpen(true)}>Add Salesman</Button>}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Search name or route"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
        <Select
          value={filters.area}
          onChange={(e) => setFilters({ area: e.target.value })}
          placeholder="All areas"
        >
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          value={filters.activeOnly ? 'active' : 'all'}
          onChange={(e) => setFilters({ activeOnly: e.target.value === 'active' })}
        >
          <option value="active">Active only</option>
          <option value="all">All</option>
        </Select>
      </div>
      {status === 'loading' && filtered.length === 0 ? (
        <Spinner />
      ) : (
        <Table
          rows={filtered}
          onRowClick={(row) => navigate(`/salesmen/${row.id}`)}
          empty="No salesmen yet. Add the first one."
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'area', header: 'Area', render: (r) => r.area || '—' },
            { key: 'route', header: 'Route', render: (r) => r.route || '—' },
            { key: 'contact', header: 'Contact' },
            {
              key: 'cashInHand',
              header: 'Cash',
              render: (r) => formatCurrency(r.cashInHand),
            },
            {
              key: 'bankInHand',
              header: 'Bank',
              render: (r) => formatCurrency(r.bankInHand),
            },
            {
              key: 'totalSales',
              header: 'Total sales',
              render: (r) => formatCurrency(r.totalSales),
            },
            {
              key: 'active',
              header: 'Status',
              render: (r) => <Badge tone={r.active ? 'active' : 'inactive'}>{r.active ? 'Active' : 'Inactive'}</Badge>,
            },
          ]}
        />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add salesman">
        <SalesmanForm
          submitting={saving}
          onCancel={() => setOpen(false)}
          onSubmit={async (data) => {
            setSaving(true);
            const result = await create(data);
            setSaving(false);
            if (result.error) {
              toast(result.error.message || 'Could not save', 'danger');
              return;
            }
            toast('Salesman added', 'success');
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
