import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  DatePicker,
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
import { useDateRangeFilter } from '../../../hooks/useDateRangeFilter';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatDate, todayKey } from '../../../utils/formatters';
import { getSalesmen } from '../../salesmen/salesmenService';
import { addOfficeExpense, addSalesmanExpense, getOfficeExpenses, getSalesmanExpenses } from '../expenseService';

const SUGGESTIONS = ['Fuel', 'Rent', 'Utilities', 'Wages', 'Packing', 'Transport', 'Misc'];

export function ExpensesListPage() {
  const profile = useSelector((s) => s.auth.profile);
  const toast = useToast();
  const {
    start,
    end,
    setStart,
    setEnd,
    inRange,
    fromStart,
    setFromStart,
    setThisMonth,
  } = useDateRangeFilter();
  const [tab, setTab] = useState('office');
  const [office, setOffice] = useState([]);
  const [salesmanRows, setSalesmanRows] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('cash');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayKey());
  const [salesmanId, setSalesmanId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterSalesman, setFilterSalesman] = useState('');
  const [saving, setSaving] = useState(false);
  const [warnNeg, setWarnNeg] = useState(false);

  async function reload() {
    setLoading(true);
    const [o, s, men] = await Promise.all([
      getOfficeExpenses(),
      getSalesmanExpenses(),
      getSalesmen({ activeOnly: true }),
    ]);
    setOffice(o);
    setSalesmanRows(s);
    setSalesmen(men);
    setLoading(false);
  }

  useEffect(() => {
    reload().catch((e) => toast(e.message, 'danger'));
  }, []);

  const officeFiltered = useMemo(
    () =>
      office.filter(
        (r) =>
          inRange(r.date) &&
          (!filterCategory || r.category === filterCategory) &&
          (!filterSource || r.source === filterSource),
      ),
    [office, inRange, filterCategory, filterSource],
  );
  const salesmanFiltered = useMemo(
    () =>
      salesmanRows.filter(
        (r) =>
          inRange(r.date) &&
          (!filterCategory || r.category === filterCategory) &&
          (!filterSalesman || r.salesmanId === filterSalesman),
      ),
    [salesmanRows, inRange, filterCategory, filterSalesman],
  );

  const cats = [...new Set([...(tab === 'office' ? office : salesmanRows).map((r) => r.category)])];

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Office cash/bank outflows, plus salesman-attributed costs (reporting only)."
        actions={<Button onClick={() => setOpen(true)}>Add expense</Button>}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'office', label: 'Office expenses' },
          { id: 'salesman', label: 'Salesman expenses' },
        ]}
      />
      <div className="my-4 grid gap-3 md:grid-cols-4">
        <DatePicker
          mode="range"
          start={start}
          end={end}
          fromStart={fromStart}
          onStartChange={setStart}
          onEndChange={setEnd}
          onFromStart={setFromStart}
          onThisMonth={setThisMonth}
        />
        <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} placeholder="All categories">
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {tab === 'office' ? (
          <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} placeholder="All sources">
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
          </Select>
        ) : (
          <Select value={filterSalesman} onChange={(e) => setFilterSalesman(e.target.value)} placeholder="All salesmen">
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      {loading ? (
        <Spinner />
      ) : tab === 'office' ? (
        <Table
          rows={officeFiltered}
          empty="No office expenses."
          columns={[
            { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
            { key: 'category', header: 'Category' },
            { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
            { key: 'source', header: 'Source' },
            { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
          ]}
        />
      ) : (
        <Table
          rows={salesmanFiltered}
          empty="No salesman expenses."
          columns={[
            { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
            { key: 'salesmanName', header: 'Salesman' },
            { key: 'category', header: 'Category' },
            { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
            { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
          ]}
        />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={`Add ${tab} expense`}>
        <div className="space-y-3">
          <Input
            label="Category"
            list="exp-cats"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="exp-cats">
            {SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {tab === 'salesman' && (
            <SearchableSelect
              label="Salesman"
              required
              value={salesmanId}
              onChange={setSalesmanId}
              options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {tab === 'office' && (
            <Select label="Source" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </Select>
          )}
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {warnNeg && (
            <p className="text-sm text-warn">
              This may drive the office balance negative. Submit again to continue.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={async () => {
                if (!category.trim() || !amount) return toast('Category and amount required', 'danger');
                setSaving(true);
                try {
                  if (tab === 'office') {
                    await addOfficeExpense(
                      { category, amount, source, date, notes },
                      profile?.email,
                    );
                  } else {
                    await addSalesmanExpense(
                      { salesmanId, category, amount, date, notes },
                      profile?.email,
                    );
                  }
                  toast('Expense added', 'success');
                  setOpen(false);
                  setCategory('');
                  setAmount('');
                  setNotes('');
                  setWarnNeg(false);
                  reload();
                } catch (err) {
                  if (!warnNeg && /negative/i.test(err.message)) {
                    setWarnNeg(true);
                  }
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
