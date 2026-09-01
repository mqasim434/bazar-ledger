import { doc, serverTimestamp } from 'firebase/firestore';
import { requireDb } from '../config/firebase';
import { roundMoney } from './calculations';

export function officeBalanceRef(db = requireDb()) {
  return doc(db, 'officeBalances', 'summary');
}

export async function readOfficeBalance(tx, db = requireDb()) {
  const ref = officeBalanceRef(db);
  const snap = await tx.get(ref);
  return {
    ref,
    exists: snap.exists(),
    data: snap.exists() ? snap.data() : { cashInHand: 0, cashInBank: 0 },
  };
}

export function writeOfficeBalanceDelta(tx, office, field, delta) {
  const next = {
    cashInHand: roundMoney(
      Number(office.data.cashInHand || 0) + (field === 'cashInHand' ? delta : 0),
    ),
    cashInBank: roundMoney(
      Number(office.data.cashInBank || 0) + (field === 'cashInBank' ? delta : 0),
    ),
    updatedAt: serverTimestamp(),
  };
  if (office.exists) tx.update(office.ref, next);
  else tx.set(office.ref, next);
  return next;
}
