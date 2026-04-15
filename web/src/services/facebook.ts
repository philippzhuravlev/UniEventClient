export function buildFacebookLoginUrl() {
  const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
  const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
  const FB_REDIRECT_URI = encodeURIComponent(`${BACKEND_BASE_URL}/api/facebook/callback`);
  const FB_SCOPES = [
    'pages_show_list',
    'pages_read_engagement'
  ].join(',');
  return `https://www.facebook.com/v25.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${FB_REDIRECT_URI}&scope=${FB_SCOPES}`;
}
