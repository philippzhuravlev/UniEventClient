const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';
const TOKEN_KEY = 'unievent_token';
const USER_KEY = 'unievent_user';
const REQUEST_TIMEOUT_MS = 30_000;

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

export type AccountRole = 'user' | 'organizer';

type SignupInput = {
    username: string;
    email: string;
    password: string;
    role?: AccountRole;
    organizerNames?: string[];
};

type RegisterWithKeyInput = {
    confirmationToken: string;
    username: string;
    password: string;
    email: string;
};

type AuthErrorContext = 'login' | 'signup' | 'organizer-key-verify' | 'organizer-key-register' | 'general';

type HttpError = Error & { status: number };

function createHttpError(status: number, message: string): HttpError {
    return Object.assign(new Error(message), { status });
}

// Module-level listener list for auth state subscriptions
const listeners: Array<(user: AuthUser | null) => void> = [];

function notifyListeners(user: AuthUser | null): void {
    listeners.forEach((cb) => cb(user));
}

function toStoredUser(user: AuthUser): Record<string, unknown> {
    return {
        username: user.username,
        email: user.email,
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        organizerNames: user.organizerNames,
    };
}

function persistUser(user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, user.token);
    localStorage.setItem(USER_KEY, JSON.stringify(toStoredUser(user)));
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
        const parsed = JSON.parse(raw) as {
            username?: string;
            email?: string;
            uid?: string;
            displayName?: string;
            photoURL?: string | null;
            role?: AccountRole;
            organizerNames?: string[];
        };

        if (!parsed.username || !parsed.email) {
            return null;
        }

        return {
            username: parsed.username,
            email: parsed.email,
            token,
            uid: parsed.uid ?? parsed.username,
            displayName: parsed.displayName ?? parsed.username,
            photoURL: parsed.photoURL,
            role: parsed.role,
            organizerNames: Array.isArray(parsed.organizerNames) ? [...parsed.organizerNames] : undefined,
        };
    } catch {
        return null;
    }
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw createHttpError(408, 'Request timed out. Please try again.');
        }
        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/login`, {
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

    const data = await response.json() as { token: string; username: string; email: string };
    const user: AuthUser = { token: data.token, username: data.username, email: data.email, uid: data.username, displayName: data.username };
    persistUser(user);
    notifyListeners(user);
    return user;
}

export async function signupWithEmail({ username, email, password, role, organizerNames }: SignupInput): Promise<AuthUser> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/register`, {
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

    const data = await response.json() as { token: string; username: string; email: string };
    const user: AuthUser = {
        token: data.token,
        username: data.username,
        email: data.email,
        uid: data.username,
        displayName: data.username,
        role,
        organizerNames: organizerNames ? [...organizerNames] : undefined,
    };
    persistUser(user);
    notifyListeners(user);
    return user;
}

export async function verifyOrganizerKey(key: string): Promise<{ confirmationToken: string; expiresIn: number; email: string }> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/organizer-key/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as Record<string, unknown>;
        throw createHttpError(
            response.status,
            (body['message'] as string | undefined) ?? response.statusText,
        );
    }

    return await response.json() as { confirmationToken: string; expiresIn: number; email: string };
}

export async function registerWithOrganizerKey({
    confirmationToken,
    username,
    password,
    email,
}: RegisterWithKeyInput): Promise<AuthUser> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/register-with-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationToken, username, password, email }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as Record<string, unknown>;
        throw createHttpError(
            response.status,
            (body['message'] as string | undefined) ?? response.statusText,
        );
    }

    const data = await response.json() as {
        accessToken?: string;
        token?: string;
        user?: { username?: string; email?: string; role?: AccountRole; id?: string };
        username?: string;
        email?: string;
    };

    const token = data.accessToken ?? data.token;
    const resolvedUsername = data.user?.username ?? data.username;
    const resolvedEmail = data.user?.email ?? data.email;

    if (!token || !resolvedUsername || !resolvedEmail) {
        throw createHttpError(500, 'Unexpected response from server.');
    }

    const user: AuthUser = {
        token,
        username: resolvedUsername,
        email: resolvedEmail,
        uid: data.user?.id ?? resolvedUsername,
        displayName: resolvedUsername,
        role: data.user?.role ?? 'organizer',
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

    const response = await fetchWithTimeout(`${BACKEND_URL}/api/auth/profile`, {
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

    const data = await response.json() as { role?: AccountRole; organizerNames?: string[] };
    const profile = {
        role: data.role ?? 'user',
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
        if (_context === 'organizer-key-verify') {
            if (e.status === 404) return 'This organizer key was not found.';
            if (e.status === 410) return 'This organizer key has already been used.';
            if (e.status === 401) return 'This organizer key has expired.';
            if (e.status === 400) return e.message ?? 'Please enter a valid organizer key.';
        }
        if (_context === 'organizer-key-register') {
            if (e.status === 401) return 'Your verification session has expired. Verify your key again.';
            if (e.status === 409) return e.message ?? 'Username or email is already registered.';
            if (e.status === 422) return 'This confirmation token has already been used.';
            if (e.status === 400) return e.message ?? 'Please check your input and try again.';
        }
        if (e.status === 401 || e.status === 403) {
            return 'Invalid email or password.';
        }
        if (e.status === 409 || (e.status !== undefined && e.message && e.message.toLowerCase().includes('already'))) {
            return e.message ?? 'Account already exists.';
        }
        if (e.status === 400) {
            return e.message ?? 'Invalid input. Please check your details.';
        }
        // Only surface the message when it came from our backend (has a known status code).
        if (e.status !== undefined && e.message) {
            return e.message;
        }
    }
    return 'Something went wrong. Please try again.';
}
