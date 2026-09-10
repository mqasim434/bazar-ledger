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

/**
 * Deposit salesman-held money to office.
 * mode: 'cash' takes from cashInHand → office cashInHand
 * mode: 'bank' takes from bankInHand → office cashInBank (also usable as confirm path)
 */
export async function recordDeposit(data, receivedBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const mode = data.mode === 'bank' ? 'bank' : 'cash';
  const db = requireDb();

  await runTransaction(db, async (tx) => {
    const salesmanRef = doc(db, 'salesmen', data.salesmanId);
    const [snap, office] = await Promise.all([
      tx.get(salesmanRef),
      readOfficeBalance(tx, db),
    ]);
    if (!snap.exists()) throw new Error('Salesman not found.');
    const salesman = snap.data();
    const field = mode === 'bank' ? 'bankInHand' : 'cashInHand';
    const available = Number(salesman[field] || 0);
    if (amount > available) {
      throw new Error(
        `Amount exceeds salesman ${mode === 'bank' ? 'bank' : 'cash in hand'} (${available}).`,
      );
    }

    tx.update(salesmanRef, {
      [field]: roundMoney(available - amount),
      updatedAt: serverTimestamp(),
    });

    writeOfficeBalanceDelta(tx, office, mode === 'bank' ? 'cashInBank' : 'cashInHand', amount);

    tx.set(doc(collection(db, 'salesmanDeposits')), {
      salesmanId: data.salesmanId,
      salesmanName: salesman.name,
      amount,
      mode,
      date: data.date,
      receivedBy: receivedBy || null,
      createdAt: serverTimestamp(),
    });
  });
}

export async function getDepositsBySalesman(salesmanId) {
  if (!salesmanId) {
    return docsToEntities(await getDocs(collection(requireDb(), 'salesmanDeposits')));
  }
  const q = query(
    collection(requireDb(), 'salesmanDeposits'),
    where('salesmanId', '==', salesmanId),
  );
  return docsToEntities(await getDocs(q));
}

export async function getAllDeposits() {
  return docsToEntities(await getDocs(collection(requireDb(), 'salesmanDeposits')));
}
