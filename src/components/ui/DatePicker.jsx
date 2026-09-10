import { Button } from './Button';
import { Input } from './Input';

export function DatePicker({
  mode = 'single',
  value,
  onChange,
  start,
  end,
  onStartChange,
  onEndChange,
  label,
  fromStart,
  onFromStart,
  onThisMonth,
  showFromStart = true,
}) {
  if (mode === 'range') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label={label ? `${label} from` : 'From'}
            value={fromStart ? '' : start || ''}
            disabled={fromStart}
            hint={fromStart ? 'From start (full history)' : undefined}
            onChange={(e) => onStartChange?.(e.target.value)}
          />
          <Input
            type="date"
            label={label ? `${label} to` : 'To'}
            value={end || ''}
            onChange={(e) => onEndChange?.(e.target.value)}
          />
        </div>
        {showFromStart && (onFromStart || onThisMonth) && (
          <div className="flex flex-wrap gap-2">
            {onFromStart && (
              <Button type="button" size="sm" variant={fromStart ? 'primary' : 'ghost'} onClick={onFromStart}>
                From start
              </Button>
            )}
            {onThisMonth && (
              <Button type="button" size="sm" variant="ghost" onClick={onThisMonth}>
                This month
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Input
      type="date"
      label={label || 'Date'}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
