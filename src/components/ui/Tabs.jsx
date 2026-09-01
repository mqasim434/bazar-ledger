import clsx from 'clsx';

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="border-b border-ink-100">
      <nav className="-mb-px flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const id = tab.id ?? tab;
          const label = tab.label ?? tab;
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={clsx(
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-ink-500 hover:text-ink-900',
              )}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
