/** SHA-256 hex digest for salesman passwords (Firestore custom auth, not Firebase Auth). */
export async function hashPassword(password) {
  const value = String(password || '');
  if (!value) return '';
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function normalizeUsername(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}
