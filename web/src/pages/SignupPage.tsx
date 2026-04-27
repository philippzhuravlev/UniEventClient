import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { HeaderLogoLink } from '../components/HeaderLogoLink';
import { ThemeToggle } from '../components/ThemeToggle';
import { Footer } from '../components/Footer';
import { UserPlus } from 'lucide-react';
import { mapAuthError, signupWithEmail } from '../services/auth';
import '../styles/SignupPage.css';

export function SignupPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    function isValidEmail(value: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage('');

        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim();

        if (!trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
            setErrorMessage('Please fill in all fields.');
            return;
        }

        if (!isValidEmail(trimmedEmail)) {
            setErrorMessage('Please provide a valid email address.');
            return;
        }

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        try {
            setIsLoading(true);
            await signupWithEmail({ 
                username: trimmedUsername, 
                email: trimmedEmail, 
                password, 
                role: 'user'
            });
            navigate('/', { replace: true });
        } catch (error) {
            setErrorMessage(mapAuthError(error, 'signup'));
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
                        <h1 className="header-title">Create Your Account</h1>
                        <p className="header-subtitle">Sign up to save your preferences and discover events faster</p>
                    </div>
                </div>

                <div className="header-toggle">
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 px-6 md:px-8 pb-8 max-w-6xl mx-auto w-full">
                <section className="signup-shell">
                    <div className="signup-card">
                        <div className="signup-card-glow" aria-hidden="true" />

                        <div className="signup-card-content">
                            <p className="signup-eyebrow">NEW ACCOUNT</p>
                            <h2 className="signup-title">Sign up to get started</h2>
                            <p className="signup-description">Create your account with a username and password.</p>
                            <p className="signup-helper">Already have an account? Log in from the link below.</p>

                            <form className="signup-form" onSubmit={handleSubmit} noValidate>
                                <label className="signup-label" htmlFor="signup-username">Username</label>
                                <input
                                    id="signup-username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Choose a username"
                                    className="signup-input"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                />

                                <label className="signup-label" htmlFor="signup-email">Email</label>
                                <input
                                    id="signup-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="Enter your email"
                                    className="signup-input"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                />

                                <label className="signup-label" htmlFor="signup-password">Password</label>
                                <input
                                    id="signup-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Create a password"
                                    className="signup-input"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                />

                                <label className="signup-label" htmlFor="signup-confirm-password">Confirm Password</label>
                                <input
                                    id="signup-confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Type your password again"
                                    className="signup-input"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                />

                                {errorMessage && <p className="signup-status signup-status-error">{errorMessage}</p>}

                                <div className="signup-actions">
                                    <button type="submit" className="signup-btn signup-btn-primary" disabled={isLoading}>
                                        <UserPlus size={18} />
                                        {isLoading ? 'Signing Up...' : 'Sign Up'}
                                    </button>
                                </div>
                            </form>

                            <div className="signup-links-row">
                                <Link to="/login" className="signup-link">Already have an account? Log In</Link>
                                <Link to="/organizer/onboarding" className="signup-link">Want to become an organizer?</Link>
                                <Link to="/" className="signup-link">← Back to Events</Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
