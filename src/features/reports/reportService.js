import { roundMoney } from '../../utils/calculations';
import { getClients, getClientById } from '../clients/clientsService';
import { getCommissions } from '../commissions/commissionService';
import { getOfficeExpenses, getSalesmanExpenses } from '../expenses/expenseService';
import { getInventory } from '../inventory/inventoryService';
import { getRecoveries } from '../recoveries/recoveryService';
import { getReturns } from '../returns/returnService';
import { getAdvancesBySalesman } from '../salesmen/advanceService';
import { getAllDeposits, getDepositsBySalesman } from '../salesmen/depositService';
import { getSalesmanById, getSalesmen } from '../salesmen/salesmenService';
import { getTransactions } from '../transactions/transactionService';
import { getVendorTransactions, getVendors } from '../vendors/vendorService';

function inRange(date, range) {
  if (!date) return false;
  if (!range) return true;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

function splitSales(tx) {
  const cash = tx.filter((r) => r.paymentType === 'cash');
  const credit = tx.filter((r) => r.paymentType === 'credit');
  return {
    cashSales: roundMoney(cash.reduce((s, r) => s + Number(r.netAmount || 0), 0)),
    creditSales: roundMoney(credit.reduce((s, r) => s + Number(r.netAmount || 0), 0)),
    totalSales: roundMoney(tx.reduce((s, r) => s + Number(r.netAmount || 0), 0)),
  };
}

export async function getClientReport(clientId, dateRange) {
  const [client, transactions, recoveries, returns] = await Promise.all([
    getClientById(clientId),
    getTransactions({ clientId }),
    getRecoveries({ clientId }),
    getReturns({ clientId }),
  ]);
  const tx = transactions.filter((r) => inRange(r.date, dateRange));
  const rec = recoveries.filter((r) => inRange(r.date, dateRange));
  const ret = returns.filter((r) => inRange(r.date, dateRange));
  const salesSplit = splitSales(tx);

  const ledger = [
    ...tx.map((r) => ({
      id: `s-${r.id}`,
      date: r.date,
      kind: 'sale',
      detail: `${r.itemName} · ${r.yards} yd`,
      paymentMode: r.paymentType,
      amount: r.netAmount,
      debit: r.paymentType === 'credit' ? r.netAmount : 0,
      credit: r.paymentType === 'cash' ? r.netAmount : 0,
    })),
    ...rec.map((r) => ({
      id: `r-${r.id}`,
      date: r.date,
      kind: 'recovery',
      detail: `Recovery`,
      paymentMode: r.paymentMode,
      amount: r.amount,
      debit: 0,
      credit: r.amount,
    })),
    ...ret.map((r) => ({
      id: `t-${r.id}`,
      date: r.date,
      kind: 'return',
      detail: `${r.itemName} · ${r.yardsReturned} yd · ${r.status}`,
      paymentMode: '—',
      amount: r.yardsReturned,
      debit: 0,
      credit: 0,
    })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return {
    client,
    transactions: tx,
    recoveries: rec,
    returns: ret,
    ledger,
    totals: {
      ...salesSplit,
      sales: salesSplit.totalSales,
      recovery: roundMoney(rec.reduce((s, r) => s + Number(r.amount || 0), 0)),
      returnedYards: roundMoney(ret.reduce((s, r) => s + Number(r.yardsReturned || 0), 0)),
      balance: Number(client?.balance || 0),
    },
  };
}

export async function getSalesmanReport(salesmanId, dateRange) {
  const [salesman, transactions, recoveries, expenses, commissions, deposits, clients, advances] =
    await Promise.all([
      getSalesmanById(salesmanId),
      getTransactions({ salesmanId }),
      getRecoveries({ salesmanId }),
      getSalesmanExpenses(salesmanId),
      getCommissions(salesmanId),
      getDepositsBySalesman(salesmanId),
      getClients(),
      getAdvancesBySalesman(salesmanId),
    ]);
  const tx = transactions.filter((r) => inRange(r.date, dateRange));
  const rec = recoveries.filter((r) => inRange(r.date, dateRange));
  const exp = expenses.filter((r) => inRange(r.date, dateRange));
  const dep = deposits.filter((r) => inRange(r.date, dateRange));
  const adv = advances.filter((r) => inRange(r.date, dateRange) && r.type === 'taken');
  const comm = commissions.filter((r) => {
    if (!dateRange?.start) return !dateRange?.end || r.periodStart <= dateRange.end;
    return r.periodEnd >= dateRange.start && r.periodStart <= dateRange.end;
  });
  const salesSplit = splitSales(tx);
  const linkedClients = clients
    .filter((c) => c.salesmanId === salesmanId)
    .map((c) => ({
      id: c.id,
      shopName: c.shopName,
      serialNumber: c.serialNumber,
      city: c.city,
      balance: Number(c.balance || 0),
      active: c.active,
    }));
  const totalCreditOutstanding = roundMoney(
    linkedClients.reduce((s, c) => s + Math.max(0, Number(c.balance || 0)), 0),
  );

  return {
    salesman,
    transactions: tx,
    recoveries: rec,
    expenses: exp,
    commissions: comm,
    deposits: dep,
    advances: adv,
    clients: linkedClients,
    totals: {
      ...salesSplit,
      sales: salesSplit.totalSales,
      recovery: roundMoney(rec.reduce((s, r) => s + Number(r.amount || 0), 0)),
      expenses: roundMoney(exp.reduce((s, r) => s + Number(r.amount || 0), 0)),
      deposits: roundMoney(dep.reduce((s, r) => s + Number(r.amount || 0), 0)),
      advancesTaken: roundMoney(adv.reduce((s, r) => s + Number(r.amount || 0), 0)),
      commissionEarned: roundMoney(comm.reduce((s, r) => s + Number(r.earnedAmount || 0), 0)),
      commissionPaid: roundMoney(comm.reduce((s, r) => s + Number(r.paidAmount || 0), 0)),
      commissionRemaining: roundMoney(comm.reduce((s, r) => s + Number(r.remainingBalance || 0), 0)),
      totalCreditOutstanding,
      cashInHand: Number(salesman?.cashInHand || 0),
      bankInHand: Number(salesman?.bankInHand || 0),
      advanceBalance: Number(salesman?.advanceBalance || 0),
    },
  };
}

export async function getWeeklySalesmanReport(salesmanId, dateRange) {
  return getSalesmanReport(salesmanId, dateRange);
}

export async function getAreaReport(area, dateRange) {
  const [clients, salesmen] = await Promise.all([getClients(), getSalesmen()]);
  const inArea = salesmen.filter((s) => s.area === area);
  const ids = new Set(inArea.map((s) => s.id));
  const areaClients = clients
    .filter((c) => ids.has(c.salesmanId) || c.city === area || c.area === area)
    .map((c) => ({
      id: c.id,
      shopName: c.shopName,
      serialNumber: c.serialNumber,
      city: c.city,
      salesmanName: c.salesmanName,
      salesmanId: c.salesmanId,
      balance: Number(c.balance || 0),
    }));
  const reports = await Promise.all(inArea.map((s) => getSalesmanReport(s.id, dateRange)));
  return {
    area,
    salesmen: inArea,
    clients: areaClients,
    totals: {
      sales: roundMoney(reports.reduce((s, r) => s + r.totals.sales, 0)),
      recovery: roundMoney(reports.reduce((s, r) => s + r.totals.recovery, 0)),
      creditOutstanding: roundMoney(
        areaClients.reduce((s, c) => s + Math.max(0, Number(c.balance || 0)), 0),
      ),
    },
    rows: reports.map((r) => ({
      id: r.salesman.id,
      name: r.salesman.name,
      sales: r.totals.sales,
      recovery: r.totals.recovery,
      creditOutstanding: r.totals.totalCreditOutstanding,
    })),
  };
}

export async function getItemReport(itemId, dateRange) {
  const [items, transactions] = await Promise.all([getInventory(), getTransactions()]);
  const item = items.find((i) => i.id === itemId);
  const rows = transactions.filter((t) => t.itemId === itemId && inRange(t.date, dateRange));
  return {
    item,
    rows,
    totals: {
      yards: roundMoney(rows.reduce((s, r) => s + Number(r.yards || 0), 0)),
      revenue: roundMoney(rows.reduce((s, r) => s + Number(r.netAmount || 0), 0)),
    },
  };
}

export async function getOfficeReport(dateRange) {
  const [transactions, recoveries, expenses] = await Promise.all([
    getTransactions(),
    getRecoveries(),
    getOfficeExpenses(),
  ]);
  const tx = transactions.filter((r) => inRange(r.date, dateRange) && r.status !== 'returned');
  const rec = recoveries.filter((r) => inRange(r.date, dateRange));
  const exp = expenses.filter((r) => inRange(r.date, dateRange));
  const salesSplit = splitSales(tx);
  return {
    transactions: tx,
    recoveries: rec,
    expenses: exp,
    totals: {
      ...salesSplit,
      sales: salesSplit.totalSales,
      recovery: roundMoney(rec.reduce((s, r) => s + Number(r.amount || 0), 0)),
      expense: roundMoney(exp.reduce((s, r) => s + Number(r.amount || 0), 0)),
    },
  };
}

export async function getVendorReport(vendorId, dateRange) {
  const [vendors, rows] = await Promise.all([
    getVendors(),
    vendorId ? getVendorTransactions(vendorId) : Promise.resolve([]),
  ]);
  const vendor = vendors.find((v) => v.id === vendorId);
  const filtered = rows.filter((r) => inRange(r.date, dateRange));
  return {
    vendor,
    rows: filtered,
    totals: {
      purchase: roundMoney(
        filtered.filter((r) => r.type === 'purchase').reduce((s, r) => s + Number(r.amount || 0), 0),
      ),
      payment: roundMoney(
        filtered.filter((r) => r.type === 'payment').reduce((s, r) => s + Number(r.amount || 0), 0),
      ),
      advance: roundMoney(
        filtered.filter((r) => r.type === 'advance').reduce((s, r) => s + Number(r.amount || 0), 0),
      ),
    },
  };
}

export async function getVendorOwedTotal() {
  const vendors = await getVendors();
  return roundMoney(vendors.reduce((s, v) => s + Number(v.totalOwed || 0), 0));
}

export { getOfficeExpenses, getAllDeposits };
