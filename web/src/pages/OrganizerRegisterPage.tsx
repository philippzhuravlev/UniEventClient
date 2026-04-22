import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { HeaderLogoLink } from '../components/HeaderLogoLink';
import { ThemeToggle } from '../components/ThemeToggle';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { mapAuthError, registerWithOrganizerKey } from '../services/auth';
import '../styles/OrganizerRegisterPage.css';

type OrganizerRegisterState = {
    confirmationToken: string;
    email: string;
    expiresIn?: number;
};

function isValidUsername(username: string): boolean {
    return /^[A-Za-z0-9_-]{3,50}$/.test(username);
}

function isStrongPassword(password: string): boolean {
    if (password.length < 12 || password.length > 100) {
        return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

export function OrganizerRegisterPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const flowState = location.state as OrganizerRegisterState | null;
    const confirmationToken = flowState?.confirmationToken?.trim() ?? '';
    const emailFromKey = flowState?.email?.trim() ?? '';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const expiryMinutes = useMemo(() => {
        if (!flowState?.expiresIn || flowState.expiresIn <= 0) {
            return null;
        }
        return Math.max(1, Math.floor(flowState.expiresIn / 60));
    }, [flowState?.expiresIn]);

    if (!confirmationToken || !emailFromKey) {
        return <Navigate to="/become-organizer" replace />;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage('');

        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password || !confirmPassword) {
            setErrorMessage('Please fill in all fields.');
            return;
        }

        if (!isValidUsername(trimmedUsername)) {
            setErrorMessage('Username must be 3-50 characters and use only letters, numbers, _ or -.');
            return;
        }

        if (!isStrongPassword(password)) {
            setErrorMessage('Password must be 12-100 chars and include uppercase, lowercase, number, and special character.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        try {
            setIsLoading(true);
            await registerWithOrganizerKey({
                confirmationToken,
                username: trimmedUsername,
                password,
                email: emailFromKey,
            });
            navigate('/', { replace: true });
        } catch (error) {
            setErrorMessage(mapAuthError(error, 'organizer-key-register'));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            <header className="page-header mx-6 md:mx-8 mt-4 md:mt-6 mb-8">
                <div className="header-content">
                    <HeaderLogoLink />
                    <div className="header-text">
                        <h1 className="header-title">Organizer Registration</h1>
                        <p className="header-subtitle">Step 2: Create your organizer account</p>
                    </div>
                </div>

                <div className="header-toggle">
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 px-6 md:px-8 pb-8 max-w-6xl mx-auto w-full">
                <section className="organizer-register-shell">
                    <div className="organizer-register-card">
                        <div className="organizer-register-card-glow" aria-hidden="true" />

                        <div className="organizer-register-card-content">
                            <p className="organizer-register-eyebrow">ORGANIZER ACCESS</p>
                            <h2 className="organizer-register-title">Create your account</h2>
                            <p className="organizer-register-description">
                                Your key is verified. Complete account setup to activate organizer tools.
                            </p>
                            {expiryMinutes && (
                                <p className="organizer-register-helper">
                                    Confirmation session expires in about {expiryMinutes} minute{expiryMinutes === 1 ? '' : 's'}.
                                </p>
                            )}

                            <form className="organizer-register-form" onSubmit={handleSubmit} noValidate>
                                <label className="organizer-register-label" htmlFor="organizer-email">Verified Email</label>
                                <input
                                    id="organizer-email"
                                    type="email"
                                    className="organizer-register-input organizer-register-input-readonly"
                                    value={emailFromKey}
                                    readOnly
                                />

                                <label className="organizer-register-label" htmlFor="organizer-username">Username</label>
                                <input
                                    id="organizer-username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Choose a username"
                                    className="organizer-register-input"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    disabled={isLoading}
                                />

                                <label className="organizer-register-label" htmlFor="organizer-password">Password</label>
                                <input
                                    id="organizer-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Create a secure password"
                                    className="organizer-register-input"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    disabled={isLoading}
                                />

                                <label className="organizer-register-label" htmlFor="organizer-confirm-password">Confirm Password</label>
                                <input
                                    id="organizer-confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Re-enter your password"
                                    className="organizer-register-input"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    disabled={isLoading}
                                />

                                <p className="organizer-register-password-hint">
                                    Use 12+ characters including uppercase, lowercase, number, and special character.
                                </p>

                                {errorMessage && (
                                    <p className="organizer-register-status organizer-register-status-error">{errorMessage}</p>
                                )}

                                <div className="organizer-register-actions">
                                    <button
                                        type="submit"
                                        className="organizer-register-btn organizer-register-btn-primary"
                                        disabled={isLoading}
                                    >
                                        <ShieldCheck size={18} />
                                        {isLoading ? 'Creating Account...' : 'Create Organizer Account'}
                                    </button>

                                    <Link to="/become-organizer" className="organizer-register-btn organizer-register-btn-secondary">
                                        <UserPlus size={18} />
                                        Verify Another Key
                                    </Link>
                                </div>
                            </form>

                            <div className="organizer-register-links-row">
                                <Link to="/login" className="organizer-register-link">Already have an account? Log In</Link>
                                <Link to="/" className="organizer-register-link">Back to Events</Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
