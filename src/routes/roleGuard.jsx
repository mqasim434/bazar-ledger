import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FullPageSpinner } from '../components/ui';

export function ProtectedRoute({ allowedRoles }) {
  const { user, profile, status } = useSelector((s) => s.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <FullPageSpinner />;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile.active) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
