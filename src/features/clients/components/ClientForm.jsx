import { useEffect, useState } from 'react';
import { Button, Input, SearchableSelect } from '../../../components/ui';
import { getSalesmen } from '../../salesmen/salesmenService';

export function ClientForm({ initial, onSubmit, onCancel, submitting }) {
  const [salesmen, setSalesmen] = useState([]);
  const [form, setForm] = useState({
    shopName: initial?.shopName || '',
    serialNumber: initial?.serialNumber || '',
    ownerName: initial?.ownerName || '',
    contact: initial?.contact || '',
    city: initial?.city || '',
    gps: { lat: initial?.gps?.lat ?? '', lng: initial?.gps?.lng ?? '' },
    creditLimit: initial?.creditLimit ?? 0,
    creditLimitEnabled: initial?.creditLimitEnabled || false,
    defaultDiscountPercent: initial?.defaultDiscountPercent ?? 0,
    salesmanId: initial?.salesmanId || '',
    active: initial?.active !== false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getSalesmen({ activeOnly: true }).then(setSalesmen).catch(() => setSalesmen([]));
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.shopName.trim()) next.shopName = 'Shop name is required.';
    if (!form.serialNumber.trim()) next.serialNumber = 'Serial number is required.';
    if (!form.salesmanId) next.salesmanId = 'Salesman is required.';
    const disc = Number(form.defaultDiscountPercent);
    if (disc < 0 || disc > 100) next.defaultDiscountPercent = 'Discount must be 0–100.';
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
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Shop name"
          required
          value={form.shopName}
          error={errors.shopName}
          onChange={(e) => set('shopName', e.target.value)}
        />
        <Input
          label="Serial number"
          required
          value={form.serialNumber}
          error={errors.serialNumber}
          onChange={(e) => set('serialNumber', e.target.value)}
        />
        <Input
          label="Owner name"
          value={form.ownerName}
          onChange={(e) => set('ownerName', e.target.value)}
        />
        <Input
          label="WhatsApp / phone"
          value={form.contact}
          hint="Used for sale and recovery receipts"
          onChange={(e) => set('contact', e.target.value)}
        />
        <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
        <Input
          label="GPS latitude"
          type="number"
          step="any"
          value={form.gps.lat}
          onChange={(e) => set('gps', { ...form.gps, lat: e.target.value })}
        />
        <Input
          label="GPS longitude"
          type="number"
          step="any"
          value={form.gps.lng}
          onChange={(e) => set('gps', { ...form.gps, lng: e.target.value })}
        />
        <Input
          label="Credit limit (Rs)"
          type="number"
          min="0"
          value={form.creditLimit}
          onChange={(e) => set('creditLimit', e.target.value)}
        />
        <Input
          label="Default discount %"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={form.defaultDiscountPercent}
          error={errors.defaultDiscountPercent}
          onChange={(e) => set('defaultDiscountPercent', e.target.value)}
        />
      </div>
      <SearchableSelect
        label="Salesman"
        required
        error={errors.salesmanId}
        value={form.salesmanId}
        onChange={(id) => set('salesmanId', id)}
        options={salesmen.map((s) => ({ value: s.id, label: `${s.name} · ${s.area || 'No area'}` }))}
        placeholder="Select salesman"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.creditLimitEnabled}
          onChange={(e) => set('creditLimitEnabled', e.target.checked)}
        />
        Enforce credit limit (warning on over-limit credit sales)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
        />
        Active
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Save client
        </Button>
      </div>
    </form>
  );
}
