import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { Clock3, FileText, RefreshCw } from "lucide-react";

const STATUS_LABELS = {
  aberto: "Aberto",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
};

const PRIORITY_LABELS = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const formatDate = (date) => {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(date);
  }
};

export default function SupportTickets({ loggedUser }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = async () => {
    setLoading(true);
    setError("");

    const reporterUid = String(loggedUser?.uid || loggedUser?.id || "").trim();
    if (!reporterUid) {
      setTickets([]);
      setLoading(false);
      setError("Usuário não autenticado para buscar chamados.");
      return;
    }

    try {
      const ticketsQuery = query(
        collection(db, "support_tickets"),
        where("reporter_uid", "==", reporterUid),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(ticketsQuery);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTickets(data);
    } catch (fetchError) {
      console.error("Erro ao carregar chamados:", fetchError);
      setError("Falha ao buscar seus chamados. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedUser) return;
    void fetchTickets();
  }, [loggedUser]);

  return (
    <div className="mx-auto w-full max-w-[84rem] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Acompanhamento de chamados
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Meus chamados de suporte
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Aqui você acompanha o histórico dos chamados abertos, o status atual e as informações de retorno.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTickets}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          <span className="inline-flex items-center gap-2 font-semibold">
            <Clock3 className="h-4 w-4" />
            Carregando seus chamados...
          </span>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          <p className="font-semibold text-slate-900">Nenhum chamado registrado ainda.</p>
          <p className="mt-2 text-sm">Use o botão flutuante de suporte para abrir um novo chamado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {PRIORITY_LABELS[ticket.priority] || "Prioridade desconhecida"}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{ticket.module_label}</h2>
                  <p className="mt-1 text-sm text-slate-600">{ticket.context_clube_nome ? `Clube: ${ticket.context_clube_nome}` : "Sem clube associado"}</p>
                </div>
                <div className="flex flex-col items-start gap-2 text-right sm:items-end">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
                    {STATUS_LABELS[ticket.status] || ticket.status || "Status"}
                  </span>
                  <span className="text-xs text-slate-500">Aberto em {formatDate(ticket.createdAt?.toDate?.() ?? ticket.createdAt)}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                {ticket.description}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>ID: {ticket.id}</span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {String(ticket.page_url || "").slice(0, 60)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
