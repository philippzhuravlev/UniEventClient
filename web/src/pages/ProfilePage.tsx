import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { Footer } from '../components/Footer';
import { getStoredAccountRole, getStoredOrganizerNames, onAuthUserChanged, signOutCurrentUser, type AuthUser } from '../services/auth';
import { CalendarDays, CircleUserRound, Heart, LogOut, MapPin, Ticket } from 'lucide-react';

function buildUsername(user: AuthUser | null) {
    if (!user) return 'username';

    const emailLocalPart = user.email?.split('@')[0]?.trim();
    if (emailLocalPart) return emailLocalPart;

    const displayName = user.displayName?.trim();
    if (displayName) return displayName.toLowerCase().replace(/\s+/g, '.');

    return 'username';
}

export function ProfilePage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isSigningOut, setIsSigningOut] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthUserChanged((user) => {
            setCurrentUser(user);
            if (!user) {
                navigate('/login', { replace: true });
            }
        });

        return unsubscribe;
    }, [navigate]);

    async function handleSignOut() {
        try {
            setIsSigningOut(true);
            await signOutCurrentUser();
            navigate('/login', { replace: true });
        } finally {
            setIsSigningOut(false);
        }
    }

    const userLabel = currentUser?.displayName || currentUser?.email || 'Profile';
    const username = buildUsername(currentUser);
    const profileImage = currentUser?.photoURL;
    const accountRole = getStoredAccountRole(currentUser?.uid);
    const organizerNames = getStoredOrganizerNames(currentUser?.uid);

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
                        <h1 className="header-title">Profile</h1>
                        <p className="header-subtitle">View your account details</p>
                    </div>
                </div>

                <div className="header-toggle flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)] disabled:cursor-not-allowed disabled:opacity-70 sm:px-4 sm:text-sm"
                    >
                        <LogOut size={18} />
                        {isSigningOut ? 'Signing out...' : 'Log out'}
                    </button>
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 px-6 md:px-8 pb-12 max-w-6xl mx-auto w-full">
                <div className="space-y-6">
                    {/* Profile & Organizations Combined Section */}
                    <div className="grid grid-cols-1 gap-8 items-start">
                        {/* Profile Card with Organizations */}
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-lg">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                {/* Left Column: Avatar + User Info */}
                                <div className="lg:col-span-2">
                                    <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
                                        {/* Avatar */}
                                        <div className="relative flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--panel-bg)] bg-[#0f1020] p-0 shadow-lg">
                                            {profileImage ? (
                                                <img
                                                    src={profileImage}
                                                    alt={userLabel}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <CircleUserRound
                                                    aria-label="Default profile picture"
                                                    className="h-[88%] w-[88%] text-white"
                                                    strokeWidth={1.55}
                                                />
                                            )}
                                        </div>

                                        {/* User Info */}
                                        <div className="space-y-3 text-center lg:text-left flex-1">
                                            <div>
                                                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                                                    {username}
                                                </h2>
                                                <span className="mt-2 inline-flex items-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.09em] text-[var(--text-primary)]">
                                                    {accountRole === 'organizer' ? 'Organisor' : 'User'}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-base font-semibold text-[var(--text-primary)]">
                                                    {userLabel}
                                                </p>
                                                <p className="text-xs text-[var(--text-subtle)]">
                                                    {currentUser?.email || 'No email available'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Organizations Box */}
                                {accountRole === 'organizer' && (
                                    <div className="lg:col-span-1">
                                        <div className="rounded-lg border border-[var(--panel-border)] bg-[color-mix(in_srgb,var(--panel-bg)_72%,var(--input-bg)_28%)] p-5 shadow-sm h-fit">
                                            <div className="space-y-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)] text-center">
                                                    Organizations You Organize For
                                                </p>
                                                <div className="space-y-2">
                                                    {organizerNames.length ? organizerNames.map((organization) => (
                                                        <div
                                                            key={organization}
                                                            className="inline-flex items-center justify-center w-full rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/85 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                                        >
                                                            {organization}
                                                        </div>
                                                    )) : (
                                                        <p className="text-xs text-[var(--text-subtle)] text-center py-3">No organizations linked yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Back to Events Button */}
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)]"
                    >
                        Back to Events
                    </Link>
                </div>

                <section className="mx-auto mt-8 max-w-5xl rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 md:p-8 shadow-xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.25em] text-[var(--text-subtle)] uppercase">
                                Liked Events
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
                                Saved for later
                            </h3>
                            <p className="mt-2 max-w-2xl text-sm text-[var(--text-subtle)]">
                                This area is ready for liked events. We will connect real data here later.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)]"
                        >
                            <Heart size={16} />
                            Liked events
                        </button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[
                            { title: 'Event title will appear here', location: 'Venue or room', date: 'Date and time', badge: 'Liked event' },
                            { title: 'Another saved event', location: 'Campus location', date: 'Date and time', badge: 'Liked event' },
                            { title: 'Future liked event', location: 'Place holder', date: 'Date and time', badge: 'Liked event' },
                        ].map((item, index) => (
                            <article
                                key={index}
                                className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--input-bg)]"
                            >
                                <div className="h-36 bg-[linear-gradient(135deg,rgba(59,130,246,0.45),rgba(20,184,166,0.35))]" />
                                <div className="space-y-3 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                                            <Heart size={12} />
                                            {item.badge}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-subtle)]">
                                            <Ticket size={12} />
                                            Saved
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-bold text-[var(--text-primary)]">
                                        {item.title}
                                    </h4>
                                    <div className="space-y-2 text-sm text-[var(--text-subtle)]">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays size={14} />
                                            <span>{item.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} />
                                            <span>{item.location}</span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}