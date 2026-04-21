"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckSquare } from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { mergeChecklistTasks } from "./inpiUtils";

const ESSENTIAL_TASK_IDS = new Set([1, 2, 4, 5, 10, 11, 12, 18, 13, 14, 15]);

export default function ChecklistSidebar({
  loggedUser = null,
  viewMode = "leitura_rapida",
}) {
  const baseTasks = useMemo(
    () => [
      { id: 1, text: "Definir titulo e categoria (PI ou MU)", done: false },
      {
        id: 2,
        text: "Realizar busca de anterioridade no BuscaWeb (varias palavras-chave)",
        done: false,
      },
      {
        id: 3,
        text: "Identificar se ha direito a desconto (ensino, MEI, etc.)",
        done: false,
      },
      {
        id: 4,
        text: "Cadastrar-se como Cliente no e-INPI (login/senha)",
        done: false,
      },
      {
        id: 5,
        text: "Emitir e pagar GRU codigo 200 (deposito) e anotar numero",
        done: false,
      },
      {
        id: 6,
        text: "Redigir Relatorio Descritivo (usar o Gerador de Documentos)",
        done: false,
      },
      {
        id: 7,
        text: "Redigir Quadro Reivindicatorio (usar o Gerador)",
        done: false,
      },
      { id: 8, text: "Redigir Resumo (usar o Gerador)", done: false },
      {
        id: 9,
        text: "Preparar Desenhos (se houver), numerar figuras",
        done: false,
      },
      {
        id: 10,
        text: "Salvar os 4 documentos em arquivos separados (DOCX ou PDF)",
        done: false,
      },
      {
        id: 11,
        text: "Acessar e-Patentes, inserir GRU e preencher formulario",
        done: false,
      },
      { id: 12, text: "Anexar os 4 documentos e enviar", done: false },
      {
        id: 13,
        text: "Baixar comprovante de deposito (protocolo)",
        done: false,
      },
      {
        id: 14,
        text: "Cadastrar numero do pedido para acompanhamento",
        done: false,
      },
      {
        id: 15,
        text: "Acompanhar a RPI semanalmente (exame formal e merito)",
        done: false,
      },
      {
        id: 16,
        text: "Solicitar exame tecnico (GRU 203) dentro de 36 meses",
        done: false,
      },
      {
        id: 17,
        text: "Pagar anuidades a partir do 2o ano (codigos 210/211)",
        done: false,
      },
      {
        id: 18,
        text: "Revisar e assinar o documento de veracidade com e-CPF ou e-CNPJ antes da confirmacao final",
        done: false,
      },
    ],
    [],
  );

  const [tasks, setTasks] = useState(baseTasks);
  const [checklistError, setChecklistError] = useState("");
  const [showFullChecklist, setShowFullChecklist] = useState(
    viewMode !== "leitura_rapida",
  );

  const firestoreUserId = String(loggedUser?.id || loggedUser?.uid || "").trim();
  const checklistFieldName = "inpi_checklist_tasks";

  useEffect(() => {
    if (viewMode !== "leitura_rapida") {
      setShowFullChecklist(true);
    }
  }, [viewMode]);

  const persistChecklist = async (tasksToPersist) => {
    setTasks(tasksToPersist);

    if (!firestoreUserId) return;

    try {
      setChecklistError("");
      await setDoc(
        doc(db, "usuarios", firestoreUserId),
        {
          [checklistFieldName]: tasksToPersist,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Erro ao salvar checklist no Firestore:", error);
      setChecklistError("Falha ao salvar checklist no Firestore.");
    }
  };

  useEffect(() => {
    if (!firestoreUserId) {
      setTasks(baseTasks);
      return;
    }

    const userRef = doc(db, "usuarios", firestoreUserId);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data();
        const remoteTasks = data?.[checklistFieldName];

        if (Array.isArray(remoteTasks)) {
          setTasks(mergeChecklistTasks(baseTasks, remoteTasks));
        } else {
          setTasks(baseTasks);
        }

        setChecklistError("");
      },
      (error) => {
        console.error("Erro ao carregar checklist do Firestore:", error);
        setChecklistError("Falha ao carregar checklist do Firestore.");
      },
    );

    return () => unsubscribe();
  }, [baseTasks, firestoreUserId]);

  const visibleTasks = showFullChecklist
    ? tasks
    : tasks.filter((task) => ESSENTIAL_TASK_IDS.has(task.id));

  const toggleTask = (id) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task,
    );
    persistChecklist(updatedTasks);
  };

  const completed = visibleTasks.filter((task) => task.done).length;
  const total = visibleTasks.length || 1;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="mx-auto">
      <div className="mb-4 rounded-xl border-2 border-slate-900 bg-slate-100 p-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">
          {showFullChecklist ? "Versao completa" : "Versao essencial"}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-700">
          {showFullChecklist
            ? "Checklist completo para controle tecnico detalhado."
            : "Somente os itens criticos para quem esta comecando."}
        </p>
        <button
          onClick={() => setShowFullChecklist((prev) => !prev)}
          className="mt-3 inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 transition-all"
        >
          {showFullChecklist ? "Ver versao essencial" : "Ver checklist completo"}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-600">Progresso</span>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">
          {progress}%
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="bg-emerald-600 h-2 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              task.done
                ? "bg-slate-50 border-slate-200 opacity-70"
                : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm"
            }`}
          >
            <div
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border ${
                task.done ? "bg-emerald-600 border-emerald-600" : "border-slate-400"
              }`}
            >
              {task.done && <CheckSquare className="w-3 h-3 text-white" />}
            </div>
            <span
              className={`text-sm text-slate-700 ${
                task.done ? "line-through text-slate-500" : ""
              }`}
            >
              {task.text}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-800">
          <strong>Atencao aos prazos:</strong> Anuidades vencem no ultimo dia do
          mes do deposito. Exame tecnico tem prazo fatal de 36 meses. Acompanhe a
          RPI todas as tercas-feiras.
        </div>
      </div>

      {checklistError && (
        <p className="mt-3 text-[11px] text-red-600">{checklistError}</p>
      )}
    </div>
  );
}
