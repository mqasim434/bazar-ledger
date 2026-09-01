import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  ReceiptPreview,
  Select,
  Spinner,
  StatCard,
  Table,
} from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate, todayKey } from '../../../utils/formatters';
import {
  addVendorTransaction,
  getVendorById,
  getVendorTransactions,
  markVendorReceiptSent,
} from '../vendorService';

export function VendorDetailPage() {
  const { id } = useParams();
  const profile = useSelector((s) => s.auth.profile);
  const toast = useToast();
  const [vendor, setVendor] = useState(null);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({ type: 'purchase', amount: '', date: todayKey() });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [v, t] = await Promise.all([getVendorById(id), getVendorTransactions(id)]);
    setVendor(v);
    setRows(t.sort((a, b) => String(b.date).localeCompare(String(a.date))));
  }

  useEffect(() => {
    reload().catch((e) => toast(e.message, 'danger'));
  }, [id]);

  if (!vendor) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={vendor.name}
        subtitle={vendor.contact || 'No contact on file'}
        actions={<Button onClick={() => setOpen(true)}>Record transaction</Button>}
      />
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <StatCard label="Total owed" value={formatCurrency(vendor.totalOwed)} accent="danger" />
        <StatCard label="Total paid" value={formatCurrency(vendor.totalPaid)} accent="teal" />
        <StatCard label="Total advance" value={formatCurrency(vendor.totalAdvance)} accent="gold" />
      </div>
      <Card title="History">
        <Table
          rows={rows}
          empty="No vendor transactions."
          columns={[
            { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
            {
              key: 'type',
              header: 'Type',
              render: (r) => <Badge tone={r.type === 'purchase' ? 'credit' : 'teal'}>{r.type}</Badge>,
            },
            { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Button size="sm" variant="ghost" onClick={() => setReceipt(r)}>
                  Receipt
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Vendor transaction">
        <div className="space-y-3">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="purchase">Purchase (increases owed)</option>
            <option value="payment">Payment (reduces owed)</option>
            <option value="advance">Advance (paid ahead)</option>
          </Select>
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const txn = await addVendorTransaction(
                    { ...form, vendorId: id },
                    profile?.email,
                  );
                  toast('Recorded', 'success');
                  setOpen(false);
                  setReceipt(txn);
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
      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="Vendor receipt">
        {receipt && (
          <ReceiptPreview
            type="vendor"
            data={receipt}
            phone={vendor.contact}
            onSent={() => markVendorReceiptSent(receipt.id)}
          />
        )}
      </Modal>
    </div>
  );
}
