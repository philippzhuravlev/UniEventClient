import type { Event, Page } from '../types';
import { events as mockEvents, pages as mockPages } from '../data/mock';
import {
  apiBindings,
  buildApiUrl,
  type EventByIdResponse,
  type ManualSubmitRequestBody,
  type ManualSubmitResponse,
  resolveEndpointPath,
  type EventsListResponse,
  type PagesListResponse,
} from './apiBindings';

// Data Access Layer (client-side): API-first with mock fallback for local/offline dev.
// Endpoint paths are centralized in apiBindings to keep frontend/backend routes aligned.
void apiBindings;

function toPage(value: Partial<Page> & { id?: string; name?: string }): Page {
  const id = value.id ?? '';
  return {
    id,
    name: value.name ?? id,
    url: value.url ?? `https://facebook.com/${id}`,
    active: value.active ?? true,
  };
}

function toEvent(value: Partial<Event> & { id?: string; pageId?: string; title?: string; startTime?: string }): Event {
  const nowIso = new Date().toISOString();
  return {
    id: value.id ?? '',
    pageId: value.pageId ?? '',
    title: value.title ?? 'Untitled event',
    description: value.description,
    startTime: value.startTime ?? nowIso,
    endTime: value.endTime,
    place: value.place,
    coverImageUrl: value.coverImageUrl,
    eventURL: value.eventURL,
    createdAt: value.createdAt ?? nowIso,
    updatedAt: value.updatedAt ?? nowIso,
  };
}

export async function getPages(): Promise<Page[]> {
  try {
    // First try the backend endpoint. If the API is not running, we gracefully fallback to mocks.
    const response = await fetch(buildApiUrl(resolveEndpointPath('pages.list')));

    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.status}`);
    }

    const data = (await response.json()) as PagesListResponse;
    return (data.pages ?? []).map((page) => toPage(page));
  } catch {
    await new Promise((r) => setTimeout(r, 100));
    return mockPages;
  }
}

export async function getEvents(): Promise<Event[]> {
  try {
    const response = await fetch(buildApiUrl(resolveEndpointPath('events.list')));

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`);
    }

    const data = (await response.json()) as EventsListResponse;
    return (data.events ?? []).map((event) => toEvent(event));
  } catch {
    await new Promise((r) => setTimeout(r, 150));
    return mockEvents;
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  try {
    const response = await fetch(
      buildApiUrl(resolveEndpointPath('events.getById', { id }))
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch event by id: ${response.status}`);
    }

    const data = (await response.json()) as EventByIdResponse;
    return data.event ? toEvent(data.event) : null;
  } catch {
    await new Promise((r) => setTimeout(r, 50));
    return mockEvents.find((event) => event.id === id) ?? null;
  }
}

export async function submitManualEvent(payload: ManualSubmitRequestBody): Promise<ManualSubmitResponse> {
  const response = await fetch(buildApiUrl(resolveEndpointPath('events.manualSubmit')), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit manual event: ${response.status}`);
  }

  return (await response.json()) as ManualSubmitResponse;
}
