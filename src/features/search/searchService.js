import { collection, endAt, getDocs, limit, orderBy, query, startAt, where } from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import { docsToEntities } from '../../utils/firestore';

function prefixQuery(col, field, q) {
  const needle = q.toLowerCase();
  return query(col, orderBy(field), startAt(needle), endAt(`${needle}\uf8ff`), limit(8));
}

export async function searchAll(raw, { city } = {}) {
  const q = (raw || '').trim();
  if (q.length < 1) return { clients: [], salesmen: [] };
  const db = requireDb();
  const clientsCol = collection(db, 'clients');
  const salesmenCol = collection(db, 'salesmen');

  const tasks = [
    getDocs(prefixQuery(clientsCol, 'shopNameLower', q)).catch(() => ({ docs: [] })),
    getDocs(query(clientsCol, where('serialNumber', '>=', q), where('serialNumber', '<=', `${q}\uf8ff`), limit(8))).catch(
      () => ({ docs: [] }),
    ),
    getDocs(prefixQuery(salesmenCol, 'nameLower', q)).catch(() => ({ docs: [] })),
    getDocs(prefixQuery(salesmenCol, 'areaLower', q)).catch(() => ({ docs: [] })),
  ];

  if (city) {
    tasks.push(
      getDocs(prefixQuery(clientsCol, 'cityLower', city)).catch(() => ({ docs: [] })),
    );
  }

  const [byName, bySerial, bySalesman, byArea, byCity] = await Promise.all(tasks);
  const clientMap = new Map();
  [...docsToEntities(byName), ...docsToEntities(bySerial), ...(byCity ? docsToEntities(byCity) : [])].forEach(
    (c) => clientMap.set(c.id, c),
  );
  const salesmanMap = new Map();
  [...docsToEntities(bySalesman), ...docsToEntities(byArea)].forEach((s) => salesmanMap.set(s.id, s));

  let clients = [...clientMap.values()];
  if (city) {
    const cityQ = city.toLowerCase();
    clients = clients.filter((c) => (c.cityLower || c.city || '').toLowerCase().includes(cityQ));
  }

  return { clients, salesmen: [...salesmanMap.values()] };
}
