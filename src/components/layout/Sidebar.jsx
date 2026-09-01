import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';
import { toggleSidebar } from '../../features/ui/uiSlice';
import { useRole } from '../../hooks/useRole';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
  { to: '/clients', label: 'Clients', icon: IconShop },
  { to: '/salesmen', label: 'Salesmen', icon: IconPeople },
  { to: '/inventory', label: 'Inventory', icon: IconBolt },
  { to: '/stock-issues', label: 'Stock Issue', icon: IconArrow },
  { to: '/transactions', label: 'Sales', icon: IconTicket },
  { to: '/recoveries', label: 'Recoveries', icon: IconCoin },
  { to: '/returns', label: 'Returns', icon: IconReturn },
  { to: '/vendors', label: 'Vendors', icon: IconTruck },
  { to: '/expenses', label: 'Expenses', icon: IconBook, adminOnly: true },
  { to: '/commissions', label: 'Commissions', icon: IconPercent, adminOnly: true },
  { to: '/reports', label: 'Reports', icon: IconChart },
];

export function Sidebar() {
  const collapsed = useSelector((s) => s.ui.sidebarCollapsed);
  const dispatch = useDispatch();
  const { isAdmin } = useRole();

  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={clsx(
        'flex h-screen flex-col border-r border-ink-100 bg-[#2A221C] text-brand-50 transition-all',
        collapsed ? 'w-[72px]' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-500 font-heading text-sm text-white">
          B
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-heading text-sm leading-tight">Bazaar Ledger</p>
            <p className="truncate text-[11px] text-brand-200">Wholesale admin</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              clsx(
                'mx-2 mb-0.5 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm',
                isActive
                  ? 'bg-brand-500/20 text-brand-100'
                  : 'text-brand-100/70 hover:bg-white/5 hover:text-brand-50',
              )
            }
          >
            <item.icon />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => dispatch(toggleSidebar())}
        className="border-t border-white/10 px-3 py-3 text-left text-xs text-brand-200 hover:text-brand-50"
      >
        {collapsed ? '»' : '« Collapse'}
      </button>
    </aside>
  );
}

function Ico({ children }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {children}
    </svg>
  );
}
function IconGrid() {
  return (
    <Ico>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </Ico>
  );
}
function IconShop() {
  return (
    <Ico>
      <path d="M4 10h16v10H4z" />
      <path d="M4 10l2-6h12l2 6" />
      <path d="M10 20v-6h4v6" />
    </Ico>
  );
}
function IconPeople() {
  return (
    <Ico>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19c0-3 2.5-5 5-5s5 2 5 5" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16 19c.2-2 1.5-3.5 3.5-4" />
    </Ico>
  );
}
function IconBolt() {
  return (
    <Ico>
      <path d="M21 8H8l-1 13h10l4-13z" />
      <path d="M7 8l1.5-5h10L21 8" />
    </Ico>
  );
}
function IconArrow() {
  return (
    <Ico>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Ico>
  );
}
function IconTicket() {
  return (
    <Ico>
      <path d="M4 7h16v4a2 2 0 010 4v4H4v-4a2 2 0 010-4V7z" />
    </Ico>
  );
}
function IconCoin() {
  return (
    <Ico>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5c.6-.8 1.5-1.2 2.5-1.2 1.8 0 3 1 3 2.4s-1.2 2.3-3 2.3-3 1-3 2.3c0 1.4 1.2 2.4 3 2.4 1 0 1.9-.4 2.5-1.2" />
    </Ico>
  );
}
function IconReturn() {
  return (
    <Ico>
      <path d="M9 10H4V5" />
      <path d="M4 10a8 8 0 111.6 4.8" />
    </Ico>
  );
}
function IconTruck() {
  return (
    <Ico>
      <path d="M3 7h11v10H3z" />
      <path d="M14 11h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </Ico>
  );
}
function IconBook() {
  return (
    <Ico>
      <path d="M5 5h11a3 3 0 013 3v12H8a3 3 0 00-3 3V5z" />
      <path d="M5 20a3 3 0 013-3h14" />
    </Ico>
  );
}
function IconPercent() {
  return (
    <Ico>
      <circle cx="8" cy="8" r="2" />
      <circle cx="16" cy="16" r="2" />
      <path d="M18 6L6 18" />
    </Ico>
  );
}
function IconChart() {
  return (
    <Ico>
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-7" />
    </Ico>
  );
}
