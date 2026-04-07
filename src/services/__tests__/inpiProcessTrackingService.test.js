/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchInpiProcessByNumber } from "../inpiProcessTrackingService.js";

describe("fetchInpiProcessByNumber", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("monta um resumo utilizável quando o detalhe do pedido exige login no portal", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          found: true,
          accessRestricted: true,
          publicDataAvailable: false,
          requiresAuthenticatedPortalAccess: true,
          query: "512026002335-1",
          sourceId: "programa",
          sourceLabel: "Programa de Computador",
          requestedSourceId: "automatico",
          requestedSourceLabel: "Busca automatica",
          fetchedAt: "2026-04-07T19:20:00.000Z",
          contentHash: "hash-restrito",
          officialSearchUrl:
            "https://busca.inpi.gov.br/pePI/jsp/programas/ProgramaSearchBasico.jsp",
          searchedSources: [
            {
              sourceId: "programa",
              sourceLabel: "Programa de Computador",
              found: true,
            },
          ],
          noticeTitle: "Pedido localizado com acesso restrito",
          noticeMessage:
            "O INPI informou que o pedido consta na base, mas o detalhe depende de login e acesso em Meus pedidos.",
        }),
    });

    const result = await fetchInpiProcessByNumber(
      "512026002335-1",
      "automatico",
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/inpi/process?number=512026002335-1&source=automatico",
    );
    expect(result).toMatchObject({
      found: true,
      accessRestricted: true,
      publicDataAvailable: false,
      sourceId: "programa",
      status: {
        label: "Disponivel em Meus pedidos",
        tone: "amber",
      },
      summary: {
        processNumber: "512026002335-1",
        title: "Pedido 512026002335-1 localizado no INPI",
      },
      notice: {
        title: "Pedido localizado com acesso restrito",
      },
    });
    expect(result.notice.message).toContain("Meus pedidos");
    expect(result.dispatches).toEqual([]);
    expect(result.petitions).toEqual([]);
  });
});