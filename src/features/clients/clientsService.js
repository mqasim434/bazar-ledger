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
import { getSalesmanById } from '../salesmen/salesmenService';

const COL = 'clients';

export async function isSerialNumberTaken(serialNumber, exceptId) {
  const q = query(
    collection(requireDb(), COL),
    where('serialNumber', '==', serialNumber.trim()),
  );
  const snap = await getDocs(q);
  return snap.docs.some((d) => d.id !== exceptId);
}

function payloadFromForm(data, salesman) {
  return {
    shopName: data.shopName.trim(),
    shopNameLower: data.shopName.trim().toLowerCase(),
    serialNumber: data.serialNumber.trim(),
    ownerName: (data.ownerName || '').trim(),
    contact: (data.contact || '').trim(),
    city: (data.city || '').trim(),
    cityLower: (data.city || '').trim().toLowerCase(),
    gps: {
      lat: data.gps?.lat === '' || data.gps?.lat == null ? null : Number(data.gps.lat),
      lng: data.gps?.lng === '' || data.gps?.lng == null ? null : Number(data.gps.lng),
    },
    creditLimit: Number(data.creditLimit || 0),
    creditLimitEnabled: Boolean(data.creditLimitEnabled),
    defaultDiscountPercent: Number(data.defaultDiscountPercent || 0),
    salesmanId: data.salesmanId,
    salesmanName: salesman?.name || data.salesmanName || '',
    active: data.active !== false,
    updatedAt: serverTimestamp(),
  };
}

export async function addClient(data) {
  if (await isSerialNumberTaken(data.serialNumber)) {
    throw new Error('Serial number is already in use.');
  }
  const salesman = await getSalesmanById(data.salesmanId);
  if (!salesman) throw new Error('Select a valid salesman.');
  const body = {
    ...payloadFromForm(data, salesman),
    totalPurchase: 0,
    totalCredit: 0,
    totalRecovery: 0,
    balance: 0,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(requireDb(), COL), body);
  return { id: ref.id, ...body };
}

export async function updateClient(id, data) {
  if (await isSerialNumberTaken(data.serialNumber, id)) {
    throw new Error('Serial number is already in use.');
  }
  const salesman = await getSalesmanById(data.salesmanId);
  if (!salesman) throw new Error('Select a valid salesman.');
  await updateDoc(doc(requireDb(), COL, id), payloadFromForm(data, salesman));
}

export async function setClientActive(id, active) {
  await updateDoc(doc(requireDb(), COL, id), { active, updatedAt: serverTimestamp() });
}

export async function getClientById(id) {
  return docToEntity(await getDoc(doc(requireDb(), COL, id)));
}

export async function getClients() {
  try {
    return docsToEntities(
      await getDocs(query(collection(requireDb(), COL), orderBy('shopNameLower'))),
    );
  } catch {
    return docsToEntities(await getDocs(collection(requireDb(), COL)));
  }
}

export async function getClientsBySalesman(salesmanId) {
  const q = query(collection(requireDb(), COL), where('salesmanId', '==', salesmanId));
  return docsToEntities(await getDocs(q));
}
