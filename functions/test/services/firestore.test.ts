import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DataStoreService } from '../../src/services/DataStoreService';

describe('DataStoreService', () => {
  let dataStoreService: DataStoreService;

  beforeEach(() => {
    const testDir = mkdtempSync(join(tmpdir(), 'unievent-datastore-'));
    dataStoreService = new DataStoreService(join(testDir, 'db.json'));
  });

  it('adds a page', async () => {
    await dataStoreService.addPage('1', { name: 'TestPage' });
    const pages = await dataStoreService.getPages();
    expect(pages).toEqual([{ id: '1', name: 'TestPage' }]);
  });

  it('updates a page', async () => {
    await dataStoreService.addPage('1', { name: 'TestPage' });
    await dataStoreService.updatePage('1', { name: 'UpdatedPage' });
    const pages = await dataStoreService.getPages();
    expect(pages).toEqual([{ id: '1', name: 'UpdatedPage' }]);
  });

  it('gets pages', async () => {
    await dataStoreService.addPage('1', { name: 'TestPage' });
    const pages = await dataStoreService.getPages();
    expect(pages).toEqual([{ id: '1', name: 'TestPage' }]);
  });

  it('adds events', async () => {
    const result = await dataStoreService.addEvents('1', [{ id: 'e1', name: 'Event1', start_time: new Date().toISOString() } as any]);
    expect(result).toEqual({ upserted: 1 });
  });
});