"use client";

import { useEffect, useState } from "react";
import {
  AlignLeft,
  Archive,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileDown,
  FileText,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Info,
  List,
  Pencil,
  Trash2,
  X,
  Sparkles
} from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Header,
  PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { buildProfessorFolderId, formatDateTimeCompact, sanitizeFilePart } from "./inpiUtils";

const CM_TO_TWIPS = 567;

const INPI_PAGE_MARGINS = {
  top: Math.round(3 * CM_TO_TWIPS),
  left: Math.round(3 * CM_TO_TWIPS),
  bottom: Math.round(2 * CM_TO_TWIPS),
  right: Math.round(2 * CM_TO_TWIPS),
};

const RELATORIO_SECTIONS = [
  { key: "campo", title: "Campo tecnico" },
  { key: "estadoTecnica", title: "Estado da tecnica" },
  { key: "problema", title: "Problema tecnico e solucao" },
  { key: "desenhos", title: "Relacao das figuras" },
  { key: "descricao", title: "Descricao detalhada" },
  { key: "exemplos", title: "Exemplos de execucao" },
];

const REQUIRED_RELATORIO_FIELDS = [
  "titulo",
  "campo",
  "estadoTecnica",
  "problema",
  "desenhos",
  "descricao",
];

const normalizeLineText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const splitParagraphs = (value) =>
  String(value || "")
    .split(/\r?\n+/)
    .map((line) => normalizeLineText(line))
    .filter(Boolean);

const countWords = (value) =>
  normalizeLineText(value)
    .split(" ")
    .filter(Boolean).length;

const parseClaims = (rawValue) =>
  String(rawValue || "")
    .split(/\r?\n+/)
    .map((claim) => claim.replace(/^\s*\d+[\).\-\s]+/, ""))
    .map((claim) => normalizeLineText(claim))
    .filter(Boolean)
    .map((claim) => (claim.endsWith(".") ? claim : `${claim}.`));

const countCaracterizadoPor = (value) =>
  (String(value || "").toLowerCase().match(/caracterizado por/g) || []).length;

const formatSignatureDate = (value) => {
  const normalized = normalizeLineText(value);
  if (!normalized) return "[DD/MM/AAAA]";

  const [year, month, day] = normalized.split("-");
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }

  return normalized;
};

const buildTopPageNumberHeader = () =>
  new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
          new TextRun({
            font: "Arial",
            size: 24,
            color: "000000",
            children: [PageNumber.CURRENT, "/", PageNumber.TOTAL_PAGES],
          }),
        ],
      }),
    ],
  });

export default function GeradorDocumentos({ loggedUser, viewMode = "leitura_rapida" }) {
  const initialFormData = {
    titulo: "",
    campo: "",
    estadoTecnica: "",
    problema: "",
    desenhos: "",
    descricao: "",
    exemplos: "",
    reivindicacao: "",
    resumo: "",
    assinaturaNome: "",
    assinaturaCpf: "",
    assinaturaEmail: "",
    assinaturaCidadeUf: "",
    assinaturaData: "",
    assinaturaHash: "",
    assinaturaDeclaracao: "",
  };

  const [copiedText, setCopiedText] = useState(false);
  const [savedText, setSavedText] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [activeTab, setActiveTab] = useState("relatorio");
  const [editingDocId, setEditingDocId] = useState(null);
  const [savedDocs, setSavedDocs] = useState([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isFolderLoading, setIsFolderLoading] = useState(true);
  const [isFolderSaving, setIsFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [exportError, setExportError] = useState("");
  const [showFolderExplorer, setShowFolderExplorer] = useState(
    viewMode !== "leitura_rapida",
  );

  const [formData, setFormData] = useState(initialFormData);

  const professorFolderId = buildProfessorFolderId(loggedUser);
  const professorFolderName = loggedUser?.nome || "Professor";
  const firestoreUserId = String(
    loggedUser?.id || loggedUser?.uid || "",
  ).trim();
  const folderFieldName = "inpi_docs_folder";

  const tabs = [
    {
      id: "relatorio",
      label: "Relatório Descritivo",
      icon: <FileText className="w-5 h-5 stroke-[3]" />,
      color: "bg-teal-400"
    },
    {
      id: "reivindicacoes",
      label: "Quadro Reivindicatório",
      icon: <List className="w-5 h-5 stroke-[3]" />,
      color: "bg-pink-400"
    },
    {
      id: "desenhos",
      label: "Desenhos",
      icon: <ImageIcon className="w-5 h-5 stroke-[3]" />,
      color: "bg-blue-400"
    },
    {
      id: "resumo",
      label: "Resumo",
      icon: <AlignLeft className="w-5 h-5 stroke-[3]" />,
      color: "bg-yellow-300"
    },
    {
      id: "assinatura",
      label: "Assinatura Digital",
      icon: <Pencil className="w-5 h-5 stroke-[3]" />,
      color: "bg-lime-300"
    },
  ];

  const getGeneratedTextByTab = (tabId, data) => {
    const safeData = data || {};
    const title =
      normalizeLineText(safeData.titulo).toUpperCase() ||
      "[TITULO DO PEDIDO DE PATENTE]";

    if (tabId === "relatorio") {
      const lines = [title];

      RELATORIO_SECTIONS.forEach((section) => {
        lines.push("");
        lines.push(section.title);
        lines.push(
          normalizeLineText(safeData[section.key]) ||
            `[Preencha o campo "${section.title}" com texto tecnico.]`,
        );
      });

      return lines.join("\n").trim();
    }

    if (tabId === "reivindicacoes") {
      const claims = parseClaims(safeData.reivindicacao);
      const previewClaims = claims.length
        ? claims
        : ["[Categoria da invencao] caracterizado por [materia pleiteada]."];

      return [
        "Reivindicações",
        "",
        ...previewClaims.map((claim, index) => `${index + 1}. ${claim}`),
      ].join("\n");
    }

    if (tabId === "desenhos") {
      return [
        "Documento de desenhos",
        "",
        "Este documento deve conter apenas figuras.",
        "Nao exportamos placeholder textual para evitar nao conformidade formal.",
        "Monte as figuras finais diretamente em um DOCX/PDF tecnico.",
      ].join("\n");
    }

    if (tabId === "resumo") {
      return [
        "Resumo",
        title,
        "",
        normalizeLineText(safeData.resumo) ||
          "[Escreva um resumo tecnico entre 50 e 200 palavras.]",
      ].join("\n");
    }

    if (tabId === "assinatura") {
      const signatureName =
        normalizeLineText(safeData.assinaturaNome) ||
        "[Nome completo do assinante]";
      const signatureCpf =
        normalizeLineText(safeData.assinaturaCpf) || "[CPF do assinante]";
      const signatureEmail =
        normalizeLineText(safeData.assinaturaEmail) || "[email@dominio.com]";
      const signatureCity =
        normalizeLineText(safeData.assinaturaCidadeUf) || "[Cidade/UF]";
      const signatureDate = formatSignatureDate(safeData.assinaturaData);
      const signatureHash =
        normalizeLineText(safeData.assinaturaHash) ||
        "[Codigo/hash de validacao da assinatura digital]";
      const signatureDeclaration =
        normalizeLineText(safeData.assinaturaDeclaracao) ||
        "[Declaro, sob as penas da lei, que as informacoes prestadas neste pedido sao verdadeiras.]";

      return [
        "Assinatura digital",
        `Titulo do pedido: ${title}`,
        "",
        "Identificacao do assinante",
        `Nome completo: ${signatureName}`,
        `CPF: ${signatureCpf}`,
        `E-mail: ${signatureEmail}`,
        `Cidade/UF: ${signatureCity}`,
        `Data da assinatura: ${signatureDate}`,
        `Codigo/hash da assinatura: ${signatureHash}`,
        "",
        "Declaracao",
        signatureDeclaration,
      ].join("\n");
    }

    return "";
  };

  const validateInpiCompliance = (tabId, data) => {
    const safeData = data || {};
    const title = normalizeLineText(safeData.titulo);

    if (tabId !== "desenhos" && !title) {
      return "Informe o titulo tecnico do pedido antes de gerar o DOCX.";
    }

    if (title && title.length > 500) {
      return "O titulo excede 500 caracteres. Ajuste para atender a Portaria INPI/DIRPA n. 14/2024.";
    }

    if (tabId === "relatorio") {
      for (const fieldName of REQUIRED_RELATORIO_FIELDS) {
        if (!normalizeLineText(safeData[fieldName])) {
          return "Preencha todos os campos obrigatorios do relatorio para gerar o arquivo no padrao INPI.";
        }
      }
    }

    if (tabId === "reivindicacoes") {
      const claims = parseClaims(safeData.reivindicacao);

      if (!claims.length) {
        return "Inclua pelo menos uma reivindicacao para gerar o documento.";
      }

      for (let index = 0; index < claims.length; index += 1) {
        if (countCaracterizadoPor(claims[index]) !== 1) {
          return `A reivindicacao ${index + 1} precisa conter exatamente uma expressao \"caracterizado por\".`;
        }
      }
    }

    if (tabId === "resumo") {
      const resumo = normalizeLineText(safeData.resumo);
      const wordCount = countWords(resumo);

      if (!resumo) {
        return "Preencha o resumo antes de gerar o DOCX.";
      }

      if (wordCount < 50 || wordCount > 200) {
        return "O resumo deve ter entre 50 e 200 palavras para manter o padrao recomendado pelo INPI.";
      }
    }

    if (tabId === "desenhos") {
      return "Para evitar nao conformidade formal, o documento de desenhos nao e gerado automaticamente. Monte as figuras finais em arquivo tecnico proprio.";
    }

    if (tabId === "assinatura") {
      if (!normalizeLineText(safeData.assinaturaNome)) {
        return "Preencha o nome completo para gerar a secao de assinatura digital.";
      }

      if (!normalizeLineText(safeData.assinaturaData)) {
        return "Informe a data da assinatura digital antes de gerar o DOCX.";
      }
    }

    return "";
  };

  const createRelatorioParagraphs = (data) => {
    const paragraphs = [];
    const title = normalizeLineText(data.titulo).toUpperCase();
    let paragraphCounter = 1;

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: title,
            font: "Arial",
            size: 24,
            bold: true,
            color: "000000",
          }),
        ],
      }),
    );

    RELATORIO_SECTIONS.forEach((section) => {
      const contentParagraphs = splitParagraphs(data[section.key]);

      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 180, after: 120 },
          children: [
            new TextRun({
              text: section.title.toUpperCase(),
              font: "Arial",
              size: 24,
              bold: true,
              color: "000000",
            }),
          ],
        }),
      );

      contentParagraphs.forEach((contentLine) => {
        const marker = `[${String(paragraphCounter).padStart(3, "0")}] `;
        paragraphCounter += 1;

        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, after: 120 },
            children: [
              new TextRun({
                text: `${marker}${contentLine}`,
                font: "Arial",
                size: 24,
                color: "000000",
              }),
            ],
          }),
        );
      });
    });

    return paragraphs;
  };

  const createReivindicacoesParagraphs = (data) => {
    const paragraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: "Reivindicações",
            font: "Arial",
            size: 24,
            bold: true,
            color: "000000",
          }),
        ],
      }),
    ];

    parseClaims(data.reivindicacao).forEach((claim, index) => {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 360, after: 120 },
          children: [
            new TextRun({
              text: `${index + 1}. ${claim}`,
              font: "Arial",
              size: 24,
              color: "000000",
            }),
          ],
        }),
      );
    });

    return paragraphs;
  };

  const createResumoParagraphs = (data) => [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: "Resumo",
          font: "Arial",
          size: 24,
          bold: true,
          color: "000000",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: normalizeLineText(data.titulo).toUpperCase(),
          font: "Arial",
          size: 24,
          bold: true,
          color: "000000",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 360, after: 120 },
      children: [
        new TextRun({
          text: normalizeLineText(data.resumo),
          font: "Arial",
          size: 24,
          color: "000000",
        }),
      ],
    }),
  ];

  const createAssinaturaParagraphs = (data) => {
    const signatureName =
      normalizeLineText(data.assinaturaNome) || "[Nome completo do assinante]";
    const signatureCpf =
      normalizeLineText(data.assinaturaCpf) || "[CPF do assinante]";
    const signatureEmail =
      normalizeLineText(data.assinaturaEmail) || "[email@dominio.com]";
    const signatureCity =
      normalizeLineText(data.assinaturaCidadeUf) || "[Cidade/UF]";
    const signatureDate = formatSignatureDate(data.assinaturaData);
    const signatureHash =
      normalizeLineText(data.assinaturaHash) ||
      "[Codigo/hash de validacao da assinatura digital]";
    const signatureDeclaration =
      normalizeLineText(data.assinaturaDeclaracao) ||
      "Declaro, sob as penas da lei, que as informacoes prestadas neste pedido sao verdadeiras.";

    const identityLines = [
      `Nome completo: ${signatureName}`,
      `CPF: ${signatureCpf}`,
      `E-mail: ${signatureEmail}`,
      `Cidade/UF: ${signatureCity}`,
      `Data da assinatura: ${signatureDate}`,
      `Codigo/hash da assinatura: ${signatureHash}`,
    ];

    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: "Assinatura digital",
            font: "Arial",
            size: 24,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: normalizeLineText(data.titulo).toUpperCase(),
            font: "Arial",
            size: 24,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "Identificacao do assinante",
            font: "Arial",
            size: 24,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      ...identityLines.map(
        (line) =>
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { line: 360, after: 80 },
            children: [
              new TextRun({
                text: line,
                font: "Arial",
                size: 24,
                color: "000000",
              }),
            ],
          }),
      ),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 180, after: 120 },
        children: [
          new TextRun({
            text: "Declaracao",
            font: "Arial",
            size: 24,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 360, after: 240 },
        children: [
          new TextRun({
            text: signatureDeclaration,
            font: "Arial",
            size: 24,
            color: "000000",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: "________________________________________",
            font: "Arial",
            size: 24,
            color: "000000",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: signatureName,
            font: "Arial",
            size: 24,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: "Assinado digitalmente",
            font: "Arial",
            size: 24,
            color: "000000",
          }),
        ],
      }),
    ];
  };

  const createDocumentParagraphs = (tabId, data) => {
    if (tabId === "relatorio") {
      return createRelatorioParagraphs(data);
    }

    if (tabId === "reivindicacoes") {
      return createReivindicacoesParagraphs(data);
    }

    if (tabId === "resumo") {
      return createResumoParagraphs(data);
    }

    if (tabId === "assinatura") {
      return createAssinaturaParagraphs(data);
    }

    return [];
  };

  const persistDocs = async (docsToPersist) => {
    setSavedDocs(docsToPersist);

    if (!firestoreUserId) {
      setFolderError(
        "Não foi possível identificar o usuário para salvar no Firestore.",
      );
      return;
    }

    try {
      setIsFolderSaving(true);
      setFolderError("");
      await setDoc(
        doc(db, "usuarios", firestoreUserId),
        {
          [folderFieldName]: docsToPersist,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Erro ao salvar pasta INPI no Firestore:", error);
      setFolderError("Falha ao salvar no Firestore. Tente novamente.");
    } finally {
      setIsFolderSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setExportError("");
  };

  useEffect(() => {
    try {
      const json = localStorage.getItem("inpi_agent_autodoc");
      if (!json) return;
      const data = JSON.parse(json);
      if (!data || typeof data !== "object") return;

      setFormData((prev) => ({
        ...prev,
        ...{
          titulo: data.titulo || prev.titulo,
          campo: data.campo || prev.campo,
          estadoTecnica: data.estadoTecnica || prev.estadoTecnica,
          problema: data.problema || prev.problema,
          desenhos: data.desenhos || prev.desenhos,
          descricao: data.descricao || prev.descricao,
          exemplos: data.exemplos || prev.exemplos,
          reivindicacao: data.reivindicacao || prev.reivindicacao,
          resumo: data.resumo || prev.resumo,
          assinaturaNome: data.assinaturaNome || prev.assinaturaNome,
          assinaturaCpf: data.assinaturaCpf || prev.assinaturaCpf,
          assinaturaEmail: data.assinaturaEmail || prev.assinaturaEmail,
          assinaturaCidadeUf: data.assinaturaCidadeUf || prev.assinaturaCidadeUf,
          assinaturaData: data.assinaturaData || prev.assinaturaData,
          assinaturaHash: data.assinaturaHash || prev.assinaturaHash,
          assinaturaDeclaracao:
            data.assinaturaDeclaracao || prev.assinaturaDeclaracao,
        },
      }));
    } catch (error) {
      console.warn(
        "Não foi possível carregar conteúdo do Agente IA para o Gerador de Documentos.",
        error,
      );
    }
  }, []);

  useEffect(() => {
    if (!firestoreUserId) {
      setSavedDocs([]);
      setIsFolderLoading(false);
      return;
    }

    setIsFolderLoading(true);
    const userRef = doc(db, "usuarios", firestoreUserId);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data();
        const parsedDocs = data?.[folderFieldName];

        setSavedDocs(Array.isArray(parsedDocs) ? parsedDocs : []);
        setFolderError("");
        setIsFolderLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar pasta INPI do Firestore:", error);
        setFolderError("Falha ao carregar documentos do Firestore.");
        setIsFolderLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firestoreUserId]);

  const orderedSavedDocs = [...savedDocs].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const HelpBox = ({ text }) => {
    if (!showTips) return null;

    return (
      <div className="mt-3 bg-white p-4 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform  hover:rotate-0 transition-transform">
        <p className="text-sm font-bold text-slate-900 flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5 stroke-[3] text-blue-500" />
          <span>{text}</span>
        </p>
      </div>
    );
  };

  const generateCurrentText = () => {
    return getGeneratedTextByTab(activeTab, formData);
  };

  const copyToClipboard = () => {
    const textArea = document.createElement("textarea");
    textArea.value = generateCurrentText();
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar", err);
    }
    document.body.removeChild(textArea);
  };

  const buildDocxBlob = async (tabId, data) => {
    const complianceError = validateInpiCompliance(tabId, data);
    if (complianceError) {
      throw new Error(complianceError);
    }

    const paragraphs = createDocumentParagraphs(tabId, data);
    if (!paragraphs.length) {
      throw new Error("Nao foi possivel montar o documento para esta aba.");
    }

    const pageHeader = buildTopPageNumberHeader();

    const doc = new Document({
      sections: [
        {
          headers: {
            default: pageHeader,
          },
          properties: {
            page: {
              margin: INPI_PAGE_MARGINS,
            },
          },
          children: paragraphs,
        },
      ],
    });

    return Packer.toBlob(doc);
  };

  const saveCurrentDocumentToFolder = () => {
    const now = new Date().toISOString();
    const timeStamp = formatDateTimeCompact(now);
    const tabLabel =
      tabs.find((tab) => tab.id === activeTab)?.label || activeTab;
    const titleChunk = sanitizeFilePart(formData.titulo) || "patente";

    if (editingDocId) {
      const existingDoc = savedDocs.find((item) => item.id === editingDocId);

      if (existingDoc) {
        const updatedDoc = {
          ...existingDoc,
          tabId: activeTab,
          tabLabel,
          title: (formData.titulo || "Documento sem titulo").trim(),
          fileBaseName: `${activeTab}_${titleChunk}_${timeStamp}`,
          formData: { ...formData },
          updatedAt: now,
        };

        const updatedDocs = savedDocs.map((item) =>
          item.id === editingDocId ? updatedDoc : item,
        );

        persistDocs(updatedDocs);
        setEditingDocId(null);
        setSavedText(true);
        setTimeout(() => setSavedText(false), 2000);
        return updatedDoc;
      }

      setEditingDocId(null);
    }

    const docRecord = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tabId: activeTab,
      tabLabel,
      title: (formData.titulo || "Documento sem titulo").trim(),
      fileBaseName: `${activeTab}_${titleChunk}_${timeStamp}`,
      createdAt: now,
      formData: { ...formData },
    };

    persistDocs([docRecord, ...savedDocs]);
    setSavedText(true);
    setTimeout(() => setSavedText(false), 2000);
    return docRecord;
  };

  const exportToDocx = async () => {
    setExportError("");

    try {
      const blob = await buildDocxBlob(activeTab, formData);
      const docRecord = saveCurrentDocumentToFolder();
      const fileName = `${docRecord.fileBaseName}.docx`;
      saveAs(blob, fileName);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o DOCX com conformidade INPI.",
      );
    }
  };

  const downloadSavedDocument = async (docRecord) => {
    setExportError("");

    try {
      const blob = await buildDocxBlob(docRecord.tabId, docRecord.formData || {});
      saveAs(blob, `${docRecord.fileBaseName}.docx`);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel baixar este documento com conformidade INPI.",
      );
    }
  };

  const downloadAllSavedDocs = async () => {
    if (!orderedSavedDocs.length) return;

    setExportError("");
    setIsBulkDownloading(true);

    try {
      const zip = new JSZip();
      const skippedDocuments = [];

      for (const docRecord of orderedSavedDocs) {
        try {
          const blob = await buildDocxBlob(
            docRecord.tabId,
            docRecord.formData || {},
          );
          zip.file(`${docRecord.fileBaseName}.docx`, blob);
        } catch {
          skippedDocuments.push(docRecord.fileBaseName);
        }
      }

      if (!Object.keys(zip.files).length) {
        throw new Error(
          "Nenhum arquivo elegivel para ZIP. Revise os documentos para conformidade INPI.",
        );
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFileName = `pasta_${professorFolderId}_inpi_${formatDateTimeCompact(
        new Date().toISOString(),
      )}.zip`;

      saveAs(zipBlob, zipFileName);

      if (skippedDocuments.length) {
        setExportError(
          `Alguns arquivos foram ignorados por nao estarem conformes para exportacao automatica: ${skippedDocuments.join(", ")}.`,
        );
      }
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o ZIP de documentos.",
      );
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const clearFolder = () => {
    persistDocs([]);
    setEditingDocId(null);
  };

  const deleteSavedDocument = (docId) => {
    const target = savedDocs.find((item) => item.id === docId);
    if (!target) return;

    const title = target.title || target.formData?.titulo || "este documento";
    const shouldDelete = window.confirm(
      `Tem certeza que deseja excluir "${title}" da pasta?`,
    );

    if (!shouldDelete) return;

    const updatedDocs = savedDocs.filter((item) => item.id !== docId);
    persistDocs(updatedDocs);

    if (editingDocId === docId) {
      setEditingDocId(null);
      setFormData(initialFormData);
      setActiveTab("relatorio");
    }
  };

  const loadDocumentForEditing = (docRecord) => {
    setActiveTab(docRecord?.tabId || "relatorio");
    setFormData({
      ...initialFormData,
      ...(docRecord?.formData || {}),
      titulo:
        docRecord?.formData?.titulo || docRecord?.title || initialFormData.titulo,
    });
    setEditingDocId(docRecord?.id || null);
    setFolderError("");
    setExportError("");
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500 relative">
      
      {/* INJEÇÃO DE CSS DA SCROLLBAR */}
      <style>{`
        .neo-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
      `}</style>

      {/* Cabeçalho / Instruções */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] transform ">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">
              Fluxo Simplificado
            </h2>
            <p className="text-sm font-bold text-slate-700 bg-slate-100 px-4 py-2 border-2 border-slate-900 rounded-xl inline-block shadow-[2px_2px_0px_0px_#cbd5e1]">
              1. Preencha o documento • 2. Revise a pré-visualização • 3. Salve na pasta ou baixe.
            </p>
          </div>
          <button
            onClick={() => setShowTips((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border-4 border-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all ${
                showTips ? 'bg-yellow-300 shadow-[2px_2px_0px_0px_#0f172a] translate-y-0.5' : 'bg-white shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a]'
            }`}
          >
            <Info className="w-5 h-5 stroke-[3]" />
            {showTips ? "Ocultar dicas" : "Mostrar dicas"}
          </button>
        </div>
      </div>

      {/* Tabs Neo-Brutalistas */}
      <div className="flex flex-wrap gap-4 border-b-4 border-slate-900 pb-4">
        {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
                <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setExportError("");
                    }}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl border-4 border-slate-900 font-black uppercase tracking-widest text-xs transition-all ${
                    isActive
                        ? `${tab.color} text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] -translate-y-1`
                        : "bg-white text-slate-900 hover:bg-slate-100 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] shadow-[2px_2px_0px_0px_#0f172a]"
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 md:gap-10 items-start">
        
        {/* COLUNA ESQUERDA: FORMULÁRIO */}
        <div className="bg-pink-300 p-8 md:p-10 rounded-[2rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a]">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3 bg-white px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] w-fit transform -">
            {tabs.find((t) => t.id === activeTab)?.icon}
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>

          {editingDocId && (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-4 border-slate-900 bg-yellow-300 px-6 py-4 shadow-[4px_4px_0px_0px_#0f172a]">
              <p className="text-sm font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                <Pencil className="w-5 h-5 stroke-[3]" /> Modo edição ativo
              </p>
              <button
                type="button"
                onClick={() => setEditingDocId(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all"
              >
                <X className="w-4 h-4 stroke-[3]" />
                Cancelar
              </button>
            </div>
          )}

          <form className="space-y-8 max-h-[80vh] overflow-y-auto neo-scrollbar pr-4">
            
            {activeTab === "relatorio" && (
              <>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Título da Invenção
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                  />
                  <HelpBox text="Use um título técnico, específico e direto, sem nomes comerciais. Esse título deve ser o mesmo no Relatório e no Resumo." />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Campo da Invenção
                  </label>
                  <textarea
                    name="campo"
                    value={formData.campo}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Informe a área técnica da invenção (ex.: engenharia mecânica, biotecnologia, software embarcado), sem explicar ainda a solução completa." />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Fundamentos (Estado da Técnica)
                  </label>
                  <textarea
                    name="estadoTecnica"
                    value={formData.estadoTecnica}
                    onChange={handleChange}
                    rows="4"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Descreva o que já existe no mercado ou na literatura e as limitações das soluções conhecidas, com linguagem objetiva." />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Problema Técnico & Vantagens
                  </label>
                  <textarea
                    name="problema"
                    value={formData.problema}
                    onChange={handleChange}
                    rows="4"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Explique qual problema técnico sua invenção resolve e quais vantagens mensuráveis ela oferece em relation ao estado da técnica." />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Breve Descrição dos Desenhos
                  </label>
                  <textarea
                    name="desenhos"
                    value={formData.desenhos}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Liste cada figura de forma curta (Figura 1, Figura 2...) e diga o que cada uma representa, sem detalhamento excessivo." />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Descrição Detalhada da Invenção
                  </label>
                  <textarea
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows="6"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Descreva estrutura, componentes, funcionamento e variações de execução, com detalhes suficientes para reprodução técnica." />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Exemplos de Concretização
                  </label>
                  <textarea
                    name="exemplos"
                    value={formData.exemplos}
                    onChange={handleChange}
                    rows="4"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Inclua ao menos um exemplo prático de aplicação da invenção, destacando a forma preferida de implementação." />
                </div>
              </>
            )}

            {activeTab === "reivindicacoes" && (
              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                  Reivindicações
                </label>
                <div className="bg-white border-4 border-slate-900 p-4 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] mb-4 font-bold text-slate-900 text-sm">
                  Formato: Preâmbulo + "caracterizado por" + essência da
                  invenção. Use ponto final único por reivindicação.
                </div>
                <textarea
                  name="reivindicacao"
                  value={formData.reivindicacao}
                  onChange={handleChange}
                  rows="12"
                  className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                />
                <HelpBox text="Comece pela reivindicação independente (núcleo da proteção) e, em seguida, escreva as dependentes com características adicionais de forma clara e sem ambiguidades." />
              </div>
            )}

            {activeTab === "desenhos" && (
              <div className="bg-white p-8 rounded-2xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] text-center transform ">
                <ImageIcon className="w-16 h-16 stroke-[2] text-slate-300 mx-auto mb-4" />
                <p className="text-base font-black uppercase tracking-widest text-slate-900 mb-2">
                  Documento tecnico manual
                </p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed max-w-sm mx-auto">
                  O INPI exige que o arquivo de desenhos contenha somente figuras.
                  Para evitar recusas formais, esta plataforma nao gera DOCX
                  automatico dessa parte. Monte e anexe o arquivo tecnico final com
                  suas figuras numeradas.
                </p>
              </div>
            )}

            {activeTab === "resumo" && (
              <>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Título da Invenção
                  </label>
                  <div className="bg-white border-4 border-slate-900 p-4 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] mb-4 font-bold text-slate-900 text-sm">
                    Deve ser idêntico ao informado no Relatório Descritivo.
                  </div>
                  <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                  />
                  <HelpBox text="Repita exatamente o mesmo título usado no Relatório Descritivo para manter consistência formal do pedido." />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Resumo (50 a 200 palavras)
                  </label>
                  <textarea
                    name="resumo"
                    value={formData.resumo}
                    onChange={handleChange}
                    rows="8"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Escreva um único parágrafo técnico com objetivo, solução e principal aplicação da invenção, sem linguagem promocional e sem reivindicações." />
                </div>
              </>
            )}

            {activeTab === "assinatura" && (
              <>
                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Titulo da Invencao
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                  />
                  <HelpBox text="Use o mesmo titulo tecnico dos demais documentos para manter consistencia no protocolo." />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Nome completo do assinante
                  </label>
                  <input
                    type="text"
                    name="assinaturaNome"
                    value={formData.assinaturaNome}
                    onChange={handleChange}
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                      CPF
                    </label>
                    <input
                      type="text"
                      name="assinaturaCpf"
                      value={formData.assinaturaCpf}
                      onChange={handleChange}
                      className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                      Data da assinatura
                    </label>
                    <input
                      type="date"
                      name="assinaturaData"
                      value={formData.assinaturaData}
                      onChange={handleChange}
                      className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                      E-mail do assinante
                    </label>
                    <input
                      type="email"
                      name="assinaturaEmail"
                      value={formData.assinaturaEmail}
                      onChange={handleChange}
                      className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                      Cidade / UF
                    </label>
                    <input
                      type="text"
                      name="assinaturaCidadeUf"
                      value={formData.assinaturaCidadeUf}
                      onChange={handleChange}
                      className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Codigo ou hash da assinatura digital
                  </label>
                  <textarea
                    name="assinaturaHash"
                    value={formData.assinaturaHash}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Cole o codigo de validacao da assinatura usado no seu certificado ou plataforma de assinatura." />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                    Declaracao do assinante
                  </label>
                  <textarea
                    name="assinaturaDeclaracao"
                    value={formData.assinaturaDeclaracao}
                    onChange={handleChange}
                    rows="4"
                    className="w-full p-4 rounded-xl border-4 border-slate-900 font-bold text-slate-900 bg-white shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none resize-y"
                  />
                  <HelpBox text="Mantenha uma declaracao objetiva confirmando autenticidade da assinatura e veracidade dos dados." />
                </div>
              </>
            )}
          </form>
        </div>

        {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO & EXPLORADOR */}
        <div className="flex flex-col gap-8">
          
          {/* PRÉ-VISUALIZAÇÃO */}
          <div className="bg-blue-300 p-8 md:p-10 rounded-[2rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter bg-white px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform ">
                Pré-Visualização
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 bg-white text-slate-900 border-4 border-slate-900 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all"
                >
                  {copiedText ? (
                    <CheckCircle2 className="w-5 h-5 stroke-[3] text-teal-500" />
                  ) : (
                    <Copy className="w-5 h-5 stroke-[3]" />
                  )}
                  Copiar
                </button>
                <button
                  onClick={exportToDocx}
                  className="flex items-center gap-2 bg-teal-400 text-slate-900 border-4 border-slate-900 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all"
                >
                  <FileDown className="w-5 h-5 stroke-[3]" />
                  Gerar DOCX INPI
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border-4 border-slate-900 shadow-inner font-serif text-sm text-slate-900 whitespace-pre-wrap leading-relaxed h-[400px] overflow-y-auto neo-scrollbar">
              {generateCurrentText()}
            </div>

            <div className="mt-6 bg-white p-4 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-start gap-3">
                <Info className="w-6 h-6 flex-shrink-0 stroke-[3] text-blue-500" />
                <span>
                  Gere o DOCX com validacao de formato do INPI. O arquivo tambem
                  entra automaticamente na pasta do orientador.
                </span>
              </p>
            </div>

            <div className="mt-4 rounded-xl border-4 border-slate-900 bg-white px-5 py-4 shadow-[4px_4px_0px_0px_#0f172a]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3">
                Referencias oficiais
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://www.gov.br/inpi/pt-br/central-de-conteudo/legislacao/arquivos/documentos/2024dirpa-no-14.pdf/%40%40download/file"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-lg border-2 border-slate-900 bg-yellow-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                >
                  Portaria DIRPA 14/2024
                </a>
                <a
                  href="https://www.gov.br/inpi/pt-br/central-de-conteudo/noticias/inpi-divulga-modelos-para-pedidos-de-patentes"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-lg border-2 border-slate-900 bg-teal-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                >
                  Modelos oficiais
                </a>
              </div>
            </div>
          </div>

          {exportError && (
            <div className="rounded-xl border-4 border-slate-900 bg-red-400 px-5 py-4 shadow-[4px_4px_0px_0px_#0f172a]">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                ! {exportError}
              </p>
            </div>
          )}

          {/* EXPLORADOR DE ARQUIVOS */}
          <div className="bg-yellow-300 rounded-[2rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] overflow-hidden flex flex-col">
            {/* Header Pasta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-4 border-slate-900 bg-white p-6 md:p-8">
              <div className="flex items-center gap-4 min-w-0">
                <div className="rounded-xl bg-yellow-300 text-slate-900 p-4 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-3">
                  <FolderOpen className="w-8 h-8 stroke-[3]" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black uppercase tracking-tighter text-slate-900 truncate">
                    Pasta do orientador • {professorFolderName}
                  </p>
                  <p className="text-xs font-bold text-slate-600 truncate mt-1">
                    ID: {professorFolderId}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-white border-4 border-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] shrink-0 transform ">
                <HardDrive className="w-5 h-5 stroke-[3]" />
                {orderedSavedDocs.length} arquivo(s)
              </div>
            </div>

            {/* Ações da Pasta */}
            <div className="flex flex-wrap items-center gap-4 p-6 bg-[#FAFAFA] border-b-4 border-slate-900">
              <button
                onClick={saveCurrentDocumentToFolder}
                className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-teal-400 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all active:translate-y-0 active:shadow-none"
              >
                {savedText ? (
                  <CheckCircle2 className="w-5 h-5 stroke-[3]" />
                ) : (
                  <FileText className="w-5 h-5 stroke-[3]" />
                )}
                {editingDocId ? "Atualizar" : "Salvar"}
              </button>
              <button
                onClick={downloadAllSavedDocs}
                disabled={!orderedSavedDocs.length || isBulkDownloading}
                className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-blue-400 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none"
              >
                <Archive className="w-5 h-5 stroke-[3]" />
                {isBulkDownloading ? "Gerando ZIP..." : "Baixar todos"}
              </button>
              <button
                onClick={clearFolder}
                disabled={!orderedSavedDocs.length}
                className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none"
              >
                <Trash2 className="w-5 h-5 stroke-[3]" />
                Limpar pasta
              </button>
            </div>

            {folderError && (
              <div className="bg-red-400 border-b-4 border-slate-900 px-6 py-4 font-black uppercase text-xs tracking-widest text-slate-900">
                ! {folderError}
              </div>
            )}

            {/* Toggle Explorador */}
            <div className="bg-pink-400 px-6 py-4 border-b-4 border-slate-900 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                  Explorador de arquivos
                </h3>
              </div>
              <button
                onClick={() => setShowFolderExplorer((prev) => !prev)}
                className="rounded-xl border-4 border-slate-900 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all active:translate-y-0 active:shadow-none"
              >
                {showFolderExplorer ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            {/* Lista de Arquivos */}
            {showFolderExplorer && isFolderLoading ? (
              <div className="p-10 text-center bg-white">
                <p className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center justify-center gap-3">
                  <LoaderCircle className="w-6 h-6 animate-spin stroke-[3]" /> Carregando...
                </p>
              </div>
            ) : showFolderExplorer && !orderedSavedDocs.length ? (
              <div className="p-12 text-center bg-white">
                <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4 stroke-[2]" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                  A pasta está vazia. Salve documentos para aparecerem aqui.
                </p>
              </div>
            ) : showFolderExplorer ? (
              <div className="max-h-[350px] overflow-y-auto neo-scrollbar bg-white">
                {orderedSavedDocs.map((docRecord) => (
                  <div
                    key={docRecord.id}
                    className="group flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b-4 border-slate-900 px-6 py-5 hover:bg-slate-100 transition-colors"
                  >
                    <div className="min-w-0 flex items-start gap-4">
                      <div className="rounded-xl bg-blue-300 text-slate-900 border-4 border-slate-900 p-3 shadow-[2px_2px_0px_0px_#0f172a] transform -">
                        <FileText className="w-6 h-6 stroke-[3]" />
                      </div>
                      <div className="min-w-0 pt-1">
                        <p className="truncate text-base font-black uppercase text-slate-900 leading-tight mb-1">
                          {docRecord.title ||
                            docRecord.formData?.titulo ||
                            "Documento sem titulo"}
                        </p>
                        <p className="truncate text-[10px] font-bold text-slate-600 bg-white border-2 border-slate-900 px-2 py-0.5 inline-block rounded-md">
                          {docRecord.fileBaseName}.docx
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 inline-flex items-center gap-2 mt-2 ml-3">
                          <Clock3 className="w-4 h-4 stroke-[3]" />
                          {docRecord.tabLabel} ·{" "}
                          {new Date(docRecord.createdAt).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <button
                        onClick={() => loadDocumentForEditing(docRecord)}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all shadow-[2px_2px_0px_0px_#0f172a]"
                      >
                        <Pencil className="w-4 h-4 stroke-[3]" />
                        Re-editar
                      </button>
                      <button
                        onClick={() => downloadSavedDocument(docRecord)}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all shadow-[2px_2px_0px_0px_#0f172a]"
                      >
                        <Download className="w-4 h-4 stroke-[3]" />
                        Baixar
                      </button>
                      <button
                        onClick={() => deleteSavedDocument(docRecord.id)}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-red-400 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all shadow-[2px_2px_0px_0px_#0f172a]"
                      >
                        <Trash2 className="w-4 h-4 stroke-[3]" />
                        Apagar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}
