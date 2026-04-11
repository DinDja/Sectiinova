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

import { handler } from '../../../netlify/functions/inpi-watch.js';

function createFirestoreMock(docs) {
  return {
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ docs }),
      })),
    })),
  };
}

function createUserDoc(data) {
  const set = vi.fn().mockResolvedValue(undefined);

  return {
    data: () => data,
    ref: { set },
    set,
  };
}

describe('inpi-watch handler', () => {
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

  it('executa a rotina agendada mesmo sem contexto HTTP manual', async () => {
    const userDoc = createUserDoc({
      [INPI_TRACKER_FIELDS.savedSearches]: [],
      [INPI_TRACKER_FIELDS.alerts]: [],
      [INPI_TRACKER_FIELDS.monitoringCount]: 0,
    });

    mocks.getFirestore.mockReturnValue(createFirestoreMock([userDoc]));

    const response = await handler();

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      scope: 'all',
      targetUserId: '',
      processedUsers: 0,
      processedSearches: 0,
      changedSearches: 0,
      alertsCreated: 0,
      skippedUsers: 1,
    });
  });

  it('gera alerta quando detecta mudança em uma busca monitorada', async () => {
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

    mocks.getFirestore.mockReturnValue(createFirestoreMock([userDoc]));
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
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      scope: 'all',
      targetUserId: '',
      processedUsers: 1,
      processedSearches: 1,
      changedSearches: 1,
      alertsCreated: 1,
      skippedUsers: 0,
    });
    expect(mocks.fetchInpiProcessFlow).toHaveBeenCalledWith('PI0101161-8', 'patente');
    expect(userDoc.set).toHaveBeenCalledTimes(1);

    const [payload, options] = userDoc.set.mock.calls[0];
    expect(options).toEqual({ merge: true });
    expect(payload[INPI_TRACKER_FIELDS.monitoringCount]).toBe(1);
    expect(payload[INPI_TRACKER_FIELDS.lastWatchSummary]).toBe(
      'Verificação concluída: 1 alerta(s) novo(s).',
    );
    expect(payload[INPI_TRACKER_FIELDS.savedSearches]).toHaveLength(1);
    expect(payload[INPI_TRACKER_FIELDS.savedSearches][0]).toMatchObject({
      processNumber: 'PI0101161-8',
      sourceId: 'patente',
      watchEnabled: true,
      lastKnownContentHash: 'hash-novo',
      lastError: '',
    });
    expect(payload[INPI_TRACKER_FIELDS.alerts]).toHaveLength(1);
    expect(payload[INPI_TRACKER_FIELDS.alerts][0]).toMatchObject({
      processNumber: 'PI0101161-8',
      sourceId: 'patente',
      sourceLabel: 'Patentes',
      title: 'Dispositivo didático',
      message: 'Mudança detectada em Patentes para o processo PI0101161-8.',
    });
  });

  it('não cria alerta quando a verificação não encontra o processo', async () => {
    const savedSearch = {
      processNumber: '904155196',
      sourceId: 'marca',
      sourceLabel: 'Marcas',
      title: 'Marca monitorada',
      statusLabel: 'Em acompanhamento',
      statusTone: 'amber',
      officialSearchUrl: 'https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_num_processo.jsp',
      fetchedAt: '2026-03-31T08:00:00.000Z',
      updatedAt: '2026-03-31T08:00:00.000Z',
      watchEnabled: true,
      lastKnownContentHash: 'hash-marca',
      lastKnownSnapshotKey: 'marca|904155196|hash-marca',
      lastKnownStatusLabel: 'Em acompanhamento',
      lastKnownDispatchKey: '',
      lastDispatchDescription: '',
      lastDispatchDate: '',
      lastCheckedAt: '2026-03-31T08:00:00.000Z',
      lastChangedAt: '2026-03-31T08:00:00.000Z',
      lastError: '',
    };

    const userDoc = createUserDoc({
      [INPI_TRACKER_FIELDS.savedSearches]: [savedSearch],
      [INPI_TRACKER_FIELDS.alerts]: [],
    });

    mocks.getFirestore.mockReturnValue(createFirestoreMock([userDoc]));
    mocks.fetchInpiProcessFlow.mockResolvedValue({
      found: false,
      query: savedSearch.processNumber,
      sourceId: savedSearch.sourceId,
      sourceLabel: savedSearch.sourceLabel,
      fetchedAt: '2026-04-01T09:58:00.000Z',
      contentHash: '',
    });

    const response = await handler({
      httpMethod: 'POST',
      headers: {},
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      scope: 'all',
      targetUserId: '',
      processedUsers: 1,
      processedSearches: 1,
      changedSearches: 0,
      alertsCreated: 0,
      skippedUsers: 0,
    });

    const [payload] = userDoc.set.mock.calls[0];
    expect(payload[INPI_TRACKER_FIELDS.alerts]).toEqual([]);
    expect(payload[INPI_TRACKER_FIELDS.savedSearches][0]).toMatchObject({
      processNumber: '904155196',
      sourceId: 'marca',
      watchEnabled: true,
      lastError: 'A verificação automática não encontrou o processo nesta rodada.',
      lastCheckedAt: '2026-04-01T10:00:00.000Z',
    });
  });
});
