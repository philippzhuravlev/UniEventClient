import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'mock-server-ts');

const usersStore = new Map<string, Record<string, unknown>>();

vi.mock('../../services/firebase', () => ({
    db: { name: 'fake-db' },
}));

vi.mock('firebase/firestore', () => ({
    doc: (...args: unknown[]) => mockDoc(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    serverTimestamp: () => mockServerTimestamp(),
}));

import { getLikedEventIdsAsync, isEventLiked, toggleLikedEvent } from '../../services/likes';

describe('likes service', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        usersStore.clear();
        mockDoc.mockReset();
        mockGetDoc.mockReset();
        mockSetDoc.mockReset();

        mockDoc.mockImplementation((_: unknown, __: string, uid: string) => ({ uid }));
        mockGetDoc.mockImplementation(async (docRef: { uid: string }) => {
            const data = usersStore.get(docRef.uid);
            return {
                exists: () => !!data,
                data: () => data,
            };
        });
        mockSetDoc.mockImplementation(async (docRef: { uid: string }, data: Record<string, unknown>) => {
            const existing = usersStore.get(docRef.uid) ?? {};
            usersStore.set(docRef.uid, { ...existing, ...data });
        });
    });

    it('starts with no liked events for unknown users', async () => {
        await expect(getLikedEventIdsAsync('missing-user')).resolves.toEqual([]);
        await expect(isEventLiked('missing-user', 'event-1')).resolves.toBe(false);
    });

    it('toggles liked events per user and keeps users isolated', async () => {
        await expect(toggleLikedEvent('user-a', 'event-1')).resolves.toBe(true);
        await expect(isEventLiked('user-a', 'event-1')).resolves.toBe(true);

        await expect(toggleLikedEvent('user-b', 'event-1')).resolves.toBe(true);
        await expect(getLikedEventIdsAsync('user-a')).resolves.toEqual(['event-1']);
        await expect(getLikedEventIdsAsync('user-b')).resolves.toEqual(['event-1']);

        await expect(toggleLikedEvent('user-a', 'event-1')).resolves.toBe(false);
        await expect(getLikedEventIdsAsync('user-a')).resolves.toEqual([]);
        await expect(getLikedEventIdsAsync('user-b')).resolves.toEqual(['event-1']);
    });

    it('falls back to cache when firestore mode fails', async () => {
        vi.stubEnv('VITE_USE_FIRESTORE', 'true');
        mockGetDoc.mockRejectedValueOnce(new Error('permission-denied'));

        await expect(toggleLikedEvent('user-c', 'event-9')).resolves.toBe(true);
        await expect(isEventLiked('user-c', 'event-9')).resolves.toBe(true);
    });

    it('keeps optimistic toggle when setDoc fails after successful getDoc', async () => {
        vi.stubEnv('VITE_USE_FIRESTORE', 'true');
        mockSetDoc.mockRejectedValueOnce(new Error('write-failed'));

        await expect(toggleLikedEvent('user-d', 'event-10')).resolves.toBe(true);
        await expect(isEventLiked('user-d', 'event-10')).resolves.toBe(true);
    });

    it('keeps optimistic un-toggle when setDoc fails after successful getDoc', async () => {
        vi.stubEnv('VITE_USE_FIRESTORE', 'true');
        usersStore.set('user-e', { likedItemIds: ['event-11'] });
        mockSetDoc.mockRejectedValueOnce(new Error('write-failed'));

        await expect(toggleLikedEvent('user-e', 'event-11')).resolves.toBe(false);
    });
});