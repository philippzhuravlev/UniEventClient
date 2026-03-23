import type { Event, Page } from '../types';

// Frontend route metadata mirrors backend endpointContracts so DAL callers use stable keys instead of raw paths.
export type ApiEndpointKey =
  | 'facebook.callback'
  | 'ingest.manual'
  | 'tokens.refresh'
  | 'health.check'
  | 'pages.list'
  | 'events.list'
  | 'events.getById'
  | 'events.manualSubmit';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiEndpointStatus = 'active' | 'planned';

export interface ApiEndpointBinding {
  key: ApiEndpointKey;
  method: ApiMethod;
  path: string;
  status: ApiEndpointStatus;
  description: string;
}

export interface IngestPageResult {
  pageId: string;
  pageName: string;
  status: 'success' | 'failed' | 'skipped';
  eventsProcessed?: number;
  eventsFailed?: number;
  reason?: string;
  error?: string;
  duration: number;
}

export interface IngestManualResponse {
  totalPages: number;
  totalEvents: number;
  totalEventsFailed: number;
  duration: number;
  pageResults: IngestPageResult[];
}

export interface RefreshTokensResponse {
  status: 'ok';
}

export interface HealthResponse {
  status: 'ok';
  service: 'unievent-backend';
  timestamp: string;
}

export interface PagesListResponse {
  pages: Page[];
}

export interface EventsListResponse {
  events: Event[];
}

export interface EventByIdResponse {
  event: Event | null;
}

export interface ManualSubmitRequestBody {
  pageId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  coverImageUrl?: string;
  eventURL?: string;
}

export interface ManualSubmitResponse {
  status: 'accepted' | 'ok';
  id: string;
}

// Keep these bindings in sync with functions/src/apiContracts.ts.
export const apiBindings: Record<ApiEndpointKey, ApiEndpointBinding> = {
  'facebook.callback': {
    key: 'facebook.callback',
    method: 'GET',
    path: '/callback',
    status: 'active',
    description: 'OAuth callback for Facebook page connection',
  },
  'ingest.manual': {
    key: 'ingest.manual',
    method: 'POST',
    path: '/ingest',
    status: 'active',
    description: 'Manually ingest events for all connected pages',
  },
  'tokens.refresh': {
    key: 'tokens.refresh',
    method: 'POST',
    path: '/refresh-tokens',
    status: 'active',
    description: 'Refresh all stored page tokens',
  },
  'health.check': {
    key: 'health.check',
    method: 'GET',
    path: '/health',
    status: 'active',
    description: 'Health endpoint for runtime readiness checks',
  },
  'pages.list': {
    key: 'pages.list',
    method: 'GET',
    path: '/pages',
    status: 'active',
    description: 'List connected pages from datastore',
  },
  'events.list': {
    key: 'events.list',
    method: 'GET',
    path: '/events',
    status: 'active',
    description: 'List normalized events from datastore',
  },
  'events.getById': {
    key: 'events.getById',
    method: 'GET',
    path: '/events/:id',
    status: 'active',
    description: 'Get one event by ID',
  },
  'events.manualSubmit': {
    key: 'events.manualSubmit',
    method: 'POST',
    path: '/events/manual',
    status: 'active',
    description: 'Manually submit an event when API access is unavailable',
  },
};

export function resolveEndpointPath(key: ApiEndpointKey, params?: Record<string, string>): string {
  // Replaces path params like /events/:id without repeating string templates across callers.
  const template = apiBindings[key].path;

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce((acc, [paramKey, value]) => {
    return acc.replace(`:${paramKey}`, encodeURIComponent(value));
  }, template);
}

export function buildApiUrl(path: string): string {
  // Empty base URL means same-origin requests, which is convenient when frontend and backend are served together.
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  return `${baseUrl}${path}`;
}
