import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import { roundMoney } from '../../utils/calculations';
import { docsToEntities } from '../../utils/firestore';

/**
 * Record an advance taken by a salesman (money given ahead of commission).
 * Increases salesmen.advanceBalance.
 */
export async function recordSalesmanAdvance(data, addedBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const db = requireDb();

  await runTransaction(db, async (tx) => {
    const salesmanRef = doc(db, 'salesmen', data.salesmanId);
    const snap = await tx.get(salesmanRef);
    if (!snap.exists()) throw new Error('Salesman not found.');
    const salesman = snap.data();
    tx.update(salesmanRef, {
      advanceBalance: roundMoney(Number(salesman.advanceBalance || 0) + amount),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, 'salesmanAdvances')), {
      salesmanId: data.salesmanId,
      salesmanName: salesman.name,
      amount,
      type: 'taken',
      date: data.date,
      notes: data.notes || '',
      addedBy: addedBy || null,
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * Clear / write-off remaining advance without commission (sets to zero with a log).
 */
export async function clearSalesmanAdvance(salesmanId, reason, addedBy) {
  const db = requireDb();
  await runTransaction(db, async (tx) => {
    const salesmanRef = doc(db, 'salesmen', salesmanId);
    const snap = await tx.get(salesmanRef);
    if (!snap.exists()) throw new Error('Salesman not found.');
    const salesman = snap.data();
    const current = roundMoney(Number(salesman.advanceBalance || 0));
    if (current <= 0) throw new Error('No advance balance to clear.');
    tx.update(salesmanRef, {
      advanceBalance: 0,
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, 'salesmanAdvances')), {
      salesmanId,
      salesmanName: salesman.name,
      amount: -current,
      type: 'cleared',
      date: new Date().toISOString().slice(0, 10),
      notes: reason || 'Advance cleared',
      addedBy: addedBy || null,
      createdAt: serverTimestamp(),
    });
  });
}

export async function getAdvancesBySalesman(salesmanId) {
  const q = query(
    collection(requireDb(), 'salesmanAdvances'),
    where('salesmanId', '==', salesmanId),
  );
  return docsToEntities(await getDocs(q));
}

export async function addSalesmanAdvanceDoc(data) {
  return addDoc(collection(requireDb(), 'salesmanAdvances'), data);
}
