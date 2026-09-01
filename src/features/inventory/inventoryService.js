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
} from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import { calcStockValue, roundYards } from '../../utils/calculations';
import { docToEntity, docsToEntities } from '../../utils/firestore';

const COL = 'inventory';

export async function addItem(data) {
  const stockYards = roundYards(data.stockYards || 0);
  const cost = Number(data.costPricePerYard || 0);
  const body = {
    itemName: data.itemName.trim(),
    itemNameLower: data.itemName.trim().toLowerCase(),
    unit: 'yard',
    costPricePerYard: cost,
    ratePerYard: Number(data.ratePerYard || 0),
    stockYards,
    stockValue: calcStockValue(stockYards, cost),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(requireDb(), COL), body);
  return { id: ref.id, ...body };
}

export async function updateItem(id, data) {
  const existing = await getItemById(id);
  if (!existing) throw new Error('Item not found.');
  const cost = Number(data.costPricePerYard || 0);
  await updateDoc(doc(requireDb(), COL, id), {
    itemName: data.itemName.trim(),
    itemNameLower: data.itemName.trim().toLowerCase(),
    unit: 'yard',
    costPricePerYard: cost,
    ratePerYard: Number(data.ratePerYard || 0),
    stockValue: calcStockValue(existing.stockYards, cost),
    updatedAt: serverTimestamp(),
  });
}

export async function getItemById(id) {
  return docToEntity(await getDoc(doc(requireDb(), COL, id)));
}

export async function getInventory() {
  try {
    return docsToEntities(
      await getDocs(query(collection(requireDb(), COL), orderBy('itemNameLower'))),
    );
  } catch {
    return docsToEntities(await getDocs(collection(requireDb(), COL)));
  }
}

/**
 * Atomic stock correction. Prevents stockYards from going below 0.
 */
export async function adjustStock(itemId, deltaYards, reason, adjustedBy) {
  const delta = roundYards(deltaYards);
  if (!reason?.trim()) throw new Error('A reason is required for stock adjustments.');
  if (!delta) throw new Error('Delta must not be zero.');

  const db = requireDb();
  await runTransaction(db, async (tx) => {
    const itemRef = doc(db, COL, itemId);
    const snap = await tx.get(itemRef);
    if (!snap.exists()) throw new Error('Item not found.');
    const item = snap.data();
    const nextYards = roundYards(Number(item.stockYards || 0) + delta);
    if (nextYards < 0) {
      throw new Error('Adjustment would take stock below zero.');
    }
    tx.update(itemRef, {
      stockYards: nextYards,
      stockValue: calcStockValue(nextYards, item.costPricePerYard),
      updatedAt: serverTimestamp(),
    });
    tx.set(doc(collection(db, 'inventoryAdjustments')), {
      itemId,
      itemName: item.itemName,
      delta,
      reason: reason.trim(),
      adjustedBy: adjustedBy || null,
      date: serverTimestamp(),
    });
  });
}
