import {
  addDoc,
  collection,
  doc,
  getDoc,
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

export async function addOfficeExpense(data, addedBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const db = requireDb();

  await runTransaction(db, async (tx) => {
    const office = await readOfficeBalance(tx, db);
    const field = data.source === 'bank' ? 'cashInBank' : 'cashInHand';
    writeOfficeBalanceDelta(tx, office, field, -amount);
    tx.set(doc(collection(db, 'expenses')), {
      category: data.category.trim(),
      amount,
      source: data.source,
      date: data.date,
      addedBy: addedBy || null,
      notes: data.notes || '',
      createdAt: serverTimestamp(),
    });
  });
}

export async function addSalesmanExpense(data, addedBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  // Assumption: salesman expenses are logged for reporting only and do not
  // draw from officeBalances. Confirm against real practice before production.
  const db = requireDb();
  const snap = await getDoc(doc(db, 'salesmen', data.salesmanId));
  if (!snap.exists()) throw new Error('Salesman not found.');
  await addDoc(collection(db, 'salesmanExpenses'), {
    salesmanId: data.salesmanId,
    salesmanName: snap.data().name,
    category: data.category.trim(),
    amount,
    date: data.date,
    addedBy: addedBy || null,
    notes: data.notes || '',
    createdAt: serverTimestamp(),
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
