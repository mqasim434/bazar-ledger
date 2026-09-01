import clsx from 'clsx';
import { forwardRef } from 'react';

export const Select = forwardRef(function Select(
  { label, error, hint, className, required, children, placeholder, ...props },
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
      <select
        ref={ref}
        className={clsx(
          'h-10 w-full rounded-md border bg-white px-3 text-sm text-ink-900',
          'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100',
          error ? 'border-danger' : 'border-ink-100',
          className,
        )}
        {...props}
      >
        {placeholder != null && (
          <option value="">{placeholder}</option>
        )}
        {children}
      </select>
      {error && <span className="block text-xs text-danger">{error}</span>}
      {hint && !error && <span className="block text-xs text-ink-500">{hint}</span>}
    </label>
  );
});
