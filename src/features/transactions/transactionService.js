import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import {
  calcDiscountAmount,
  calcGrossAmount,
  calcNetAmount,
  computeSaleFromRates,
  roundMoney,
  roundYards,
} from '../../utils/calculations';
import { docToEntity, docsToEntities } from '../../utils/firestore';
import { salesmanInventoryId } from '../inventory/stockIssueService';

/** Legacy percent-based (kept for older callers). Prefer computeSaleFromRates. */
export function computeSaleAmounts({ yards, ratePerYard, discountPercent, givenRatePerYard }) {
  if (givenRatePerYard != null && givenRatePerYard !== '') {
    return computeSaleFromRates({
      yards,
      givenRatePerYard,
      soldRatePerYard: ratePerYard,
    });
  }
  const grossAmount = calcGrossAmount(yards, ratePerYard);
  const discountAmount = calcDiscountAmount(grossAmount, discountPercent);
  const netAmount = calcNetAmount(grossAmount, discountAmount);
  return { grossAmount, discountAmount, netAmount, discountPercent: Number(discountPercent || 0) };
}

export async function createTransaction(data, createdBy) {
  const yards = roundYards(data.yards);
  if (yards <= 0) throw new Error('Yards must be greater than zero.');
  const amounts = computeSaleAmounts(data);
  const { grossAmount, discountAmount, netAmount } = amounts;
  const discountPercent = Number(amounts.discountPercent || data.discountPercent || 0);
  const givenRate = Number(data.givenRatePerYard ?? data.ratePerYard);
  const soldRate = Number(data.ratePerYard);
  const db = requireDb();
  let createdId = null;

  await runTransaction(db, async (tx) => {
    const clientRef = doc(db, 'clients', data.clientId);
    const salesmanRef = doc(db, 'salesmen', data.salesmanId);
    const invRef = doc(db, 'salesmanInventory', salesmanInventoryId(data.salesmanId, data.itemId));
    const itemRef = doc(db, 'inventory', data.itemId);

    const [clientSnap, salesmanSnap, invSnap, itemSnap] = await Promise.all([
      tx.get(clientRef),
      tx.get(salesmanRef),
      tx.get(invRef),
      tx.get(itemRef),
    ]);

    if (!clientSnap.exists()) throw new Error('Client not found.');
    if (!salesmanSnap.exists()) throw new Error('Salesman not found.');
    if (!invSnap.exists()) throw new Error('This salesman has no stock of that item.');

    const client = clientSnap.data();
    const salesman = salesmanSnap.data();
    const inv = invSnap.data();
    const item = itemSnap.exists()
      ? itemSnap.data()
      : { itemName: inv.itemName, ratePerYard: givenRate };
    const available = Number(inv.yards || 0);
    if (yards > available) {
      throw new Error(`Not enough salesman stock. Available: ${available} yd.`);
    }

    const unitCost = available > 0 ? Number(inv.valueAtCost || 0) / available : 0;
    const valueOut = roundMoney(unitCost * yards);
    const nextInvYards = roundYards(available - yards);
    const nextInvValue = roundMoney(Number(inv.valueAtCost || 0) - valueOut);

    tx.update(invRef, {
      yards: nextInvYards,
      valueAtCost: Math.max(0, nextInvValue),
      updatedAt: serverTimestamp(),
    });
    tx.update(salesmanRef, {
      inventoryValue: roundMoney(Number(salesman.inventoryValue || 0) - valueOut),
      totalSales: roundMoney(Number(salesman.totalSales || 0) + netAmount),
      cashInHand:
        data.paymentType === 'cash'
          ? roundMoney(Number(salesman.cashInHand || 0) + netAmount)
          : Number(salesman.cashInHand || 0),
      updatedAt: serverTimestamp(),
    });

    const clientUpdate = {
      totalPurchase: roundMoney(Number(client.totalPurchase || 0) + netAmount),
      updatedAt: serverTimestamp(),
    };
    if (data.paymentType === 'credit') {
      clientUpdate.totalCredit = roundMoney(Number(client.totalCredit || 0) + netAmount);
      clientUpdate.balance = roundMoney(Number(client.balance || 0) + netAmount);
    }
    tx.update(clientRef, clientUpdate);

    const txnRef = doc(collection(db, 'transactions'));
    createdId = txnRef.id;
    tx.set(txnRef, {
      clientId: data.clientId,
      clientName: client.shopName,
      salesmanId: data.salesmanId,
      salesmanName: salesman.name,
      itemId: data.itemId,
      itemName: item.itemName || inv.itemName,
      yards,
      givenRatePerYard: givenRate,
      ratePerYard: soldRate,
      discountPercent,
      discountAmount,
      grossAmount,
      netAmount,
      paymentType: data.paymentType,
      date: data.date,
      createdBy: createdBy || null,
      receiptSent: false,
      status: 'active',
      returnedYards: 0,
      createdAt: serverTimestamp(),
    });
  });

  return getTransactionById(createdId);
}

export async function getTransactionById(id) {
  return docToEntity(await getDoc(doc(requireDb(), 'transactions', id)));
}

export async function getTransactions({ clientId, salesmanId } = {}) {
  const col = collection(requireDb(), 'transactions');
  let q = col;
  if (clientId) q = query(col, where('clientId', '==', clientId));
  else if (salesmanId) q = query(col, where('salesmanId', '==', salesmanId));
  return docsToEntities(await getDocs(q));
}

export async function markReceiptSent(id) {
  await updateDoc(doc(requireDb(), 'transactions', id), { receiptSent: true });
}
