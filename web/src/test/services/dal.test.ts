import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAuthToken = vi.fn<() => string | null>();

vi.mock('../../services/auth', () => ({
    getAuthToken: () => mockGetAuthToken(),
}));

import { createEvent, createPage, getPages, uploadEventCover } from '../../services/dal';
import type { CreateEventRequest, CreatePageRequest } from '../../types';

describe('dal service', () => {
    beforeEach(() => {
        mockGetAuthToken.mockReset();
        vi.restoreAllMocks();
    });

    it('maps getPages response content into frontend page shape', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    content: [{ id: 'p-1', name: 'S-Huset', url: 'https://example.com/shuset', active: true }],
                    totalElements: 1,
                    totalPages: 1,
                    number: 0,
                    size: 100,
                    hasNext: false,
                    hasPrevious: false,
                }),
                { status: 200 },
            ),
        );

        const pages = await getPages(0, 100);

        expect(pages).toEqual([
            {
                id: 'p-1',
                name: 'S-Huset',
                url: 'https://example.com/shuset',
                active: true,
            },
        ]);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('creates a page with bearer authentication', async () => {
        const payload: CreatePageRequest = {
            name: 'DTU Robotics Society',
            url: 'https://facebook.com/dturobotics',
            active: true,
        };
        mockGetAuthToken.mockReturnValue('token-123');

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    id: 'page-123',
                    name: payload.name,
                    url: payload.url,
                    active: true,
                }),
                { status: 200 },
            ),
        );

        const createdPage = await createPage(payload);

        expect(createdPage).toEqual({
            id: 'page-123',
            name: payload.name,
            url: payload.url,
            active: true,
        });
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('/api/pages'),
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer token-123',
                }),
            }),
        );
    });

    it('creates an event with bearer authentication', async () => {
        const payload: CreateEventRequest = {
            pageId: 'page-123',
            title: 'Robotics Night',
            description: 'Open lab session',
            startTime: '2026-06-01T16:00:00.000Z',
            eventUrl: 'https://facebook.com/events/123',
        };
        mockGetAuthToken.mockReturnValue('token-abc');

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    id: 'event-1',
                    pageId: payload.pageId,
                    title: payload.title,
                    description: payload.description,
                    startTime: payload.startTime,
                    eventUrl: payload.eventUrl,
                    createdAt: '2026-05-01T00:00:00.000Z',
                    updatedAt: '2026-05-01T00:00:00.000Z',
                }),
                { status: 200 },
            ),
        );

        const createdEvent = await createEvent(payload);

        expect(createdEvent).toEqual({
            id: 'event-1',
            pageId: payload.pageId,
            title: payload.title,
            description: payload.description,
            startTime: payload.startTime,
            endTime: undefined,
            place: undefined,
            coverImageUrl: undefined,
            eventURL: payload.eventUrl,
            createdAt: '2026-05-01T00:00:00.000Z',
            updatedAt: '2026-05-01T00:00:00.000Z',
        });
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('/api/events'),
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer token-abc',
                }),
            }),
        );
    });

    it('rejects create methods when no auth token exists', async () => {
        mockGetAuthToken.mockReturnValue(null);

        await expect(
            createPage({
                name: 'DTU',
                url: 'https://example.com',
                active: true,
            }),
        ).rejects.toThrow('Not authenticated');

        await expect(
            createEvent({
                pageId: 'p-1',
                title: 'No token event',
                startTime: '2026-05-01T00:00:00.000Z',
            }),
        ).rejects.toThrow('Not authenticated');
    });

    it('uploads cover image with bearer authentication', async () => {
        mockGetAuthToken.mockReturnValue('upload-token');

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    id: 'event-1',
                    pageId: 'page-1',
                    title: 'Event with cover',
                    startTime: '2026-06-01T16:00:00.000Z',
                    createdAt: '2026-05-01T00:00:00.000Z',
                    updatedAt: '2026-05-01T00:00:00.000Z',
                }),
                { status: 200 },
            ),
        );

        const file = new File(['abc'], 'cover.png', { type: 'image/png' });

        const result = await uploadEventCover('event-1', file);

        expect(result.id).toBe('event-1');
        expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/events/event-1/coverImage'), expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
            headers: expect.objectContaining({ Authorization: 'Bearer upload-token' }),
        }));
    });
});
