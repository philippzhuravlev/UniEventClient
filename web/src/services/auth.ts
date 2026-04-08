import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile, type User } from 'firebase/auth';
import { getAuthInstance } from './firebase';

export type AuthUser = User;
type AuthErrorContext = 'login' | 'signup' | 'general';
export type AccountRole = 'user' | 'organizer';

const ACCOUNT_ROLE_STORAGE_KEY = 'unievent.accountRoles';
const ORGANIZER_NAMES_STORAGE_KEY = 'unievent.organizerNames';

type SignupInput = {
    username: string;
    email: string;
    password: string;
    role?: AccountRole;
    organizerNames?: string[];
};

function readStoredRoleMap(): Record<string, AccountRole> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(ACCOUNT_ROLE_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed as Record<string, AccountRole>;
        }
    } catch {
        // Ignore malformed local storage data and fall back to empty map.
    }

    return {};
}

function persistRoleMap(roleMap: Record<string, AccountRole>) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(ACCOUNT_ROLE_STORAGE_KEY, JSON.stringify(roleMap));
}

function readStoredOrganizerNamesMap(): Record<string, string[]> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(ORGANIZER_NAMES_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed as Record<string, string[]>;
        }
    } catch {
        // Ignore malformed local storage data and fall back to empty map.
    }

    return {};
}

function persistOrganizerNamesMap(nameMap: Record<string, string[]>) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(ORGANIZER_NAMES_STORAGE_KEY, JSON.stringify(nameMap));
}

function saveOrganizerNames(uid: string, organizerNames: string[]) {
    const current = readStoredOrganizerNamesMap();
    current[uid] = organizerNames;
    persistOrganizerNamesMap(current);
}

function saveAccountRole(uid: string, role: AccountRole) {
    const current = readStoredRoleMap();
    current[uid] = role;
    persistRoleMap(current);
}

export function getStoredAccountRole(uid: string | null | undefined): AccountRole {
    if (!uid) {
        return 'user';
    }

    const role = readStoredRoleMap()[uid];
    return role === 'organizer' ? 'organizer' : 'user';
}

export function getStoredOrganizerNames(uid: string | null | undefined): string[] {
    if (!uid) {
        return [];
    }

    const organizerNames = readStoredOrganizerNamesMap()[uid];
    if (!Array.isArray(organizerNames)) {
        return [];
    }

    return organizerNames
        .map((name) => name?.trim())
        .filter((name): name is string => !!name);
}

export async function loginWithEmail(email: string, password: string) {
    const auth = getAuthInstance();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
}

export async function signupWithEmail({ username, email, password, role = 'user', organizerNames = [] }: SignupInput) {
    const auth = getAuthInstance();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const trimmedUsername = username.trim();

    if (trimmedUsername) {
        await updateProfile(credential.user, { displayName: trimmedUsername });
    }

    if (credential.user?.uid) {
        saveAccountRole(credential.user.uid, role);

        if (role === 'organizer') {
            saveOrganizerNames(credential.user.uid, organizerNames);
        } else {
            saveOrganizerNames(credential.user.uid, []);
        }
    }

    return credential.user;
}

export function onAuthUserChanged(callback: (user: AuthUser | null) => void) {
    const auth = getAuthInstance();
    return onAuthStateChanged(auth, callback);
}

export async function signOutCurrentUser() {
    const auth = getAuthInstance();
    await signOut(auth);
}

export function mapAuthError(error: unknown, context: AuthErrorContext = 'general'): string {
    if (error instanceof Error && error.message.includes('Missing Firebase env variables:')) {
        return error.message;
    }

    if (error instanceof Error && error.message.includes('auth/invalid-api-key')) {
        return 'Firebase Auth is not configured correctly (invalid API key).';
    }

    if (!(error instanceof FirebaseError)) {
        return 'Something went wrong. Please try again.';
    }

    switch (error.code) {
        case 'auth/operation-not-allowed':
            return 'Email/password sign-in is disabled in Firebase Authentication. Enable it in Firebase Console -> Authentication -> Sign-in method.';
        case 'auth/configuration-not-found':
            return 'Authentication provider configuration is missing in Firebase Console.';
        case 'auth/invalid-email':
            if (context === 'login') {
                return 'Invalid email or password.';
            }
            return 'The email address is invalid.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'This email is already in use.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait and try again.';
        case 'auth/network-request-failed':
            return 'Network error. Check your connection and try again.';
        case 'auth/admin-restricted-operation':
            return 'This operation is restricted by Firebase project settings.';
        case 'auth/unauthorized-domain':
            return 'Current domain is not authorized for Firebase Auth. Add localhost in Firebase Console -> Authentication -> Settings -> Authorized domains.';
        default:
            return `Authentication failed (${error.code}). Please verify Firebase Authentication settings.`;
    }
}
