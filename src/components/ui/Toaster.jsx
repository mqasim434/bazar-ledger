import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import { dismissToast } from '../../features/ui/uiSlice';

export function Toaster() {
  const toasts = useSelector((s) => s.ui.toasts);
  const dispatch = useDispatch();

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => dispatch(dismissToast(t.id))} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 4200);
    return () => clearTimeout(id);
  }, [onClose]);

  const tones = {
    default: 'border-l-brand-500',
    success: 'border-l-success',
    danger: 'border-l-danger',
    warn: 'border-l-warn',
  };

  return (
    <div
      className={clsx(
        'rounded-md border border-ink-100 border-l-4 bg-card px-3 py-2 text-sm text-ink-900 shadow-card',
        tones[toast.tone] || tones.default,
      )}
    >
      {toast.message}
    </div>
  );
}
