import { useState } from 'react';
import { Button, Input } from '../../../components/ui';

const PHONE_RE = /^[0-9+\-\s]{10,16}$/;

export function SalesmanForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    contact: initial?.contact || '',
    route: initial?.route || '',
    area: initial?.area || '',
    active: initial?.active !== false,
  });
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!form.contact.trim()) next.contact = 'Contact is required.';
    else if (!PHONE_RE.test(form.contact.trim())) next.contact = 'Enter a valid phone number.';
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
        label="Name"
        required
        value={form.name}
        error={errors.name}
        onChange={(e) => set('name', e.target.value)}
      />
      <Input
        label="Contact"
        required
        value={form.contact}
        error={errors.contact}
        hint="Mobile number used for coordination"
        onChange={(e) => set('contact', e.target.value)}
      />
      <Input label="Route" value={form.route} onChange={(e) => set('route', e.target.value)} />
      <Input label="Area" value={form.area} onChange={(e) => set('area', e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-ink-700">
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
          Save salesman
        </Button>
      </div>
    </form>
  );
}
