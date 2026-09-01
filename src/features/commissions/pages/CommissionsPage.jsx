import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  SearchableSelect,
  Select,
  Spinner,
  Table,
  Tabs,
  Textarea,
} from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate, todayKey } from '../../../utils/formatters';
import { getSalesmen } from '../../salesmen/salesmenService';
import {
  addCommissionAdjustment,
  addCommissionRule,
  generateCommission,
  getCommissionRules,
  getCommissions,
  recordCommissionPayment,
} from '../commissionService';

export function CommissionsPage() {
  const profile = useSelector((s) => s.auth.profile);
  const toast = useToast();
  const [tab, setTab] = useState('runs');
  const [rules, setRules] = useState([]);
  const [rows, setRows] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    salesmanId: 'default',
    basis: 'sales',
    type: 'percentage',
    rate: '',
    effectiveFrom: todayKey(),
  });
  const [gen, setGen] = useState({ salesmanId: '', periodStart: todayKey().slice(0, 8) + '01', periodEnd: todayKey() });
  const [pay, setPay] = useState('');
  const [adj, setAdj] = useState({ amount: '', reason: '' });

  async function reload() {
    setLoading(true);
    const [r, c, s] = await Promise.all([getCommissionRules(), getCommissions(), getSalesmen()]);
    setRules(r);
    setRows(c.sort((a, b) => String(b.periodEnd).localeCompare(String(a.periodEnd))));
    setSalesmen(s);
    setLoading(false);
  }

  useEffect(() => {
    reload().catch((e) => toast(e.message, 'danger'));
  }, []);

  const salesmanName = (id) =>
    id === 'default' ? 'Default (all)' : salesmen.find((s) => s.id === id)?.name || id;

  return (
    <div>
      <PageHeader
        title="Commissions"
        subtitle="Formula is configurable — set rules, then generate a run per period. Rates are not assumed."
        actions={
          <>
            <Button variant="secondary" onClick={() => setRuleOpen(true)}>
              Add rule
            </Button>
            <Button onClick={() => setGenOpen(true)}>Generate commission</Button>
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'runs', label: 'Commission runs' },
          { id: 'rules', label: 'Rules' },
        ]}
      />
      <div className="mt-4">
        {loading ? (
          <Spinner />
        ) : tab === 'rules' ? (
          <Table
            rows={rules}
            empty="No rules yet. Add a default percentage or per-yard rule."
            columns={[
              { key: 'salesmanId', header: 'Applies to', render: (r) => salesmanName(r.salesmanId) },
              { key: 'basis', header: 'Basis' },
              { key: 'type', header: 'Type' },
              { key: 'rate', header: 'Rate' },
              { key: 'effectiveFrom', header: 'From', render: (r) => formatDate(r.effectiveFrom) },
            ]}
          />
        ) : (
          <Table
            rows={rows}
            empty="No commission runs generated."
            onRowClick={setDetail}
            columns={[
              { key: 'salesmanName', header: 'Salesman' },
              {
                key: 'period',
                header: 'Period',
                render: (r) => `${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}`,
              },
              { key: 'basisAmount', header: 'Basis', render: (r) => formatCurrency(r.basisAmount) },
              { key: 'earnedAmount', header: 'Earned', render: (r) => formatCurrency(r.earnedAmount) },
              { key: 'paidAmount', header: 'Paid', render: (r) => formatCurrency(r.paidAmount) },
              {
                key: 'remainingBalance',
                header: 'Remaining',
                render: (r) => formatCurrency(r.remainingBalance),
              },
            ]}
          />
        )}
      </div>

      <Modal open={ruleOpen} onClose={() => setRuleOpen(false)} title="Commission rule">
        <div className="space-y-3">
          <Select
            label="Salesman"
            value={ruleForm.salesmanId}
            onChange={(e) => setRuleForm({ ...ruleForm, salesmanId: e.target.value })}
          >
            <option value="default">Default (all salesmen)</option>
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            label="Basis"
            value={ruleForm.basis}
            onChange={(e) => setRuleForm({ ...ruleForm, basis: e.target.value })}
          >
            <option value="sales">Sales</option>
            <option value="recovery">Recovery</option>
          </Select>
          <Select
            label="Type"
            value={ruleForm.type}
            onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value })}
          >
            <option value="percentage">Percentage of basis amount</option>
            <option value="flat_per_yard">Flat amount per yard</option>
          </Select>
          <Input
            label="Rate"
            type="number"
            step="0.01"
            value={ruleForm.rate}
            onChange={(e) => setRuleForm({ ...ruleForm, rate: e.target.value })}
          />
          <Input
            label="Effective from"
            type="date"
            value={ruleForm.effectiveFrom}
            onChange={(e) => setRuleForm({ ...ruleForm, effectiveFrom: e.target.value })}
          />
          <Button
            className="w-full"
            onClick={async () => {
              await addCommissionRule({
                ...ruleForm,
                salesmanName: salesmanName(ruleForm.salesmanId),
              });
              toast('Rule saved', 'success');
              setRuleOpen(false);
              reload();
            }}
          >
            Save rule
          </Button>
        </div>
      </Modal>

      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate commission">
        <div className="space-y-3">
          <SearchableSelect
            label="Salesman"
            value={gen.salesmanId}
            onChange={(id) => setGen({ ...gen, salesmanId: id })}
            options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Input
            label="Period start"
            type="date"
            value={gen.periodStart}
            onChange={(e) => setGen({ ...gen, periodStart: e.target.value })}
          />
          <Input
            label="Period end"
            type="date"
            value={gen.periodEnd}
            onChange={(e) => setGen({ ...gen, periodEnd: e.target.value })}
          />
          <p className="text-xs text-ink-500">
            Uses the latest matching rule (salesman-specific, else default) effective on the period end date.
          </p>
          <Button
            className="w-full"
            onClick={async () => {
              try {
                const man = salesmen.find((s) => s.id === gen.salesmanId);
                await generateCommission({ ...gen, salesmanName: man?.name }, profile?.email);
                toast('Commission generated', 'success');
                setGenOpen(false);
                reload();
              } catch (err) {
                toast(err.message, 'danger');
              }
            }}
          >
            Generate
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Commission detail" size="lg">
        {detail && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              {detail.salesmanName} · {formatDate(detail.periodStart)} – {formatDate(detail.periodEnd)} ·{' '}
              {detail.basis} @ {detail.rate}
              {detail.type === 'percentage' ? '%' : ' / yd'}
            </p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Card>
                Earned
                <div className="font-heading text-lg">{formatCurrency(detail.earnedAmount)}</div>
              </Card>
              <Card>
                Paid
                <div className="font-heading text-lg">{formatCurrency(detail.paidAmount)}</div>
              </Card>
              <Card accent="gold">
                Remaining
                <div className="font-heading text-lg">{formatCurrency(detail.remainingBalance)}</div>
              </Card>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Input label="Record payment" type="number" value={pay} onChange={(e) => setPay(e.target.value)} />
                <Button
                  size="sm"
                  onClick={async () => {
                    await recordCommissionPayment(detail.id, pay, profile?.email);
                    toast('Payment recorded', 'success');
                    setPay('');
                    setDetail(null);
                    reload();
                  }}
                >
                  Pay
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  label="Adjustment amount"
                  type="number"
                  value={adj.amount}
                  onChange={(e) => setAdj({ ...adj, amount: e.target.value })}
                />
                <Textarea
                  label="Reason"
                  value={adj.reason}
                  onChange={(e) => setAdj({ ...adj, reason: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await addCommissionAdjustment(detail.id, adj.amount, adj.reason, profile?.email);
                    toast('Adjustment added', 'success');
                    setAdj({ amount: '', reason: '' });
                    setDetail(null);
                    reload();
                  }}
                >
                  Add adjustment
                </Button>
              </div>
            </div>
            <Table
              rows={detail.adjustments || []}
              empty="No adjustments."
              keyField="date"
              columns={[
                { key: 'date', header: 'Date' },
                { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
                { key: 'reason', header: 'Reason' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
