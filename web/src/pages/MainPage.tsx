import { useEffect, useState } from 'react'; // React imports
import { FilterBar } from '../components/FilterBar';
import { ThemeToggle } from '../components/ThemeToggle';
import { EventList } from '../components/EventList';
import { CalendarView } from '../components/Calendar';
import { Footer } from '../components/Footer';
import { getEvents, getPages } from '../services/dal';
import { buildFacebookLoginUrl } from '../services/facebook';
import { parseDateOnly, startOfDayMs, endOfDayMs } from '../utils/dateUtils';
import type { Event as EventType, Page } from '../types';

export function MainPage() { // function for main page (can be used in other files bc of export) hej  
  const [pages, setPages] = useState([] as Page[]); // a variable that holds an array of pages
  const [events, setEvents] = useState([] as EventType[]); // a variable that holds an array of events
  const [loading, setLoading] = useState(true); // loading is by defualt true until data is loaded
  const [error, setError] = useState<string>(''); // errors are empty by default until an error occurs

  // runs when component is first rendered
  useEffect(() => {
    let cancelled = false; // to avoid setting state on unmounted component
    (async () => { // function that runs straight away
      try {
        setLoading(true); // loading is set to true when data fetching starts
        const [page, event] = await Promise.all([getPages(), getEvents()]); // fetch pages and events in parallel
        if (cancelled) return;
        setPages(page);
        setEvents(event);
      } catch (err) { // error handling
        if (cancelled) return;
        const message = (err instanceof Error && err.message) ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false); // loading is false when data fetching ends
      }
    })();
    return () => { cancelled = true };
  }, []); // [] at the end means it only runs once when component is mounted


    // organizer filter (multi-select)
  const [pageIds, setPageIds] = useState<string[]>([]);
  const filteredByPage = pageIds.length > 0 ? events.filter(e => pageIds.includes(e.pageId)) : events;

  const [query, setQuery] = useState<string>(''); // react variable with default empty string
  const [debouncedQuery, setDebouncedQuery] = useState<string>(''); // only update after user stops typing for 250ms
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase()); // makes query lowercase and removes whitespace
    }, 250); // 250ms delay
    return () => clearTimeout(id);
  }, [query]); // runs whenever query changes

  const textFiltered = debouncedQuery // variable created if debouncedQuery is not empty
    ? filteredByPage.filter(event => {
      const haystack = (
        (event.title || '') + ' ' +
        (event.description || '') + ' ' +
        (event.place?.name || '')
      ).toLowerCase();
      return haystack.includes(debouncedQuery); // if haystack includes the debouncedQuery then include it in the result
    })
    : filteredByPage; // if there is no debouncedQuery then return all events from filteredByPage

    // date range filter
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fromObj = parseDateOnly(fromDate); // turn fromDate string into date object
  const toObj = parseDateOnly(toDate); // turn toDate string into date object
  const invalidRange = !!(fromObj && toObj && toObj < fromObj); // check if range is invalid
  const effectiveToObj = invalidRange ? undefined : toObj; // if invalid then ignore toDate

  const dateFiltered = textFiltered.filter(event => {
    const eventMs = new Date(event.startTime).getTime(); // get timestamp of event start time
    if (fromObj && eventMs < startOfDayMs(fromObj)) return false; // if fromdate is after event start then exclude
    if (effectiveToObj && eventMs > endOfDayMs(effectiveToObj)) return false; // if todate is before event start then exclude
    
    return true;
  });

  // pick a created/added timestamp from an event (ms)
  const getCreatedMs = (e: EventType) => { // for each event we 
    // pick the first available "created/added" timestamp field and fallback to startTime if none exist
    const maybe = (e as any).createdTime ?? (e as any).createdAt ?? (e as any).postedTime ?? (e as any).insertedAt ?? (e as any).addedAt ?? e.startTime;
    const ms = Date.parse(maybe); // parse maybe into ms
    return isNaN(ms) ? new Date(e.startTime).getTime() : ms; // fallback to startTime if parsing fails
  };

  const [sortMode, setSortMode] = useState<'newest' | 'upcoming' | 'all'>('upcoming'); // 'upcoming' = all (default)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // build final list with sortMode
  let list = [...dateFiltered];
  
  // only filter out past events if NOT in 'all' mode
  if (sortMode !== 'all') {
    const now = new Date().getTime();
    list = list.filter(event => new Date(event.startTime).getTime() >= now); // exclude events that have already started in the past
  }
  
  if (sortMode === 'upcoming') { // if upcoming is selected then
    list = list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()); // sort by startTime ascending
  } else if (sortMode === 'newest') { // if it is set to newest then
    list = list.sort((a, b) => getCreatedMs(b) - getCreatedMs(a)); // sort by createdMs descending (so when they were added)
  }
  // if 'all' is selected then no sorting is applied

  const count = list.length;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="page-header mx-6 md:mx-8 mt-4 md:mt-6 mb-6">
        <div className="header-content">
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/dtuevent-8105b.firebasestorage.app/o/picture%2Fdtulogo.png?alt=media&token=7e86de6e-f1f4-471d-8354-70ad70bafe14" 
            alt="DTU Logo" 
            className="header-logo" 
          />
          <div className="header-text">
            <h1 className="header-title">DTU Events</h1>
            <p className="header-subtitle">Discover Technical University of Denmark Events</p>
          </div>
        </div>
        {/* Theme toggle placed inside header so it floats cleanly */}
        <div className="header-toggle">
          <ThemeToggle />
        </div>
      </header>

      {/* Filter and Content Section */}
      <div className="flex-1 px-6 md:px-8 pb-8 max-w-6xl mx-auto w-full">
        <div className="space-y-8">
        {/* this is where filterbar component receives data and functions */}
        <FilterBar // renders the filter bar component 
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

      {/* conditional rendering */}

      {loading && <p className="text-sm text-[var(--text-subtle)] mb-2 animate-pulse">Loading…</p>}  {/*if loading is true then show loading text*/}
      {error && <p className="text-sm text-[var(--dtu-accent)] mb-2 font-semibold">{error}</p>} {/* if there is an error then show error message */}
      {invalidRange && (
        <p className="text-xs text-[var(--dtu-accent)] mb-2 font-semibold">End date is before start date. Showing results up to any end date.</p>
      )} {/* if date range is invalid then show warning message */}

      {/* view mode toggle (list vs calendar) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div className="text-sm text-[var(--text-subtle)]">{count} event{count === 1 ? '' : 's'} found</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
              viewMode === 'list'
                ? 'bg-[var(--link-primary)] text-white border-transparent'
                : 'bg-[var(--panel-bg)] text-[var(--text-primary)] border-[var(--panel-border)] hover:bg-[var(--input-bg)]'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
              viewMode === 'calendar'
                ? 'bg-[var(--link-primary)] text-white border-transparent'
                : 'bg-[var(--panel-bg)] text-[var(--text-primary)] border-[var(--panel-border)] hover:bg-[var(--input-bg)]'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <EventList list={list} /> /* the final list of events shown after all filters have been applied */
      ) : (
        <CalendarView events={list} />
      )}

      <div className="flex justify-center">
        <a
          href={buildFacebookLoginUrl()}
          className="bg-[var(--link-primary)] hover:bg-[var(--link-primary-hover)] text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          Connect Facebook Page
        </a>
      </div>
    </div>
      </div>
      <Footer />
    </div>
  );
}
