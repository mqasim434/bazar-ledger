export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading ledger…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
      <p className="mt-4 font-heading text-lg text-ink-700">{label}</p>
    </div>
  );
}
