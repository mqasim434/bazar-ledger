import { roundMoney } from '../../utils/calculations';
import { getClients, getClientById } from '../clients/clientsService';
import { getCommissions } from '../commissions/commissionService';
import { getOfficeExpenses, getSalesmanExpenses } from '../expenses/expenseService';
import { getInventory } from '../inventory/inventoryService';
import { getRecoveries } from '../recoveries/recoveryService';
import { getReturns } from '../returns/returnService';
import { getDepositsBySalesman } from '../salesmen/depositService';
import { getSalesmanById, getSalesmen } from '../salesmen/salesmenService';
import { getTransactions } from '../transactions/transactionService';
import { getVendors } from '../vendors/vendorService';

function inRange(date, range) {
  if (!range?.start || !range?.end || !date) return true;
  return date >= range.start && date <= range.end;
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
  return {
    client,
    transactions: tx,
    recoveries: rec,
    returns: ret,
    totals: {
      sales: roundMoney(tx.reduce((s, r) => s + Number(r.netAmount || 0), 0)),
      recovery: roundMoney(rec.reduce((s, r) => s + Number(r.amount || 0), 0)),
      returnedYards: roundMoney(ret.reduce((s, r) => s + Number(r.yardsReturned || 0), 0)),
    },
  };
}

export async function getSalesmanReport(salesmanId, dateRange) {
  const [salesman, transactions, recoveries, expenses, commissions, deposits] = await Promise.all([
    getSalesmanById(salesmanId),
    getTransactions({ salesmanId }),
    getRecoveries({ salesmanId }),
    getSalesmanExpenses(salesmanId),
    getCommissions(salesmanId),
    getDepositsBySalesman(salesmanId),
  ]);
  const tx = transactions.filter((r) => inRange(r.date, dateRange));
  const rec = recoveries.filter((r) => inRange(r.date, dateRange));
  const exp = expenses.filter((r) => inRange(r.date, dateRange));
  const dep = deposits.filter((r) => inRange(r.date, dateRange));
  const comm = commissions.filter(
    (r) => r.periodEnd >= dateRange.start && r.periodStart <= dateRange.end,
  );
  return {
    salesman,
    transactions: tx,
    recoveries: rec,
    expenses: exp,
    commissions: comm,
    deposits: dep,
    totals: {
      sales: roundMoney(tx.reduce((s, r) => s + Number(r.netAmount || 0), 0)),
      recovery: roundMoney(rec.reduce((s, r) => s + Number(r.amount || 0), 0)),
      expenses: roundMoney(exp.reduce((s, r) => s + Number(r.amount || 0), 0)),
      deposits: roundMoney(dep.reduce((s, r) => s + Number(r.amount || 0), 0)),
      commissionEarned: roundMoney(comm.reduce((s, r) => s + Number(r.earnedAmount || 0), 0)),
    },
  };
}

export async function getAreaReport(area, dateRange) {
  const [clients, salesmen] = await Promise.all([getClients(), getSalesmen()]);
  const inArea = salesmen.filter((s) => s.area === area);
  const ids = new Set(inArea.map((s) => s.id));
  const areaClients = clients.filter((c) => ids.has(c.salesmanId) || c.city === area);
  const reports = await Promise.all(inArea.map((s) => getSalesmanReport(s.id, dateRange)));
  return {
    area,
    salesmen: inArea,
    clients: areaClients,
    totals: {
      sales: roundMoney(reports.reduce((s, r) => s + r.totals.sales, 0)),
      recovery: roundMoney(reports.reduce((s, r) => s + r.totals.recovery, 0)),
    },
    rows: reports.map((r) => ({
      id: r.salesman.id,
      name: r.salesman.name,
      sales: r.totals.sales,
      recovery: r.totals.recovery,
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

export async function getVendorOwedTotal() {
  const vendors = await getVendors();
  return roundMoney(vendors.reduce((s, v) => s + Number(v.totalOwed || 0), 0));
}

export { getOfficeExpenses };
