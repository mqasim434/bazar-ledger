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
}) {
  if (mode === 'range') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          label={label ? `${label} from` : 'From'}
          value={start || ''}
          onChange={(e) => onStartChange?.(e.target.value)}
        />
        <Input
          type="date"
          label={label ? `${label} to` : 'To'}
          value={end || ''}
          onChange={(e) => onEndChange?.(e.target.value)}
        />
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
