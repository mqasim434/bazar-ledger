import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import clientsReducer from '../features/clients/clientsSlice';
import commissionsReducer from '../features/commissions/commissionsSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import expensesReducer from '../features/expenses/expensesSlice';
import inventoryReducer from '../features/inventory/inventorySlice';
import recoveriesReducer from '../features/recoveries/recoveriesSlice';
import returnsReducer from '../features/returns/returnsSlice';
import salesmenReducer from '../features/salesmen/salesmenSlice';
import searchReducer from '../features/search/searchSlice';
import transactionsReducer from '../features/transactions/transactionsSlice';
import uiReducer from '../features/ui/uiSlice';
import vendorsReducer from '../features/vendors/vendorsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clients: clientsReducer,
    salesmen: salesmenReducer,
    inventory: inventoryReducer,
    transactions: transactionsReducer,
    recoveries: recoveriesReducer,
    returns: returnsReducer,
    vendors: vendorsReducer,
    expenses: expensesReducer,
    commissions: commissionsReducer,
    dashboard: dashboardReducer,
    search: searchReducer,
    ui: uiReducer,
  },
});
