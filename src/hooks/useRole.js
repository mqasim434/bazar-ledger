import { useSelector } from 'react-redux';

export function useRole() {
  const profile = useSelector((state) => state.auth.profile);
  const role = profile?.role || null;
  return {
    role,
    isAdmin: role === 'admin',
    isAccountant: role === 'accountant',
    canConfirmReturns: role === 'admin',
    canManageCommissions: role === 'admin',
    canManageExpenses: role === 'admin',
  };
}
