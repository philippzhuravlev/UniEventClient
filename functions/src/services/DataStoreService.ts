import { promises as fs } from 'fs';
import path from 'path';
import { normalizeEvent } from '../utils';
import type { FbEventResponse, StoredPage } from '../types';

type LocalDatabase = {
  pages: Record<string, StoredPage>;
  events: Record<string, any>;
};

export class DataStoreService {
  private readonly dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? path.join(process.cwd(), '.data', 'db.json');
  }

  private async ensureDbFile(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(this.dbPath);
    } catch {
      const initial: LocalDatabase = { pages: {}, events: {} };
      await fs.writeFile(this.dbPath, JSON.stringify(initial, null, 2), 'utf8');
    }
  }

  private async readDb(): Promise<LocalDatabase> {
    await this.ensureDbFile();
    const raw = await fs.readFile(this.dbPath, 'utf8');
    const parsed = JSON.parse(raw || '{}') as Partial<LocalDatabase>;
    return {
      pages: parsed.pages ?? {},
      events: parsed.events ?? {},
    };
  }

  private async writeDb(db: LocalDatabase): Promise<void> {
    await this.ensureDbFile();
    await fs.writeFile(this.dbPath, JSON.stringify(db, null, 2), 'utf8');
  }

  async addPage(pageId: string, pageData: any): Promise<void> {
    const db = await this.readDb();
    db.pages[pageId] = {
      ...(db.pages[pageId] ?? ({} as StoredPage)),
      ...(pageData as StoredPage),
      id: pageId,
    };
    await this.writeDb(db);
  }

  async updatePage(pageId: string, data: Record<string, any>): Promise<void> {
    const db = await this.readDb();
    db.pages[pageId] = {
      ...(db.pages[pageId] ?? ({ id: pageId } as StoredPage)),
      ...data,
      id: pageId,
    };
    await this.writeDb(db);
  }

  async getPages(): Promise<(StoredPage & { id: string })[]> {
    const db = await this.readDb();
    return Object.entries(db.pages).map(([id, value]) => ({
      ...value,
      id,
    }));
  }

  async addEvents(pageId: string, events: (FbEventResponse & { coverImageUrl?: string })[]): Promise<{ upserted: number }> {
    const currentTimeInIso = new Date().toISOString();
    const db = await this.readDb();

    for (const event of events) {
      const normalizedData = normalizeEvent(pageId, event);
      const existing = db.events[event.id] as any;
      db.events[event.id] = {
        ...existing,
        ...normalizedData,
        coverImageUrl: event.coverImageUrl ?? normalizedData.coverImageUrl,
        createdAt: existing?.createdAt ?? currentTimeInIso,
        updatedAt: currentTimeInIso,
      };
    }

    await this.writeDb(db);
    return { upserted: events.length };
  }
}
