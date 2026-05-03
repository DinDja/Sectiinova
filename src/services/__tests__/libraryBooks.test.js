/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handler } from "../../../netlify/functions/library-books.js";

function createFetchResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

describe("library-books handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete globalThis.__libraryBooksCache;
    delete globalThis.__libraryBooksInflight;
  });

  afterEach(() => {
    delete globalThis.__libraryBooksCache;
    delete globalThis.__libraryBooksInflight;
    vi.unstubAllGlobals();
  });

  it("bloqueia metodos nao permitidos", async () => {
    const response = await handler({
      httpMethod: "DELETE",
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(405);
    expect(JSON.parse(response.body)).toEqual({
      error: "Metodo nao permitido. Use GET ou POST.",
    });
  });

  it("retorna apenas livros aderentes ao foco informado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({
        results: [
          {
            id: 101,
            title: "Science and Technology for Students",
            subjects: ["Science -- Study and teaching", "Technology"],
            bookshelves: ["Education"],
            languages: ["en"],
            authors: [{ name: "A. Researcher" }],
            download_count: 2500,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/science.pdf",
              "text/html": "https://example.org/science.html",
            },
          },
          {
            id: 202,
            title: "Love Poems Collection",
            subjects: ["Poetry", "Love stories"],
            bookshelves: ["Poetry"],
            languages: ["en"],
            authors: [{ name: "P. Poet" }],
            download_count: 9000,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/poetry.pdf",
            },
          },
          {
            id: 303,
            title: "Manual de Quimica Experimental para Escola",
            subjects: ["Quimica", "Experimentos"],
            bookshelves: ["Educacao"],
            languages: ["pt"],
            authors: [{ name: "C. Professora" }],
            download_count: 1800,
            copyright: false,
            formats: {
              "application/epub+zip": "https://example.org/quimica.epub",
              "text/html": "https://example.org/quimica.html",
            },
          },
        ],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const response = await handler({
      httpMethod: "GET",
      queryStringParameters: {
        query: "quimica",
        limit: "10",
      },
      headers: {},
    });

    const payload = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.books)).toBe(true);
    expect(payload?.sectiMagazine && typeof payload.sectiMagazine === "object").toBe(true);
    expect(String(payload?.sectiMagazine?.pdfUrl || "").length).toBeGreaterThan(0);
    expect(payload.books.some((book) => String(book.id) === "303")).toBe(true);
    expect(payload.books.some((book) => String(book.id) === "202")).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("prioriza livros em portugues quando houver oferta suficiente", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({
        results: [
          {
            id: 501,
            title: "Introducao a Fisica Experimental",
            subjects: ["Fisica", "Educacao Cientifica"],
            bookshelves: ["Educacao"],
            languages: ["pt"],
            authors: [{ name: "L. Docente" }],
            download_count: 1400,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/pt1.pdf",
            },
          },
          {
            id: 502,
            title: "Manual de Quimica para Escolas",
            subjects: ["Quimica", "Laboratorio"],
            bookshelves: ["Educacao"],
            languages: ["pt"],
            authors: [{ name: "A. Pesquisadora" }],
            download_count: 1600,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/pt2.pdf",
            },
          },
          {
            id: 503,
            title: "Biologia e Metodo Cientifico",
            subjects: ["Biologia", "Experimentos"],
            bookshelves: ["Educacao"],
            languages: ["pt"],
            authors: [{ name: "C. Biologa" }],
            download_count: 1100,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/pt3.pdf",
            },
          },
          {
            id: 504,
            title: "Tecnologia e Inovacao na Escola",
            subjects: ["Tecnologia", "Inovacao"],
            bookshelves: ["Educacao"],
            languages: ["pt"],
            authors: [{ name: "M. Coordenadora" }],
            download_count: 980,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/pt4.pdf",
            },
          },
          {
            id: 505,
            title: "Science Experiments Handbook",
            subjects: ["Science", "School"],
            bookshelves: ["Education"],
            languages: ["en"],
            authors: [{ name: "S. Mentor" }],
            download_count: 2100,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/en1.pdf",
            },
          },
          {
            id: 506,
            title: "Engineering and Innovation for Students",
            subjects: ["Engineering", "Innovation"],
            bookshelves: ["Education"],
            languages: ["en"],
            authors: [{ name: "T. Instructor" }],
            download_count: 1900,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/en2.pdf",
            },
          },
        ],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const response = await handler({
      httpMethod: "GET",
      queryStringParameters: {
        limit: "6",
      },
      headers: {},
    });

    const payload = JSON.parse(response.body);
    const ptCount = payload.books.filter((book) => book?.isPortugueseSource === true).length;
    const intlCount = payload.books.length - ptCount;

    expect(response.statusCode).toBe(200);
    expect(ptCount).toBeGreaterThan(intlCount);
    expect(Number(payload?.robot?.portugueseSelected || 0)).toBe(ptCount);
  });

  it("filtra conteudo adulto explicito e mantem livros cientificos sobre sexo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({
        results: [
          {
            id: 9101,
            title: "Educacao Sexual e Saude Reprodutiva na Escola",
            subjects: ["Educacao sexual", "Saude reprodutiva", "Biologia humana"],
            bookshelves: ["Educacao"],
            languages: ["pt"],
            authors: [{ name: "D. Docente" }],
            download_count: 1800,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/educacao-sexual.pdf",
            },
          },
          {
            id: 9102,
            title: "Colecao Erotica XXX para Adultos",
            subjects: ["Erotica", "Adult content", "Contos"],
            bookshelves: ["Literatura"],
            languages: ["pt"],
            authors: [{ name: "X. Autor" }],
            download_count: 2600,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/erotica.pdf",
            },
          },
        ],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const response = await handler({
      httpMethod: "GET",
      queryStringParameters: {
        intent: "formacao cientifica escolar",
        query: "sexo",
        limit: "10",
      },
      headers: {},
    });

    const payload = JSON.parse(response.body);
    const selectedIds = new Set(payload.books.map((book) => String(book?.id || "")));

    expect(response.statusCode).toBe(200);
    expect(payload.success).toBe(true);
    expect(selectedIds.has("9101")).toBe(true);
    expect(selectedIds.has("9102")).toBe(false);
  });

  it("exclui livros sem sinal cientifico mesmo quando aderentes ao tema textual", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({
        results: [
          {
            id: 9201,
            title: "Historia Medieval das Monarquias Europeias",
            subjects: ["Historia", "Monarquias", "Cultura geral"],
            bookshelves: ["History"],
            languages: ["pt"],
            authors: [{ name: "H. Autor" }],
            download_count: 2200,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/historia-medieval.pdf",
            },
          },
          {
            id: 9202,
            title: "Fisica Experimental para Ensino Medio",
            subjects: ["Fisica", "Experimentos", "Laboratorio"],
            bookshelves: ["Science", "Education"],
            languages: ["pt"],
            authors: [{ name: "L. Professora" }],
            download_count: 1700,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/fisica-experimental.pdf",
            },
          },
        ],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const response = await handler({
      httpMethod: "GET",
      queryStringParameters: {
        intent: "formacao escolar",
        query: "historia",
        limit: "10",
      },
      headers: {},
    });

    const payload = JSON.parse(response.body);
    const selectedIds = new Set(payload.books.map((book) => String(book?.id || "")));

    expect(response.statusCode).toBe(200);
    expect(payload.success).toBe(true);
    expect(selectedIds.has("9201")).toBe(false);
    expect(selectedIds.has("9202")).toBe(true);
  });

  it("usa cache para repeticao da mesma busca", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({
        results: [
          {
            id: 401,
            title: "Engineering Experiments in School",
            subjects: ["Engineering", "Education"],
            bookshelves: ["Science"],
            languages: ["en"],
            authors: [{ name: "E. Mentor" }],
            download_count: 1200,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/eng.pdf",
            },
          },
        ],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await handler({
      httpMethod: "GET",
      queryStringParameters: {
        intent: "ciencia e tecnologia escolar",
        query: "engineering",
      },
      headers: {},
    });

    fetchMock.mockClear();

    const secondResponse = await handler({
      httpMethod: "GET",
      queryStringParameters: {
        intent: "ciencia e tecnologia escolar",
        query: "engineering",
      },
      headers: {},
    });

    const payload = JSON.parse(secondResponse.body);

    expect(secondResponse.statusCode).toBe(200);
    expect(payload.cacheHit).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("combina fontes em portugues sem excluir fontes internacionais existentes", async () => {
    const fetchMock = vi.fn(async (url) => {
      const normalizedUrl = String(url || "");

      if (normalizedUrl.includes("gutendex.com/books")) {
        return createFetchResponse({
          results: [
            {
              id: 701,
              title: "Science Classroom Experiments",
              subjects: ["Science", "Education"],
              bookshelves: ["Education"],
              languages: ["en"],
              authors: [{ name: "S. Teacher" }],
              download_count: 2400,
              copyright: false,
              formats: {
                "application/pdf": "https://example.org/science-classroom.pdf",
              },
            },
          ],
        });
      }

      if (normalizedUrl.includes("openlibrary.org/search.json")) {
        return createFetchResponse({
          docs: [
            {
              key: "/works/OL999W",
              title: "Tecnologia e Inovacao para Escolas",
              author_name: ["L. Pesquisadora"],
              language: ["por"],
              has_fulltext: true,
              ebook_access: "public",
              subject: ["Tecnologia", "Educacao Cientifica"],
              cover_i: 123456,
              ia: ["tecnologiaescolas2024"],
              edition_count: 2,
            },
          ],
        });
      }

      if (normalizedUrl.includes("pt.wikisource.org/w/api.php")) {
        return createFetchResponse({
          query: {
            search: [
              {
                pageid: 9911,
                title: "Noções de ciência para escolas",
                wordcount: 2800,
                snippet: "obra em ciencia e tecnologia para estudantes",
              },
            ],
          },
        });
      }

      return createFetchResponse({ results: [] });
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await handler({
      httpMethod: "GET",
      queryStringParameters: {
        query: "ciencia tecnologia",
        limit: "8",
      },
      headers: {},
    });

    const payload = JSON.parse(response.body);
    const sourceIds = new Set(payload.books.map((book) => String(book?.sourceId || "")));

    expect(response.statusCode).toBe(200);
    expect(payload.success).toBe(true);
    expect(sourceIds.has("openlibrary")).toBe(true);
    expect(sourceIds.has("gutendex")).toBe(true);
    expect(Array.isArray(payload?.robot?.sourceStats)).toBe(true);
    expect(payload.robot.sourceStats.length).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(payload?.robot?.portuguesePortals)).toBe(true);
    expect(payload.robot.portuguesePortals.length).toBeGreaterThanOrEqual(3);
  });

  it("reaproveita consulta em andamento para reduzir chamadas simultaneas", async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 35));
      return createFetchResponse({
        results: [
          {
            id: 8801,
            title: "Manual de Robotica Escolar",
            subjects: ["Robotica", "Educacao"],
            bookshelves: ["Educacao"],
            languages: ["pt"],
            authors: [{ name: "R. Tutor" }],
            download_count: 900,
            copyright: false,
            formats: {
              "application/pdf": "https://example.org/robotica.pdf",
            },
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      handler({
        httpMethod: "GET",
        queryStringParameters: {
          intent: "ciencia aplicada",
          query: "robotica",
          limit: "12",
        },
        headers: {},
      }),
      handler({
        httpMethod: "GET",
        queryStringParameters: {
          intent: "ciencia aplicada",
          query: "robotica",
          limit: "12",
        },
        headers: {},
      }),
    ]);

    const firstPayload = JSON.parse(first.body);
    const secondPayload = JSON.parse(second.body);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(firstPayload.success).toBe(true);
    expect(secondPayload.success).toBe(true);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it("sanitiza fallback de cache e remove itens explicitos antes de exibir", async () => {
    globalThis.__libraryBooksCache = new Map([
      [
        "cache-misto-recente",
        {
          createdAt: Date.now(),
          payload: {
            success: true,
            books: [
              {
                id: "99001",
                title: "Colecao Adult-Content XXX",
                authors: [{ name: "Autor X" }],
                languages: ["pt"],
                subjects: ["Erotica", "Adult-content", "Contos"],
                bookshelves: ["Literatura"],
                downloadCount: 3200,
                relevanceScore: 0.91,
                downloads: {
                  pdf: "https://example.org/explicito.pdf",
                },
                sourceUrl: "https://example.org/explicito",
                sourceName: "Fonte livre",
                sourceId: "openlibrary",
                publicDomain: true,
              },
              {
                id: "99002",
                title: "Manual de Ciencia para Escola",
                authors: [{ name: "Prof. A" }],
                languages: ["pt"],
                subjects: ["Ciencia", "Educacao"],
                bookshelves: ["Educacao"],
                downloadCount: 1800,
                relevanceScore: 0.74,
                downloads: {
                  pdf: "https://example.org/ciencia.pdf",
                },
                sourceUrl: "https://example.org/ciencia",
                sourceName: "Fonte livre",
                sourceId: "openlibrary",
                publicDomain: true,
              },
            ],
          },
        },
      ],
    ]);

    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handler({
      httpMethod: "GET",
      queryStringParameters: {
        intent: "formacao cientifica escolar",
        query: "sexo",
        limit: "6",
        forceRefresh: "1",
      },
      headers: {},
    });

    const payload = JSON.parse(response.body);
    const selectedIds = new Set(payload.books.map((book) => String(book?.id || "")));

    expect(response.statusCode).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload?.robot?.degradedMode).toBe(true);
    expect(payload?.robot?.fallbackSource).toBe("cache");
    expect(selectedIds.has("99001")).toBe(false);
    expect(selectedIds.has("99002")).toBe(true);
  });

  it("retorna modo degradado quando todas as fontes externas falham", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handler({
      httpMethod: "GET",
      queryStringParameters: {
        intent: "ciencia e tecnologia escolar",
        query: "robotica",
        limit: "12",
      },
      headers: {},
    });

    const payload = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.books)).toBe(true);
    expect(payload.books.length).toBeGreaterThan(0);
    expect(payload?.robot?.degradedMode).toBe(true);
    expect(payload?.robot?.fallbackSource).toBe("static");
    expect(
      Array.isArray(payload?.robot?.warnings)
      && payload.robot.warnings.some((warning) => String(warning).includes("Nao foi possivel consultar fontes")),
    ).toBe(true);
  });
});
