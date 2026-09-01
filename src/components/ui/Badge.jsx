import clsx from 'clsx';

const tones = {
  default: 'border-l-ink-300 text-ink-700 bg-ink-50',
  active: 'border-l-success text-success bg-[#3E7D5A]/10',
  inactive: 'border-l-ink-300 text-ink-500 bg-ink-50',
  cash: 'border-l-gold-400 text-gold-500 bg-[#D9A441]/10',
  credit: 'border-l-danger text-danger bg-[#B14A3C]/10',
  pending: 'border-l-warn text-warn bg-[#C0872F]/10',
  confirmed: 'border-l-success text-success bg-[#3E7D5A]/10',
  rejected: 'border-l-danger text-danger bg-[#B14A3C]/10',
  returned: 'border-l-ink-500 text-ink-700 bg-ink-50',
  teal: 'border-l-teal-500 text-teal-600 bg-[#2E6E6A]/10',
  brand: 'border-l-brand-500 text-brand-700 bg-brand-50',
};

export function Badge({ children, tone = 'default', className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center border-l-[3px] px-2 py-0.5 text-xs font-medium',
        tones[tone] || tones.default,
        className,
      )}
    >
      {children}
    </span>
  );
}
