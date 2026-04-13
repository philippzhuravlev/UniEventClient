import { beforeEach, describe, expect, it } from 'vitest';
import { getLikedEventIds, isEventLiked, toggleLikedEvent } from '../../services/likes';

describe('likes service', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('starts with no liked events for unknown users', () => {
        expect(getLikedEventIds('missing-user')).toEqual([]);
        expect(isEventLiked('missing-user', 'event-1')).toBe(false);
    });

    it('toggles liked events per user and keeps users isolated', () => {
        expect(toggleLikedEvent('user-a', 'event-1')).toBe(true);
        expect(isEventLiked('user-a', 'event-1')).toBe(true);

        expect(toggleLikedEvent('user-b', 'event-1')).toBe(true);
        expect(getLikedEventIds('user-a')).toEqual(['event-1']);
        expect(getLikedEventIds('user-b')).toEqual(['event-1']);

        expect(toggleLikedEvent('user-a', 'event-1')).toBe(false);
        expect(getLikedEventIds('user-a')).toEqual([]);
        expect(getLikedEventIds('user-b')).toEqual(['event-1']);
    });
});