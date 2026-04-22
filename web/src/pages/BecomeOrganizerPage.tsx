import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { HeaderLogoLink } from '../components/HeaderLogoLink';
import { ThemeToggle } from '../components/ThemeToggle';
import { ArrowRight, KeyRound } from 'lucide-react';
import { mapAuthError, verifyOrganizerKey } from '../services/auth';
import '../styles/BecomeOrganizerPage.css';

export function BecomeOrganizerPage() {
    const navigate = useNavigate();
    const [inviteKey, setInviteKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage('');

        const trimmedKey = inviteKey.trim();
        if (!trimmedKey) {
            setErrorMessage('Please enter your organizer key.');
            return;
        }

        if (trimmedKey.length < 16) {
            setErrorMessage('Organizer key looks too short. Please check and try again.');
            return;
        }

        try {
            setIsLoading(true);
            const result = await verifyOrganizerKey(trimmedKey);
            navigate('/organizer-register', {
                state: {
                    confirmationToken: result.confirmationToken,
                    email: result.email,
                    expiresIn: result.expiresIn,
                },
            });
        } catch (error) {
            setErrorMessage(mapAuthError(error, 'organizer-key-verify'));
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
                        <h1 className="header-title">Become an Organizer</h1>
                        <p className="header-subtitle">Verify your organizer key to continue registration</p>
                    </div>
                </div>

                <div className="header-toggle">
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 px-6 md:px-8 pb-8 max-w-6xl mx-auto w-full">
                <section className="organizer-request-shell">
                    <article className="organizer-request-card">
                        <div className="organizer-request-glow" aria-hidden="true" />

                        <div className="organizer-request-content">
                            <p className="organizer-request-eyebrow">ORGANIZER ACCESS</p>
                            <h2 className="organizer-request-title">How to become an organizer</h2>
                            <p className="organizer-request-text">
                                You can become an organizer by getting a single-use key from an admin.
                            </p>
                            <p className="organizer-request-text">
                                Write us a mail: <a href="mailto:s245915@dtu.dk" className="organizer-request-mail">s245915@dtu.dk</a>
                            </p>
                            <p className="organizer-request-text">
                                When you are an organizer, you can connect to your Facebook page and get events directly from Facebook, or make events manually.
                            </p>

                            <div className="organizer-code-panel">
                                <h3 className="organizer-code-title">Do you have a code already?</h3>
                                <p className="organizer-code-help">Enter your key to verify it, then create your organizer account.</p>

                                <form className="organizer-code-form" onSubmit={handleSubmit} noValidate>
                                    <label htmlFor="organizer-code" className="organizer-code-label">Organizer Code</label>
                                    <input
                                        id="organizer-code"
                                        type="text"
                                        className="organizer-code-input"
                                        placeholder="Enter organizer code"
                                        autoComplete="off"
                                        value={inviteKey}
                                        onChange={(event) => setInviteKey(event.target.value)}
                                        disabled={isLoading}
                                    />

                                    {errorMessage && <p className="organizer-code-status organizer-code-status-error">{errorMessage}</p>}

                                    <button type="submit" className="organizer-code-button" disabled={isLoading}>
                                        <KeyRound size={18} />
                                        {isLoading ? 'Verifying...' : 'Verify Key'}
                                    </button>
                                </form>

                                <p className="organizer-code-note">
                                    <ArrowRight size={16} />
                                    After verification, you will continue to account creation.
                                </p>
                            </div>

                            <div className="organizer-request-links">
                                <Link to="/signup" className="organizer-request-link">Back to Sign Up</Link>
                                <Link to="/" className="organizer-request-link">Back to Events</Link>
                            </div>
                        </div>
                    </article>
                </section>
            </main>

            <Footer />
        </div>
    );
}