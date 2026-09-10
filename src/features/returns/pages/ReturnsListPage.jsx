import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Badge,
  Button,
  Modal,
  PageHeader,
  PrintButton,
  Select,
  Spinner,
  Table,
  Textarea,
} from '../../../components/ui';
import { useRole } from '../../../hooks/useRole';
import { useToast } from '../../../hooks/useToast';
import { formatDate, formatYards } from '../../../utils/formatters';
import { getClients } from '../../clients/clientsService';
import { getSalesmen } from '../../salesmen/salesmenService';
import { ReturnForm } from '../components/ReturnForm';
import { confirmReturn, getReturns, rejectReturn } from '../returnService';

export function ReturnsListPage() {
  const { isAdmin } = useRole();
  const profile = useSelector((s) => s.auth.profile);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [status, setStatus] = useState('pending');
  const [clientId, setClientId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [r, c, s] = await Promise.all([getReturns(), getClients(), getSalesmen()]);
    setRows(r);
    setClients(c);
    setSalesmen(s);
    setLoading(false);
  }

  useEffect(() => {
    reload().catch((e) => toast(e.message, 'danger'));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status && r.status !== status) return false;
        if (clientId && r.clientId !== clientId) return false;
        if (salesmanId && r.salesmanId !== salesmanId) return false;
        return true;
      }),
    [rows, status, clientId, salesmanId],
  );

  return (
    <div>
      <PageHeader
        title="Returns"
        subtitle="Add a return from here or a sale row. Pending returns do not move balances until an admin confirms."
        actions={
          <>
            <PrintButton
              title="Returns"
              rows={filtered}
              columns={[
                { header: 'Date', value: (r) => formatDate(r.date) },
                { header: 'Client', value: (r) => r.clientName },
                { header: 'Salesman', value: (r) => r.salesmanName },
                { header: 'Item', value: (r) => r.itemName },
                { header: 'Yards', value: (r) => formatYards(r.yardsReturned) },
                { header: 'Status', value: (r) => r.status },
              ]}
            />
            <Button onClick={() => setAddOpen(true)}>Add return</Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All statuses">
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="All shops">
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shopName}
            </option>
          ))}
        </Select>
        <Select value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)} placeholder="All salesmen">
          {salesmen.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <Table
          rows={filtered}
          empty="No returns."
          columns={[
            { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
            { key: 'clientName', header: 'Client' },
            { key: 'salesmanName', header: 'Salesman' },
            { key: 'itemName', header: 'Item' },
            { key: 'yardsReturned', header: 'Yards', render: (r) => formatYards(r.yardsReturned) },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <Badge tone={r.status}>{r.status}</Badge>,
            },
            {
              key: 'actions',
              header: '',
              render: (r) =>
                r.status === 'pending' && isAdmin ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await confirmReturn(r.id, profile?.email);
                          toast('Return confirmed', 'success');
                          reload();
                        } catch (err) {
                          toast(err.message, 'danger');
                        }
                      }}
                    >
                      Confirm
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setRejecting(r)}>
                      Reject
                    </Button>
                  </div>
                ) : null,
            },
          ]}
        />
      )}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add return" size="lg">
        <ReturnForm
          onCancel={() => setAddOpen(false)}
          onCreated={() => {
            toast('Return submitted as pending', 'success');
            setAddOpen(false);
            reload();
          }}
        />
      </Modal>
      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Reject return">
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejecting(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await rejectReturn(rejecting.id, reason, profile?.email);
              toast('Return rejected', 'warn');
              setRejecting(null);
              reload();
            }}
          >
            Reject
          </Button>
        </div>
      </Modal>
    </div>
  );
}
