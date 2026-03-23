import { apiBindings, buildApiUrl } from './apiBindings';

export function buildFacebookLoginUrl() {
  const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
  const FB_REDIRECT_URI = encodeURIComponent(buildApiUrl(apiBindings['facebook.callback'].path));
  const FB_SCOPES = [
    'pages_show_list',
    'pages_read_engagement'
  ].join(',');
  return `https://www.facebook.com/v23.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${FB_REDIRECT_URI}&scope=${FB_SCOPES}`;
}
