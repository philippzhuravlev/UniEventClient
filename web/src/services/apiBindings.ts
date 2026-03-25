export type ApiEndpointKey =
  | 'facebook.callback'
  | 'health.check'
  | 'pages.list'
  | 'events.list'
  | 'events.getById'
  | 'events.manualSubmit';

type EndpointMeta = {
  method: 'GET' | 'POST';
  path: string;
};

const endpointBindings: Record<ApiEndpointKey, EndpointMeta> = {
  'facebook.callback': { method: 'GET', path: '/callback' },
  'health.check': { method: 'GET', path: '/health' },
  'pages.list': { method: 'GET', path: '/pages' },
  'events.list': { method: 'GET', path: '/events' },
  'events.getById': { method: 'GET', path: '/events/:id' },
  'events.manualSubmit': { method: 'POST', path: '/events/manual' },
};

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function getApiBaseUrl(): string {
  const configured = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  return trimTrailingSlash(configured || 'http://localhost:8080');
}

export function getEndpointPath(key: ApiEndpointKey): string {
  return endpointBindings[key].path;
}

export function getEndpointMethod(key: ApiEndpointKey): 'GET' | 'POST' {
  return endpointBindings[key].method;
}

export function buildApiUrl(key: ApiEndpointKey, params?: Record<string, string>): string {
  let path = getEndpointPath(key);

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      path = path.replace(`:${paramKey}`, encodeURIComponent(paramValue));
    }
  }

  return `${getApiBaseUrl()}${path}`;
}