import { db } from './firebase';

export const LIKES_CHANGED_EVENT = 'unievent:likes-changed';
const likesCache = new Map<string, Set<string>>();

function isFirestoreEnabled(): boolean {
    return import.meta.env.VITE_USE_FIRESTORE?.toLowerCase() === 'true';
}

function emitLikesChanged() {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new Event(LIKES_CHANGED_EVENT));
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item): item is string => !!item);
}

function getCachedLikes(uid: string): string[] {
    return Array.from(likesCache.get(uid) ?? new Set<string>());
}

function setCachedLikes(uid: string, nextLikes: Iterable<string>) {
    likesCache.set(uid, new Set(nextLikes));
}

export async function getLikedEventIdsAsync(uid: string | null | undefined): Promise<string[]> {
    if (!uid) {
        return [];
    }

    if (!isFirestoreEnabled()) {
        return getCachedLikes(uid);
    }

    try {
        const { doc, getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
            return getCachedLikes(uid);
        }

        const data = userDoc.data() as Record<string, unknown>;
        const likedIds = normalizeStringArray(data.likedItemIds);
        setCachedLikes(uid, likedIds);
        return likedIds;
    } catch {
        return getCachedLikes(uid);
    }
}

export async function isEventLiked(uid: string | null | undefined, eventId: string): Promise<boolean> {
    const likedEventIds = await getLikedEventIdsAsync(uid);
    return likedEventIds.includes(eventId);
}

export async function toggleLikedEvent(uid: string, eventId: string): Promise<boolean> {
    const applyToggle = (currentLikedIds: string[]) => {
        const nextLikedEventIds = new Set(currentLikedIds);
        if (nextLikedEventIds.has(eventId)) {
            nextLikedEventIds.delete(eventId);
        } else {
            nextLikedEventIds.add(eventId);
        }

        setCachedLikes(uid, nextLikedEventIds);
        emitLikesChanged();
        return nextLikedEventIds.has(eventId);
    };

    if (!isFirestoreEnabled()) {
        return applyToggle(getCachedLikes(uid));
    }

    try {
        const { doc, getDoc, serverTimestamp, setDoc } = await import('firebase/firestore');
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        const existingData = userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : {};

        const nextLiked = applyToggle(normalizeStringArray(existingData.likedItemIds));

        try {
            await setDoc(
                userRef,
                {
                    likedItemIds: getCachedLikes(uid),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        } catch (writeError) {
            console.warn('Firestore write failed; keeping optimistic in-memory state.', writeError);
        }

        return nextLiked;
    } catch (error) {
        console.warn('Falling back to in-memory likes after Firestore failure.', error);
        return applyToggle(getCachedLikes(uid));
    }
}