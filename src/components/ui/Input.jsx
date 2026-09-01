import clsx from 'clsx';
import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, error, hint, className, id, required, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-sm font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
      )}
      <input
        id={inputId}
        ref={ref}
        className={clsx(
          'h-10 w-full rounded-md border bg-white px-3 text-sm text-ink-900 tnum',
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
