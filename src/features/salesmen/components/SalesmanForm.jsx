import { useState } from 'react';
import { Button, Input } from '../../../components/ui';

const PHONE_RE = /^[0-9+\-\s]{10,16}$/;

export function SalesmanForm({ initial, onSubmit, onCancel, submitting }) {
  const hasLogin = Boolean(initial?.username);
  const [form, setForm] = useState({
    name: initial?.name || '',
    contact: initial?.contact || '',
    route: initial?.route || '',
    area: initial?.area || '',
    active: initial?.active !== false,
    username: initial?.username || '',
    password: '',
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
    const user = form.username.trim();
    if (user && !/^[a-zA-Z0-9._-]{3,32}$/.test(user)) {
      next.username = 'Username: 3–32 letters, numbers, . _ -';
    }
    if (user && !hasLogin && (!form.password || form.password.length < 4)) {
      next.password = 'Password required (min 4 chars) for new mobile login.';
    }
    if (form.password && form.password.length < 4) {
      next.password = 'Password must be at least 4 characters.';
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

      <div className="rounded-md border border-ink-100 bg-brand-50/40 p-3 space-y-3">
        <p className="text-sm font-medium text-ink-700">Mobile app login</p>
        <p className="text-xs text-ink-500">
          Username and password are stored in Firestore (not Firebase Auth). Leave password blank when
          editing to keep the current password.
        </p>
        <Input
          label="Username"
          value={form.username}
          error={errors.username}
          autoComplete="off"
          hint={hasLogin ? `Current login: ${initial.username}` : 'Optional until mobile access is needed'}
          onChange={(e) => set('username', e.target.value)}
        />
        <Input
          label={hasLogin ? 'New password' : 'Password'}
          type="password"
          value={form.password}
          error={errors.password}
          autoComplete="new-password"
          hint={hasLogin ? 'Leave blank to keep existing password' : 'Min 4 characters'}
          onChange={(e) => set('password', e.target.value)}
        />
      </div>

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
