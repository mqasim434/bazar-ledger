import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../features/auth/authSlice';
import { GlobalSearch } from '../../features/search/components/GlobalSearch';
import { Button } from '../ui';

export function Topbar() {
  const profile = useSelector((s) => s.auth.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-ink-100 bg-card px-4">
      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-ink-100 px-2.5 py-1.5 text-left hover:bg-brand-50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 font-heading text-xs text-brand-700">
            {(profile?.name || 'U').slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden sm:block">
            <span className="block text-sm font-medium leading-tight">{profile?.name || 'User'}</span>
            <span className="block text-[11px] capitalize text-ink-500">{profile?.role || '—'}</span>
          </span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-40 mt-1 w-48 rounded-md border border-ink-100 bg-card p-2 shadow-card">
            <p className="px-2 py-1 text-xs text-ink-500">{profile?.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={async () => {
                setMenuOpen(false);
                await dispatch(logoutUser());
                navigate('/login');
              }}
            >
              Log out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
