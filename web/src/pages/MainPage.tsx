import { useEffect, useRef, useState } from 'react';
import { FilterBar } from '../components/FilterBar';
import { ThemeToggle } from '../components/ThemeToggle';
import { EventList } from '../components/EventList';
import { CalendarView } from '../components/Calendar';
import { Footer } from '../components/Footer';
import { HeaderLogoLink } from '../components/HeaderLogoLink';
import { getEvents, getPages } from '../services/dal';
import { mapAuthError, signOutCurrentUser } from '../services/auth';
import { parseDateOnly, startOfDayMs, endOfDayMs } from '../utils/dateUtils';
import type { Event as EventType, Page } from '../types';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, CircleUserRound, LayoutList, LogOut } from 'lucide-react';

export function MainPage() {
  const { currentUser } = useAuth();
  const [pages, setPages] = useState([] as Page[]);
  const [events, setEvents] = useState([] as EventType[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // organizer filter
  const [pageIds, setPageIds] = useState<string[]>([]);
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortMode, setSortMode] = useState<'newest' | 'upcoming' | 'all'>('upcoming');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [page, event] = await Promise.all([getPages(), getEvents()]);
        if (cancelled) return;

        setPages(page);
        setEvents(event);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 250);

    return () => clearTimeout(id);
  }, [query]);





  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      setError('');
      await signOutCurrentUser();
      setIsProfileOpen(false);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setIsSigningOut(false);
    }
  }

  const userLabel = currentUser?.username || currentUser?.email || 'My Profile';

  const filteredByPage =
    pageIds.length > 0 ? events.filter((e) => pageIds.includes(e.pageId)) : events;

  const textFiltered = debouncedQuery
    ? filteredByPage.filter((event) => {
      const haystack = (
        (event.title || '') +
        ' ' +
        (event.description || '') +
        ' ' +
        (event.place?.name || '')
      ).toLowerCase();

      return haystack.includes(debouncedQuery);
    })
    : filteredByPage;

  const fromObj = parseDateOnly(fromDate);
  const toObj = parseDateOnly(toDate);
  const invalidRange = !!(fromObj && toObj && toObj < fromObj);
  const effectiveToObj = invalidRange ? undefined : toObj;

  const dateFiltered = textFiltered.filter((event) => {
    const eventMs = new Date(event.startTime).getTime();
    if (fromObj && eventMs < startOfDayMs(fromObj)) return false;
    if (effectiveToObj && eventMs > endOfDayMs(effectiveToObj)) return false;
    return true;
  });

  const getCreatedMs = (e: EventType) => {
    type LegacyEvent = EventType & { createdTime?: string; postedTime?: string; insertedAt?: string; addedAt?: string };
    const le = e as LegacyEvent;
    const maybe =
      le.createdTime ??
      le.createdAt ??
      le.postedTime ??
      le.insertedAt ??
      le.addedAt ??
      le.startTime;

    const ms = Date.parse(maybe);
    return isNaN(ms) ? new Date(e.startTime).getTime() : ms;
  };

  let list = [...dateFiltered];

  if (sortMode !== 'all') {
    const now = new Date().getTime();
    list = list.filter((event) => new Date(event.startTime).getTime() >= now);
  }

  if (sortMode === 'upcoming') {
    list = list.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  } else if (sortMode === 'newest') {
    list = list.sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
  }

  const count = list.length;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="page-header mx-6 md:mx-8 mt-4 md:mt-6 mb-6">
        <div className="header-content">
          <HeaderLogoLink />
          <div className="header-text">
            <h1 className="header-title main-header-title">DTU Events</h1>
            <p className="header-subtitle main-header-subtitle">Discover Technical University of Denmark Events</p>
          </div>
        </div>

        <div className="header-toggle relative flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1.5 shadow-sm">
          <ThemeToggle />

          {currentUser ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((open) => !open)}
                className="inline-flex items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-focus-border)]"
                aria-label="Open account menu"
                aria-expanded={isProfileOpen}
              >
                <CircleUserRound size={18} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 shadow-xl">
                  <p className="px-2 py-2 text-xs font-semibold text-[var(--text-subtle)]">
                    Signed in as
                  </p>
                  <p className="truncate px-2 pb-2 text-sm font-semibold text-[var(--text-primary)]">
                    {userLabel}
                  </p>
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)]"
                  >
                    <CircleUserRound size={16} />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <LogOut size={16} />
                    {isSigningOut ? 'Signing out...' : 'Log out'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--button-hover)] sm:px-4 sm:text-sm"
              aria-label="Log in or sign up"
            >
              Log In / Sign Up
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 px-6 md:px-8 pb-8 max-w-6xl mx-auto w-full">
        <div className="space-y-8">
          <FilterBar
            pages={pages}
            pageIds={pageIds}
            setPageIds={setPageIds}
            query={query}
            setQuery={setQuery}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            count={count}
            sortMode={sortMode}
            setSortMode={setSortMode}
          />

          {loading && (
            <p className="text-sm text-[var(--text-subtle)] mb-2 animate-pulse">Loading…</p>
          )}

          {error && (
            <p className="text-sm text-[var(--dtu-accent)] mb-2 font-semibold">{error}</p>
          )}

          {invalidRange && (
            <p className="text-xs text-[var(--dtu-accent)] mb-2 font-semibold">
              End date is before start date. Showing results up to any end date.
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 gap-3">
            <div className="text-sm font-medium text-[var(--text-subtle)]" aria-live="polite">
              {count} event{count === 1 ? '' : 's'} found
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--input-bg)] p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${viewMode === 'list'
                  ? 'bg-[var(--link-primary)] text-white border-transparent'
                  : 'bg-[var(--panel-bg)] text-[var(--text-primary)] border-[var(--panel-border)] hover:bg-[var(--input-bg)]'
                  }`}
              >
                <span className="inline-flex items-center gap-2">
                  <LayoutList size={16} />
                  List
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                aria-pressed={viewMode === 'calendar'}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${viewMode === 'calendar'
                  ? 'bg-[var(--link-primary)] text-white border-transparent'
                  : 'bg-[var(--panel-bg)] text-[var(--text-primary)] border-[var(--panel-border)] hover:bg-[var(--input-bg)]'
                  }`}
              >
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  Calendar
                </span>
              </button>
            </div>
          </div>

          {viewMode === 'list' ? <EventList list={list} /> : <CalendarView events={list} />}
        </div>
      </div>

      <Footer />
    </div>
  );
}