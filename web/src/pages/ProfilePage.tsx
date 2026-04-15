import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeaderLogoLink } from '../components/HeaderLogoLink';
import { ThemeToggle } from '../components/ThemeToggle';
import { Footer } from '../components/Footer';
import { getAccountProfile, onAuthUserChanged, signOutCurrentUser, type AccountRole, type AuthUser } from '../services/auth';
import { buildFacebookLoginUrl } from '../services/facebook';
import { getEvents } from '../services/dal';
import { getLikedEventIdsAsync, LIKES_CHANGED_EVENT } from '../services/likes';
import { formatEventStart } from '../utils/eventUtils';
import type { Event as EventType } from '../types';
import { LikeButton } from '../components/LikeButton';
import { CalendarDays, CircleUserRound, Heart, LogOut, MapPin, Ticket } from 'lucide-react';

function buildUsername(user: AuthUser | null) {
    if (!user) return 'username';

    const emailLocalPart = user.email?.split('@')[0]?.trim();
    if (emailLocalPart) return emailLocalPart;

    const displayName = user.displayName?.trim();
    if (displayName) return displayName.toLowerCase().replace(/\s+/g, '.');

    return 'username';
}

function filterAndSortLikedEvents(events: EventType[], likedEventIds: string[]) {
    const likedEventIdSet = new Set(likedEventIds);

    return events
        .filter((event) => likedEventIdSet.has(event.id))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export function ProfilePage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [accountRole, setAccountRole] = useState<AccountRole>('user');
    const [organizerNames, setOrganizerNames] = useState<string[]>([]);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [allEvents, setAllEvents] = useState<EventType[]>([]);
    const [likedEvents, setLikedEvents] = useState<EventType[]>([]);
    const [isLoadingLikedEvents, setIsLoadingLikedEvents] = useState(true);

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

    useEffect(() => {
        let cancelled = false;

        const loadAccountProfile = async () => {
            const profile = await getAccountProfile(currentUser?.uid);
            if (cancelled) {
                return;
            }

            setAccountRole(profile.role);
            setOrganizerNames(profile.organizerNames);
        };

        void loadAccountProfile();

        return () => {
            cancelled = true;
        };
    }, [currentUser?.uid]);

    useEffect(() => {
        let cancelled = false;

        const loadEvents = async () => {
            if (!currentUser?.uid) {
                setAllEvents([]);
                setLikedEvents([]);
                setIsLoadingLikedEvents(false);
                return;
            }

            setIsLoadingLikedEvents(true);

            try {
                const events = await getEvents();
                const likedEventIds = await getLikedEventIdsAsync(currentUser.uid);

                if (cancelled) {
                    return;
                }

                setAllEvents(events);
                setLikedEvents(filterAndSortLikedEvents(events, likedEventIds));
            } finally {
                if (!cancelled) {
                    setIsLoadingLikedEvents(false);
                }
            }
        };

        void loadEvents();

        return () => {
            cancelled = true;
        };
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!currentUser?.uid) {
            return;
        }

        let cancelled = false;

        const syncLikedEvents = async () => {
            const likedEventIds = await getLikedEventIdsAsync(currentUser.uid);
            if (!cancelled) {
                setLikedEvents(filterAndSortLikedEvents(allEvents, likedEventIds));
            }
        };

        void syncLikedEvents();
        const handleLikesChanged = () => {
            void syncLikedEvents();
        };
        window.addEventListener(LIKES_CHANGED_EVENT, handleLikesChanged);

        return () => {
            cancelled = true;
            window.removeEventListener(LIKES_CHANGED_EVENT, handleLikesChanged);
        };
    }, [allEvents, currentUser?.uid]);

    return (
        <div className="min-h-screen flex flex-col">
            <header className="page-header mx-6 md:mx-8 mt-4 md:mt-6 mb-8">
                <div className="header-content">
                    <HeaderLogoLink />
                    <div className="header-text profile-header-text">
                        <h1 className="header-title">Profile</h1>
                        <p className="header-subtitle">View your account details</p>
                    </div>
                </div>

                <div className="header-toggle relative flex flex-col md:flex-row items-end md:items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        aria-label="Log out"
                        className="profile-header-logout-btn inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)] disabled:cursor-not-allowed disabled:opacity-70 sm:px-4 sm:text-sm"
                    >
                        <LogOut size={18} />
                        <span className="profile-header-logout-label">
                            {isSigningOut ? 'Signing out...' : 'Log out'}
                        </span>
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

                </div>

                {accountRole === 'organizer' && (
                    <section className="mt-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-lg">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                                    Facebook Integration
                                </p>
                                <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                                    Connect your Facebook Page
                                </h3>
                            </div>

                            <a
                                href={buildFacebookLoginUrl()}
                                className="inline-flex items-center justify-center rounded-lg bg-[var(--link-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--link-primary-hover)]"
                            >
                                Connect Facebook Page
                            </a>
                        </div>
                    </section>
                )}

                <section className="mt-8 w-full rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 md:p-8 shadow-xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.25em] text-[var(--text-subtle)] uppercase">
                                Liked Events
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
                                Your liked events
                            </h3>
                            <p className="mt-2 max-w-2xl text-sm text-[var(--text-subtle)]">
                                Events you like are saved here so you can quickly find them again.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
                            <Heart size={16} fill="currentColor" />
                            {likedEvents.length} saved
                        </div>
                    </div>

                    {isLoadingLikedEvents ? (
                        <p className="mt-6 text-sm text-[var(--text-subtle)]">Loading liked events...</p>
                    ) : likedEvents.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--input-bg)]/60 p-8 text-center">
                            <Heart size={20} className="mx-auto text-[var(--text-subtle)]" />
                            <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                                No liked events yet
                            </p>
                            <p className="mt-2 text-sm text-[var(--text-subtle)]">
                                Tap the heart on an event to save it here.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {likedEvents.map((event) => (
                                <article
                                    key={event.id}
                                    className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--input-bg)]"
                                >
                                    <div className="h-36 bg-[linear-gradient(135deg,rgba(59,130,246,0.45),rgba(20,184,166,0.35))]">
                                        {event.coverImageUrl && (
                                            <img
                                                src={event.coverImageUrl}
                                                alt={event.title}
                                                className="h-full w-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                                                <Heart size={12} fill="currentColor" />
                                                Liked event
                                            </span>
                                            <LikeButton event={event} compact />
                                        </div>
                                        <Link to={`/events/${event.id}`} className="block">
                                            <h4 className="text-lg font-bold text-[var(--text-primary)] hover:underline">
                                                {event.title}
                                            </h4>
                                        </Link>
                                        <div className="space-y-2 text-sm text-[var(--text-subtle)]">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays size={14} />
                                                <span>{formatEventStart(event.startTime)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} />
                                                <span>{event.place?.name || 'Location TBA'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Ticket size={14} />
                                                <span>Saved to your profile</span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}