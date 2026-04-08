import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirebaseError } from 'firebase/app';

// We use fake versions of Firebase functions so tests stay fast and predictable.
const mockAuthInstance = { name: 'fake-auth' };
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockSignOut = vi.fn();
const mockGetAuthInstance = vi.fn(() => mockAuthInstance);

// Replace real Firebase auth calls with controllable fake functions.
vi.mock('firebase/auth', () => ({
    signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
    createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
    onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
    signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Replace local Firebase setup with a fake auth instance.
vi.mock('../../services/firebase', () => ({
    getAuthInstance: () => mockGetAuthInstance(),
}));

import {
    getStoredAccountRole,
    getStoredOrganizerNames,
    loginWithEmail,
    mapAuthError,
    onAuthUserChanged,
    signOutCurrentUser,
    signupWithEmail,
} from '../../services/auth';

describe('auth service', () => {
    beforeEach(() => {
        // Start each test with clean fake functions to avoid cross-test noise.
        mockSignInWithEmailAndPassword.mockReset();
        mockCreateUserWithEmailAndPassword.mockReset();
        mockUpdateProfile.mockReset();
        mockOnAuthStateChanged.mockReset();
        mockSignOut.mockReset();
        mockGetAuthInstance.mockClear();
        window.localStorage.clear();
    });

    it('logs in with email and password', async () => {
        // Checks normal login works and returns the same user object from Firebase.
        const fakeUser = { uid: 'user-1' };
        mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });

        const user = await loginWithEmail('user@example.com', 'secret123');

        expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(mockAuthInstance, 'user@example.com', 'secret123');
        expect(user).toBe(fakeUser);
    });

    it('passes through Firebase login errors', async () => {
        // Checks login errors are forwarded unchanged so UI can handle the real cause.
        const firebaseError = new FirebaseError('auth/wrong-password', 'Wrong password');
        mockSignInWithEmailAndPassword.mockRejectedValueOnce(firebaseError);

        await expect(loginWithEmail('user@example.com', 'wrong')).rejects.toBe(firebaseError);
    });

    it('signs up and stores display name when username is provided', async () => {
        // Checks signup trims the username and saves it as display name.
        const fakeUser = { uid: 'user-2' };
        mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });

        const user = await signupWithEmail({
            username: '  Alice  ',
            email: 'alice@example.com',
            password: 'secret123',
            role: 'organizer',
            organizerNames: ['UniEvent Core Team', 'DTU Campus Events'],
        });

        expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(mockAuthInstance, 'alice@example.com', 'secret123');
        expect(mockUpdateProfile).toHaveBeenCalledWith(fakeUser, { displayName: 'Alice' });
        expect(getStoredAccountRole('user-2')).toBe('organizer');
        expect(getStoredOrganizerNames('user-2')).toEqual(['UniEvent Core Team', 'DTU Campus Events']);
        expect(user).toBe(fakeUser);
    });

    it('passes through Firebase signup errors', async () => {
        // Checks signup errors from Firebase are passed through unchanged.
        const firebaseError = new FirebaseError('auth/email-already-in-use', 'Email already used');
        mockCreateUserWithEmailAndPassword.mockRejectedValueOnce(firebaseError);

        await expect(
            signupWithEmail({ username: 'Alice', email: 'alice@example.com', password: 'secret123' })
        ).rejects.toBe(firebaseError);
    });

    it('signs up without profile update when username is blank', async () => {
        // Checks blank usernames skip profile updates to avoid saving empty names.
        const fakeUser = { uid: 'user-3' };
        mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });

        await signupWithEmail({ username: '   ', email: 'blank@example.com', password: 'secret123' });

        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('fails signup if profile update fails', async () => {
        // Checks signup fails clearly if display name update fails after account creation.
        const fakeUser = { uid: 'user-4' };
        const updateError = new Error('update profile failed');
        mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });
        mockUpdateProfile.mockRejectedValueOnce(updateError);

        await expect(
            signupWithEmail({ username: 'Alice', email: 'alice@example.com', password: 'secret123' })
        ).rejects.toBe(updateError);
    });

    it('returns undefined if Firebase response has no user', async () => {
        // Checks unexpected Firebase responses do not crash the helper.
        mockSignInWithEmailAndPassword.mockResolvedValueOnce({});

        const user = await loginWithEmail('user@example.com', 'secret123');

        expect(user).toBeUndefined();
    });

    it('subscribes to auth state changes', () => {
        // Checks auth state listener is connected and returns an unsubscribe function.
        const callback = vi.fn();
        const unsubscribe = vi.fn();
        mockOnAuthStateChanged.mockReturnValueOnce(unsubscribe);

        const result = onAuthUserChanged(callback);

        expect(mockOnAuthStateChanged).toHaveBeenCalledWith(mockAuthInstance, callback);
        expect(result).toBe(unsubscribe);
    });

    it('signs out the current user', async () => {
        // Checks sign out request is forwarded to Firebase auth.
        await signOutCurrentUser();

        expect(mockSignOut).toHaveBeenCalledWith(mockAuthInstance);
    });

    it('maps invalid email differently for login and signup', () => {
        // Checks one Firebase error can map to different user messages by context.
        const err = new FirebaseError('auth/invalid-email', 'bad email');

        expect(mapAuthError(err, 'login')).toBe('Invalid email or password.');
        expect(mapAuthError(err, 'signup')).toBe('The email address is invalid.');
    });

    it('maps non-firebase errors to a safe fallback message', () => {
        // Checks unknown errors always become a safe, generic user message.
        expect(mapAuthError(new Error('random failure'))).toBe('Something went wrong. Please try again.');
    });

    it('keeps missing env errors readable for quick debugging', () => {
        // Checks setup errors stay readable so environment issues are easy to fix.
        const err = new Error('Missing Firebase env variables: VITE_FIREBASE_API_KEY');

        expect(mapAuthError(err)).toBe('Missing Firebase env variables: VITE_FIREBASE_API_KEY');
    });

    it('defaults to user role when no role is saved', () => {
        expect(getStoredAccountRole('unknown-user')).toBe('user');
    });

    it('defaults to no organizations when none are saved', () => {
        expect(getStoredOrganizerNames('unknown-user')).toEqual([]);
    });
});
