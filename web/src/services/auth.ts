const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';
const TOKEN_KEY = 'unievent_token';
const USER_KEY = 'unievent_user';

import { sanitizeErrorMessage } from '../utils/securityUtils';
import type {
    GenerateOrganizerKeyRequest,
    GenerateOrganizerKeyResponse,
    OrganizerKeyRequestData,
    OrganizerKeyRequestResponse,
    OrganizerKeyVerifyResponse,
    OrganizerRegisterWithKeyRequest,
} from '../types';

export type AuthUser = {
    username: string;
    email: string;
    token: string;
    uid?: string;
    displayName?: string;
    photoURL?: string | null;
    role?: AccountRole;
    organizerNames?: string[];
};

export type AccountRole = 'user' | 'organizer' | 'admin';
function normalizeAccountRole(role: unknown): AccountRole {
    if (typeof role !== 'string') {
        return 'user';
    }

    const normalizedRole = role.trim().toLowerCase();
    if (normalizedRole === 'organizer') {
        return 'organizer';
    }

    if (normalizedRole === 'admin') {
        return 'admin';
    }

    return 'user';
}

type SignupInput = {
    username: string;
    email: string;
    password: string;
    role?: AccountRole;
    organizerNames?: string[];
};

type AuthErrorContext = 'login' | 'signup' | 'general';

type HttpError = Error & { status: number };

function createHttpError(status: number, message: string): HttpError {
    return Object.assign(new Error(message), { status });
}

// Module-level listener list for auth state subscriptions
const listeners: Array<(user: AuthUser | null) => void> = [];

function notifyListeners(user: AuthUser | null): void {
    listeners.forEach((cb) => cb(user));
}

function persistUser(user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, user.token);
    localStorage.setItem(USER_KEY, JSON.stringify({ username: user.username, email: user.email, role: user.role }));
}

function clearUser(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getCurrentUser(): AuthUser | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;
    try {
        const { username, email, role } = JSON.parse(raw) as { username: string; email: string; role?: AccountRole };
        return { username, email, token, uid: username, displayName: username, role: role ?? 'user' };
    } catch {
        return null;
    }
}

export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as Record<string, unknown>;
        throw createHttpError(
            response.status,
            (body['message'] as string | undefined) ?? response.statusText,
        );
    }

    const data = await response.json() as { token: string; username: string; email: string; role: string };
    const user: AuthUser = { token: data.token, username: data.username, email: data.email, uid: data.username, displayName: data.username, role: normalizeAccountRole(data.role) };
    persistUser(user);
    notifyListeners(user);
    return user;
}

export async function signupWithEmail({ username, email, password, role, organizerNames }: SignupInput): Promise<AuthUser> {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role, organizerNames }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as Record<string, unknown>;
        throw createHttpError(
            response.status,
            (body['message'] as string | undefined) ?? response.statusText,
        );
    }

    const data = await response.json() as { token: string; username: string; email: string; role: string };
    const user: AuthUser = {
        token: data.token,
        username: data.username,
        email: data.email,
        uid: data.username,
        displayName: data.username,
        role: normalizeAccountRole(data.role),
    };
    persistUser(user);
    notifyListeners(user);
    return user;
}

export function onAuthUserChanged(callback: (user: AuthUser | null) => void): () => void {
    listeners.push(callback);
    // fire immediately with current state
    callback(getCurrentUser());
    return () => {
        const idx = listeners.indexOf(callback);
        if (idx !== -1) listeners.splice(idx, 1);
    };
}

export async function signOutCurrentUser(): Promise<void> {
    clearUser();
    notifyListeners(null);
}

export function getStoredAccountRole(uid: string): AccountRole {
    const user = getCurrentUser();
    if (!user || (uid && user.uid !== uid)) {
        return 'user';
    }
    return user.role ?? 'user';
}

export function getStoredOrganizerNames(uid: string): string[] {
    const user = getCurrentUser();
    if (!user || (uid && user.uid !== uid)) {
        return [];
    }
    return Array.isArray(user.organizerNames) ? [...user.organizerNames] : [];
}

export async function getAccountProfile(uid?: string): Promise<{ role: AccountRole; organizerNames: string[] }> {
    const user = getCurrentUser();
    if (!user || !user.token || (uid && user.uid !== uid)) {
        return { role: 'user', organizerNames: [] };
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
        },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as Record<string, unknown>;
        const message = (body['message'] as string | undefined) ?? response.statusText;
        throw createHttpError(response.status, message);
    }

    const data = await response.json() as { role?: string; organizerNames?: string[] };
    const profile = {
        role: normalizeAccountRole(data.role),
        organizerNames: Array.isArray(data.organizerNames) ? data.organizerNames : [],
    };

    const updatedUser: AuthUser = {
        ...user,
        role: profile.role,
        organizerNames: [...profile.organizerNames],
    };
    persistUser(updatedUser);
    notifyListeners(updatedUser);

    return profile;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mapAuthError(error: unknown, _context?: AuthErrorContext): string {
    if (error && typeof error === 'object') {
        const e = error as { status?: number; message?: string };
        if (e.status === 401 || e.status === 403) {
            return 'Invalid email or password.';
        }
        if (e.status === 409 || (e.status !== undefined && e.message && e.message.toLowerCase().includes('already'))) {
            return sanitizeErrorMessage(e.message ?? 'Account already exists.');
        }
        if (e.status === 400) {
            return sanitizeErrorMessage(e.message ?? 'Invalid input. Please check your details.');
        }
        // Only surface the message when it came from our backend (has a known status code).
        if (e.status !== undefined && e.message) {
            return sanitizeErrorMessage(e.message);
        }
    }
    return 'Something went wrong. Please try again.';
}

/**
 * Verify an organizer invitation key and receive a confirmation token
 * Used in Step 1 of organizer registration flow
 *
 * @param key - The organizer key (32-char alphanumeric string)
 * @returns Promise resolving to verification response with confirmation token
 * @throws HttpError with status 404, 410, or 401 for various failure cases
 */
export async function verifyOrganizerKey(key: string): Promise<OrganizerKeyVerifyResponse> {
    const response = await fetch(`${BACKEND_URL}/api/auth/organizer-key/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
    });

    if (!response.ok) {
        const message = await response.text();
        throw createHttpError(response.status, message);
    }

    return response.json() as Promise<OrganizerKeyVerifyResponse>;
}

/**
 * Complete organizer registration using confirmation token from key verification
 * Used in Step 2 of organizer registration flow
 *
 * @param data - Registration request with confirmation token, username, password, email
 * @returns Promise resolving to AuthUser (with tokens, role='organizer')
 * @throws HttpError with status 401, 409, or 422 for various failure cases
 */
export async function registerOrganizerWithKey(
    data: OrganizerRegisterWithKeyRequest
): Promise<AuthUser> {
    const response = await fetch(`${BACKEND_URL}/api/auth/register-with-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const message = await response.text();
        throw createHttpError(response.status, message);
    }

    const user: AuthUser = await response.json() as AuthUser;
    persistUser(user);
    notifyListeners(user);
    return user;
}

/**
 * Map HTTP errors to user-friendly messages for organizer key endpoints
 * Sanitizes all messages to prevent XSS attacks
 */
export function mapOrganizerKeyError(error: unknown): string {
    if (!(error instanceof Error) || !('status' in error)) {
        return 'Something went wrong. Please try again.';
    }

    const httpError = error as Error & { status: number };
    const message = (httpError.message || '').toLowerCase();

    // Verify endpoint errors
    if (httpError.status === 404) {
        return sanitizeErrorMessage('Organizer key not found. Please check and try again.');
    }
    if (httpError.status === 410) {
        return sanitizeErrorMessage('This organizer key has already been used.');
    }
    if (httpError.status === 401 && message.includes('expired')) {
        return sanitizeErrorMessage('Organizer key has expired. Please request a new one.');
    }

    // Registration endpoint errors
    if (httpError.status === 409 && message.includes('username')) {
        return sanitizeErrorMessage('This username is already taken. Please choose another.');
    }
    if (httpError.status === 409 && message.includes('email')) {
        return sanitizeErrorMessage('This email is already registered.');
    }
    if (httpError.status === 401 && message.includes('token')) {
        return sanitizeErrorMessage('Confirmation token is invalid or expired. Please verify the key again.');
    }
    if (httpError.status === 422) {
        return sanitizeErrorMessage('This confirmation link has already been used. Please verify the key again.');
    }

    // Fallback to existing mapAuthError for other cases
    return mapAuthError(error);
}

export async function submitOrganizerKeyRequest(
    data: OrganizerKeyRequestData,
): Promise<OrganizerKeyRequestResponse> {
    const response = await fetch(`${BACKEND_URL}/api/auth/organizer-key-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const message = await response.text();
        throw createHttpError(response.status, message);
    }

    return response.json() as Promise<OrganizerKeyRequestResponse>;
}

export function mapOrganizerKeyRequestError(error: unknown): string {
    if (!(error instanceof Error) || !('status' in error)) {
        return 'Unable to submit your request right now. Please try again.';
    }

    const httpError = error as Error & { status: number };

    if (httpError.status === 400) {
        return sanitizeErrorMessage('Please check the form fields and try again.');
    }
    if (httpError.status === 409) {
        return sanitizeErrorMessage('A request with this email is already pending.');
    }
    if (httpError.status === 429) {
        return sanitizeErrorMessage('Too many requests. Please wait and try again later.');
    }

    return mapAuthError(error);
}

/**
 * Generate a new organizer invitation key and send it by email
 * Admin-only endpoint
 */
export async function generateOrganizerKey(
    data: GenerateOrganizerKeyRequest,
): Promise<GenerateOrganizerKeyResponse> {
    const token = getAuthToken();
    if (!token) {
        throw createHttpError(401, 'Not authenticated');
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/organizer-key/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const message = await response.text();
        throw createHttpError(response.status, message);
    }

    return response.json() as Promise<GenerateOrganizerKeyResponse>;
}

/**
 * Map HTTP errors to user-friendly messages for admin organizer key generation
 */
export function mapAdminKeyError(error: unknown): string {
    if (!(error instanceof Error) || !('status' in error)) {
        return sanitizeErrorMessage('Something went wrong. Please try again.');
    }

    const httpError = error as Error & { status: number };
    const message = (httpError.message || '').toLowerCase();

    if (httpError.status === 401) {
        return sanitizeErrorMessage('You are not logged in. Please log in to continue.');
    }
    if (httpError.status === 403) {
        return sanitizeErrorMessage('You do not have permission to generate invitation keys. Admin role required.');
    }
    if (httpError.status === 400) {
        if (message.includes('email')) {
            return sanitizeErrorMessage('Please enter a valid email address.');
        }
        return sanitizeErrorMessage('Invalid input. Please check your details.');
    }
    if (httpError.status === 409 && message.includes('registered')) {
        return sanitizeErrorMessage('This email is already registered. Please use a different email.');
    }
    if (httpError.status === 500 && message.includes('email')) {
        return sanitizeErrorMessage('Failed to send invitation email. Please try again later.');
    }
    if (httpError.status === 500) {
        return sanitizeErrorMessage('Server error. Please try again later.');
    }

    return sanitizeErrorMessage('An unexpected error occurred. Please try again.');
}