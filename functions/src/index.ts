// like any `index.ts` file, this file is the Firebase entry point.
// It initializes Firebase Admin, reads runtime params/secrets, instantiates
// service dependencies and exposes thin wrappers that delegate to handlers
// (the handler implementations live in `src/handlers`). Keeping the
// wrappers here ensures the compiled `lib/index.js` contains the Cloud
// Function exports that the emulator and Firebase deploy expect.

import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

import {
  handleCallback as handler_handleCallback,
  handleManualIngest as handler_handleManualIngest,
  handleScheduledIngest as handler_handleScheduledIngest,
  handleRefreshTokens as handler_handleRefreshTokens,
} from './handlers';
import {
	FacebookService,
	SecretManagerService,
	StorageService,
	FirestoreService,
} from './services';

// initialize Firebase Admin SDK and set global options
// europe-west1 is chosen as the deployment region (closest to Denmark)
admin.initializeApp();
setGlobalOptions({ region: 'europe-west1' });

// Parameters / secrets (server-side)
const FACEBOOK_APP_SECRET = defineSecret('FACEBOOK_APP_SECRET');
const FACEBOOK_APP_ID_PARAM = defineString('FACEBOOK_APP_ID');
const FB_REDIRECT_URI_PARAM = defineString('FB_REDIRECT_URI');
const GCP_PROJECT_ID_PARAM = defineString('GCP_PROJECT_ID');

// Helper: build dependencies for handlers. We set runtime env vars consumed by utils/services
function buildDepsFromParams() {
	try {
		process.env.FACEBOOK_APP_ID = FACEBOOK_APP_ID_PARAM.value();
		process.env.FACEBOOK_APP_SECRET = FACEBOOK_APP_SECRET.value();
		process.env.FB_REDIRECT_URI = FB_REDIRECT_URI_PARAM.value();
		process.env.GCP_PROJECT_ID = GCP_PROJECT_ID_PARAM.value();
	} catch (e) {
		// value() may throw in some contexts (e.g. during local TS type checks) - fall back to existing env
	}

	const facebookService = new FacebookService();
	const secretManagerService = new SecretManagerService();
	const storageService = new StorageService(admin.storage().bucket());
	const firestoreService = new FirestoreService(admin.firestore());

	return { facebookService, secretManagerService, storageService, firestoreService } as const;
}

// Exports: thin Firebase wrappers only - handlers contain the business logic.
// Note: wrappers intentionally avoid heavy logic; they build `deps` and pass
// control to the handler implementations in `src/handlers`.
export const handleCallback = onRequest({ secrets: [FACEBOOK_APP_SECRET] }, async (req, res) => {
	const deps = buildDepsFromParams();
	try {
		await handler_handleCallback(deps as any, req, res);
		return;
	} catch (err: any) {
		// Avoid depending on handler utils here in case initialization failed.
		res.status(500).send(err?.message || String(err));
	}
});

export const handleManualIngest = onRequest({ secrets: [FACEBOOK_APP_SECRET] }, async (req, res) => {
	const deps = buildDepsFromParams();
	try {
		await handler_handleManualIngest(req, res, deps as any);
		return;
	} catch (e: any) {
		res.status(500).send(e?.message || String(e));
	}
});

export const handleRefreshTokens = onRequest({ secrets: [FACEBOOK_APP_SECRET] }, async (_req, res) => {
	const deps = buildDepsFromParams();
	try {
		await handler_handleRefreshTokens(deps as any);
		res.json({ status: 'ok' });
	} catch (e: any) {
		res.status(500).send(e?.message || String(e));
	}
});

// scheduled token refresh (every 45 days)
export const handleRefreshTokensScheduled = onSchedule(
	({ schedule: 'every 1080 hours', timeZone: 'Europe/Copenhagen', secrets: [FACEBOOK_APP_SECRET] } as any),
	async (event: any) => {
		const deps = buildDepsFromParams();
		try {
			await handler_handleRefreshTokens(deps as any);
			return;
		} catch (err: any) {
			console.error('Scheduled token refresh failed', err?.message || err);
		}
	}
);

// scheduled ingest: run twice daily
export const handleScheduleIngest = onSchedule(
	({ schedule: 'every 12 hours', timeZone: 'Etc/UTC', secrets: [FACEBOOK_APP_SECRET] } as any),
	async (event: any) => {
		const deps = buildDepsFromParams();
		try {
			await handler_handleScheduledIngest(event, {}, deps as any);
			return;
		} catch (err: any) {
			console.error('Nightly ingest failed', err?.message || err);
		}
	}
);
