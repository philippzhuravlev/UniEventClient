import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { Footer } from '../components/Footer';
import { Facebook, UserPlus } from 'lucide-react';
import '../styles/SignupPage.css';

export function SignupPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="page-header mx-6 md:mx-8 mt-4 md:mt-6 mb-8">
                <div className="header-content">
                    <img
                        src="https://firebasestorage.googleapis.com/v0/b/dtuevent-8105b.firebasestorage.app/o/picture%2Fdtulogo.png?alt=media&token=7e86de6e-f1f4-471d-8354-70ad70bafe14"
                        alt="DTU Logo"
                        className="header-logo"
                    />
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

                            <form className="signup-form" onSubmit={(e) => e.preventDefault()}>
                                <label className="signup-label" htmlFor="signup-username">Username</label>
                                <input
                                    id="signup-username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Choose a username"
                                    className="signup-input"
                                />

                                <label className="signup-label" htmlFor="signup-password">Password</label>
                                <input
                                    id="signup-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Create a password"
                                    className="signup-input"
                                />

                                <label className="signup-label" htmlFor="signup-confirm-password">Confirm Password</label>
                                <input
                                    id="signup-confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Type your password again"
                                    className="signup-input"
                                />

                                <div className="signup-actions">
                                    <button type="button" className="signup-btn signup-btn-primary">
                                        <UserPlus size={18} />
                                        Sign Up
                                    </button>

                                    <button type="button" className="signup-btn signup-btn-facebook">
                                        <Facebook size={22} strokeWidth={2.35} />
                                        Sign Up with Facebook
                                    </button>
                                </div>
                            </form>

                            <div className="signup-links-row">
                                <Link to="/login" className="signup-link">Already have an account? Log In</Link>
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
