import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { Event } from '../types';
import { getEventById } from '../services/dal';
import { formatEventStart } from '../utils/eventUtils';
import { downloadIcs, buildGoogleCalendarUrl } from '../utils/calendarUtils';
import { FacebookLinkButton } from '../components/FacebookLinkButton';
import { LikeButton } from '../components/LikeButton';

export function EventPage() {
  const { id } = useParams<{ id: string }>(); // id for /events/:id
  const navigate = useNavigate(); // surprise tool that will help us later
  const [event, setEvent] = useState<Event | null>(null); // make events stateful

  // () => means "when this happens, do this". Lambda function / arrow function syntax.
  useEffect(() => {
    if (!id) return;

    // fetch event by id from dal.ts
    const getEventFromDal = async () => {
      const fetchedEvent = await getEventById(id);
      setEvent(fetchedEvent);
    };
    getEventFromDal(); // async
  }, [id]);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  // close the menu when clicking outside
  useEffect(() => {
    if (!showAddMenu) return;

    const onClick = (e: MouseEvent) => {
      if (!addMenuRef.current?.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showAddMenu]);

  const handleBack = () => { // when back button clicked...
    navigate('/'); // ...go back to main events list
  };

  if (!event) return null;

  // Main Rendering of EventPage
  return (
    <div className="page flex flex-col">

      {/* Top Bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/50 dark:bg-black/30 border-b border-white/20 dark:border-white/10 w-full">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => handleBack()}
            aria-label="Back"
            className="text-primary text-sm font-medium hover:underline"
          >
            Back to events
          </button>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowAddMenu(v => !v)}
              className="bg-[var(--link-primary)] hover:bg-[var(--link-primary-hover)] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition"
            >
              Add to calendar
            </button>

            {showAddMenu && (
              <div
                ref={addMenuRef}
                className="absolute right-0 mt-2 w-44 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-lg shadow-xl z-50"
              >
                <button
                  onClick={() => {
                    window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold hover:bg-[var(--input-bg)] transition"
                >
                  Google Calendar
                </button>
                <button
                  onClick={() => {
                    downloadIcs(event);
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold hover:bg-[var(--input-bg)] transition"
                >
                  Apple / .ics
                </button>
              </div>
            )}

            <LikeButton event={event} />
            <FacebookLinkButton event={event} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto pb-16 px-4">
          
          {/* Hero / Cover Image */}
          <div className="w-full h-[45vh] min-h-[260px] relative rounded-b-lg overflow-hidden mb-6">
            <img
              src={event.coverImageUrl ?? ''}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          {/* Event Header */}
          <section className="-mt-12 relative">
            <div className="bubble p-6 shadow-xl">
              <h1 className="text-3xl font-bold text-primary mb-2">
                {event.title}
              </h1>

              {/* Location */}
              {event.place && (
                <div className="text-subtle text-sm leading-relaxed">
                  <div className="font-semibold text-primary text-base">
                    {event.place.name}
                  </div>

                  {event.place.location && (
                    <div className="mt-1">
                      {event.place.location.street && (
                        <div>{event.place.location.street}</div>
                      )}
                      {(event.place.location.zip || event.place.location.city) && (
                        <div>
                          {event.place.location.zip} {event.place.location.city}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="text-sm mt-4 text-subtle">
                {formatEventStart(event.startTime)}
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="mt-6">
            <div className="bubble p-6">
              {event.description ? (
                <div className="prose prose-sm max-w-none text-primary whitespace-pre-wrap break-words overflow-hidden">
                  {event.description}
                </div>
              ) : (
                <p className="text-subtle italic">No description available</p>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
