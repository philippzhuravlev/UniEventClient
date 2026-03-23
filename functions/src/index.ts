import express from 'express';

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
	DataStoreService,
} from './services';

// Helper: build dependencies for handlers. We set runtime env vars consumed by utils/services
function buildDepsFromParams() {
	const facebookService = new FacebookService();
	const secretManagerService = new SecretManagerService();
	const storageService = new StorageService();
	const dataStoreService = new DataStoreService();

	return { facebookService, secretManagerService, storageService, dataStoreService } as const;
}

export async function handleCallback(req: express.Request, res: express.Response) {
	const deps = buildDepsFromParams();
	try {
		await handler_handleCallback(deps as any, req, res);
		return;
	} catch (err: any) {
		res.status(500).send(err?.message || String(err));
	}
}

export async function handleManualIngest(req: express.Request, res: express.Response) {
	const deps = buildDepsFromParams();
	try {
		await handler_handleManualIngest(req, res, deps as any);
		return;
	} catch (e: any) {
		res.status(500).send(e?.message || String(e));
	}
}

export async function handleRefreshTokens(_req: express.Request, res: express.Response) {
	const deps = buildDepsFromParams();
	try {
		await handler_handleRefreshTokens(deps as any);
		res.json({ status: 'ok' });
	} catch (e: any) {
		res.status(500).send(e?.message || String(e));
	}
}

export async function handleRefreshTokensScheduled(event?: any) {
	const deps = buildDepsFromParams();
	try {
		await handler_handleRefreshTokens(deps as any);
		return;
	} catch (err: any) {
		console.error('Scheduled token refresh failed', err?.message || err);
	}
}

export async function handleScheduleIngest(event?: any) {
	const deps = buildDepsFromParams();
	try {
		await handler_handleScheduledIngest(event, {}, deps as any);
		return;
	} catch (err: any) {
		console.error('Scheduled ingest failed', err?.message || err);
	}
}

export const app = express();

app.get('/callback', handleCallback);
app.post('/ingest', handleManualIngest);
app.post('/refresh-tokens', handleRefreshTokens);

if (require.main === module) {
	const port = Number(process.env.PORT || 8080);
	app.listen(port, () => {
		console.log(`UniEvent backend listening on port ${port}`);
	});
}
