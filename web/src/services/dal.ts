import type { Event, Page } from '../types';
import { events as mockEvents, pages as mockPages } from '../data/mock';

// Data Access Layer (client-side): local mock data only.

export async function getPages(): Promise<Page[]> {
  await new Promise(r => setTimeout(r, 100));
  return mockPages;
}

export async function getEvents(): Promise<Event[]> {
  await new Promise(r => setTimeout(r, 150));
  return mockEvents;
}

export async function getEventById(id: string): Promise<Event | null> {
  await new Promise(r => setTimeout(r, 50));
  return mockEvents.find(event => event.id === id) ?? null;
}
