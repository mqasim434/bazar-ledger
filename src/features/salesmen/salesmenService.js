import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import { docToEntity, docsToEntities } from '../../utils/firestore';

const COL = 'salesmen';

function payloadFromForm(data) {
  return {
    name: data.name.trim(),
    nameLower: data.name.trim().toLowerCase(),
    contact: data.contact.trim(),
    route: (data.route || '').trim(),
    area: (data.area || '').trim(),
    areaLower: (data.area || '').trim().toLowerCase(),
    active: data.active !== false,
    updatedAt: serverTimestamp(),
  };
}

export async function addSalesman(data) {
  const body = {
    ...payloadFromForm(data),
    cashInHand: 0,
    bankInHand: 0,
    advanceBalance: 0,
    totalSales: 0,
    totalRecovery: 0,
    totalCommissionEarned: 0,
    totalCommissionPaid: 0,
    inventoryValue: 0,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(requireDb(), COL), body);
  return { id: ref.id, ...body };
}

export async function updateSalesman(id, data) {
  await updateDoc(doc(requireDb(), COL, id), payloadFromForm(data));
}

export async function deactivateSalesman(id, active) {
  await updateDoc(doc(requireDb(), COL, id), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function getSalesmanById(id) {
  return docToEntity(await getDoc(doc(requireDb(), COL, id)));
}

export async function getSalesmen({ activeOnly = false } = {}) {
  const q = activeOnly
    ? query(collection(requireDb(), COL), where('active', '==', true), orderBy('nameLower'))
    : query(collection(requireDb(), COL), orderBy('nameLower'));
  try {
    return docsToEntities(await getDocs(q));
  } catch {
    const snap = await getDocs(collection(requireDb(), COL));
    const rows = docsToEntities(snap);
    return activeOnly ? rows.filter((r) => r.active) : rows;
  }
}
