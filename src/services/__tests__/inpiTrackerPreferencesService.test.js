/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INPI_TRACKER_FIELDS } from "../inpiTrackingShared.js";

const mocks = vi.hoisted(() => ({
  db: { name: "db-mock" },
  doc: vi.fn((_db, collectionName, userId) => ({ collectionName, userId })),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
  fetchInpiProcessByNumber: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  onSnapshot: mocks.onSnapshot,
  runTransaction: mocks.runTransaction,
}));

vi.mock("../../../firebase", () => ({
  db: mocks.db,
}));

vi.mock("../inpiProcessTrackingService.js", () => ({
  fetchInpiProcessByNumber: mocks.fetchInpiProcessByNumber,
}));

import { executeManualInpiWatchForUser } from "../inpiTrackerPreferencesService.js";

describe("executeManualInpiWatchForUser", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T20:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("falha sem userId", async () => {
    await expect(executeManualInpiWatchForUser("")).rejects.toThrow(
      "Usuário não identificado para executar a varredura manual.",
    );
  });

  it("executa a varredura manual das buscas monitoradas do usuário", async () => {
    const savedSearch = {
      processNumber: "PI0101161-8",
      sourceId: "patente",
      sourceLabel: "Patentes",
      title: "Dispositivo didático",
      statusLabel: "Em análise",
      statusTone: "sky",
      officialSearchUrl: "https://busca.inpi.gov.br/pePI/jsp/patentes/PatenteSearchBasico.jsp",
      fetchedAt: "2026-03-30T12:00:00.000Z",
      updatedAt: "2026-03-30T12:00:00.000Z",
      watchEnabled: true,
      lastKnownContentHash: "hash-antigo",
      lastKnownSnapshotKey: "patente|PI0101161-8|hash-antigo",
      lastKnownStatusLabel: "Em análise",
      lastKnownDispatchKey: "",
      lastDispatchDescription: "",
      lastDispatchDate: "",
      lastCheckedAt: "2026-03-30T12:00:00.000Z",
      lastChangedAt: "2026-03-30T12:00:00.000Z",
      lastError: "",
    };
    const initialData = {
      [INPI_TRACKER_FIELDS.savedSearches]: [savedSearch],
      [INPI_TRACKER_FIELDS.alerts]: [],
    };
    const initialSnapshot = {
      data: () => initialData,
    };
    const transactionSet = vi.fn();

    mocks.getDoc.mockResolvedValue(initialSnapshot);
    mocks.runTransaction.mockImplementation(async (_db, callback) => {
      const transaction = {
        get: vi.fn().mockResolvedValue(initialSnapshot),
        set: transactionSet,
      };

      return callback(transaction);
    });
    mocks.fetchInpiProcessByNumber.mockResolvedValue({
      found: true,
      query: savedSearch.processNumber,
      sourceId: savedSearch.sourceId,
      sourceLabel: savedSearch.sourceLabel,
      officialSearchUrl: savedSearch.officialSearchUrl,
      fetchedAt: "2026-04-07T19:59:00.000Z",
      contentHash: "hash-novo",
      summary: {
        processNumber: savedSearch.processNumber,
        title: savedSearch.title,
      },
      status: {
        label: "Atualizado",
        tone: "sky",
      },
      latestDispatch: null,
      dispatches: [],
      petitions: [],
    });

    const summary = await executeManualInpiWatchForUser("usuario123");

    expect(summary).toEqual({
      scope: "user",
      targetUserId: "usuario123",
      processedUsers: 1,
      processedSearches: 1,
      changedSearches: 1,
      alertsCreated: 1,
      skippedUsers: 0,
    });
    expect(mocks.fetchInpiProcessByNumber).toHaveBeenCalledWith(
      "PI0101161-8",
      "patente",
    );
    expect(transactionSet).toHaveBeenCalledTimes(1);

    const [userRef, payload, options] = transactionSet.mock.calls[0];
    expect(userRef).toEqual({ collectionName: "usuarios", userId: "usuario123" });
    expect(options).toEqual({ merge: true });
    expect(payload[INPI_TRACKER_FIELDS.lastWatchSummary]).toBe(
      "Varredura manual concluída: 1 busca(s) verificadas e 1 alerta(s) novo(s).",
    );
    expect(payload[INPI_TRACKER_FIELDS.savedSearches]).toHaveLength(1);
    expect(payload[INPI_TRACKER_FIELDS.savedSearches][0]).toMatchObject({
      processNumber: "PI0101161-8",
      sourceId: "patente",
      watchEnabled: true,
      lastKnownContentHash: "hash-novo",
      lastError: "",
    });
    expect(payload[INPI_TRACKER_FIELDS.savedSearches][0].lastManualSyncAt).toBe(
      "2026-04-07T20:00:00.000Z",
    );
    expect(payload[INPI_TRACKER_FIELDS.alerts]).toHaveLength(1);
  });
});
