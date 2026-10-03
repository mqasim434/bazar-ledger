import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { requireDb } from '../../config/firebase';
import { docToEntity, docsToEntities } from '../../utils/firestore';
import { hashPassword, normalizeUsername } from '../../utils/password';

const COL = 'salesmen';
const LOGIN_COL = 'salesmanLogins';

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

export async function isUsernameTaken(username, exceptSalesmanId) {
  const key = normalizeUsername(username);
  if (!key) return false;
  const snap = await getDoc(doc(requireDb(), LOGIN_COL, key));
  if (!snap.exists()) return false;
  return snap.data().salesmanId !== exceptSalesmanId;
}

async function upsertLogin({ salesmanId, username, password, active }) {
  const key = normalizeUsername(username);
  if (!key) throw new Error('Username is required for mobile login.');
  if (await isUsernameTaken(key, salesmanId)) {
    throw new Error('This username is already taken.');
  }

  const db = requireDb();
  const salesmanRef = doc(db, COL, salesmanId);
  const existing = await getDoc(salesmanRef);
  const prevUsername = existing.exists() ? existing.data().username : null;

  const updates = {
    username: key,
    updatedAt: serverTimestamp(),
  };
  if (password) {
    updates.passwordHash = await hashPassword(password);
  } else if (!existing.data()?.passwordHash) {
    throw new Error('Password is required when creating a login.');
  }

  const loginPayload = {
    salesmanId,
    username: key,
    passwordHash: updates.passwordHash || existing.data().passwordHash,
    active: active !== false,
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.update(salesmanRef, updates);

  if (prevUsername && prevUsername !== key) {
    batch.delete(doc(db, LOGIN_COL, prevUsername));
  }
  batch.set(doc(db, LOGIN_COL, key), loginPayload, { merge: true });
  await batch.commit();
}

export async function addSalesman(data) {
  const username = normalizeUsername(data.username);
  const password = data.password || '';
  if (username) {
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }
    if (await isUsernameTaken(username)) {
      throw new Error('This username is already taken.');
    }
  }

  const passwordHash = username ? await hashPassword(password) : null;
  const body = {
    ...payloadFromForm(data),
    username: username || null,
    passwordHash,
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

  if (username) {
    await setDoc(doc(requireDb(), LOGIN_COL, username), {
      salesmanId: ref.id,
      username,
      passwordHash,
      active: body.active,
      updatedAt: serverTimestamp(),
    });
  }

  return { id: ref.id, ...body, passwordHash: passwordHash ? '[set]' : null };
}

export async function updateSalesman(id, data) {
  const username = normalizeUsername(data.username);
  const password = data.password || '';

  await updateDoc(doc(requireDb(), COL, id), payloadFromForm(data));

  if (username) {
    if (password && password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }
    await upsertLogin({
      salesmanId: id,
      username,
      password: password || null,
      active: data.active !== false,
    });
  } else {
    const existing = await getSalesmanById(id);
    if (existing?.username) {
      const batch = writeBatch(requireDb());
      batch.delete(doc(requireDb(), LOGIN_COL, existing.username));
      batch.update(doc(requireDb(), COL, id), {
        username: null,
        passwordHash: null,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    }
  }
}

export async function deactivateSalesman(id, active) {
  const salesman = await getSalesmanById(id);
  await updateDoc(doc(requireDb(), COL, id), {
    active,
    updatedAt: serverTimestamp(),
  });
  if (salesman?.username) {
    await updateDoc(doc(requireDb(), LOGIN_COL, salesman.username), {
      active,
      updatedAt: serverTimestamp(),
    });
  }
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

export async function removeSalesmanLogin(salesmanId) {
  const salesman = await getSalesmanById(salesmanId);
  if (!salesman?.username) return;
  await deleteDoc(doc(requireDb(), LOGIN_COL, salesman.username));
  await updateDoc(doc(requireDb(), COL, salesmanId), {
    username: null,
    passwordHash: null,
    updatedAt: serverTimestamp(),
  });
}
