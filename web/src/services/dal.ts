import type { Event, Page } from '../types';
import { events as mockEvents, pages as mockPages } from '../data/mock';
import { buildApiUrl, getEndpointMethod } from './apiBindings';

// Data Access Layer (client-side): API-first with mock fallback for local resilience.

const useMockFallback = (String((import.meta as any).env?.VITE_USE_MOCK_FALLBACK || 'true')).toLowerCase() === 'true';

async function fetchJson<T>(url: string, method: 'GET' | 'POST'): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function getPages(): Promise<Page[]> {
  try {
    const url = buildApiUrl('pages.list');
    const payload = await fetchJson<{ pages: Page[] }>(url, getEndpointMethod('pages.list'));
    return payload.pages;
  } catch (error) {
    if (!useMockFallback) {
      throw error;
    }

    await new Promise(r => setTimeout(r, 100));
    return mockPages;
  }
}

export async function getEvents(): Promise<Event[]> {
  try {
    const url = buildApiUrl('events.list');
    const payload = await fetchJson<{ events: Event[] }>(url, getEndpointMethod('events.list'));
    return payload.events;
  } catch (error) {
    if (!useMockFallback) {
      throw error;
    }

    await new Promise(r => setTimeout(r, 150));
    return mockEvents;
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  try {
    const url = buildApiUrl('events.getById', { id });
    const payload = await fetchJson<{ event: Event | null }>(url, getEndpointMethod('events.getById'));
    return payload.event;
  } catch (error) {
    if (!useMockFallback) {
      throw error;
    }

    return mockEvents.find(event => event.id === id) || null;
  }
}
