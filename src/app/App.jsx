import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { restoreSession } from '../features/auth/authSlice';
import { FullPageSpinner } from '../components/ui';
import { AppRoutes } from './routes';

export function App() {
  const dispatch = useDispatch();
  const status = useSelector((s) => s.auth.status);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      dispatch(restoreSession(null));
      return undefined;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      dispatch(restoreSession(user));
    });
    return unsub;
  }, [dispatch]);

  if (status === 'idle' || status === 'loading') {
    return <FullPageSpinner />;
  }

  return <AppRoutes />;
}
