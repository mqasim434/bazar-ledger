import { useState } from 'react';
import { Button, Input } from '../../../components/ui';

export function ItemForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    itemName: initial?.itemName || '',
    unit: 'yard',
    costPricePerYard: initial?.costPricePerYard ?? '',
    ratePerYard: initial?.ratePerYard ?? '',
    stockYards: initial?.stockYards ?? 0,
  });
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(initial?.id);

  function validate() {
    const next = {};
    if (!form.itemName.trim()) next.itemName = 'Item name is required.';
    if (form.costPricePerYard === '' || Number(form.costPricePerYard) < 0) {
      next.costPricePerYard = 'Cost price is required.';
    }
    if (form.ratePerYard === '' || Number(form.ratePerYard) < 0) {
      next.ratePerYard = 'Rate is required.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validate()) return;
        onSubmit(form);
      }}
    >
      <Input
        label="Item name"
        required
        value={form.itemName}
        error={errors.itemName}
        onChange={(e) => setForm({ ...form, itemName: e.target.value })}
      />
      <Input label="Unit" value="yard" disabled />
      <Input
        label="Cost price per yard (Rs)"
        type="number"
        min="0"
        step="0.01"
        required
        value={form.costPricePerYard}
        error={errors.costPricePerYard}
        onChange={(e) => setForm({ ...form, costPricePerYard: e.target.value })}
      />
      <Input
        label="Default rate per yard (Rs)"
        type="number"
        min="0"
        step="0.01"
        required
        hint="Salesmen can override this per sale."
        value={form.ratePerYard}
        error={errors.ratePerYard}
        onChange={(e) => setForm({ ...form, ratePerYard: e.target.value })}
      />
      {!isEdit && (
        <Input
          label="Opening stock (yards)"
          type="number"
          min="0"
          step="0.01"
          value={form.stockYards}
          onChange={(e) => setForm({ ...form, stockYards: e.target.value })}
        />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Save item
        </Button>
      </div>
    </form>
  );
}
