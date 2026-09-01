import clsx from 'clsx';
import { forwardRef } from 'react';

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, required, rows = 3, ...props },
  ref,
) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-sm font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={clsx(
          'w-full rounded-md border bg-white px-3 py-2 text-sm text-ink-900',
          'placeholder:text-ink-300',
          'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100',
          error ? 'border-danger' : 'border-ink-100',
          className,
        )}
        {...props}
      />
      {error && <span className="block text-xs text-danger">{error}</span>}
      {hint && !error && <span className="block text-xs text-ink-500">{hint}</span>}
    </label>
  );
});
