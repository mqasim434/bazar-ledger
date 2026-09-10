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

/**
 * Recovery payment modes:
 * - cash → salesman.cashInHand
 * - bank → salesman.bankInHand (pending office confirmation)
 * - pos  → same as bank (treated as bank recovery awaiting confirm)
 *
 * Office confirmBankRecovery() moves salesman.bankInHand → office cashInBank.
 */
export async function createRecovery(data, createdBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const mode = data.paymentMode === 'pos' ? 'bank' : data.paymentMode;
  if (mode !== 'cash' && mode !== 'bank') {
    throw new Error('Payment mode must be cash or bank.');
  }
  const db = requireDb();
  let createdId = null;

  await runTransaction(db, async (tx) => {
    const clientRef = doc(db, 'clients', data.clientId);
    const salesmanRef = doc(db, 'salesmen', data.salesmanId);
    const [clientSnap, salesmanSnap] = await Promise.all([
      tx.get(clientRef),
      tx.get(salesmanRef),
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

    const salesmanUpdate = {
      totalRecovery: roundMoney(Number(salesman.totalRecovery || 0) + amount),
      updatedAt: serverTimestamp(),
    };
    if (mode === 'cash') {
      salesmanUpdate.cashInHand = roundMoney(Number(salesman.cashInHand || 0) + amount);
    } else {
      salesmanUpdate.bankInHand = roundMoney(Number(salesman.bankInHand || 0) + amount);
    }
    tx.update(salesmanRef, salesmanUpdate);

    const ref = doc(collection(db, 'recoveries'));
    createdId = ref.id;
    tx.set(ref, {
      clientId: data.clientId,
      clientName: client.shopName,
      salesmanId: data.salesmanId,
      salesmanName: salesman.name,
      amount,
      paymentMode: mode,
      bankStatus: mode === 'bank' ? 'pending' : null,
      date: data.date,
      createdBy: createdBy || null,
      receiptSent: false,
      createdAt: serverTimestamp(),
    });
  });

  return getRecoveryById(createdId);
}

/**
 * Confirm a pending bank recovery: move amount from salesman.bankInHand → office cashInBank.
 */
export async function confirmBankRecovery(recoveryId, confirmedBy) {
  const db = requireDb();
  await runTransaction(db, async (tx) => {
    const recoveryRef = doc(db, 'recoveries', recoveryId);
    const recoverySnap = await tx.get(recoveryRef);
    if (!recoverySnap.exists()) throw new Error('Recovery not found.');
    const recovery = recoverySnap.data();
    if (recovery.paymentMode !== 'bank') throw new Error('Only bank recoveries need confirmation.');
    if (recovery.bankStatus === 'confirmed') throw new Error('Already confirmed.');

    const amount = roundMoney(recovery.amount);
    const salesmanRef = doc(db, 'salesmen', recovery.salesmanId);
    const [salesmanSnap, office] = await Promise.all([
      tx.get(salesmanRef),
      readOfficeBalance(tx, db),
    ]);
    if (!salesmanSnap.exists()) throw new Error('Salesman not found.');
    const salesman = salesmanSnap.data();
    const bank = Number(salesman.bankInHand || 0);
    if (amount > bank + 0.001) {
      throw new Error(`Salesman bank balance (${bank}) is less than this recovery.`);
    }

    tx.update(salesmanRef, {
      bankInHand: roundMoney(bank - amount),
      updatedAt: serverTimestamp(),
    });
    writeOfficeBalanceDelta(tx, office, 'cashInBank', amount);
    tx.update(recoveryRef, {
      bankStatus: 'confirmed',
      bankConfirmedBy: confirmedBy || null,
      bankConfirmedAt: serverTimestamp(),
    });
  });
}

export async function getRecoveryById(id) {
  return docToEntity(await getDoc(doc(requireDb(), 'recoveries', id)));
}

export async function getRecoveries({ clientId, salesmanId, bankStatus } = {}) {
  const col = collection(requireDb(), 'recoveries');
  let q = col;
  if (clientId) q = query(col, where('clientId', '==', clientId));
  else if (salesmanId) q = query(col, where('salesmanId', '==', salesmanId));
  else if (bankStatus) q = query(col, where('bankStatus', '==', bankStatus));
  let rows = docsToEntities(await getDocs(q));
  if (bankStatus && !clientId && !salesmanId) {
    // already filtered
  } else if (bankStatus) {
    rows = rows.filter((r) => r.bankStatus === bankStatus);
  }
  return rows;
}

export async function getPendingBankRecoveries() {
  try {
    return docsToEntities(
      await getDocs(query(collection(requireDb(), 'recoveries'), where('bankStatus', '==', 'pending'))),
    );
  } catch {
    const all = await getRecoveries();
    return all.filter((r) => r.paymentMode === 'bank' && r.bankStatus === 'pending');
  }
}

export async function markRecoveryReceiptSent(id) {
  await updateDoc(doc(requireDb(), 'recoveries', id), { receiptSent: true });
}
