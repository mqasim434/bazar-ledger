import {
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
import { readOfficeBalance, writeOfficeBalanceDelta } from '../../utils/officeBalance';

/** Office expense — deducts from office cash or bank. */
export async function addOfficeExpense(data, addedBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const db = requireDb();

  await runTransaction(db, async (tx) => {
    const office = await readOfficeBalance(tx, db);
    const field = data.source === 'bank' ? 'cashInBank' : 'cashInHand';
    const available = Number(office[field] || 0);
    if (amount > available) {
      throw new Error(
        `Amount exceeds office ${data.source === 'bank' ? 'bank' : 'cash'} (${available}).`,
      );
    }
    writeOfficeBalanceDelta(tx, office, field, -amount);
    tx.set(doc(collection(db, 'expenses')), {
      category: data.category.trim(),
      amount,
      source: data.source === 'bank' ? 'bank' : 'cash',
      date: data.date,
      addedBy: addedBy || null,
      notes: data.notes || '',
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * Salesman expense — deducts from that salesman's cashInHand or bankInHand.
 * Does not touch office balances.
 */
export async function addSalesmanExpense(data, addedBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  if (!data.salesmanId) throw new Error('Salesman is required.');
  const category = String(data.category || '').trim();
  if (!category) throw new Error('Category is required.');
  const paidFrom = data.paidFrom === 'bank' ? 'bank' : 'cash';
  const db = requireDb();

  await runTransaction(db, async (tx) => {
    const salesmanRef = doc(db, 'salesmen', data.salesmanId);
    const snap = await tx.get(salesmanRef);
    if (!snap.exists()) throw new Error('Salesman not found.');
    const salesman = snap.data();
    const field = paidFrom === 'bank' ? 'bankInHand' : 'cashInHand';
    const available = Number(salesman[field] || 0);
    if (amount > available) {
      throw new Error(
        `Amount exceeds ${salesman.name}'s ${paidFrom === 'bank' ? 'bank' : 'cash'} in hand (${available}).`,
      );
    }
    tx.update(salesmanRef, {
      [field]: roundMoney(available - amount),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, 'salesmanExpenses')), {
      salesmanId: data.salesmanId,
      salesmanName: salesman.name,
      category,
      amount,
      paidFrom,
      date: data.date,
      addedBy: addedBy || null,
      notes: data.notes || '',
      createdAt: serverTimestamp(),
    });
  });
}

export async function getOfficeExpenses() {
  return docsToEntities(await getDocs(collection(requireDb(), 'expenses')));
}

export async function getSalesmanExpenses(salesmanId) {
  const col = collection(requireDb(), 'salesmanExpenses');
  if (!salesmanId) return docsToEntities(await getDocs(col));
  return docsToEntities(await getDocs(query(col, where('salesmanId', '==', salesmanId))));
}
