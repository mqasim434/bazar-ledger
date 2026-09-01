import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Input } from '../../../components/ui';
import { isFirebaseConfigured } from '../../../config/firebase';
import { useAuth } from '../useAuth';

export function LoginPage() {
  const { user, profile, status, error, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  if (user && profile) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!email || !password) {
      setFormError('Email and password are required.');
      return;
    }
    const result = await login(email, password);
    if (result.error) {
      setFormError(result.payload || result.error.message || 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="relative hidden w-[42%] flex-col justify-between bg-[#2A221C] p-10 text-brand-50 lg:flex">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-500 font-heading text-lg">
            B
          </div>
          <h1 className="mt-10 font-heading text-4xl leading-tight text-white">
            Cloth trade,
            <br />
            kept in order.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-brand-200">
            Admin ledger for shops, salesmen, stock, credit, and recovery — built for wholesale
            yards, not generic SaaS.
          </p>
        </div>
        <p className="text-xs text-brand-300">Bazaar Ledger · Wholesale distribution</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="font-heading text-2xl">Sign in</h2>
            <p className="mt-1 text-sm text-ink-500">Admin and accountant access only.</p>
          </div>
          {!isFirebaseConfigured && (
            <p className="rounded-md border border-warn/40 bg-[#C0872F]/10 px-3 py-2 text-sm text-warn">
              Firebase keys are missing. Copy <code>.env.example</code> to <code>.env</code> and
              restart the dev server.
            </p>
          )}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {(formError || error) && (
            <p className="text-sm text-danger">{formError || error}</p>
          )}
          <Button type="submit" className="w-full" loading={status === 'loading'}>
            Enter ledger
          </Button>
          <p className="text-xs text-ink-500">
            No self-signup. Users are created in Firebase Auth plus a matching{' '}
            <code>users/{'{uid}'}</code> document.
          </p>
        </form>
      </div>
    </div>
  );
}
