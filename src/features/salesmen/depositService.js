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

export async function recordDeposit(data, receivedBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const db = requireDb();

  await runTransaction(db, async (tx) => {
    const salesmanRef = doc(db, 'salesmen', data.salesmanId);
    const [snap, office] = await Promise.all([
      tx.get(salesmanRef),
      readOfficeBalance(tx, db),
    ]);
    if (!snap.exists()) throw new Error('Salesman not found.');
    const salesman = snap.data();
    const cash = Number(salesman.cashInHand || 0);
    if (amount > cash) {
      throw new Error(`Amount exceeds cash in hand (${cash}).`);
    }

    tx.update(salesmanRef, {
      cashInHand: roundMoney(cash - amount),
      updatedAt: serverTimestamp(),
    });

    writeOfficeBalanceDelta(tx, office, data.mode === 'bank' ? 'cashInBank' : 'cashInHand', amount);

    tx.set(doc(collection(db, 'salesmanDeposits')), {
      salesmanId: data.salesmanId,
      salesmanName: salesman.name,
      amount,
      mode: data.mode,
      date: data.date,
      receivedBy: receivedBy || null,
      createdAt: serverTimestamp(),
    });
  });
}

export async function getDepositsBySalesman(salesmanId) {
  const q = query(
    collection(requireDb(), 'salesmanDeposits'),
    where('salesmanId', '==', salesmanId),
  );
  return docsToEntities(await getDocs(q));
}
