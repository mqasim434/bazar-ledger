import {
  addDoc,
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
import { calcProportionalAmount, roundMoney, roundYards } from '../../utils/calculations';
import { docToEntity, docsToEntities } from '../../utils/firestore';
import { salesmanInventoryId } from '../inventory/stockIssueService';

export async function createReturn(data) {
  const yardsReturned = roundYards(data.yardsReturned);
  if (yardsReturned <= 0) throw new Error('Yards returned must be greater than zero.');
  const original = await getDoc(doc(requireDb(), 'transactions', data.originalTransactionId));
  if (!original.exists()) throw new Error('Original sale not found.');
  const txn = original.data();
  if (yardsReturned > Number(txn.yards) - Number(txn.returnedYards || 0)) {
    throw new Error('Cannot return more yards than remain on the original sale.');
  }
  const ref = await addDoc(collection(requireDb(), 'returns'), {
    originalTransactionId: data.originalTransactionId,
    clientId: txn.clientId,
    clientName: txn.clientName,
    salesmanId: txn.salesmanId,
    salesmanName: txn.salesmanName,
    itemId: txn.itemId,
    itemName: txn.itemName,
    yardsReturned,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    date: data.date,
    notes: data.notes || '',
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { id: ref.id, ...snap.data() };
}

export async function rejectReturn(returnId, reason, reviewedBy) {
  await updateDoc(doc(requireDb(), 'returns', returnId), {
    status: 'rejected',
    rejectReason: reason || '',
    reviewedBy: reviewedBy || null,
    reviewedAt: serverTimestamp(),
  });
}

export async function confirmReturn(returnId, reviewedBy) {
  const db = requireDb();
  await runTransaction(db, async (tx) => {
    const returnRef = doc(db, 'returns', returnId);
    const returnSnap = await tx.get(returnRef);
    if (!returnSnap.exists()) throw new Error('Return not found.');
    const ret = returnSnap.data();
    if (ret.status !== 'pending') throw new Error('Only pending returns can be confirmed.');

    const txnRef = doc(db, 'transactions', ret.originalTransactionId);
    const clientRef = doc(db, 'clients', ret.clientId);
    const salesmanRef = doc(db, 'salesmen', ret.salesmanId);
    const invRef = doc(db, 'salesmanInventory', salesmanInventoryId(ret.salesmanId, ret.itemId));

    const [txnSnap, clientSnap, salesmanSnap, invSnap] = await Promise.all([
      tx.get(txnRef),
      tx.get(clientRef),
      tx.get(salesmanRef),
      tx.get(invRef),
    ]);
    if (!txnSnap.exists()) throw new Error('Original sale not found.');
    if (!clientSnap.exists() || !salesmanSnap.exists()) {
      throw new Error('Client or salesman missing.');
    }

    const txn = txnSnap.data();
    const client = clientSnap.data();
    const salesman = salesmanSnap.data();
    const yardsReturned = Number(ret.yardsReturned || 0);
    const alreadyReturned = Number(txn.returnedYards || 0);
    if (alreadyReturned + yardsReturned > Number(txn.yards)) {
      throw new Error('This would exceed the original sale quantity (including prior returns).');
    }

    const refund = calcProportionalAmount(txn.netAmount, yardsReturned, txn.yards);
    const inv = invSnap.exists() ? invSnap.data() : { yards: 0, valueAtCost: 0 };
    const unitCost = Number(inv.yards) > 0 ? Number(inv.valueAtCost || 0) / Number(inv.yards) : 0;
    const restoredValue = roundMoney(unitCost * yardsReturned);

    if (invSnap.exists()) {
      tx.update(invRef, {
        yards: roundYards(Number(inv.yards || 0) + yardsReturned),
        valueAtCost: roundMoney(Number(inv.valueAtCost || 0) + restoredValue),
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(invRef, {
        salesmanId: ret.salesmanId,
        salesmanName: ret.salesmanName,
        itemId: ret.itemId,
        itemName: ret.itemName,
        yards: yardsReturned,
        valueAtCost: restoredValue,
        updatedAt: serverTimestamp(),
      });
    }

    tx.update(salesmanRef, {
      inventoryValue: roundMoney(Number(salesman.inventoryValue || 0) + restoredValue),
      totalSales: roundMoney(Number(salesman.totalSales || 0) - refund),
      // Assumption (confirm with business): cash-sale returns refund from salesman cashInHand.
      cashInHand:
        txn.paymentType === 'cash'
          ? roundMoney(Number(salesman.cashInHand || 0) - refund)
          : Number(salesman.cashInHand || 0),
      updatedAt: serverTimestamp(),
    });

    const clientUpdate = {
      totalPurchase: roundMoney(Number(client.totalPurchase || 0) - refund),
      updatedAt: serverTimestamp(),
    };
    if (txn.paymentType === 'credit') {
      clientUpdate.totalCredit = roundMoney(Number(client.totalCredit || 0) - refund);
      clientUpdate.balance = roundMoney(Number(client.balance || 0) - refund);
    }
    tx.update(clientRef, clientUpdate);

    const totalReturned = alreadyReturned + yardsReturned;
    tx.update(txnRef, {
      returnedYards: roundYards(totalReturned),
      status: totalReturned >= Number(txn.yards) ? 'returned' : 'partially_returned',
    });
    tx.update(returnRef, {
      status: 'confirmed',
      reviewedBy: reviewedBy || null,
      reviewedAt: serverTimestamp(),
    });
  });
}

export async function getReturns({ clientId, salesmanId } = {}) {
  const col = collection(requireDb(), 'returns');
  let q = col;
  if (clientId) q = query(col, where('clientId', '==', clientId));
  else if (salesmanId) q = query(col, where('salesmanId', '==', salesmanId));
  return docsToEntities(await getDocs(q));
}

export async function getReturnById(id) {
  return docToEntity(await getDoc(doc(requireDb(), 'returns', id)));
}
