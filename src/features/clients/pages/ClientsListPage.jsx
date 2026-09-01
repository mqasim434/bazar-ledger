import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Input, Modal, PageHeader, Select, Spinner, Table } from '../../../components/ui';
import { formatCurrency } from '../../../utils/formatters';
import { useToast } from '../../../hooks/useToast';
import { useClients } from '../useClients';
import { useSalesmen } from '../../salesmen/useSalesmen';
import { ClientForm } from '../components/ClientForm';

export function ClientsListPage() {
  const { filtered, cities, status, filters, load, create, setFilters } = useClients();
  const salesmen = useSalesmen();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    load();
    salesmen.load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Shops on credit and cash terms."
        actions={<Button onClick={() => setOpen(true)}>Add Client</Button>}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Input
          placeholder="Search shop, serial, city"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
        <Select
          value={filters.salesmanId}
          onChange={(e) => setFilters({ salesmanId: e.target.value })}
          placeholder="All salesmen"
        >
          {salesmen.list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.city}
          onChange={(e) => setFilters({ city: e.target.value })}
          placeholder="All cities"
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
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
          onRowClick={(row) => navigate(`/clients/${row.id}`)}
          empty="No shops yet."
          columns={[
            { key: 'shopName', header: 'Shop' },
            { key: 'serialNumber', header: 'Serial' },
            { key: 'ownerName', header: 'Owner', render: (r) => r.ownerName || '—' },
            { key: 'city', header: 'City', render: (r) => r.city || '—' },
            { key: 'salesmanName', header: 'Salesman' },
            {
              key: 'balance',
              header: 'Balance',
              render: (r) => (
                <span className={Number(r.balance) > 0 ? 'text-danger' : 'text-success'}>
                  {formatCurrency(r.balance)}
                </span>
              ),
            },
            {
              key: 'active',
              header: 'Status',
              render: (r) => (
                <Badge tone={r.active ? 'active' : 'inactive'}>{r.active ? 'Active' : 'Inactive'}</Badge>
              ),
            },
          ]}
        />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add client" size="lg">
        <ClientForm
          submitting={saving}
          onCancel={() => setOpen(false)}
          onSubmit={async (data) => {
            setSaving(true);
            const result = await create(data);
            setSaving(false);
            if (result.error) {
              toast(result.payload || result.error.message || 'Could not save', 'danger');
              return;
            }
            toast('Client added', 'success');
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
