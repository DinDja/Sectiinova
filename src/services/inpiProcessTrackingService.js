const OFFICIAL_SEARCH_URL = "https://busca.inpi.gov.br/pePI/";

const OFFICIAL_SEARCH_URLS = {
  patente: "https://busca.inpi.gov.br/pePI/jsp/patentes/PatenteSearchBasico.jsp",
  marca: "https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_num_processo.jsp",
  programa:
    "https://busca.inpi.gov.br/pePI/jsp/programas/ProgramaSearchBasico.jsp",
};

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value = "") {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparableText(value = "") {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°ª]/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function createDocument(html) {
  return new DOMParser().parseFromString(String(html || ""), "text/html");
}

function normalizeNoticeText(value = "") {
  const text = createDocument(String(value || "")).body?.textContent || value;
  return normalizeText(text).replace(/\\+/g, " ").replace(/\s+/g, " ").trim();
}

function getRestrictedAccessNotice(payload = {}) {
  const explicitTitle = normalizeText(payload.noticeTitle) || "Pedido localizado com acesso restrito";
  const explicitMessage = normalizeNoticeText(payload.noticeMessage);

  if (explicitMessage) {
    return {
      title: explicitTitle,
      message: explicitMessage,
    };
  }

  const pageText = normalizeNoticeText(
    createDocument(payload.searchHtml).body?.textContent || "",
  );
  const comparableText = normalizeComparableText(pageText);

  if (
    !comparableText.includes("consta em nosso banco de dados") ||
    !comparableText.includes("meus pedidos") ||
    !comparableText.includes("login e senha")
  ) {
    return null;
  }

  const extractedMessage =
    pageText.match(/AVISO\s*:?\s*(.+?)(?=Dados atualizados at[eé]|Rua Mayrink Veiga|$)/i)?.[1] ||
    "";
  const processNumber = normalizeText(
    payload.restrictedProcessNumber || payload.query,
  );

  return {
    title: explicitTitle,
    message:
      normalizeNoticeText(extractedMessage) ||
      `O INPI informou que o pedido ${processNumber} consta na base, mas o detalhe depende de login e acesso em Meus pedidos.`,
  };
}

function getSearchResultData(sourceId, searchHtml) {
  const searchDocument = createDocument(searchHtml);
  const pageText = normalizeText(searchDocument.body?.textContent || "");
  const totalResultsMatch = pageText.match(/Foram encontrados (\d+) processos/i);
  const detailAnchors = Array.from(searchDocument.querySelectorAll("a[href]"));
  const firstDetailAnchor = detailAnchors.find((anchor) => {
    const href = anchor.getAttribute("href") || "";

    if (sourceId === "programa") {
      return href.includes("ProgramaServletController?Action=detail");
    }

    if (sourceId === "marca") {
      return href.includes("MarcasServletController?Action=detail");
    }

    return href.includes("PatenteServletController?Action=detail");
  });
  const firstRow = firstDetailAnchor?.closest("tr") || null;

  if (!firstRow) {
    return {
      found: false,
      totalResults: Number(totalResultsMatch?.[1] || 0),
      detailPath: "",
    };
  }

  const cells = Array.from(firstRow.children);
  const detailPath = firstDetailAnchor?.getAttribute("href") || "";

  if (sourceId === "marca") {
    return {
      found: true,
      totalResults: Number(totalResultsMatch?.[1] || 1),
      detailPath,
      processNumber: normalizeText(cells[0]?.textContent),
      depositDate: normalizeText(cells[1]?.textContent),
      title: normalizeText(cells[3]?.textContent),
      statusFromSearch: normalizeText(cells[5]?.textContent),
      holderFromSearch: normalizeText(cells[6]?.textContent),
      extraFromSearch: normalizeText(cells[7]?.textContent),
    };
  }

  return {
    found: true,
    totalResults: Number(totalResultsMatch?.[1] || 1),
    detailPath,
    processNumber: normalizeText(cells[0]?.textContent),
    depositDate: normalizeText(cells[1]?.textContent),
    title: normalizeText(cells[2]?.textContent),
    extraFromSearch: normalizeText(cells[3]?.textContent),
  };
}

function findRowCellsByLabel(detailDocument, fragments) {
  const rows = Array.from(detailDocument.querySelectorAll("tr"));
  const normalizedFragments = fragments.map((fragment) =>
    normalizeComparableText(fragment),
  );

  for (const row of rows) {
    const cells = Array.from(row.children).filter(
      (cell) => cell.tagName === "TD",
    );

    if (cells.length < 2) continue;

    const labelText = normalizeComparableText(cells[0].textContent);
    const matched = normalizedFragments.some((fragment) =>
      labelText.includes(fragment),
    );

    if (matched) {
      return cells;
    }
  }

  return [];
}

function getFieldValue(detailDocument, fragments) {
  const cells = findRowCellsByLabel(detailDocument, fragments);
  return normalizeText(cells[1]?.textContent || "");
}

function getAccordionSection(detailDocument, fragments) {
  const labels = Array.from(detailDocument.querySelectorAll("label"));
  const normalizedFragments = fragments.map((fragment) =>
    normalizeComparableText(fragment),
  );

  return (
    labels.find((label) => {
      const text = normalizeComparableText(label.textContent);
      return normalizedFragments.some((fragment) => text.includes(fragment));
    })?.closest(".accordion-item") || null
  );
}

function getSectionRows(detailDocument, fragments) {
  const section = getAccordionSection(detailDocument, fragments);
  const table = section?.querySelector(".accordion-content table");
  const body = table?.tBodies?.[0] || table?.querySelector("tbody");

  if (!body) {
    return [];
  }

  return Array.from(body.children).filter((row) => row.tagName === "TR");
}

function getRowCells(row) {
  return Array.from(row?.children || []).filter((cell) =>
    ["TD", "TH"].includes(cell.tagName),
  );
}

function getSectionEntries(detailDocument, fragments, valueIndex = 1) {
  return getSectionRows(detailDocument, fragments)
    .map((row) => normalizeText(getRowCells(row)[valueIndex]?.textContent || ""))
    .filter(Boolean);
}

function getMarkDates(detailDocument) {
  const firstRow = getSectionRows(detailDocument, ["datas"])[0];
  const cells = getRowCells(firstRow);

  return {
    depositDate: normalizeText(cells[0]?.textContent || ""),
    grantDate: normalizeText(cells[1]?.textContent || ""),
    validityDate: normalizeText(cells[2]?.textContent || ""),
  };
}

function getMarkClasses(detailDocument) {
  return Array.from(
    new Set(
      getSectionRows(detailDocument, ["classificacao de produtos", "classe de nice"])
        .map((row) => normalizeText(getRowCells(row)[0]?.textContent || ""))
        .filter(Boolean),
    ),
  );
}

function getIpcCodes(detailDocument) {
  const cells = findRowCellsByLabel(detailDocument, ["classificacao ipc"]);
  const valueCell = cells[1];

  if (!valueCell) {
    return [];
  }

  const links = Array.from(valueCell.querySelectorAll("a.normal"))
    .map((anchor) => normalizeText(anchor.textContent))
    .filter(Boolean);

  const uniqueCodes = new Set(
    links
      .map((value) => value.replace(/;$/, ""))
      .filter((value) => /[A-H][0-9]{2}[A-Z]/i.test(value)),
  );

  return Array.from(uniqueCodes);
}

function getPresentationType(detailDocument) {
  const boldTexts = Array.from(detailDocument.querySelectorAll("b"))
    .map((node) => normalizeText(node.textContent))
    .filter(Boolean);

  return (
    boldTexts.find((text) =>
      /deposito|depósito|patente|modelo|programa/i.test(
        normalizeComparableText(text),
      ),
    ) || "Processo INPI"
  );
}

function getDispatchHistory(detailDocument) {
  const targetTable = Array.from(detailDocument.querySelectorAll("table")).find(
    (table) => {
      const tableText = normalizeText(table.textContent).toLowerCase();
      return tableText.includes("data rpi") && tableText.includes("despacho");
    },
  );

  if (!targetTable) {
    return [];
  }

  const body = targetTable.tBodies?.[0] || targetTable.querySelector("tbody");
  if (!body) {
    return [];
  }

  const rows = Array.from(body.children).filter(
    (element) => element.tagName === "TR",
  );

  return rows
    .map((row) => {
      const cells = Array.from(row.children).filter(
        (cell) => cell.tagName === "TD",
      );

      if (cells.length < 5) {
        return null;
      }

      const rpiEdition = normalizeText(cells[0].textContent);
      if (!/^\d+$/.test(rpiEdition)) {
        return null;
      }

      const rawDispatchText = normalizeText(cells[2].textContent);
      const code = normalizeText(cells[2].querySelector("a")?.textContent || "");
      const descriptionText = normalizeText(
        cells[2].querySelector("div td[align='left'] font.normal")?.textContent ||
          cells[2].querySelector("div font.normal")?.textContent ||
          "",
      );
      const description = (descriptionText || rawDispatchText).replace(
        new RegExp(`^${escapeRegExp(code)}\\s*`),
        "",
      );

      return {
        rpiEdition,
        rpiDate: normalizeText(cells[1].textContent),
        code,
        description: description || rawDispatchText,
        complement: normalizeText(cells[cells.length - 1]?.textContent || ""),
      };
    })
    .filter(Boolean);
}

function getTooltipValue(detailDocument, fragments) {
  const cells = findRowCellsByLabel(detailDocument, fragments);
  const valueCell = cells[1];

  if (!valueCell) {
    return {
      code: "",
      description: "",
      display: "",
    };
  }

  const code = normalizeText(valueCell.querySelector("a.normal")?.textContent);
  const rawDescription = normalizeText(
    valueCell.querySelector("div font.normal")?.textContent || "",
  );
  const description = rawDescription.replace(
    new RegExp(`^${escapeRegExp(code)}\\s*`),
    "",
  );

  return {
    code,
    description,
    display: [code, description].filter(Boolean).join(" - "),
  };
}

function getProcessPetitions(detailDocument) {
  const targetTable = Array.from(detailDocument.querySelectorAll("table")).find(
    (table) => {
      const text = normalizeComparableText(table.textContent);
      return (
        text.includes("protocolo") &&
        text.includes("servico") &&
        text.includes("cliente")
      );
    },
  );

  if (!targetTable) {
    return [];
  }

  const body = targetTable.tBodies?.[0] || targetTable.querySelector("tbody");
  if (!body) {
    return [];
  }

  return Array.from(body.children)
    .filter((row) => row.tagName === "TR")
    .map((row) => {
      const cells = Array.from(row.children).filter(
        (cell) => cell.tagName === "TD",
      );

      if (cells.length < 9) {
        return null;
      }

      const protocol = normalizeText(cells[1].textContent);
      if (!protocol) {
        return null;
      }

      const serviceCode = normalizeText(
        cells[5].querySelector("a")?.textContent || cells[5].textContent,
      );
      const serviceDescription = normalizeText(
        cells[5].querySelector("div font.normal")?.textContent || "",
      ).replace(new RegExp(`^${escapeRegExp(serviceCode)}\\s*`), "");

      return {
        paymentStatus: normalizeText(cells[0].querySelector("img")?.alt || ""),
        protocol,
        date: normalizeText(cells[2].textContent),
        serviceCode,
        serviceDescription,
        client: normalizeText(cells[6].textContent),
        deliveryDate: normalizeText(cells[8].textContent),
      };
    })
    .filter(Boolean);
}

function inferToneFromText(value = "") {
  const text = normalizeComparableText(value);

  if (
    text.includes("concedido") ||
    text.includes("deferido") ||
    text.includes("registrado")
  ) {
    return "emerald";
  }

  if (
    text.includes("indefer") ||
    text.includes("arquivad") ||
    text.includes("extint") ||
    text.includes("peticao nao conhecida")
  ) {
    return "amber";
  }

  if (text.includes("exame")) {
    return "indigo";
  }

  if (text.includes("publicad") || text.includes("notificacao")) {
    return "sky";
  }

  return "slate";
}

function inferStatus(sourceId, grantDate, latestDispatch, explicitStatus = "") {
  if (explicitStatus) {
    return {
      label: explicitStatus,
      tone: inferToneFromText(explicitStatus),
    };
  }

  if (grantDate && grantDate !== "-") {
    return {
      label: "Concedido",
      tone: "emerald",
    };
  }

  const latestText = normalizeComparableText(
    `${latestDispatch?.description || ""} ${latestDispatch?.complement || ""}`,
  );

  if (latestText.includes("peticao nao conhecida")) {
    return {
      label: "Peticao nao conhecida",
      tone: "amber",
    };
  }

  if (latestText.includes("manutencao do arquivamento")) {
    return {
      label: "Arquivamento mantido",
      tone: "red",
    };
  }

  if (latestText.includes("arquivamento")) {
    return {
      label: "Arquivado",
      tone: "amber",
    };
  }

  if (latestText.includes("publicado")) {
    return {
      label: "Publicado",
      tone: "sky",
    };
  }

  if (latestText.includes("pedido de exame")) {
    return {
      label: "Exame requerido",
      tone: "indigo",
    };
  }

  if (latestText.includes("publicado") || latestText.includes("registro")) {
    return {
      label: sourceId === "programa" ? "Publicado na RPI" : "Publicado",
      tone: "sky",
    };
  }

  if (latestDispatch?.description) {
    return {
      label: latestDispatch.description,
      tone: "slate",
    };
  }

  return {
    label: sourceId === "programa" ? "Registro localizado" : "Em tramitacao",
    tone: "slate",
  };
}

function buildRestrictedProcessSummary(payload, restrictedNotice) {
  const sourceId = payload.sourceId || payload.requestedSourceId || "patente";
  const sourceLabel =
    payload.sourceLabel || payload.requestedSourceLabel || "Busca INPI";
  const processNumber = normalizeText(
    payload.restrictedProcessNumber || payload.query,
  );
  const title = processNumber
    ? `Pedido ${processNumber} localizado no INPI`
    : "Pedido localizado no INPI";

  return {
    found: true,
    accessRestricted: true,
    publicDataAvailable: false,
    requiresAuthenticatedPortalAccess: true,
    query: payload.query,
    requestedSourceId: payload.requestedSourceId || "automatico",
    requestedSourceLabel: payload.requestedSourceLabel || "Busca automatica",
    sourceId,
    sourceLabel,
    fetchedAt: payload.fetchedAt,
    contentHash: payload.contentHash || "",
    officialSearchUrl:
      payload.officialSearchUrl || OFFICIAL_SEARCH_URLS[sourceId] || OFFICIAL_SEARCH_URL,
    totalResults: 1,
    summary: {
      presentationType: `${sourceLabel} • detalhe disponivel apenas com login`,
      processNumber,
      title,
      depositDate: "",
      publicationDate: "",
      grantDate: "-",
      accessNote: restrictedNotice?.message || "",
    },
    latestDispatch: null,
    dispatches: [],
    petitions: [],
    searchedSources: payload.searchedSources || [],
    status: {
      label: "Disponivel em Meus pedidos",
      tone: "amber",
    },
    notice: restrictedNotice,
  };
}

function buildPatentSummary(payload, searchData) {
  const detailDocument = createDocument(payload.detailHtml);
  const dispatches = getDispatchHistory(detailDocument);
  const latestDispatch = dispatches[0] || null;
  const grantDate = getFieldValue(detailDocument, ["data da concessao"]);

  return {
    found: true,
    query: payload.query,
    requestedSourceId: payload.requestedSourceId,
    requestedSourceLabel: payload.requestedSourceLabel,
    sourceId: payload.sourceId,
    sourceLabel: payload.sourceLabel,
    fetchedAt: payload.fetchedAt,
    contentHash: payload.contentHash || "",
    officialSearchUrl:
      payload.officialSearchUrl || OFFICIAL_SEARCH_URLS[payload.sourceId],
    totalResults: searchData.totalResults,
    summary: {
      presentationType: getPresentationType(detailDocument),
      processNumber:
        getFieldValue(detailDocument, ["n do pedido", "numero do pedido"]) ||
        searchData.processNumber,
      title: searchData.title,
      depositDate:
        getFieldValue(detailDocument, ["data do deposito"]) ||
        searchData.depositDate,
      publicationDate: getFieldValue(detailDocument, ["data da publicacao"]),
      grantDate,
      applicant: getFieldValue(detailDocument, ["nome do depositante"]),
      inventors: getFieldValue(detailDocument, ["nome do inventor"]),
      attorney: getFieldValue(detailDocument, ["nome do procurador"]),
      ipcCodes: getIpcCodes(detailDocument),
      ipcFromSearch: searchData.extraFromSearch,
    },
    latestDispatch,
    dispatches: dispatches.slice(0, 8),
    petitions: [],
    searchedSources: payload.searchedSources || [],
    status: inferStatus(payload.sourceId, grantDate, latestDispatch),
  };
}

function buildProgramSummary(payload, searchData) {
  const detailDocument = createDocument(payload.detailHtml);
  const dispatches = getDispatchHistory(detailDocument);
  const petitions = getProcessPetitions(detailDocument);
  const latestDispatch = dispatches[0] || null;
  const applicationField = getTooltipValue(detailDocument, ["campo de aplicacao"]);
  const programType = getTooltipValue(detailDocument, ["tipo programa"]);

  return {
    found: true,
    query: payload.query,
    requestedSourceId: payload.requestedSourceId,
    requestedSourceLabel: payload.requestedSourceLabel,
    sourceId: payload.sourceId,
    sourceLabel: payload.sourceLabel,
    fetchedAt: payload.fetchedAt,
    contentHash: payload.contentHash || "",
    officialSearchUrl:
      payload.officialSearchUrl || OFFICIAL_SEARCH_URLS[payload.sourceId],
    totalResults: searchData.totalResults,
    summary: {
      presentationType: getPresentationType(detailDocument),
      processNumber:
        getFieldValue(detailDocument, ["n do pedido", "numero do pedido"]) ||
        searchData.processNumber,
      title:
        getFieldValue(detailDocument, ["titulo"]) || searchData.title,
      depositDate:
        getFieldValue(detailDocument, ["data do deposito"]) ||
        searchData.depositDate,
      publicationDate: latestDispatch?.rpiDate || "",
      grantDate: "-",
      holder: getFieldValue(detailDocument, ["nome do titular"]),
      author: getFieldValue(detailDocument, ["nome do autor"]),
      attorney: getFieldValue(detailDocument, ["nome do procurador"]),
      language: getFieldValue(detailDocument, ["linguagem"]),
      applicationField,
      programType,
    },
    latestDispatch,
    dispatches: dispatches.slice(0, 8),
    petitions,
    searchedSources: payload.searchedSources || [],
    status: inferStatus(payload.sourceId, "", latestDispatch),
  };
}

function buildMarkSummary(payload, searchData) {
  const detailDocument = createDocument(payload.detailHtml);
  const dispatches = getDispatchHistory(detailDocument);
  const petitions = getProcessPetitions(detailDocument);
  const latestDispatch = dispatches[0] || null;
  const dates = getMarkDates(detailDocument);
  const holders = getSectionEntries(detailDocument, ["titulares"]);
  const attorneys = getSectionEntries(detailDocument, ["representante legal"]);
  const presentation = getFieldValue(detailDocument, ["apresentacao"]);
  const nature = getFieldValue(detailDocument, ["natureza"]);
  const situation =
    getFieldValue(detailDocument, ["situacao"]) || searchData.statusFromSearch;

  return {
    found: true,
    query: payload.query,
    requestedSourceId: payload.requestedSourceId,
    requestedSourceLabel: payload.requestedSourceLabel,
    sourceId: payload.sourceId,
    sourceLabel: payload.sourceLabel,
    fetchedAt: payload.fetchedAt,
    contentHash: payload.contentHash || "",
    officialSearchUrl:
      payload.officialSearchUrl || OFFICIAL_SEARCH_URLS[payload.sourceId],
    totalResults: searchData.totalResults,
    summary: {
      presentationType: ["Marca", presentation, nature].filter(Boolean).join(" • "),
      processNumber:
        getFieldValue(detailDocument, ["n do processo", "numero do processo"]) ||
        searchData.processNumber,
      title: getFieldValue(detailDocument, ["marca"]) || searchData.title,
      depositDate: dates.depositDate || searchData.depositDate,
      publicationDate: latestDispatch?.rpiDate || "",
      grantDate: dates.grantDate || "-",
      validityDate: dates.validityDate || "-",
      holder: holders.join(" / ") || searchData.holderFromSearch,
      attorney: attorneys.join(" / "),
      presentation,
      nature,
      classes: getMarkClasses(detailDocument),
      classFromSearch: searchData.extraFromSearch,
    },
    latestDispatch,
    dispatches: dispatches.slice(0, 8),
    petitions,
    searchedSources: payload.searchedSources || [],
    status: inferStatus(payload.sourceId, dates.grantDate, latestDispatch, situation),
  };
}

function buildProcessSummary(payload) {
  const restrictedNotice = getRestrictedAccessNotice(payload);

  if (
    payload.accessRestricted ||
    payload.requiresAuthenticatedPortalAccess ||
    restrictedNotice
  ) {
    return buildRestrictedProcessSummary(payload, restrictedNotice);
  }

  const sourceId = payload.sourceId || payload.requestedSourceId || "patente";
  const searchData = getSearchResultData(sourceId, payload.searchHtml);

  if (!searchData.found || !payload.detailHtml) {
    return {
      found: false,
      totalResults: searchData.totalResults,
      query: payload.query,
      fetchedAt: payload.fetchedAt,
      contentHash: payload.contentHash || "",
      sourceId,
      sourceLabel: payload.sourceLabel || payload.requestedSourceLabel || "Busca INPI",
      requestedSourceId: payload.requestedSourceId || "automatico",
      requestedSourceLabel: payload.requestedSourceLabel || "Busca automatica",
      officialSearchUrl:
        payload.officialSearchUrl ||
        OFFICIAL_SEARCH_URLS[payload.requestedSourceId] ||
        OFFICIAL_SEARCH_URLS[sourceId] ||
        OFFICIAL_SEARCH_URL,
      searchedSources: payload.searchedSources || [],
    };
  }

  if (sourceId === "marca") {
    return buildMarkSummary(payload, searchData);
  }

  if (sourceId === "programa") {
    return buildProgramSummary(payload, searchData);
  }

  return buildPatentSummary(payload, searchData);
}

export async function fetchInpiProcessByNumber(processNumber, sourceId = "automatico") {
  const trimmedNumber = String(processNumber || "").trim();
  const trimmedSourceId = String(sourceId || "automatico").trim() || "automatico";

  if (!trimmedNumber) {
    throw new Error("Informe o número do pedido para consultar o INPI.");
  }

  const searchParams = new URLSearchParams({
    number: trimmedNumber,
    source: trimmedSourceId,
  });

  const response = await fetch(`/api/inpi/process?${searchParams.toString()}`);

  const rawResponse = await response.text();
  let payload = {};

  try {
    payload = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    if (response.status === 404 || response.status === 405) {
      throw new Error(
        "O endpoint /api/inpi/process não está disponível. Em local, rode o Next.js com npm run dev. Em produção na Netlify, confirme se a Function inpi-process foi publicada corretamente.",
      );
    }

    if (!rawResponse.trim()) {
      throw new Error("O endpoint do INPI não retornou conteúdo.");
    }

    throw new Error(payload?.error || "Falha ao consultar o INPI.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("O endpoint do INPI retornou um formato inválido.");
  }

  return buildProcessSummary(payload);
}

export { OFFICIAL_SEARCH_URL, OFFICIAL_SEARCH_URLS };

