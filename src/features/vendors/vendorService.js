import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import { roundMoney } from '../../utils/calculations';
import { docToEntity, docsToEntities } from '../../utils/firestore';

export async function addVendor(data) {
  const body = {
    name: data.name.trim(),
    nameLower: data.name.trim().toLowerCase(),
    contact: (data.contact || '').trim(),
    totalPaid: 0,
    totalOwed: 0,
    totalAdvance: 0,
    active: data.active !== false,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(requireDb(), 'vendors'), body);
  return { id: ref.id, ...body };
}

export async function updateVendor(id, data) {
  await updateDoc(doc(requireDb(), 'vendors', id), {
    name: data.name.trim(),
    nameLower: data.name.trim().toLowerCase(),
    contact: (data.contact || '').trim(),
    active: data.active !== false,
  });
}

export async function getVendorById(id) {
  return docToEntity(await getDoc(doc(requireDb(), 'vendors', id)));
}

export async function getVendors() {
  try {
    return docsToEntities(
      await getDocs(query(collection(requireDb(), 'vendors'), orderBy('nameLower'))),
    );
  } catch {
    return docsToEntities(await getDocs(collection(requireDb(), 'vendors')));
  }
}

export async function addVendorTransaction(data, createdBy) {
  const amount = roundMoney(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const db = requireDb();
  let createdId = null;

  await runTransaction(db, async (tx) => {
    const vendorRef = doc(db, 'vendors', data.vendorId);
    const snap = await tx.get(vendorRef);
    if (!snap.exists()) throw new Error('Vendor not found.');
    const vendor = snap.data();
    const next = {
      totalOwed: Number(vendor.totalOwed || 0),
      totalPaid: Number(vendor.totalPaid || 0),
      totalAdvance: Number(vendor.totalAdvance || 0),
    };
    if (data.type === 'purchase') next.totalOwed = roundMoney(next.totalOwed + amount);
    else if (data.type === 'payment') {
      next.totalOwed = roundMoney(next.totalOwed - amount);
      next.totalPaid = roundMoney(next.totalPaid + amount);
    } else if (data.type === 'advance') {
      next.totalAdvance = roundMoney(next.totalAdvance + amount);
    } else {
      throw new Error('Unknown vendor transaction type.');
    }

    tx.update(vendorRef, next);
    const ref = doc(collection(db, 'vendorTransactions'));
    createdId = ref.id;
    tx.set(ref, {
      vendorId: data.vendorId,
      vendorName: vendor.name,
      type: data.type,
      amount,
      date: data.date,
      createdBy: createdBy || null,
      receiptSent: false,
      createdAt: serverTimestamp(),
    });
  });

  return getVendorTransactionById(createdId);
}

export async function getVendorTransactionById(id) {
  return docToEntity(await getDoc(doc(requireDb(), 'vendorTransactions', id)));
}

export async function getVendorTransactions(vendorId) {
  const q = query(
    collection(requireDb(), 'vendorTransactions'),
    where('vendorId', '==', vendorId),
  );
  return docsToEntities(await getDocs(q));
}

export async function markVendorReceiptSent(id) {
  await updateDoc(doc(requireDb(), 'vendorTransactions', id), { receiptSent: true });
}
