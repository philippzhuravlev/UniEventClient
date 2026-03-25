import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SignupPage } from '../../pages/SignupPage';

// These are fake functions we control in tests.
const mockNavigate = vi.fn();
const mockSignupWithEmail = vi.fn();
const mockMapAuthError = vi.fn();

// We replace real navigation with our fake one, so no page actually changes.
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// We replace backend calls with fake responses to test screen behavior only.
vi.mock('../../services/auth', () => ({
    signupWithEmail: (...args: unknown[]) => mockSignupWithEmail(...args),
    mapAuthError: (...args: unknown[]) => mockMapAuthError(...args),
}));

// Small helper to open the page in a test-safe router.
function renderPage() {
    return render(
        <MemoryRouter>
            <SignupPage />
        </MemoryRouter>
    );
}

describe('SignupPage', () => {
    beforeEach(() => {
        // Clean state before each test so tests do not affect each other.
        mockNavigate.mockReset();
        mockSignupWithEmail.mockReset();
        mockMapAuthError.mockReset();
    });

    it('shows an error when fields are empty', async () => {
        // Simple check: all fields are required.
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'Sign Up' }));

        expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument();
        expect(mockSignupWithEmail).not.toHaveBeenCalled();
    });

    it('shows an error when password and confirm password differ', async () => {
        // Simple check: both password fields must match.
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText('Username'), 'alice');
        await user.type(screen.getByLabelText('Email'), 'alice@example.com');
        await user.type(screen.getByLabelText('Password'), '123456');
        await user.type(screen.getByLabelText('Confirm Password'), '654321');
        await user.click(screen.getByRole('button', { name: 'Sign Up' }));

        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
        expect(mockSignupWithEmail).not.toHaveBeenCalled();
    });

    it('submits valid signup data and navigates to home', async () => {
        // Happy path: valid data should create account and continue.
        const user = userEvent.setup();
        mockSignupWithEmail.mockResolvedValueOnce({ uid: 'new-user' });
        renderPage();

        await user.type(screen.getByLabelText('Username'), 'alice');
        await user.type(screen.getByLabelText('Email'), 'alice@example.com');
        await user.type(screen.getByLabelText('Password'), '123456');
        await user.type(screen.getByLabelText('Confirm Password'), '123456');
        await user.click(screen.getByRole('button', { name: 'Sign Up' }));

        expect(mockSignupWithEmail).toHaveBeenCalledWith({
            username: 'alice',
            email: 'alice@example.com',
            password: '123456',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('shows mapped backend error when signup fails', async () => {
        // If backend rejects signup, user should still get a clear message.
        const user = userEvent.setup();
        const error = new Error('signup-fail');
        mockSignupWithEmail.mockRejectedValueOnce(error);
        mockMapAuthError.mockReturnValueOnce('This email is already in use.');
        renderPage();

        await user.type(screen.getByLabelText('Username'), 'alice');
        await user.type(screen.getByLabelText('Email'), 'alice@example.com');
        await user.type(screen.getByLabelText('Password'), '123456');
        await user.type(screen.getByLabelText('Confirm Password'), '123456');
        await user.click(screen.getByRole('button', { name: 'Sign Up' }));

        expect(mockMapAuthError).toHaveBeenCalledWith(error, 'signup');
        expect(screen.getByText('This email is already in use.')).toBeInTheDocument();
    });
});
