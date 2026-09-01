import { useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';

/**
 * Cross-feature Firestore listener. Pass a Query/DocumentReference or null.
 */
export function useFirestoreListener(refOrQuery, onData, onError) {
  useEffect(() => {
    if (!refOrQuery) return undefined;
    const unsub = onSnapshot(
      refOrQuery,
      (snap) => {
        if (typeof snap.docs === 'undefined') {
          onData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
          return;
        }
        onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        if (onError) onError(err);
        else console.error(err);
      },
    );
    return unsub;
  }, [refOrQuery, onData, onError]);
}
