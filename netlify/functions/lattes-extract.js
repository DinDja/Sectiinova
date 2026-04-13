function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

function decodeHtmlEntities(value = "") {
  const namedEntities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&ccedil;": "ç",
    "&Ccedil;": "Ç",
    "&atilde;": "ã",
    "&Atilde;": "Ã",
    "&otilde;": "õ",
    "&Otilde;": "Õ",
    "&aacute;": "á",
    "&Aacute;": "Á",
    "&eacute;": "é",
    "&Eacute;": "É",
    "&iacute;": "í",
    "&Iacute;": "Í",
    "&oacute;": "ó",
    "&Oacute;": "Ó",
    "&uacute;": "ú",
    "&Uacute;": "Ú",
    "&agrave;": "à",
    "&Agrave;": "À",
    "&ecirc;": "ê",
    "&Ecirc;": "Ê",
    "&ocirc;": "ô",
    "&Ocirc;": "Ô",
    "&uuml;": "ü",
    "&Uuml;": "Ü",
  };

  let decoded = String(value || "");
  Object.entries(namedEntities).forEach(([entity, char]) => {
    decoded = decoded.split(entity).join(char);
  });

  decoded = decoded.replace(/&#(\d+);/g, (_, code) => {
    const parsed = Number(code);
    return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
  });

  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const parsed = Number.parseInt(hex, 16);
    return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
  });

  return decoded;
}

function normalizeWhitespace(value = "") {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value = "") {
  return normalizeWhitespace(
    decodeHtmlEntities(
      String(value || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function extractLattesNumericId(value = "") {
  const matched = String(value || "").match(/(\d{16})/);
  return matched?.[1] || "";
}

function extractSectionChunk(html = "", headingPattern) {
  const headingMatch = html.match(headingPattern);
  if (!headingMatch?.index && headingMatch?.index !== 0) {
    return "";
  }

  const startIndex = headingMatch.index;
  const tail = html.slice(startIndex);
  const nextHeadingIndex = tail
    .slice(1)
    .search(/<h[1-4][^>]*>/i);
  if (nextHeadingIndex < 0) {
    return tail;
  }

  return tail.slice(0, nextHeadingIndex + 1);
}

function extractListItems(html = "") {
  const items = [];
  const listMatches = html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);

  for (const match of listMatches) {
    const text = stripHtml(match[1]);
    if (text) {
      items.push(text);
    }
  }

  if (items.length > 0) {
    return [...new Set(items)];
  }

  const tableRowMatches = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const rowMatch of tableRowMatches) {
    const columns = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((match) => stripHtml(match[1]))
      .filter(Boolean);

    if (columns.length > 0) {
      items.push(columns.join(" · "));
    }
  }

  return [...new Set(items)];
}

function parseLattesHtml(html = "", normalizedLink = "", idLattes = "") {
  const isCaptcha =
    /tokenCaptchar|divCaptcha|C[oó]digo de seguran[çc]a|g-recaptcha|captcha/i.test(
      html,
    );

  const idHash =
    html.match(/name=["']id["']\s+value=["']([^"']+)["']/i)?.[1] || "";

  if (isCaptcha) {
    return {
      success: false,
      requiresCaptcha: true,
      message:
        "O portal do CNPq solicitou CAPTCHA e bloqueou a leitura automática. Tente novamente mais tarde.",
      data: {
        id_lattes: idLattes || "",
        id_hash: idHash,
        link: normalizedLink,
      },
    };
  }

  const nome =
    stripHtml(
      html.match(/Curr[ií]culo do Sistema de Curr[ií]culos Lattes\s*\(([^)]+)\)/i)?.[1] ||
        html.match(/<h[12][^>]*class=["'][^"']*nome[^"']*["'][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1] ||
        html.match(/<title>\s*([^<]{5,})\s*<\/title>/i)?.[1] ||
        "",
    ) || "";

  const resumoSection = extractSectionChunk(
    html,
    /Resumo informado pelo autor|Resumo|summary/i,
  );
  const resumo = stripHtml(
    resumoSection.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ||
      resumoSection.match(/<div[^>]*id=["']resumo["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
      "",
  );

  const areasSection = extractSectionChunk(
    html,
    /[ÁA]reas de atua[çc][ãa]o|Areas de atuacao/i,
  );
  const areasAtuacao = extractListItems(areasSection);

  const formacaoSection = extractSectionChunk(
    html,
    /Forma[çc][ãa]o acad[êe]mica\/titula[çc][ãa]o|Formacao academica\/titulacao/i,
  );
  const formacaoAcademica = extractListItems(formacaoSection);

  const ultimaAtualizacao =
    stripHtml(
      html.match(/[ÚU]ltima atualiza[çc][ãa]o do curr[ií]culo em\s*([^<\n]+)/i)?.[1] ||
        "",
    ) || "";

  const hasUsefulData = Boolean(
    nome ||
      resumo ||
      ultimaAtualizacao ||
      areasAtuacao.length > 0 ||
      formacaoAcademica.length > 0,
  );

  if (!hasUsefulData) {
    return {
      success: false,
      requiresCaptcha: false,
      message:
        "Não foi possível extrair campos do currículo neste momento a partir do link informado.",
      data: {
        id_lattes: idLattes || "",
        id_hash: idHash,
        link: normalizedLink,
      },
    };
  }

  return {
    success: true,
    requiresCaptcha: false,
    message: "",
    data: {
      id_lattes: idLattes || "",
      id_hash: idHash,
      link: normalizedLink,
      nome,
      resumo,
      areas_atuacao: areasAtuacao,
      formacao_academica: formacaoAcademica,
      ultima_atualizacao: ultimaAtualizacao,
      fonte: "lattes-cnpq",
      sincronizado_em: new Date().toISOString(),
    },
  };
}

async function extractLattesFromLink(link = "") {
  const trimmedLink = String(link || "").trim();
  if (!trimmedLink) {
    return {
      success: false,
      requiresCaptcha: false,
      message: "Informe o link do Currículo Lattes.",
      data: null,
    };
  }

  let normalizedLink = trimmedLink;
  const numericId = extractLattesNumericId(trimmedLink);

  if (numericId) {
    normalizedLink = `https://lattes.cnpq.br/${numericId}`;
  } else {
    try {
      const parsed = new URL(trimmedLink);
      if (!/^https?:$/i.test(parsed.protocol)) {
        throw new Error("Protocolo inválido");
      }
      normalizedLink = parsed.toString();
    } catch {
      return {
        success: false,
        requiresCaptcha: false,
        message: "Link do Lattes inválido.",
        data: null,
      };
    }
  }

  const response = await fetch(normalizedLink, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "SECTI-Lattes-Extractor/1.0",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    return {
      success: false,
      requiresCaptcha: false,
      message: "Falha ao consultar o link do Lattes.",
      data: null,
    };
  }

  const html = await response.text();
  const parsed = parseLattesHtml(html, normalizedLink, numericId);
  return parsed;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, {
      success: false,
      error: "Método não suportado. Use POST.",
    });
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
      : String(event.body || "");
    const body = rawBody ? JSON.parse(rawBody) : {};
    const link = String(body?.link || "");

    const result = await extractLattesFromLink(link);
    return json(200, result);
  } catch (error) {
    return json(502, {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha inesperada ao consultar dados do Lattes.",
    });
  }
}

