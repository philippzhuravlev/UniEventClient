import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { Footer } from '../components/Footer';
import { Facebook, LogIn, UserPlus } from 'lucide-react';
import '../styles/LoginPage.css';

export function LoginPage() {
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
                        <p className="header-subtitle">Join DTU Events and personalize your event flow</p>
                    </div>
                </div>

                <div className="header-toggle">
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 px-6 md:px-8 pb-8 max-w-6xl mx-auto w-full">
                <section className="login-shell">
                    <div className="login-card">
                        <div className="login-card-glow" aria-hidden="true" />

                        <div className="login-card-content">
                            <p className="login-eyebrow">AUTHENTICATION</p>
                            <h2 className="login-title">Sign in to your account</h2>
                            <p className="login-description">Enter your username and password to continue.</p>
                            <p className="login-helper">No account yet? Use Sign Up or Sign Up / Log In with Facebook.</p>

                            <form className="login-form" onSubmit={(e) => e.preventDefault()}>
                                <label className="login-label" htmlFor="username">Username</label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Enter your username"
                                    className="login-input"
                                />

                                <label className="login-label" htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="login-input"
                                />

                                <div className="login-actions">
                                    <button type="button" className="login-btn login-btn-primary">
                                        <LogIn size={18} />
                                        Sign In
                                    </button>

                                    <Link to="/signup" className="login-btn login-btn-secondary">
                                        <UserPlus size={18} />
                                        Sign Up
                                    </Link>

                                    <button type="button" className="login-btn login-btn-facebook">
                                        <Facebook size={22} strokeWidth={2.35} />
                                        Sign Up / Log In with Facebook
                                    </button>
                                </div>
                            </form>

                            <div className="login-back-row">
                                <Link to="/" className="login-back-link">← Back to Events</Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
