import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualEventPage } from '../../pages/ManualEventPage';

const mockCreatePage = vi.fn();
const mockCreateEvent = vi.fn();
const mockUploadEventCover = vi.fn();

vi.mock('../../services/dal', () => ({
    createPage: (...args: unknown[]) => mockCreatePage(...args),
    createEvent: (...args: unknown[]) => mockCreateEvent(...args),
    uploadEventCover: (...args: unknown[]) => mockUploadEventCover(...args),
}));

function renderPage() {
    return render(
        <MemoryRouter>
            <ManualEventPage />
        </MemoryRouter>,
    );
}

describe('ManualEventPage', () => {
    beforeEach(() => {
        mockCreatePage.mockReset();
        mockCreateEvent.mockReset();
        mockUploadEventCover.mockReset();
    });

    it('keeps save draft disabled', () => {
        renderPage();

        const saveDraftButton = screen.getByRole('button', { name: 'Save Draft (Disabled)' });
        expect(saveDraftButton).toBeDisabled();
    });

    it('shows validation errors and does not publish invalid form', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'Publish Event' }));

        expect(screen.getByText('Event title is required.')).toBeInTheDocument();
        expect(mockCreatePage).not.toHaveBeenCalled();
        expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it('publishes page then event and shows success message', async () => {
        const user = userEvent.setup();
        mockCreatePage.mockResolvedValueOnce({
            id: 'page-1',
            name: 'DTU Robotics Society',
            url: 'DTU Robotics Society',
            active: true,
        });
        mockCreateEvent.mockResolvedValueOnce({
            id: 'event-1',
            pageId: 'page-1',
            title: 'DTU Robotics Night',
            startTime: '2026-11-10T18:00:00.000Z',
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
        });
        mockUploadEventCover.mockResolvedValueOnce({
            id: 'event-1',
            pageId: 'page-1',
            title: 'DTU Robotics Night',
            startTime: '2026-11-10T18:00:00.000Z',
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
        });

        renderPage();

        await user.type(screen.getByLabelText('Event title'), 'DTU Robotics Night');
        await user.type(screen.getByLabelText('Organizer display name'), 'DTU Robotics Society');
        await user.type(screen.getByLabelText('Start date'), '2026-11-10');
        await user.type(screen.getByLabelText('Start time'), '18:00');
        await user.type(screen.getByLabelText('Venue name'), 'Oticon Hall');
        await user.type(screen.getByLabelText('Address'), 'Anker Engelunds Vej 1, 2800 Kgs. Lyngby');
        await user.type(screen.getByLabelText('Short summary'), 'A practical robotics intro evening.');
        // attach a file
        const file = new File(['dummy'], 'cover.png', { type: 'image/png' });
        await user.upload(screen.getByLabelText('Cover image'), file);

        await user.click(screen.getByRole('button', { name: 'Publish Event' }));

        await waitFor(() => {
            expect(mockCreatePage).toHaveBeenCalledWith({
                id: 'dtu-robotics-society',
                name: 'DTU Robotics Society',
                url: 'https://facebook.com/dtu-robotics-society',
                active: true,
            });
        });

        await waitFor(() => {
            expect(mockCreateEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    pageId: 'page-1',
                    title: 'DTU Robotics Night',
                    place: expect.objectContaining({
                        name: 'Oticon Hall',
                    }),
                }),
            );
        });

        await waitFor(() => {
            expect(mockUploadEventCover).toHaveBeenCalledWith('event-1', expect.any(File));
        });

        expect(screen.getByText('Published "DTU Robotics Night" successfully.')).toBeInTheDocument();
    }, 10000);
});
