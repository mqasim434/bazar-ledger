import { doc, getDoc } from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import { roundMoney } from '../../utils/calculations';
import { getClients } from '../clients/clientsService';
import { getInventory } from '../inventory/inventoryService';
import { getRecoveries } from '../recoveries/recoveryService';
import { getSalesmen } from '../salesmen/salesmenService';
import { getTransactions } from '../transactions/transactionService';
import { getVendors } from '../vendors/vendorService';
import { getCommissions } from '../commissions/commissionService';

export async function getDashboardSummary(dateRange) {
  const db = requireDb();
  const officeSnap = await getDoc(doc(db, 'officeBalances', 'summary'));
  const office = officeSnap.exists()
    ? officeSnap.data()
    : { cashInHand: 0, cashInBank: 0 };

  const [clients, salesmen, inventory, vendors, transactions, recoveries, commissions] =
    await Promise.all([
      getClients(),
      getSalesmen(),
      getInventory(),
      getVendors(),
      getTransactions(),
      getRecoveries(),
      getCommissions(),
    ]);

  const creditOutstanding = roundMoney(
    clients.reduce((s, c) => s + Math.max(0, Number(c.balance || 0)), 0),
  );
  const inventoryValue = roundMoney(
    inventory.reduce((s, i) => s + Number(i.stockValue || 0), 0),
  );
  const vendorOwed = roundMoney(vendors.reduce((s, v) => s + Number(v.totalOwed || 0), 0));

  const inRange = (d) =>
    !dateRange?.start || !dateRange?.end || (d >= dateRange.start && d <= dateRange.end);

  const rangedSales = transactions.filter((t) => inRange(t.date));
  const rangedRecovery = recoveries.filter((r) => inRange(r.date));

  const salesmanRows = salesmen.map((s) => {
    const comm = commissions.filter((c) => c.salesmanId === s.id);
    const remaining = roundMoney(comm.reduce((sum, c) => sum + Number(c.remainingBalance || 0), 0));
    return {
      id: s.id,
      name: s.name,
      sales: s.totalSales || 0,
      recovery: s.totalRecovery || 0,
      cashInHand: s.cashInHand || 0,
      commissionRemaining: remaining,
    };
  });

  const activity = [
    ...transactions.map((t) => ({
      id: t.id,
      kind: 'sale',
      date: t.date,
      label: `${t.clientName} · ${t.itemName}`,
      amount: t.netAmount,
      href: `/clients/${t.clientId}`,
    })),
    ...recoveries.map((r) => ({
      id: r.id,
      kind: 'recovery',
      date: r.date,
      label: `${r.clientName} · recovery`,
      amount: r.amount,
      href: `/clients/${r.clientId}`,
    })),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 10);

  return {
    office,
    creditOutstanding,
    inventoryValue,
    vendorOwed,
    totalSales: roundMoney(rangedSales.reduce((s, t) => s + Number(t.netAmount || 0), 0)),
    totalRecovery: roundMoney(rangedRecovery.reduce((s, r) => s + Number(r.amount || 0), 0)),
    salesmanRows,
    activity,
  };
}
