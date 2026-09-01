import { useDispatch } from 'react-redux';
import { pushToast } from '../features/ui/uiSlice';

export function useToast() {
  const dispatch = useDispatch();
  return (message, tone = 'default') => dispatch(pushToast({ message, tone }));
}
