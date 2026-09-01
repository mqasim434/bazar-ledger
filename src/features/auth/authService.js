import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { requireAuth, requireDb } from '../../config/firebase';
import { docToEntity } from '../../utils/firestore';

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(requireAuth(), email, password);
  const profile = await getUserProfile(cred.user.uid);
  return { user: cred.user, profile };
}

export async function signOutUser() {
  await signOut(requireAuth());
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(requireDb(), 'users', uid));
  return docToEntity(snap);
}

/** Missing `active` counts as active. Only an explicit false (or "false") blocks login. */
export function isProfileActive(profile) {
  const value = profile?.active;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return true;
}

export function assertStaffProfile(profile, uid) {
  if (!profile) {
    throw new Error(
      `No Firestore profile for this login. Create users/${uid} (document ID must be the Auth UID, not an auto-ID).`,
    );
  }
  if (!isProfileActive(profile)) {
    throw new Error(
      'This account is inactive. In Firestore → users → this document, set field `active` to boolean true (not the text "true").',
    );
  }
  if (profile.role !== 'admin' && profile.role !== 'accountant') {
    throw new Error(
      `Invalid role "${profile.role || ''}". Set role to exactly admin or accountant (lowercase).`,
    );
  }
  return profile;
}
