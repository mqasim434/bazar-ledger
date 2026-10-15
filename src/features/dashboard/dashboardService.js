import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import { roundMoney } from '../../utils/calculations';
import { docsToEntities } from '../../utils/firestore';
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

  const [clients, salesmen, inventory, vendors, transactions, recoveries, commissions, advances] =
    await Promise.all([
      getClients(),
      getSalesmen(),
      getInventory(),
      getVendors(),
      getTransactions(),
      getRecoveries(),
      getCommissions(),
      docsToEntities(await getDocs(collection(db, 'salesmanAdvances'))),
    ]);

  const creditOutstanding = roundMoney(
    clients.reduce((s, c) => s + Math.max(0, Number(c.balance || 0)), 0),
  );
  const inventoryValue = roundMoney(
    inventory.reduce((s, i) => s + Number(i.stockValue || 0), 0),
  );
  const vendorOwed = roundMoney(vendors.reduce((s, v) => s + Number(v.totalOwed || 0), 0));

  const inRange = (d) => {
    if (!d) return false;
    if (dateRange?.start && d < dateRange.start) return false;
    if (dateRange?.end && d > dateRange.end) return false;
    return true;
  };

  const rangedSales = transactions.filter((t) => inRange(t.date));
  const rangedRecovery = recoveries.filter((r) => inRange(r.date));
  const rangedAdvances = advances.filter((a) => inRange(a.date) && a.type !== 'cleared');

  const cashSales = roundMoney(
    rangedSales
      .filter((t) => t.paymentType === 'cash')
      .reduce((s, t) => s + Number(t.netAmount || 0), 0),
  );
  const creditSales = roundMoney(
    rangedSales
      .filter((t) => t.paymentType === 'credit')
      .reduce((s, t) => s + Number(t.netAmount || 0), 0),
  );
  const totalSales = roundMoney(cashSales + creditSales);
  const totalRecovery = roundMoney(
    rangedRecovery.reduce((s, r) => s + Number(r.amount || 0), 0),
  );
  const commissionDue = roundMoney(
    commissions.reduce((s, c) => s + Number(c.remainingBalance || 0), 0),
  );
  const commissionEarnedInRange = roundMoney(
    commissions
      .filter((c) => inRange(c.periodEnd) || inRange(c.periodStart))
      .reduce((s, c) => s + Number(c.earnedAmount || 0), 0),
  );
  const advanceTaken = roundMoney(
    rangedAdvances.reduce((s, a) => s + Math.max(0, Number(a.amount || 0)), 0),
  );
  const advanceOutstanding = roundMoney(
    salesmen.reduce((s, m) => s + Number(m.advanceBalance || 0), 0),
  );

  /** Office + all salesmen held cash/bank (current snapshot). */
  const cashInHand = roundMoney(
    Number(office.cashInHand || 0) +
      salesmen.reduce((s, m) => s + Number(m.cashInHand || 0), 0),
  );
  const cashInBank = roundMoney(
    Number(office.cashInBank || 0) +
      salesmen.reduce((s, m) => s + Number(m.bankInHand || 0), 0),
  );

  const salesmanRows = salesmen.map((s) => {
    const comm = commissions.filter((c) => c.salesmanId === s.id);
    const remaining = roundMoney(comm.reduce((sum, c) => sum + Number(c.remainingBalance || 0), 0));
    return {
      id: s.id,
      name: s.name,
      sales: s.totalSales || 0,
      recovery: s.totalRecovery || 0,
      cashInHand: s.cashInHand || 0,
      bankInHand: s.bankInHand || 0,
      advanceBalance: s.advanceBalance || 0,
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
    cashInHand,
    cashInBank,
    officeCashInHand: Number(office.cashInHand || 0),
    officeCashInBank: Number(office.cashInBank || 0),
    totalSales,
    cashSales,
    creditSales,
    totalRecovery,
    commissionDue,
    commissionEarnedInRange,
    advanceTaken,
    advanceOutstanding,
    salesmanRows,
    activity,
  };
}
