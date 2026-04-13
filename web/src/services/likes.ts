const LIKED_EVENT_IDS_STORAGE_KEY = 'unievent.likedEventIds';
export const LIKES_CHANGED_EVENT = 'unievent:likes-changed';

type LikedEventsMap = Record<string, string[]>;

function readLikedEventsMap(): LikedEventsMap {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(LIKED_EVENT_IDS_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed as LikedEventsMap;
        }
    } catch {
        // Ignore malformed local storage data and fall back to an empty map.
    }

    return {};
}

function persistLikedEventsMap(likedEventsMap: LikedEventsMap) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(LIKED_EVENT_IDS_STORAGE_KEY, JSON.stringify(likedEventsMap));
}

function emitLikesChanged() {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new Event(LIKES_CHANGED_EVENT));
}

export function getLikedEventIds(uid: string | null | undefined): string[] {
    if (!uid) {
        return [];
    }

    const likedEventIds = readLikedEventsMap()[uid];
    if (!Array.isArray(likedEventIds)) {
        return [];
    }

    return likedEventIds.filter((eventId): eventId is string => typeof eventId === 'string' && !!eventId.trim());
}

export function isEventLiked(uid: string | null | undefined, eventId: string): boolean {
    return getLikedEventIds(uid).includes(eventId);
}

export function toggleLikedEvent(uid: string, eventId: string): boolean {
    const current = readLikedEventsMap();
    const nextLikedEventIds = new Set(current[uid] ?? []);

    if (nextLikedEventIds.has(eventId)) {
        nextLikedEventIds.delete(eventId);
    } else {
        nextLikedEventIds.add(eventId);
    }

    current[uid] = Array.from(nextLikedEventIds);
    persistLikedEventsMap(current);
    emitLikesChanged();

    return nextLikedEventIds.has(eventId);
}