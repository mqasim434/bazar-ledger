import { useDispatch, useSelector } from 'react-redux';
import { loginUser, logoutUser } from './authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector((s) => s.auth);

  return {
    ...auth,
    login: (email, password) => dispatch(loginUser({ email, password })),
    logout: () => dispatch(logoutUser()),
  };
}
