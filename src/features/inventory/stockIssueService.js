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
import { calcStockValue, roundMoney, roundYards } from '../../utils/calculations';
import { docsToEntities } from '../../utils/firestore';

export function salesmanInventoryId(salesmanId, itemId) {
  return `${salesmanId}_${itemId}`;
}

export async function issueStock({ salesmanId, itemId, yards, notes, issuedBy }) {
  const qty = roundYards(yards);
  if (qty <= 0) throw new Error('Yards must be greater than zero.');
  const db = requireDb();

  await runTransaction(db, async (tx) => {
    const itemRef = doc(db, 'inventory', itemId);
    const salesmanRef = doc(db, 'salesmen', salesmanId);
    const invRef = doc(db, 'salesmanInventory', salesmanInventoryId(salesmanId, itemId));

    const [itemSnap, salesmanSnap, invSnap] = await Promise.all([
      tx.get(itemRef),
      tx.get(salesmanRef),
      tx.get(invRef),
    ]);

    if (!itemSnap.exists()) throw new Error('Inventory item not found.');
    if (!salesmanSnap.exists()) throw new Error('Salesman not found.');

    const item = itemSnap.data();
    const salesman = salesmanSnap.data();
    const available = Number(item.stockYards || 0);
    if (qty > available) {
      throw new Error(`Not enough stock. Available: ${available} yd.`);
    }

    const valueAtCost = roundMoney(qty * Number(item.costPricePerYard || 0));
    const nextYards = roundYards(available - qty);

    tx.update(itemRef, {
      stockYards: nextYards,
      stockValue: calcStockValue(nextYards, item.costPricePerYard),
      updatedAt: serverTimestamp(),
    });

    if (invSnap.exists()) {
      const current = invSnap.data();
      tx.update(invRef, {
        yards: roundYards(Number(current.yards || 0) + qty),
        valueAtCost: roundMoney(Number(current.valueAtCost || 0) + valueAtCost),
        salesmanName: salesman.name,
        itemName: item.itemName,
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(invRef, {
        salesmanId,
        salesmanName: salesman.name,
        itemId,
        itemName: item.itemName,
        yards: qty,
        valueAtCost,
        updatedAt: serverTimestamp(),
      });
    }

    tx.update(salesmanRef, {
      inventoryValue: roundMoney(Number(salesman.inventoryValue || 0) + valueAtCost),
      updatedAt: serverTimestamp(),
    });

    tx.set(doc(collection(db, 'stockIssues')), {
      salesmanId,
      salesmanName: salesman.name,
      itemId,
      itemName: item.itemName,
      yards: qty,
      valueAtCost,
      issuedBy: issuedBy || null,
      date: serverTimestamp(),
      notes: notes || '',
    });
  });
}

export async function getSalesmanInventory(salesmanId) {
  const q = query(
    collection(requireDb(), 'salesmanInventory'),
    where('salesmanId', '==', salesmanId),
  );
  return docsToEntities(await getDocs(q));
}

export async function getStockIssues() {
  return docsToEntities(await getDocs(collection(requireDb(), 'stockIssues')));
}

export async function getSalesmanInventoryItem(salesmanId, itemId) {
  const { getDoc, doc: docFn } = await import('firebase/firestore');
  const snap = await getDoc(docFn(requireDb(), 'salesmanInventory', salesmanInventoryId(salesmanId, itemId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
