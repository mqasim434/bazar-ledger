import { Button } from './Button';
import { printTable } from '../../utils/print';
import { useToast } from '../../hooks/useToast';

export function PrintButton({
  title,
  subtitle,
  columns,
  rows,
  stats,
  label = 'Print',
  variant = 'secondary',
  size = 'md',
  disabled,
  onPrint,
}) {
  const toast = useToast();

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={() => {
        try {
          if (onPrint) onPrint();
          else printTable({ title, subtitle, columns, rows, stats });
        } catch (err) {
          toast(err.message || 'Print failed', 'danger');
        }
      }}
    >
      {label}
    </Button>
  );
}
