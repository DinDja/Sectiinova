/* @vitest-environment node */

import { EventEmitter } from "node:events";
import https from "node:https";

import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchInpiProcessFlow } from "../inpiProcessProxy.js";

function mockHttpsSequence(responses) {
  return vi.spyOn(https, "request").mockImplementation((options, callback) => {
    const nextResponse = responses.shift();

    if (!nextResponse) {
      throw new Error(
        `Resposta mock não configurada para ${options?.method || "GET"} ${options?.path || ""}.`,
      );
    }

    const request = new EventEmitter();
    request.write = vi.fn();
    request.end = vi.fn(() => {
      const response = new EventEmitter();
      response.statusCode = nextResponse.statusCode ?? 200;
      response.headers = nextResponse.headers || {};

      callback(response);

      if (nextResponse.body) {
        response.emit("data", Buffer.from(nextResponse.body, "latin1"));
      }

      response.emit("end");
    });

    return request;
  });
}

describe("fetchInpiProcessFlow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reconhece quando o INPI localiza o pedido mas exige acesso por Meus pedidos", async () => {
    const restrictedHtml = `
      <html>
        <body>
          AVISO: Nº Pedido: '512026002335-1' consta em nosso banco de dados.
          Por favor, acesse regularmente a Revista da Propriedade Industrial (RPI),
          a fim de acompanhar as publicações relativas ao pedido em questão.
          2º Entre com seu login e senha.
          4º Clique em Meus pedidos.
          Dados atualizados até 31/03/2026
        </body>
      </html>
    `;

    mockHttpsSequence([
      {
        headers: {
          "set-cookie": ["JSESSIONID=abc123; Path=/"],
        },
        body: "<html>login ok</html>",
      },
      {
        body: restrictedHtml,
      },
    ]);

    const result = await fetchInpiProcessFlow("512026002335-1", "programa");

    expect(result).toMatchObject({
      found: true,
      accessRestricted: true,
      publicDataAvailable: false,
      requiresAuthenticatedPortalAccess: true,
      sourceId: "programa",
      sourceLabel: "Programa de Computador",
      query: "512026002335-1",
      noticeTitle: "Pedido localizado com acesso restrito",
    });
    expect(result.noticeMessage).toContain("Meus pedidos");
    expect(result.contentHash).toBeTruthy();
  });

  it("mantem hash estavel no acesso restrito quando so muda o rodape de atualizacao", async () => {
    const restrictedHtmlV1 = `
      <html>
        <body>
          AVISO: Nº Pedido: '512026002335-1' consta em nosso banco de dados.
          Por favor, acesse regularmente a Revista da Propriedade Industrial (RPI),
          a fim de acompanhar as publicações relativas ao pedido em questão.
          2º Entre com seu login e senha.
          4º Clique em Meus pedidos.
          Dados atualizados até 31/03/2026
        </body>
      </html>
    `;

    const restrictedHtmlV2 = `
      <html>
        <body>
          AVISO: Nº Pedido: '512026002335-1' consta em nosso banco de dados.
          Por favor, acesse regularmente a Revista da Propriedade Industrial (RPI),
          a fim de acompanhar as publicações relativas ao pedido em questão.
          2º Entre com seu login e senha.
          4º Clique em Meus pedidos.
          Dados atualizados até 01/04/2026
        </body>
      </html>
    `;

    mockHttpsSequence([
      { body: "<html>login ok</html>" },
      { body: restrictedHtmlV1 },
    ]);
    const firstResult = await fetchInpiProcessFlow("512026002335-1", "programa");

    vi.restoreAllMocks();
    mockHttpsSequence([
      { body: "<html>login ok</html>" },
      { body: restrictedHtmlV2 },
    ]);
    const secondResult = await fetchInpiProcessFlow("512026002335-1", "programa");

    expect(firstResult.found).toBe(true);
    expect(secondResult.found).toBe(true);
    expect(firstResult.accessRestricted).toBe(true);
    expect(secondResult.accessRestricted).toBe(true);
    expect(firstResult.contentHash).toBe(secondResult.contentHash);
  });
});
