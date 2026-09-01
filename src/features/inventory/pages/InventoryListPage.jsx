import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Button,
  Input,
  Modal,
  PageHeader,
  SearchableSelect,
  Spinner,
  StatCard,
  Table,
  Textarea,
} from '../../../components/ui';
import { formatCurrency, formatYards } from '../../../utils/formatters';
import { useToast } from '../../../hooks/useToast';
import { useInventory } from '../useInventory';
import { ItemForm } from '../components/ItemForm';

export function InventoryListPage() {
  const { list, status, totalValue, load, create, save, adjust } = useInventory();
  const profile = useSelector((s) => s.auth.profile);
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Main inventory"
        subtitle="Office stock before it is issued to salesmen."
        actions={
          <>
            <Link to="/stock-issues">
              <Button variant="secondary">Issue stock</Button>
            </Link>
            <Button onClick={() => setAddOpen(true)}>Add item</Button>
          </>
        }
      />
      <div className="mb-4">
        <StatCard label="Total stock value" value={formatCurrency(totalValue)} accent="teal" />
      </div>
      {status === 'loading' && list.length === 0 ? (
        <Spinner />
      ) : (
        <Table
          rows={list}
          empty="No items yet."
          columns={[
            { key: 'itemName', header: 'Item' },
            { key: 'costPricePerYard', header: 'Cost / yd', render: (r) => formatCurrency(r.costPricePerYard) },
            { key: 'ratePerYard', header: 'Rate / yd', render: (r) => formatCurrency(r.ratePerYard) },
            { key: 'stockYards', header: 'Stock', render: (r) => formatYards(r.stockYards) },
            { key: 'stockValue', header: 'Value', render: (r) => formatCurrency(r.stockValue) },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEdit(r)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdjustItem(r)}>
                    Adjust
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add item">
        <ItemForm
          submitting={saving}
          onCancel={() => setAddOpen(false)}
          onSubmit={async (data) => {
            setSaving(true);
            const res = await create(data);
            setSaving(false);
            if (res.error) return toast(res.error.message, 'danger');
            toast('Item added', 'success');
            setAddOpen(false);
          }}
        />
      </Modal>

      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title="Edit item">
        {edit && (
          <ItemForm
            initial={edit}
            submitting={saving}
            onCancel={() => setEdit(null)}
            onSubmit={async (data) => {
              setSaving(true);
              const res = await save(edit.id, data);
              setSaving(false);
              if (res.error) return toast(res.error.message, 'danger');
              toast('Item updated', 'success');
              setEdit(null);
            }}
          />
        )}
      </Modal>

      <Modal open={Boolean(adjustItem)} onClose={() => setAdjustItem(null)} title="Adjust stock">
        {adjustItem && (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">
              {adjustItem.itemName} · available {formatYards(adjustItem.stockYards)}
            </p>
            <Input
              label="Delta (yards)"
              type="number"
              step="0.01"
              hint="Use a negative number to reduce stock (damage/audit)."
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
            <Textarea label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdjustItem(null)}>
                Cancel
              </Button>
              <Button
                loading={saving}
                onClick={async () => {
                  setSaving(true);
                  const res = await adjust({
                    itemId: adjustItem.id,
                    deltaYards: delta,
                    reason,
                    adjustedBy: profile?.email,
                  });
                  setSaving(false);
                  if (res.error) return toast(res.error.message, 'danger');
                  toast('Stock adjusted', 'success');
                  setAdjustItem(null);
                  setDelta('');
                  setReason('');
                  load();
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
