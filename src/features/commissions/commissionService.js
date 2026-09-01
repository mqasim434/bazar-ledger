import {
  addDoc,
  arrayUnion,
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
import { calcCommission, roundMoney } from '../../utils/calculations';
import { docToEntity, docsToEntities } from '../../utils/firestore';
import { getRecoveries } from '../recoveries/recoveryService';
import { getTransactions } from '../transactions/transactionService';

export async function addCommissionRule(data) {
  const body = {
    salesmanId: data.salesmanId || 'default',
    salesmanName: data.salesmanName || 'Default',
    basis: data.basis,
    type: data.type,
    rate: Number(data.rate),
    effectiveFrom: data.effectiveFrom,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(requireDb(), 'commissionRules'), body);
  return { id: ref.id, ...body };
}

export async function getCommissionRules() {
  return docsToEntities(await getDocs(collection(requireDb(), 'commissionRules')));
}

export function pickActiveRule(rules, salesmanId, periodEnd) {
  const relevant = rules
    .filter((r) => (r.salesmanId === salesmanId || r.salesmanId === 'default') && r.effectiveFrom <= periodEnd)
    .sort((a, b) => {
      const specific = (x) => (x.salesmanId === salesmanId ? 1 : 0);
      if (specific(b) !== specific(a)) return specific(b) - specific(a);
      return (b.effectiveFrom || '').localeCompare(a.effectiveFrom || '');
    });
  return relevant[0] || null;
}

export async function generateCommission({ salesmanId, salesmanName, periodStart, periodEnd }, generatedBy) {
  const rules = await getCommissionRules();
  const rule = pickActiveRule(rules, salesmanId, periodEnd);
  if (!rule) throw new Error('No commission rule covers this salesman/period.');

  let basisAmount = 0;
  if (rule.basis === 'recovery') {
    const rows = await getRecoveries({ salesmanId });
    basisAmount = rows
      .filter((r) => r.date >= periodStart && r.date <= periodEnd)
      .reduce((s, r) => s + Number(r.amount || 0), 0);
  } else {
    const rows = await getTransactions({ salesmanId });
    const inRange = rows.filter((r) => r.date >= periodStart && r.date <= periodEnd && r.status !== 'returned');
    if (rule.type === 'flat_per_yard') {
      basisAmount = inRange.reduce((s, r) => s + Number(r.yards || 0), 0);
    } else {
      basisAmount = inRange.reduce((s, r) => s + Number(r.netAmount || 0), 0);
    }
  }

  const earnedAmount = calcCommission(basisAmount, rule);
  const body = {
    salesmanId,
    salesmanName,
    periodStart,
    periodEnd,
    basis: rule.basis,
    type: rule.type,
    rate: rule.rate,
    basisAmount: roundMoney(basisAmount),
    earnedAmount,
    paidAmount: 0,
    remainingBalance: earnedAmount,
    adjustments: [],
    generatedAt: serverTimestamp(),
    generatedBy: generatedBy || null,
  };
  const ref = await addDoc(collection(requireDb(), 'commissions'), body);
  return { id: ref.id, ...body };
}

export async function recordCommissionPayment(commissionId, amount, paidBy) {
  const pay = roundMoney(amount);
  if (pay <= 0) throw new Error('Amount must be greater than zero.');
  const db = requireDb();
  await runTransaction(db, async (tx) => {
    const commRef = doc(db, 'commissions', commissionId);
    const commSnap = await tx.get(commRef);
    if (!commSnap.exists()) throw new Error('Commission not found.');
    const comm = commSnap.data();
    const salesmanRef = doc(db, 'salesmen', comm.salesmanId);
    const salesmanSnap = await tx.get(salesmanRef);
    if (!salesmanSnap.exists()) throw new Error('Salesman not found.');

    const paidAmount = roundMoney(Number(comm.paidAmount || 0) + pay);
    const remainingBalance = roundMoney(Number(comm.earnedAmount || 0) - paidAmount);
    tx.update(commRef, { paidAmount, remainingBalance });
    tx.update(salesmanRef, {
      totalCommissionPaid: roundMoney(Number(salesmanSnap.data().totalCommissionPaid || 0) + pay),
      updatedAt: serverTimestamp(),
    });
  });
  void paidBy;
}

export async function addCommissionAdjustment(commissionId, amount, reason, addedBy) {
  const adj = roundMoney(amount);
  if (!reason?.trim()) throw new Error('Reason is required.');
  const db = requireDb();
  const ref = doc(db, 'commissions', commissionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Commission not found.');
  const comm = snap.data();
  const earnedAmount = roundMoney(Number(comm.earnedAmount || 0) + adj);
  const remainingBalance = roundMoney(earnedAmount - Number(comm.paidAmount || 0));
  await updateDoc(ref, {
    earnedAmount,
    remainingBalance,
    adjustments: arrayUnion({
      amount: adj,
      reason: reason.trim(),
      date: new Date().toISOString().slice(0, 10),
      addedBy: addedBy || null,
    }),
  });
}

export async function getCommissions(salesmanId) {
  const col = collection(requireDb(), 'commissions');
  if (!salesmanId) return docsToEntities(await getDocs(col));
  return docsToEntities(await getDocs(query(col, where('salesmanId', '==', salesmanId))));
}

export async function getCommissionById(id) {
  return docToEntity(await getDoc(doc(requireDb(), 'commissions', id)));
}
