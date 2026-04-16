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
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { buildProfessorFolderId, formatDateTimeCompact, sanitizeFilePart } from "./inpiUtils";

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
  ];

  const getGeneratedTextByTab = (tabId, data) => {
    const safeData = data || {};

    const generators = {
      relatorio: () => `${
        safeData.titulo?.toUpperCase() || "[TÍTULO DO SEU PEDIDO DE PATENTE]"
      }

Campo da invenção
${
  safeData.campo ||
  "[Descreva aqui o setor técnico ao qual se refere sua invenção.]"
}

Fundamentos da invenção
${
  safeData.estadoTecnica ||
  "[Escreva aqui o estado da técnica relacionado à sua invenção.]"
}
${
  safeData.problema ||
  "[Apresente o problema técnico e como sua invenção resolve esse problema.]"
}

Breve descrição dos desenhos
${
  safeData.desenhos ||
  "[Se o seu pedido tiver desenhos, descreva de forma breve as informações apresentadas em cada um.]"
}

Descrição da invenção
${
  safeData.descricao ||
  "[Apresente de forma detalhada sua invenção nessa seção e inclua todas as suas possibilidades de concretização.]"
}

Exemplos de concretizações da invenção
${
  safeData.exemplos ||
  "[Apresente exemplos de concretizações da sua invenção. Indique a forma preferida de concretizar.]"
}`,

      reivindicacoes: () => `REIVINDICAÇÕES

1. ${
        safeData.reivindicacao ||
        "[Preâmbulo] caracterizado por [Matéria Pleiteada]."
      }`,

      desenhos: () => `DESENHOS

[Insira aqui sua figura - Exclua este texto no Word e cole a imagem]

Figura 1

[Insira aqui sua figura - Exclua este texto no Word e cole a imagem]

Figura 2`,

      resumo: () => `RESUMO
${safeData.titulo?.toUpperCase() || "[TÍTULO DO SEU PEDIDO DE PATENTE]"}

${
  safeData.resumo ||
  "[Escreva um resumo da sua invenção aqui em um único parágrafo com 50 a 200 palavras, não excedendo uma página.]"
}`,
    };

    const generator = generators[tabId] || generators.relatorio;
    return generator().trim();
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
    const textToExport = getGeneratedTextByTab(tabId, data);
    const lines = textToExport.split("\n");
    const paragraphs = [];

    let paragraphCounter = 1;

    const subtitulos = [
      "Campo da invenção",
      "Fundamentos da invenção",
      "Breve descrição dos desenhos",
      "Descrição da invenção",
      "Exemplos de concretizações da invenção",
    ];

    for (let line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) continue;

      const isMainTitle =
        trimmedLine ===
          (data.titulo?.toUpperCase() || "[TÍTULO DO SEU PEDIDO DE PATENTE]") ||
        ["RESUMO", "REIVINDICAÇÕES", "DESENHOS"].includes(trimmedLine);

      if (isMainTitle) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: trimmedLine,
                font: "Arial",
                size: 24,
                bold: true,
                color: "000000",
              }),
            ],
          }),
        );
        continue;
      }

      if (
        subtitulos.includes(trimmedLine) ||
        trimmedLine.startsWith("Figura ")
      ) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: trimmedLine,
                font: "Arial",
                size: 24,
                bold: true,
                color: "000000",
              }),
            ],
          }),
        );
        continue;
      }

      let prefix = "";

      if (tabId === "relatorio") {
        const paddedCounter = String(paragraphCounter).padStart(4, "0");
        prefix = `[${paddedCounter}] `;
        paragraphCounter++;
      }

      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            after: 120,
            line: 360,
          },
          children: [
            new TextRun({
              text: prefix + trimmedLine,
              font: "Arial",
              size: 24,
              color: "000000",
            }),
          ],
        }),
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1701,
                left: 1701,
                bottom: 1134,
                right: 1134,
              },
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
    const blob = await buildDocxBlob(activeTab, formData);
    const docRecord = saveCurrentDocumentToFolder();
    const fileName = `${docRecord.fileBaseName}.docx`;
    saveAs(blob, fileName);
  };

  const downloadSavedDocument = async (docRecord) => {
    const blob = await buildDocxBlob(docRecord.tabId, docRecord.formData || {});
    saveAs(blob, `${docRecord.fileBaseName}.docx`);
  };

  const downloadAllSavedDocs = async () => {
    if (!orderedSavedDocs.length) return;

    setIsBulkDownloading(true);

    try {
      const zip = new JSZip();

      for (const docRecord of orderedSavedDocs) {
        const blob = await buildDocxBlob(
          docRecord.tabId,
          docRecord.formData || {},
        );
        zip.file(`${docRecord.fileBaseName}.docx`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFileName = `pasta_${professorFolderId}_inpi_${formatDateTimeCompact(
        new Date().toISOString(),
      )}.zip`;

      saveAs(zipBlob, zipFileName);
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
                    onClick={() => setActiveTab(tab.id)}
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
                  Apenas documento base
                </p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed max-w-sm mx-auto">
                  Esta seção gera apenas o documento base com a numeração das
                  figuras. Você deve exportar o documento para o Word (DOCX) e
                  colar suas imagens diretamente no arquivo final antes de
                  submeter.
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
                  Gerar DOCX
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
                  Gere o DOCX para salvar no padrão do e-Patentes. O
                  arquivo também entra automaticamente na pasta do orientador.
                </span>
              </p>
            </div>
          </div>

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