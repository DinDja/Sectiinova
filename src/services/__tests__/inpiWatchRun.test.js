/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INPI_TRACKER_FIELDS } from '../inpiTrackingShared.js';

const mocks = vi.hoisted(() => ({
  cert: vi.fn((value) => value),
  fetchInpiProcessFlow: vi.fn(),
  getApps: vi.fn(),
  getFirestore: vi.fn(),
  initializeApp: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  cert: mocks.cert,
  getApps: mocks.getApps,
  initializeApp: mocks.initializeApp,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mocks.getFirestore,
}));

vi.mock('../../../scripts/inpiProcessProxy.js', () => ({
  fetchInpiProcessFlow: mocks.fetchInpiProcessFlow,
}));

import { handler } from '../../../netlify/functions/inpi-watch-run.js';

function createFirestoreMock(docMap) {
  return {
    collection: vi.fn(() => ({
      doc: vi.fn((userId) => ({
        get: vi.fn().mockResolvedValue(docMap[userId] || { exists: false }),
      })),
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ docs: Object.values(docMap) }),
      })),
    })),
  };
}

function createUserDoc(data, exists = true) {
  const set = vi.fn().mockResolvedValue(undefined);

  return {
    exists,
    data: () => data,
    ref: { set },
    set,
  };
}

describe('inpi-watch-run handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
    vi.clearAllMocks();

    process.env.FIREBASE_ADMIN_PROJECT_ID = 'projeto-teste';
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'watcher@projeto-teste.iam.gserviceaccount.com';
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----\\n';

    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    delete process.env.INPI_WATCH_RUN_TOKEN;

    mocks.getApps.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    delete process.env.FIREBASE_ADMIN_PROJECT_ID;
    delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    delete process.env.INPI_WATCH_RUN_TOKEN;
  });

  it('exige userId ou token para rodar a execução manual', async () => {
    const response = await handler({
      httpMethod: 'POST',
      headers: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error:
        'Informe userId para executar a sua varredura ou forneça um token válido para rodar a varredura global.',
    });
  });

  it('executa somente as buscas monitoradas do userId informado', async () => {
    const savedSearch = {
      processNumber: 'PI0101161-8',
      sourceId: 'patente',
      sourceLabel: 'Patentes',
      title: 'Dispositivo didático',
      statusLabel: 'Em análise',
      statusTone: 'sky',
      officialSearchUrl: 'https://busca.inpi.gov.br/pePI/jsp/patentes/PatenteSearchBasico.jsp',
      fetchedAt: '2026-03-30T12:00:00.000Z',
      updatedAt: '2026-03-30T12:00:00.000Z',
      watchEnabled: true,
      lastKnownContentHash: 'hash-antigo',
      lastKnownSnapshotKey: 'patente|PI0101161-8|hash-antigo',
      lastKnownStatusLabel: 'Em análise',
      lastKnownDispatchKey: '',
      lastDispatchDescription: '',
      lastDispatchDate: '',
      lastCheckedAt: '2026-03-30T12:00:00.000Z',
      lastChangedAt: '2026-03-30T12:00:00.000Z',
      lastError: '',
    };

    const userDoc = createUserDoc({
      [INPI_TRACKER_FIELDS.savedSearches]: [savedSearch],
      [INPI_TRACKER_FIELDS.alerts]: [],
    });

    mocks.getFirestore.mockReturnValue(createFirestoreMock({ usuario123: userDoc }));
    mocks.fetchInpiProcessFlow.mockResolvedValue({
      found: true,
      query: savedSearch.processNumber,
      sourceId: savedSearch.sourceId,
      sourceLabel: savedSearch.sourceLabel,
      officialSearchUrl: savedSearch.officialSearchUrl,
      fetchedAt: '2026-04-01T09:59:00.000Z',
      contentHash: 'hash-novo',
    });

    const response = await handler({
      httpMethod: 'POST',
      headers: {},
      queryStringParameters: { userId: 'usuario123' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      scope: 'user',
      targetUserId: 'usuario123',
      processedUsers: 1,
      processedSearches: 1,
      changedSearches: 1,
      alertsCreated: 1,
      skippedUsers: 0,
    });
    expect(mocks.fetchInpiProcessFlow).toHaveBeenCalledWith('PI0101161-8', 'patente');
    expect(userDoc.set).toHaveBeenCalledTimes(1);
  });
});