import clsx from 'clsx';

const variants = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 border-transparent shadow-[0_1px_0_0_rgb(78_44_21/0.25)]',
  secondary:
    'bg-white text-ink-900 border-ink-100 hover:bg-brand-50 hover:border-brand-200',
  danger: 'bg-danger text-white hover:opacity-90 border-transparent',
  ghost: 'bg-transparent text-ink-700 border-transparent hover:bg-brand-50',
  gold: 'bg-gold-500 text-white hover:bg-gold-400 border-transparent',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  disabled,
  loading,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
