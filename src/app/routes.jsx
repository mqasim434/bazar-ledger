import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedRoute } from '../routes/roleGuard';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { ClientsListPage } from '../features/clients/pages/ClientsListPage';
import { ClientDetailPage } from '../features/clients/pages/ClientDetailPage';
import { SalesmenListPage } from '../features/salesmen/pages/SalesmenListPage';
import { SalesmanDetailPage } from '../features/salesmen/pages/SalesmanDetailPage';
import { InventoryListPage } from '../features/inventory/pages/InventoryListPage';
import { StockIssuePage } from '../features/inventory/pages/StockIssuePage';
import { TransactionsListPage } from '../features/transactions/pages/TransactionsListPage';
import { RecoveriesListPage } from '../features/recoveries/pages/RecoveriesListPage';
import { ReturnsListPage } from '../features/returns/pages/ReturnsListPage';
import { VendorsListPage } from '../features/vendors/pages/VendorsListPage';
import { VendorDetailPage } from '../features/vendors/pages/VendorDetailPage';
import { ExpensesListPage } from '../features/expenses/pages/ExpensesListPage';
import { CommissionsPage } from '../features/commissions/pages/CommissionsPage';
import { ReportsPage } from '../features/reports/pages/ReportsPage';
import { SearchPage } from '../features/search/pages/SearchPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsListPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/salesmen" element={<SalesmenListPage />} />
          <Route path="/salesmen/:id" element={<SalesmanDetailPage />} />
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/stock-issues" element={<StockIssuePage />} />
          <Route path="/transactions" element={<TransactionsListPage />} />
          <Route path="/recoveries" element={<RecoveriesListPage />} />
          <Route path="/returns" element={<ReturnsListPage />} />
          <Route path="/vendors" element={<VendorsListPage />} />
          <Route path="/vendors/:id" element={<VendorDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/expenses" element={<ExpensesListPage />} />
          <Route path="/commissions" element={<CommissionsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
