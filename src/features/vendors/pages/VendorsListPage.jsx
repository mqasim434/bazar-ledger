import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, PageHeader, Spinner, Table } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { addVendor, getVendors } from '../vendorService';

export function VendorsListPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  async function reload() {
    setLoading(true);
    setRows(await getVendors());
    setLoading(false);
  }

  useEffect(() => {
    reload().catch((e) => toast(e.message, 'danger'));
  }, []);

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Cloth suppliers — purchases, payments, and advances."
        actions={<Button onClick={() => setOpen(true)}>Add vendor</Button>}
      />
      {loading ? (
        <Spinner />
      ) : (
        <Table
          rows={rows}
          onRowClick={(r) => navigate(`/vendors/${r.id}`)}
          empty="No vendors yet."
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'contact', header: 'Contact', render: (r) => r.contact || '—' },
            { key: 'totalOwed', header: 'Owed', render: (r) => formatCurrency(r.totalOwed) },
            { key: 'totalPaid', header: 'Paid', render: (r) => formatCurrency(r.totalPaid) },
            { key: 'totalAdvance', header: 'Advance', render: (r) => formatCurrency(r.totalAdvance) },
          ]}
        />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add vendor">
        <div className="space-y-3">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Contact"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={async () => {
                if (!form.name.trim()) return toast('Name is required', 'danger');
                setSaving(true);
                try {
                  await addVendor(form);
                  toast('Vendor added', 'success');
                  setOpen(false);
                  setForm({ name: '', contact: '' });
                  reload();
                } catch (err) {
                  toast(err.message, 'danger');
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
