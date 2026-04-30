import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  LifeBuoy,
  LoaderCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Toast from "../forum/Toast";
import { createSupportTicket } from "../../services/supportTicketService";

const SUPPORT_VIEW_LABELS = {
  Projetos: "Feed de Projetos",
  meusProjetos: "Meus Projetos",
  inpi: "PatentesLab",
  trilha: "Trilha Pedagógica",
  popEventos: "POP Eventos",
  forum: "Fórum",
  clube: "Meu Clube",
  diario: "Diário de Bordo",
};

const PRIORITY_OPTIONS = [
  {
    value: "baixa",
    label: "Baixa",
    helper: "Não bloqueia o fluxo",
    dot: "bg-sky-400",
    activeClass: "border-sky-300 bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  },
  {
    value: "media",
    label: "Média",
    helper: "Afeta parte das funções",
    dot: "bg-amber-400",
    activeClass: "border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  },
  {
    value: "alta",
    label: "Alta",
    helper: "Bloqueia tarefas importantes",
    dot: "bg-orange-400",
    activeClass: "border-orange-300 bg-orange-50 text-orange-800 ring-1 ring-orange-200",
  },
  {
    value: "critica",
    label: "Crítica",
    helper: "Sistema indisponível",
    dot: "bg-rose-400",
    activeClass: "border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-rose-200",
  },
];

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

export default function SupportTicketWidget({
  currentView,
  currentViewMeta,
  contextClubName,
  loggedUser,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");
  const [contactEmail, setContactEmail] = useState(String(loggedUser?.email || ""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "error" });

  useEffect(() => {
    const e = String(loggedUser?.email || "").trim();
    if (e) setContactEmail(e);
  }, [loggedUser?.email]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDescription("");
      setPriority("media");
      setIsSubmitting(false);
      setToast({ message: "", type: "error" });
    }
  }, [isOpen]);

  const moduleLabel = useMemo(
    () => currentViewMeta?.label || SUPPORT_VIEW_LABELS[currentView] || "Sistema",
    [currentView, currentViewMeta]
  );

  const moduleChip = useMemo(() => {
    const s = String(moduleLabel || "Sistema").trim();
    return s.length > 20 ? `${s.slice(0, 20)}…` : s;
  }, [moduleLabel]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setToast({ message: "Descreva o problema encontrado para abrir o chamado.", type: "error" });
      return;
    }

    setToast({ message: "", type: "error" });
    setIsSubmitting(true);

    try {
      const ticketId = await createSupportTicket({
        currentView,
        moduleLabel,
        description,
        priority,
        contactEmail,
        contextClubName,
        pageUrl: window.location.href,
        loggedUser,
      });

      setToast({
        message: `Chamado aberto com sucesso. Ticket: ${ticketId}`,
        type: "success",
      });
      setDescription("");
      setPriority("media");
    } catch (error) {
      console.error("Support ticket error:", error);
      setToast({
        message: String(error?.message || "Não foi possível abrir o chamado agora."),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ── Floating button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir chamado de suporte"
        className="
          fixed bottom-5 right-4 z-[145]
          inline-flex items-center gap-0
          rounded-full border border-indigo-200 bg-white
          px-3 py-3 text-indigo-700
          shadow-[0_4px_20px_rgba(99,102,241,0.16)]
          transition-all duration-200
          hover:border-indigo-300 hover:shadow-[0_6px_28px_rgba(99,102,241,0.24)]
          focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2
          group
          sm:right-6
        "
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 transition-colors duration-200 group-hover:bg-indigo-100">
          <LifeBuoy className="h-5 w-5 text-indigo-500" />
        </span>

        <span className="flex max-w-0 flex-col overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover:max-w-[18rem] group-hover:gap-1.5 group-hover:px-3 group-hover:opacity-100">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
            Suporte
          </span>
          <span className="text-sm font-bold leading-tight text-slate-900">
            Abrir chamado
          </span>
        </span>

        <span className="hidden rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-500 transition-all duration-200 group-hover:inline-flex">
          {moduleChip}
        </span>
      </button>

      {/* ── Modal overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-400/25 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="
            flex w-full max-w-xl flex-col overflow-hidden
            rounded-2xl border border-slate-200 bg-white
            shadow-[0_20px_60px_rgba(99,102,241,0.10),0_4px_16px_rgba(0,0,0,0.06)]
            max-h-[92dvh]
          ">

            {/* ── Header ── */}
            <div className="flex-shrink-0 border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
                    <LifeBuoy className="h-3 w-3" />
                    Central de Suporte
                  </p>
                  <h2 className="text-xl font-bold leading-snug text-slate-800">
                    Reportar falha técnica
                  </h2>
                  <p className="text-sm text-slate-500">
                    O módulo atual é capturado automaticamente para agilizar o diagnóstico.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar"
                  className="
                    mt-0.5 flex-shrink-0 inline-flex h-9 w-9 items-center justify-center
                    rounded-full border border-slate-200 bg-white text-slate-600
                    transition hover:border-slate-300 hover:text-slate-700
                  "
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* context chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3.5 text-xs">
                <span className="text-slate-600">Módulo:</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-600">
                  <Sparkles className="h-3 w-3" />
                  {moduleLabel}
                </span>
                {contextClubName && (
                  <>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-600">Clube:</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-600">
                      {contextClubName}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-5 p-6">

                {/* Priority */}
                <Field label="Prioridade">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PRIORITY_OPTIONS.map((opt) => {
                      const active = priority === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPriority(opt.value)}
                          className={`
                            rounded-xl border px-3 py-2.5 text-left
                            transition-all duration-150
                            ${active
                              ? opt.activeClass
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }
                          `}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${opt.dot}`} />
                            <span className="text-xs font-bold">{opt.label}</span>
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-tight text-slate-600">
                            {opt.helper}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Description */}
                <Field
                  label="O que aconteceu?"
                  hint="Mínimo recomendado: 15 caracteres para facilitar a triagem."
                >
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="Descreva o passo que falhou, a mensagem exibida e o comportamento esperado."
                    className="
                      w-full resize-none rounded-xl border border-slate-200
                      bg-slate-50 px-4 py-3 text-sm text-slate-800
                      placeholder:text-slate-500 outline-none transition
                      focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100
                    "
                  />
                </Field>

                {/* Email */}
                <Field label="E-mail para retorno">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="seu.nome@exemplo.com"
                    className="
                      w-full rounded-xl border border-slate-200
                      bg-slate-50 px-4 py-3 text-sm text-slate-800
                      placeholder:text-slate-500 outline-none transition
                      focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100
                    "
                  />
                </Field>

                {/* Submit row */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                    Módulo identificado automaticamente no chamado.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="
                      flex-shrink-0 inline-flex items-center gap-2
                      rounded-xl bg-indigo-600 px-5 py-2.5
                      text-sm font-semibold text-white
                      transition hover:bg-indigo-500
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Enviando…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar chamado
                      </>
                    )}
                  </button>
                </div>

                {toast.message && (
                  <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ message: "", type: "error" })}
                  />
                )}

              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}