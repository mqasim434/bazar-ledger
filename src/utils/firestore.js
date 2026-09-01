import { Timestamp } from 'firebase/firestore';

export function docToEntity(snap) {
  if (!snap?.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export function docsToEntities(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function toDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function nowTimestamp() {
  return Timestamp.now();
}

export function normalizeList(items) {
  const byId = {};
  const allIds = [];
  items.forEach((item) => {
    byId[item.id] = item;
    allIds.push(item.id);
  });
  return { byId, allIds };
}
