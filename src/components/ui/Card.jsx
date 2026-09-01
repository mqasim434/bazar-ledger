import clsx from 'clsx';

export function Card({ children, className, accent, title, action }) {
  const accents = {
    brand: 'border-l-brand-500',
    teal: 'border-l-teal-500',
    gold: 'border-l-gold-400',
    danger: 'border-l-danger',
    success: 'border-l-success',
    warn: 'border-l-warn',
  };

  return (
    <div
      className={clsx(
        'rounded-md border border-ink-100 bg-card',
        accent && `border-l-4 ${accents[accent] || accents.brand}`,
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          {title && <h3 className="font-heading text-base">{title}</h3>}
          {action}
        </div>
      )}
      <div className={title || action ? 'p-4' : 'p-4'}>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, hint, accent = 'brand' }) {
  return (
    <Card accent={accent} className="h-full">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-heading text-2xl tnum text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}
