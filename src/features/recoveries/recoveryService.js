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
import { roundMoney } from '../../utils/calculations';
import { docToEntity, docsToEntities } from '../../utils/firestore';
import { readOfficeBalance, writeOfficeBalanceDelta } from '../../utils/officeBalance';

export async function createRecovery(data, createdBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const db = requireDb();
  let createdId = null;

  await runTransaction(db, async (tx) => {
    const clientRef = doc(db, 'clients', data.clientId);
    const salesmanRef = doc(db, 'salesmen', data.salesmanId);
    const needsOffice = data.paymentMode === 'pos' || data.paymentMode === 'bank';
    const [clientSnap, salesmanSnap, office] = await Promise.all([
      tx.get(clientRef),
      tx.get(salesmanRef),
      needsOffice ? readOfficeBalance(tx, db) : Promise.resolve(null),
    ]);
    if (!clientSnap.exists()) throw new Error('Client not found.');
    if (!salesmanSnap.exists()) throw new Error('Salesman not found.');

    const client = clientSnap.data();
    const salesman = salesmanSnap.data();

    tx.update(clientRef, {
      totalRecovery: roundMoney(Number(client.totalRecovery || 0) + amount),
      balance: roundMoney(Number(client.balance || 0) - amount),
      updatedAt: serverTimestamp(),
    });
    tx.update(salesmanRef, {
      totalRecovery: roundMoney(Number(salesman.totalRecovery || 0) + amount),
      cashInHand:
        data.paymentMode === 'cash'
          ? roundMoney(Number(salesman.cashInHand || 0) + amount)
          : Number(salesman.cashInHand || 0),
      updatedAt: serverTimestamp(),
    });

    if (needsOffice) {
      writeOfficeBalanceDelta(tx, office, 'cashInBank', amount);
    }

    const ref = doc(collection(db, 'recoveries'));
    createdId = ref.id;
    tx.set(ref, {
      clientId: data.clientId,
      clientName: client.shopName,
      salesmanId: data.salesmanId,
      salesmanName: salesman.name,
      amount,
      paymentMode: data.paymentMode,
      date: data.date,
      createdBy: createdBy || null,
      receiptSent: false,
      createdAt: serverTimestamp(),
    });
  });

  return getRecoveryById(createdId);
}

export async function getRecoveryById(id) {
  return docToEntity(await getDoc(doc(requireDb(), 'recoveries', id)));
}

export async function getRecoveries({ clientId, salesmanId } = {}) {
  const col = collection(requireDb(), 'recoveries');
  let q = col;
  if (clientId) q = query(col, where('clientId', '==', clientId));
  else if (salesmanId) q = query(col, where('salesmanId', '==', salesmanId));
  return docsToEntities(await getDocs(q));
}

export async function markRecoveryReceiptSent(id) {
  await updateDoc(doc(requireDb(), 'recoveries', id), { receiptSent: true });
}
