"use client";

import React, { useEffect, useState } from "react";
import ModalPesquisaAnterioridade from "./ModalPesquisaAnterioridade";
import ModalPI from "./ModalPI";
import ModalMU from "./ModalMU";
import ModalLogin from "./ModalLogin";
import AutonomousINPIAgent from "./AutonomousINPIAgent";
import INPIProcessTracker from "./INPIProcessTracker";
import {
  BookOpen,
  Sparkles,
  FileText,
  CheckSquare,
  Search,
  UserPlus,
  CreditCard,
  Upload,
  AlertCircle,
  Copy,
  CheckCircle2,
  File,
  Calendar,
  DollarSign,
  ExternalLink,
  Info,
  Download,
  FileDown,
  Archive,
  FolderOpen,
  HardDrive,
  Clock3,
  List,
  Image as ImageIcon,
  AlignLeft,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function INPI({ clubProjects = [], loggedUser = null }) {
  const [activeTab, setActiveTab] = useState("guia");
  const [isPesquisaModalOpen, setIsPesquisaModalOpen] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [viewMode, setViewMode] = useState("leitura_rapida");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white text-white shadow-md">
        <div className="mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <img src="/logoPatentes.svg" alt="" />
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 flex justify-center">
        <div className=" mx-auto px-4 flex overflow-x-auto">
          <button
            onClick={() => setActiveTab("guia")}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "guia"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Guia Completo
          </button>
          <button
            onClick={() => setActiveTab("documentos")}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "documentos"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <File className="w-5 h-5" />
            Documentos Obrigatórios
          </button>
          <button
            onClick={() => setActiveTab("gerador")}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "gerador"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="w-5 h-5" />
            Gerador de Documentos
          </button>
          <button
            onClick={() => setActiveTab("acompanhamento")}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "acompanhamento"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Clock3 className="w-5 h-5" />
            Acompanhamento
          </button>
          <button
            onClick={() => setActiveTab("agente")}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "agente"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <img src="/Lobo.svg" alt="" className="w-5 h-5" />
            GUIÁ
          </button>
        </div>
      </nav>

      <ModalPesquisaAnterioridade
        isOpen={isPesquisaModalOpen}
        onClose={() => setIsPesquisaModalOpen(false)}
      />

      <main className=" mx-auto px-4 py-8">
        <div className="mb-4 flex justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-1">
              <button
                onClick={() => setViewMode("leitura_rapida")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === "leitura_rapida"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Modo leitura rapida
              </button>
              <button
                onClick={() => setViewMode("completo")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === "completo"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Modo completo
              </button>
            </div>
            <button
              onClick={() => setShowChecklist((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <CheckSquare className="w-4 h-4" />
              {showChecklist ? "Ocultar checklist" : "Marcar checklist"}
            </button>
          </div>
        </div>

        <div
          className={`grid gap-8 ${
            showChecklist ? "lg:grid-cols-[380px_1fr]" : "grid-cols-1"
          }`}
        >
          {showChecklist && (
            <aside className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 sticky top-20 self-start">
              <h2 className="text-lg font-bold text-slate-800 mb-3">
                Checklist Completo
              </h2>
              <ChecklistSidebar loggedUser={loggedUser} />
            </aside>
          )}

          <section>
            {activeTab === "guia" && (
              <GuiaINPI
                onOpenPesquisa={() => setIsPesquisaModalOpen(true)}
                viewMode={viewMode}
              />
            )}
            {activeTab === "gerador" && (
              <GeradorDocumentos loggedUser={loggedUser} viewMode={viewMode} />
            )}
            {activeTab === "documentos" && (
              <DocumentosObrigatorios viewMode={viewMode} />
            )}
            {activeTab === "acompanhamento" && <INPIProcessTracker />}
            {activeTab === "agente" && (
              <AutonomousINPIAgent clubProjects={clubProjects} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function GuiaINPI({ onOpenPesquisa, viewMode = "leitura_rapida" }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalMUOpen, setIsModalMUOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentBeginnerStep, setCurrentBeginnerStep] = useState(0);

  const steps = [
    {
      icon: <Search className="w-6 h-6 text-indigo-500" />,
      title: "1. Pesquisa de anterioridade e triagem de patenteabilidade",
      desc: "A busca inicial define se vale a pena seguir com o depósito. O critério do INPI não é novidade apenas no mercado brasileiro: a análise considera novidade mundial, confronto com o estado da técnica e, no caso de MU, se existe melhoria funcional real em objeto de uso prático.",
      checklist: [
        "Pesquisar no BuscaWeb do INPI e, idealmente, em bases internacionais, usando palavras-chave, sinônimos, nomes técnicos e classes IPC/CPC.",
        "Ler documentos próximos até o nível de reivindicações e relatório, não apenas o título do pedido.",
        "Comparar a essência técnica da solução com o estado da técnica para decidir se o caso é PI, MU ou se ainda precisa ser amadurecido.",
      ],
      outputs: [
        "Mapa de palavras-chave e classificações relevantes.",
        "Lista de documentos potencialmente conflitantes.",
        "Decisão fundamentada sobre seguir, ajustar ou adiar o depósito.",
      ],
      alerts: [
        "Divulgação prévia em artigo, banca, feira, pitch ou site pode comprometer a estratégia do pedido.",
        "Um produto ser novo comercialmente não significa que ele seja novo para fins patentários.",
      ],
      deadline: "Fase preparatória",
      ctaLabel: "Abrir explicação detalhada da pesquisa de anterioridade",
      onClick: onOpenPesquisa,
    },
    {
      icon: <UserPlus className="w-6 h-6 text-blue-500" />,
      title: "2. Estrutura jurídica do pedido e cadastro no e-INPI",
      desc: "Antes do protocolo, é preciso definir corretamente quem inventou, quem será titular e qual será o enquadramento do depositante. O cadastro ativo no e-INPI é obrigatório para emissão da GRU e uso do sistema e-Patentes.",
      checklist: [
        "Conferir dados completos de inventores, titulares, CPF/CNPJ e endereços.",
        "Definir se haverá procurador ou se o depósito será feito diretamente pelo interessado.",
        "Resolver internamente temas de cessão, cotitularidade e vínculo com empresa, universidade ou ICT antes do envio.",
      ],
      outputs: [
        "Cadastro ativo no e-INPI.",
        "Titularidade e inventoria alinhadas.",
        "Enquadramento para desconto validado antes do pagamento.",
      ],
      alerts: [
        "Inventor e titular não são necessariamente a mesma pessoa ou entidade.",
        "Erro de titularidade parece detalhe, mas afeta cessão, licenciamento e alterações futuras do pedido.",
      ],
      deadline: "Pré-requisito para depósito",
      ctaLabel: "Abrir explicação detalhada sobre o cadastro no INPI",
      onClick: () => setIsLoginModalOpen(true),
    },
    {
      icon: <CreditCard className="w-6 h-6 text-emerald-500" />,
      title: "3. Emissão da GRU e planejamento financeiro do processo",
      desc: "O depósito começa com a taxa correta. No fluxo padrão, a GRU código 200 é a referência do depósito. O portal de custos do INPI alerta para um erro clássico: não confundir a data de vencimento da GRU com o prazo legal do processo.",
      checklist: [
        "Emitir e pagar a GRU correspondente ao depósito e guardar o número gerado para o peticionamento.",
        "Verificar se o desconto foi aplicado conforme o enquadramento real do depositante.",
        "Montar uma agenda mínima de custos futuros: exame técnico, anuidades e eventuais petições ao longo do processo.",
      ],
      outputs: [
        "GRU quitada e comprovante guardado.",
        "Número da GRU pronto para o e-Patentes.",
        "Visão financeira do ciclo do pedido, e não apenas do depósito inicial.",
      ],
      alerts: [
        "O depósito não encerra os custos: o pedido exigirá exame e anuidades para continuar vivo.",
        "Erro no código ou descuido com pagamento gera retrabalho e pode impactar o cronograma.",
      ],
      deadline: "Código 200 para depósito",
    },
    {
      icon: <FileText className="w-6 h-6 text-purple-500" />,
      title: "4. Redação técnica do pedido: relatório, reivindicações, resumo e desenhos",
      desc: "O pedido de patente é um documento jurídico-técnico. O relatório precisa permitir reprodução por técnico no assunto; as reivindicações definem o alcance da proteção; o resumo serve para divulgação técnica; os desenhos apoiam a compreensão. Em biotecnologia, pode haver listagem de sequências no padrão ST26.",
      checklist: [
        "Descrever o problema técnico, a solução, as variações de implementação e a melhor forma de execução.",
        "Escrever reivindicações independentes e dependentes com suporte integral no relatório descritivo.",
        "Manter o resumo informativo, conciso e sem inflar o escopo que está nas reivindicações.",
        "Numerar figuras e referenciá-las corretamente quando houver desenhos.",
      ],
      outputs: [
        "Relatório descritivo consistente.",
        "Quadro reivindicatório coerente com o relatório.",
        "Resumo e desenhos prontos para protocolo.",
      ],
      alerts: [
        "Reivindicação ampla demais, sem base no relatório, costuma gerar exigência ou indeferimento.",
        "Texto comercial ou institucional não substitui redação técnica de patente.",
      ],
      deadline: "Antes do upload no sistema",
    },
    {
      icon: <Upload className="w-6 h-6 text-orange-500" />,
      title: "5. Protocolo no e-Patentes 4.0",
      desc: "Com cadastro ativo e GRU quitada, o depósito é protocolado no sistema e-Patentes. O portal oficial do INPI destaca o e-Patentes como sistema de peticionamento para patentes e mantém o fluxo integrado com cadastro e GRU. No fechamento do envio, o usuário também precisa revisar o documento de veracidade e assiná-lo com certificado ICP-Brasil compatível, normalmente e-CPF ou e-CNPJ.",
      checklist: [
        "Informar corretamente os dados do pedido, dos titulares e dos inventores no formulário eletrônico.",
        "Inserir o número da GRU paga e anexar os documentos técnicos nos formatos aceitos pelo serviço.",
        "Revisar o documento de veracidade gerado no fluxo e aplicar a assinatura digital/eletrônica aceita pelo portal antes da transmissão final.",
        "Revisar o pacote final antes de transmitir e guardar protocolo, número do pedido e cópia exata do conteúdo enviado.",
      ],
      outputs: [
        "Número do pedido.",
        "Comprovante de protocolo.",
        "Documento de veracidade assinado digitalmente.",
        "Pacote protocolado preservado para futuras respostas e comparações.",
      ],
      alerts: [
        "Se o pedido envolver procurador, universidade ou empresa, defina previamente quem será o signatário do documento de veracidade.",
        "Sem assinatura digital válida, o peticionamento pode ficar pendente ou não ser concluído corretamente.",
        "Erro de arquivo, versão ou anexo vira problema processual depois, não apenas no dia do depósito.",
        "Guardar somente o DOCX local não basta; preserve também o conjunto efetivamente protocolado.",
      ],
      deadline: "Dia do depósito",
    },
    {
      icon: <AlertCircle className="w-6 h-6 text-red-500" />,
      title: "6. Acompanhamento do pedido: publicação, exame, anuidades e decisão",
      desc: "Depois do protocolo, o pedido entra em fluxo administrativo no INPI. Segundo o Guia Básico, há depósito, exame formal, publicação, exame técnico e decisão. A responsabilidade de monitorar a RPI e cumprir exigências é do depositante.",
      checklist: [
        "Consultar a Revista da Propriedade Industrial (RPI) toda terça-feira.",
        "Cadastrar o pedido em Meus Pedidos como apoio, sem tratar isso como substituto da RPI.",
        "Solicitar o exame técnico em até 36 meses do depósito: código 203 para PI e 204 para MU.",
        "Pagar a primeira anuidade a partir do 24º mês e seguir pagando para manter o pedido ou patente ativos.",
      ],
      outputs: [
        "Pedido processualmente ativo.",
        "Respostas tempestivas a exigências e pareceres.",
        "Controle do histórico até deferimento, indeferimento ou outra decisão final.",
      ],
      alerts: [
        "Perda de prazo de exame ou anuidade pode levar a arquivamento ou perda de direitos.",
        "No indeferimento, o prazo de recurso é curto e exige reação rápida.",
      ],
      deadline: "RPI semanal + exame em até 36 meses",
    },
  ];

  const completeGuideHighlights = [
    {
      label: "Critérios materiais",
      value: "Novidade mundial, atividade inventiva e aplicação industrial.",
    },
    {
      label: "Sigilo inicial",
      value: "Em regra, até 18 meses contados do depósito.",
    },
    {
      label: "Exame técnico",
      value: "Deve ser requerido em até 36 meses do depósito.",
    },
    {
      label: "Territorialidade",
      value: "O pedido no INPI protege no Brasil; exterior exige estratégia própria.",
    },
  ];

  const patentabilityCriteria = [
    {
      title: "Novidade mundial",
      desc: "O INPI compara sua solução com tudo que já foi tornado acessível ao público, no Brasil ou no exterior.",
    },
    {
      title: "Atividade inventiva",
      desc: "Não basta ser diferente: a solução não pode decorrer de forma óbvia para um técnico no assunto.",
    },
    {
      title: "Aplicação industrial",
      desc: "A invenção precisa poder ser produzida ou utilizada em contexto industrial.",
    },
    {
      title: "Ato inventivo no MU",
      desc: "No modelo de utilidade, a nova forma ou disposição deve gerar melhoria funcional em objeto de uso prático.",
    },
  ];

  const postFilingPhases = [
    {
      title: "Depósito",
      desc: "O pedido nasce com protocolo, número do processo e conjunto documental fixado na data do depósito.",
      watch: "Preserve exatamente os arquivos protocolados e os comprovantes.",
    },
    {
      title: "Exame formal",
      desc: "O INPI confere requisitos formais do pedido e pode publicar exigências administrativas ou documentais.",
      watch: "Leia a publicação integralmente e cumpra a petição indicada no prazo oficial.",
    },
    {
      title: "Publicação",
      desc: "Em regra, o pedido sai do sigilo em até 18 meses e passa a ficar visível ao público na base do INPI.",
      watch: "A partir daí, terceiros passam a conhecer a matéria técnica depositada.",
    },
    {
      title: "Exame técnico",
      desc: "O examinador confronta reivindicações, relatório e estado da técnica. Exigências e pareceres são parte normal do processo.",
      watch: "Respostas precisam ser tecnicamente consistentes e respeitar o conteúdo originalmente depositado.",
    },
    {
      title: "Decisão",
      desc: "O processo pode culminar em deferimento, indeferimento, arquivamento ou outras decisões processuais intermediárias.",
      watch: "Se houver concessão, recolha a retribuição no prazo. Se houver indeferimento, avalie recurso em 60 dias.",
    },
  ];

  const strategicWarnings = [
    "Depósito não significa concessão automática: ele apenas inicia o processo administrativo perante o INPI.",
    "Patente concedida não substitui análise de liberdade de operação; ainda podem existir direitos de terceiros em tecnologias relacionadas.",
    "Se houver plano internacional, a prioridade para CUP ou PCT deve ser pensada em até 12 meses do primeiro depósito.",
  ];

  const commonMistakes = [
    "Depositar depois de já ter divulgado publicamente a solução sem estratégia clara de novidade.",
    "Escrever o relatório como texto promocional, sem detalhamento suficiente para reprodução técnica.",
    "Criar reivindicações muito amplas, desconectadas do relatório descritivo e dos desenhos.",
    "Perder o pedido de exame técnico ou a primeira anuidade por confiar apenas em lembretes informais.",
    "Confundir proteção no Brasil com proteção internacional e deixar passar a janela de 12 meses para exterior.",
  ];

  const quickReadSteps = [
    {
      title: "1. Validação de novidade",
      objective:
        "Confirmar se sua solução tem chance real de proteção antes de gastar com o depósito.",
      deliverable: "Lista de resultados do BuscaWeb com palavras-chave e IPC.",
      risk: "Ignorar sinônimos e perder anterioridade relevante.",
      eta: "30-90 min",
      cta: "Abrir explicacao da pesquisa de anterioridade",
      onClick: onOpenPesquisa,
    },
    {
      title: "2. Cadastro e taxa de depósito",
      objective:
        "Habilitar o envio no sistema com login ativo e GRU 200 quitada.",
      deliverable: "Comprovante da GRU paga e numero para peticionamento.",
      risk: "Preencher dados de titularidade incorretos e travar exigências futuras.",
      eta: "20-40 min",
      cta: "Abrir explicacao do cadastro no INPI",
      onClick: () => setIsLoginModalOpen(true),
    },
    {
      title: "3. Pacote técnico do pedido",
      objective:
        "Consolidar os 4 documentos obrigatórios no padrão do e-Patentes.",
      deliverable:
        "Relatório, Reivindicações, Resumo e Desenhos (se houver), em DOCX ou PDF.",
      risk: "Reivindicações genéricas ou desconectadas do relatório.",
      eta: "2-6 h",
    },
    {
      title: "4. Protocolo e acompanhamento",
      objective:
        "Protocolar corretamente, assinar o documento de veracidade e controlar os marcos críticos pós-depósito.",
      deliverable:
        "Número do pedido, protocolo salvo, documento de veracidade assinado digitalmente e agenda com exame técnico em até 36 meses.",
      risk:
        "Chegar ao fim do fluxo sem assinatura digital válida no documento de veracidade ou perder o prazo de exame técnico (GRU 203).",
      eta: "15-30 min",
    },
  ];

  if (viewMode === "leitura_rapida") {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 relative">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Leitura rapida do processo
          </h2>
          <p className="text-sm text-slate-600">
            Roteiro executivo para sair da ideia ao protocolo sem se perder.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Horizonte
              </p>
              <p className="text-sm font-semibold text-slate-800">4 etapas</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Janela típica
              </p>
              <p className="text-sm font-semibold text-slate-800">3h a 8h</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Resultado final
              </p>
              <p className="text-sm font-semibold text-slate-800">Pedido protocolado</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {quickReadSteps.map((step, index) => {
            const isCurrent = index === currentBeginnerStep;
            const isDone = index < currentBeginnerStep;

            return (
              <div
                key={step.title}
                className={`rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-white"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{step.objective}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 px-2 py-1">
                      Tempo: {step.eta}
                    </span>
                    {isDone && (
                      <span className="text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">
                        Concluido
                      </span>
                    )}
                  </div>
                </div>

                {(isCurrent || isDone) && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        Entregavel
                      </p>
                      <p className="text-xs text-blue-900 mt-1">{step.deliverable}</p>
                    </div>
                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                        Risco comum
                      </p>
                      <p className="text-xs text-amber-900 mt-1">{step.risk}</p>
                    </div>
                  </div>
                )}

                {isCurrent && step.cta && step.onClick && (
                  <button
                    onClick={step.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {step.cta}
                  </button>
                )}

                {isCurrent && (
                  <div className="mt-3 text-[11px] text-slate-500">
                    Etapa {currentBeginnerStep + 1} de {quickReadSteps.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-900">
            Assinatura digital no documento de veracidade
          </h3>
          <p className="mt-2 text-sm text-amber-900 leading-relaxed">
            No fechamento do protocolo, o e-Patentes pode exigir a revisão do
            documento de veracidade e a assinatura por certificado digital
            ICP-Brasil. Neste contexto, assinatura feita apenas com conta
            gov.br não supre a exigência: organize antes quem vai assinar com
            e-CPF ou e-CNPJ e deixe o certificado já emitido e funcionando.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              setCurrentBeginnerStep((prev) => Math.max(prev - 1, 0))
            }
            disabled={currentBeginnerStep === 0}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Etapa anterior
          </button>
          <button
            onClick={() =>
              setCurrentBeginnerStep((prev) =>
                Math.min(prev + 1, quickReadSteps.length - 1),
              )
            }
            disabled={currentBeginnerStep === quickReadSteps.length - 1}
            className="rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Proxima etapa
          </button>
        </div>

        <ModalPI isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        <ModalMU
          isOpen={isModalMUOpen}
          onClose={() => setIsModalMUOpen(false)}
        />
        <ModalLogin
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            Modo completo
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-3">
            Guia aprofundado do processo de patentes no INPI
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Este guia foi estruturado para ir além do depósito inicial. Ele cobre
            o raciocínio de patenteabilidade, a formação do pacote técnico, a
            lógica do peticionamento eletrônico e os marcos processuais que
            mantêm o pedido vivo até a decisão final.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 mt-6">
            {completeGuideHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-50 shadow-sm">
          <h3 className="text-lg font-bold">Leitura estratégica</h3>
          <p className="text-sm text-slate-200 mt-2 leading-relaxed">
            O pedido de patente no INPI protege inicialmente apenas o território
            brasileiro, entra em sigilo por até 18 meses, exige pedido de exame
            em até 36 meses e passa a gerar anuidades a partir do 24º mês.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-200 list-disc list-inside">
            {strategicWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              Enquadramento do pedido e critérios que sustentam a análise
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Patente não é selo genérico de inovação. O pedido precisa se
              encaixar juridicamente no sistema de patentes e sobreviver ao exame
              técnico. A primeira decisão crítica é definir se o caso é Patente
              de Invenção, Modelo de Utilidade ou se outro instrumento de
              propriedade intelectual faz mais sentido.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-50 p-6 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 hover:shadow-md transition-all group"
          >
            <h3 className="font-bold text-blue-800 mb-2 flex items-center justify-between">
              Patente de Invenção (PI)
              <Info className="w-4 h-4 text-blue-500 group-hover:text-blue-700 transition-colors" />
            </h3>
            <p className="text-blue-900/80 text-sm leading-relaxed">
              Indicada para produto ou processo novo com atividade inventiva e
              aplicação industrial. A proteção dura 20 anos contados do depósito,
              se o pedido for concedido e mantido regularmente.
            </p>
          </div>

          <div
            onClick={() => setIsModalMUOpen(true)}
            className="bg-emerald-50 p-6 rounded-lg border border-emerald-100 cursor-pointer hover:bg-emerald-100 hover:shadow-md transition-all group"
          >
            <h3 className="font-bold text-emerald-800 mb-2 flex items-center justify-between">
              Modelo de Utilidade (MU)
              <Info className="w-4 h-4 text-emerald-500 group-hover:text-emerald-700 transition-colors" />
            </h3>
            <p className="text-emerald-900/80 text-sm leading-relaxed">
              Voltado a objeto de uso prático com nova forma ou disposição que
              produza melhoria funcional. A proteção dura 15 anos contados do
              depósito, desde que o pedido seja concedido e mantido ativo.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4 mt-6">
          {patentabilityCriteria.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="font-bold text-slate-800">{item.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900 leading-relaxed">
            Nem toda inovação deve virar patente. Dependendo da natureza da
            solução, pode ser mais adequado avaliar sigilo, desenho industrial,
            marca, programa de computador ou estratégia contratual. O erro mais
            caro é insistir em patente para matéria mal enquadrada.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-xl border border-emerald-100">
        <div className="flex items-start gap-4">
          <Info className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-emerald-800">
              Novidade: e-Patentes 4.0
            </h3>
            <p className="text-emerald-700 text-sm mt-1">
              O novo sistema permite o depósito dos documentos técnicos em
              formato DOCX (além do PDF). Na segunda fase, haverá verificação
              automática de erros formais, agilizando o processo.{" "}
              <strong>Recomenda-se usar DOCX</strong> para se beneficiar da
              validação futura.
            </p>
            <a
              href="https://www.gov.br/inpi/pt-br/servicos/patentes/e-patentes"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium mt-2 hover:underline"
            >
              Saiba mais no site do INPI <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-8 h-8 text-amber-700 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-amber-900">
              Documento de veracidade e assinatura digital
            </h3>
            <p className="text-sm text-amber-900 mt-2 leading-relaxed">
              Além dos anexos técnicos, o fechamento do peticionamento exige
              atenção ao documento de veracidade apresentado pelo sistema. Ele
              funciona como a confirmação formal de que os dados, a titularidade
              e os arquivos anexados correspondem ao que está sendo protocolado.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-amber-300 bg-white/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  O que não serve
                </p>
                <p className="mt-2 text-sm text-amber-900 leading-relaxed">
                  A assinatura eletrônica comum da conta gov.br, embora válida
                  para vários serviços públicos, não substitui a exigência de
                  certificado digital ICP-Brasil quando o fluxo pede assinatura
                  com e-CPF ou e-CNPJ.
                </p>
              </div>

              <div className="rounded-lg border border-amber-300 bg-white/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  O que normalmente é aceito
                </p>
                <p className="mt-2 text-sm text-amber-900 leading-relaxed">
                  Certificado ICP-Brasil do tipo e-CPF para pessoa física,
                  inventor ou procurador signatário, e e-CNPJ quando a assinatura
                  for feita pela pessoa jurídica competente no fluxo adotado.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-300 bg-white/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Como conseguir pelo Serpro
              </p>
              <ol className="mt-3 space-y-2 text-sm text-amber-900 list-decimal list-inside">
                <li>
                  Acesse a vitrine de Certificação Digital do Serpro e escolha o
                  tipo correto: e-CPF ou e-CNPJ.
                </li>
                <li>
                  Defina a mídia conforme sua operação: A1 em arquivo, A3 ou
                  SerproID em nuvem.
                </li>
                <li>
                  Inicie a contratação e siga o fluxo da Área do Cliente para
                  envio de dados e documentos.
                </li>
                <li>
                  Passe pela validação de identidade exigida pela ICP-Brasil,
                  feita por Autoridade de Registro, presencialmente ou por
                  videoconferência, conforme o caso.
                </li>
                <li>
                  Após a emissão, teste o certificado antes do depósito final e
                  confirme que ele assina PDFs ou o fluxo eletrônico exigido.
                </li>
              </ol>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="https://store.serpro.gov.br/certificado-digital/product/Certificado"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Certificação Digital Serpro <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://store.serpro.gov.br/serproid/product/serproid"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                SerproID em nuvem <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Entender a assinatura gov.br <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-6">
        Fluxo completo do pedido de patente
      </h2>
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-6">
              <div className="flex-shrink-0 mt-1">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  {step.icon}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-4xl">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {step.deadline}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      O que fazer
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc list-inside">
                      {step.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                      Saída esperada
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-blue-900 list-disc list-inside">
                      {step.outputs.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      Pontos de atenção
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-amber-900 list-disc list-inside">
                      {step.alerts.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {step.ctaLabel && step.onClick && (
                  <button
                    onClick={step.onClick}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {step.ctaLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mt-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          O que acontece depois do protocolo
        </h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          O Guia Básico do INPI resume o andamento em cinco grandes marcos:
          depósito, exame formal, publicação, exame técnico e decisão. Em cada
          um deles podem surgir exigências específicas, e a omissão do
          depositante pode comprometer o pedido.
        </p>

        <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
          {postFilingPhases.map((phase) => (
            <div
              key={phase.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="font-bold text-slate-800">{phase.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {phase.desc}
              </p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Vigiar
                </p>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {phase.watch}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-4 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" /> Descontos (até
            60%)
          </h3>
          <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm leading-relaxed">
            <li>
              Pessoas físicas (sem participação societária em empresa do ramo)
            </li>
            <li>Microempresas, MEI e empresas de pequeno porte</li>
            <li>Instituições de ensino e pesquisa</li>
            <li>Cooperativas e entidades sem fins lucrativos</li>
            <li>Órgãos públicos (para atos próprios)</li>
          </ul>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            O enquadramento precisa refletir a realidade do depositante. Custos
            e pagamentos oficiais devem ser sempre conferidos no portal do INPI.
          </p>
          <a
            href="https://www.gov.br/inpi/pt-br/servicos/patentes/custos"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium mt-3 hover:underline"
          >
            Ver custos e pagamentos <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
            <Calendar className="w-5 h-5 text-emerald-600" /> Principais Prazos
          </h3>
          <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm leading-relaxed">
            <li>
              <strong>Sigilo:</strong> 18 meses a partir do depósito
            </li>
            <li>
              <strong>Exame técnico:</strong> até 36 meses do depósito (203 para
              PI e 204 para MU)
            </li>
            <li>
              <strong>Anuidades:</strong> primeiro pagamento a partir do 24º mês
              contado do depósito
            </li>
            <li>
              <strong>Recurso de indeferimento:</strong> 60 dias após a decisão
            </li>
            <li>
              <strong>Concessão:</strong> pagar GRU em até 60 dias (ordinário) +
              30 extras (extraordinário)
            </li>
            <li>
              <strong>Exterior:</strong> em regra, até 12 meses para preservar a
              prioridade via CUP ou PCT
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Monitoramento
            obrigatório
          </h3>
          <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm leading-relaxed">
            <li>Consultar a RPI toda terça-feira.</li>
            <li>
              Cadastrar o pedido em Meus Pedidos para receber avisos auxiliares.
            </li>
            <li>
              Tratar alertas por e-mail como apoio, nunca como substituto da RPI.
            </li>
            <li>
              Guardar protocolo, respostas, pareceres e comprovantes de GRU em
              um histórico organizado.
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
            <ExternalLink className="w-5 h-5 text-emerald-600" /> Estratégia
            internacional
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            O depósito no INPI não gera proteção automática em outros países.
            Se houver plano de exploração fora do Brasil, a regra prática é
            estruturar o uso da prioridade da CUP ou do PCT em até 12 meses do
            primeiro depósito.
          </p>
          <a
            href="https://www.gov.br/inpi/pt-br/uso-estrategico-da-pi/deposito-internacional-de-patentes-pct-cup"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium mt-3 hover:underline"
          >
            Ver orientação sobre CUP e PCT <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Erros que mais enfraquecem um pedido
        </h2>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Em patentes, os maiores prejuízos normalmente não vêm de um único erro
          técnico, mas da soma entre estratégia ruim, redação fraca e gestão de
          prazo desorganizada.
        </p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {commonMistakes.map((mistake) => (
            <div
              key={mistake}
              className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-900 leading-relaxed"
            >
              {mistake}
            </div>
          ))}
        </div>
      </div>

      <ModalPI isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ModalMU isOpen={isModalMUOpen} onClose={() => setIsModalMUOpen(false)} />
      <ModalLogin
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

function buildProfessorFolderId(loggedUser) {
  const rawId =
    loggedUser?.id ||
    loggedUser?.uid ||
    loggedUser?.email ||
    loggedUser?.nome ||
    "professor_anonimo";

  return (
    String(rawId)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "professor_anonimo"
  );
}

function sanitizeFilePart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

function formatDateTimeCompact(isoDate) {
  const date = new Date(isoDate);
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate(),
  )}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function mergeChecklistTasks(baseTasks, remoteTasks) {
  if (!Array.isArray(remoteTasks)) {
    return baseTasks;
  }

  const remoteTasksById = new Map(remoteTasks.map((task) => [task.id, task]));
  const knownIds = new Set(baseTasks.map((task) => task.id));

  return [
    ...baseTasks.map((task) => {
      const persistedTask = remoteTasksById.get(task.id);

      if (!persistedTask) {
        return task;
      }

      return {
        ...task,
        done: Boolean(persistedTask.done),
      };
    }),
    ...remoteTasks.filter((task) => !knownIds.has(task.id)),
  ];
}

function GeradorDocumentos({ loggedUser, viewMode = "leitura_rapida" }) {
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
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "reivindicacoes",
      label: "Quadro Reivindicatório",
      icon: <List className="w-4 h-4" />,
    },
    {
      id: "desenhos",
      label: "Desenhos",
      icon: <ImageIcon className="w-4 h-4" />,
    },
    {
      id: "resumo",
      label: "Resumo",
      icon: <AlignLeft className="w-4 h-4" />,
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
      <div className="mt-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Fluxo simplificado
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              1. Preencha o documento 2. Revise a pré-visualização 3. Salve na
              pasta ou baixe.
            </p>
          </div>
          <button
            onClick={() => setShowTips((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Info className="w-4 h-4" />
            {showTips ? "Ocultar dicas" : "Mostrar dicas"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>

          {editingDocId && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-semibold text-amber-800">
                Modo edição ativo: você está atualizando um documento salvo.
              </p>
              <button
                type="button"
                onClick={() => setEditingDocId(null)}
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar edição
              </button>
            </div>
          )}

          <form className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {activeTab === "relatorio" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Título da Invenção
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Use um título técnico, específico e direto, sem nomes comerciais. Esse título deve ser o mesmo no Relatório e no Resumo." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Campo da Invenção
                  </label>
                  <textarea
                    name="campo"
                    value={formData.campo}
                    onChange={handleChange}
                    rows="2"
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Informe a área técnica da invenção (ex.: engenharia mecânica, biotecnologia, software embarcado), sem explicar ainda a solução completa." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Fundamentos (Estado da Técnica)
                  </label>
                  <textarea
                    name="estadoTecnica"
                    value={formData.estadoTecnica}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Descreva o que já existe no mercado ou na literatura e as limitações das soluções conhecidas, com linguagem objetiva." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Problema Técnico & Vantagens
                  </label>
                  <textarea
                    name="problema"
                    value={formData.problema}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Explique qual problema técnico sua invenção resolve e quais vantagens mensuráveis ela oferece em relation ao estado da técnica." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Breve Descrição dos Desenhos
                  </label>
                  <textarea
                    name="desenhos"
                    value={formData.desenhos}
                    onChange={handleChange}
                    rows="2"
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Liste cada figura de forma curta (Figura 1, Figura 2...) e diga o que cada uma representa, sem detalhamento excessivo." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Descrição Detalhada da Invenção
                  </label>
                  <textarea
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows="5"
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Descreva estrutura, componentes, funcionamento e variações de execução, com detalhes suficientes para reprodução técnica." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Exemplos de Concretização
                  </label>
                  <textarea
                    name="exemplos"
                    value={formData.exemplos}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Inclua ao menos um exemplo prático de aplicação da invenção, destacando a forma preferida de implementação." />
                </div>
              </>
            )}

            {activeTab === "reivindicacoes" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Reivindicações
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Formato: Preâmbulo + "caracterizado por" + essência da
                  invenção. Use ponto final único por reivindicação.
                </p>
                <textarea
                  name="reivindicacao"
                  value={formData.reivindicacao}
                  onChange={handleChange}
                  rows="8"
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <HelpBox text="Comece pela reivindicação independente (núcleo da proteção) e, em seguida, escreva as dependentes com características adicionais de forma clara e sem ambiguidades." />
              </div>
            )}

            {activeTab === "desenhos" && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700 text-center">
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Título da Invenção
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Deve ser idêntico ao informado no Relatório Descritivo.
                  </p>
                  <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Repita exatamente o mesmo título usado no Relatório Descritivo para manter consistência formal do pedido." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Resumo (50 a 200 palavras)
                  </label>
                  <textarea
                    name="resumo"
                    value={formData.resumo}
                    onChange={handleChange}
                    rows="6"
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <HelpBox text="Escreva um único parágrafo técnico com objetivo, solução e principal aplicação da invenção, sem linguagem promocional e sem reivindicações." />
                </div>
              </>
            )}
          </form>
        </div>

        <div className="flex flex-col h-full lg:h-auto">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="text-xl font-bold text-slate-800">
              Pré-visualização
            </h2>
            <div className="flex gap-2">
              <div className="flex flex-col h-full lg:h-auto gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h2 className="text-lg font-bold text-slate-800">
                      Pré-visualização
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                      >
                        {copiedText ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        Copiar
                      </button>
                      <button
                        onClick={exportToDocx}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm"
                      >
                        <FileDown className="w-4 h-4" />
                        Gerar DOCX
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-inner border border-slate-300 overflow-y-auto font-serif text-sm text-slate-700 whitespace-pre-wrap leading-relaxed h-[380px]">
                    {generateCurrentText()}
                  </div>

                  <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Gere o DOCX para salvar no padrão do e-Patentes. O
                        arquivo também entra automaticamente na pasta do
                        orientador.
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100/70 p-0 shadow-sm overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300/80 bg-white/90 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-xl bg-amber-100 text-amber-700 p-2.5 border border-amber-200">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          Pasta do orientador • {professorFolderName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {professorFolderId}
                        </p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      <HardDrive className="w-3.5 h-3.5" />
                      {orderedSavedDocs.length} arquivo(s)
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-slate-50/70">
                    <button
                      onClick={saveCurrentDocumentToFolder}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {savedText ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      {editingDocId ? "Atualizar documento" : "Salvar na pasta"}
                    </button>
                    <button
                      onClick={downloadAllSavedDocs}
                      disabled={!orderedSavedDocs.length || isBulkDownloading}
                      className="inline-flex items-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Archive className="w-4 h-4" />
                      {isBulkDownloading ? "Gerando ZIP..." : "Baixar todos"}
                    </button>
                    <button
                      onClick={clearFolder}
                      disabled={!orderedSavedDocs.length}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Limpar pasta
                    </button>
                  </div>

                  {folderError && (
                    <div className="px-4 pb-3">
                      <p className="text-[11px] text-red-600">{folderError}</p>
                    </div>
                  )}

                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          Explorador de arquivos
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Documentos guardados nesta pasta
                        </p>
                      </div>
                      <button
                        onClick={() => setShowFolderExplorer((prev) => !prev)}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {showFolderExplorer ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </div>

                  {showFolderExplorer && isFolderLoading ? (
                    <div className="p-6 text-center">
                      <p className="text-xs text-slate-500">
                        Carregando arquivos da pasta...
                      </p>
                    </div>
                  ) : showFolderExplorer && !orderedSavedDocs.length ? (
                    <div className="p-6 text-center">
                      <FolderOpen className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">
                        A pasta ainda está vazia. Salve documentos para
                        aparecerem aqui.
                      </p>
                    </div>
                  ) : showFolderExplorer ? (
                    <div className="max-h-64 overflow-y-auto">
                      {orderedSavedDocs.map((docRecord) => (
                        <div
                          key={docRecord.id}
                          className="group flex items-center justify-between gap-3 border-b last:border-b-0 border-slate-100 px-4 py-3 hover:bg-sky-50/40"
                        >
                          <div className="min-w-0 flex items-start gap-3">
                            <div className="mt-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200 p-1.5">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {docRecord.title ||
                                  docRecord.formData?.titulo ||
                                  "Documento sem titulo"}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {docRecord.fileBaseName}.docx
                              </p>
                              <p className="text-[11px] text-slate-400 inline-flex items-center gap-1.5 mt-0.5">
                                <Clock3 className="w-3 h-3" />
                                {docRecord.tabLabel} ·{" "}
                                {new Date(docRecord.createdAt).toLocaleString(
                                  "pt-BR",
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => loadDocumentForEditing(docRecord)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Re-editar
                            </button>
                            <button
                              onClick={() => downloadSavedDocument(docRecord)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                            <button
                              onClick={() => deleteSavedDocument(docRecord.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Apagar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Explorador oculto para manter a tela mais simples.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentosObrigatorios({ viewMode = "leitura_rapida" }) {
  if (viewMode === "leitura_rapida") {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Os 4 arquivos que voce precisa enviar
        </h2>
        <p className="text-slate-500 mb-6">
          Pense nesses documentos como um kit basico. Sem eles, o pedido nao
          segue.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-800">1. Relatorio Descritivo</p>
            <p className="text-sm text-slate-600 mt-1">
              Explica a invencao em detalhes: problema, solucao e funcionamento.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-800">2. Reivindicacoes</p>
            <p className="text-sm text-slate-600 mt-1">
              Define exatamente o que voce quer proteger legalmente.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-800">3. Resumo</p>
            <p className="text-sm text-slate-600 mt-1">
              Um paragrafo curto (50 a 200 palavras) sobre a invencao.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-800">4. Desenhos (se houver)</p>
            <p className="text-sm text-slate-600 mt-1">
              Figuras numeradas para facilitar o entendimento tecnico.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800 font-semibold">Envio no e-Patentes:</p>
          <p className="text-sm text-emerald-700 mt-1">
            Informe a GRU paga, anexe os 4 arquivos (DOCX ou PDF), revise o
            documento de veracidade, assine digitalmente e só então finalize e
            guarde o protocolo.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Documento adicional do protocolo
          </p>
          <p className="text-sm text-amber-800 mt-1 leading-relaxed">
            O documento de veracidade não substitui Relatório, Reivindicações,
            Resumo ou Desenhos. Ele entra no fechamento do peticionamento para
            validar formalmente o conteúdo enviado e precisa ser assinado
            digitalmente antes da confirmação final, com o certificado ICP-Brasil
            compatível exigido no fluxo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Documentos Técnicos para o Pedido de Patente
      </h2>
      <p className="text-slate-500 mb-6">
        Todo pedido de patente (PI ou MU) deve conter os quatro documentos
        abaixo, em arquivos separados, nos formatos DOCX ou PDF.
      </p>

      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h3 className="font-bold text-amber-900 mb-2">
          Documento de veracidade e assinatura digital
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Além dos quatro documentos técnicos, o fechamento do protocolo no
          e-Patentes exige revisar o documento de veracidade exibido pelo
          sistema e aplicar a assinatura por certificado ICP-Brasil exigida
          naquele fluxo. A assinatura gov.br não substitui esse requisito
          quando o portal pede e-CPF ou e-CNPJ. Sem essa etapa, o envio pode
          ficar incompleto mesmo com todos os anexos corretos.
        </p>
      </div>

      <div className="space-y-8">
        <div className="border-l-4 border-emerald-500 pl-5">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <FileText className="w-6 h-6 text-emerald-600" /> 1. Relatório
            Descritivo
          </h3>
          <p className="text-slate-600 mt-2">
            Descreve a invenção de forma clara e completa, permitindo a
            reprodução por um técnico no assunto. Deve conter:
          </p>
          <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1 ml-4">
            <li>Campo da invenção (setor técnico)</li>
            <li>Fundamentos da invenção / estado da técnica</li>
            <li>Problema técnico e solução proposta</li>
            <li>Descrição detalhada (materiais, dimensões, funcionamento)</li>
            <li>Exemplos de concretização (se houver)</li>
            <li>Breve descrição dos desenhos (quando houver)</li>
          </ul>
          <p className="text-sm text-slate-500 mt-2">
            Use o <strong>Gerador de Documentos</strong> desta ferramenta para
            estruturar seu relatório.
          </p>
        </div>

        <div className="border-l-4 border-emerald-500 pl-5">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <FileText className="w-6 h-6 text-emerald-600" /> 2. Quadro
            Reivindicatório
          </h3>
          <p className="text-slate-600 mt-2">
            Define o escopo de proteção legal. As reivindicações delimitam o que
            você quer proteger. Devem ser claras, concisas e apoiadas no
            relatório descritivo.
          </p>
          <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1 ml-4">
            <li>
              <strong>Reivindicação independente:</strong> define a essência da
              invenção (formato: "preâmbulo" + "caracterizado por" + matéria
              pleiteada).
            </li>
            <li>
              <strong>Reivindicações dependentes:</strong> acrescentam
              características adicionais.
            </li>
            <li>
              <strong>Numeração sequencial</strong> e redação em um único
              período.
            </li>
          </ul>
        </div>

        <div className="border-l-4 border-emerald-500 pl-5">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <FileText className="w-6 h-6 text-emerald-600" /> 3. Resumo
          </h3>
          <p className="text-slate-600 mt-2">
            Um parágrafo de 50 a 200 palavras que serve para divulgação da
            invenção. Deve indicar o título, o setor técnico e a principal
            característica da invenção.{" "}
            <strong>Não deve conter reivindicações</strong>
            nem ser usado para interpretação do escopo.
          </p>
        </div>

        <div className="border-l-4 border-emerald-500 pl-5">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <FileText className="w-6 h-6 text-emerald-600" /> 4. Desenhos (se
            houver)
          </h3>
          <p className="text-slate-600 mt-2">
            Ilustrações técnicas (figuras, gráficos, fluxogramas) necessárias
            para o entendimento da invenção. Devem ser numeradas sequencialmente
            (Figura 1, Figura 2...), com legendas claras.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Se a invenção não precisar de desenhos, você pode declarar "não se
            aplica" no campo correspondente.
          </p>
        </div>
      </div>

      <div className="mt-8 bg-slate-50 p-5 rounded-lg border border-slate-200">
        <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-2">
          <Download className="w-5 h-5 text-emerald-600" /> Como enviar no
          e-Patentes 4.0
        </h3>
        <ol className="list-decimal list-inside text-slate-600 space-y-1 ml-4">
          <li>
            Acesse o <strong>sistema e-Patentes</strong> com seu login.
          </li>
          <li>Informe o número da GRU já paga (código 200).</li>
          <li>
            Preencha o formulário eletrônico (dados do depositante, inventor,
            classificação).
          </li>
          <li>
            Na seção "Documentos", anexe cada um dos 4 arquivos (Relatório,
            Reivindicações, Resumo, Desenhos) em <strong>DOCX ou PDF</strong>.
          </li>
          <li>
            Revise o documento de veracidade exibido no fluxo e faça a
            assinatura com e-CPF ou e-CNPJ compatível com o signatário.
          </li>
          <li>Confirme e envie. Guarde o comprovante de protocolo.</li>
        </ol>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">
            Regra prática para não travar no final
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc list-inside">
            <li>A assinatura gov.br não resolve esse ponto quando o fluxo exige certificado ICP-Brasil.</li>
            <li>Se o depósito for assinado por procurador, o certificado normalmente precisa estar no CPF do procurador signatário.</li>
            <li>Se a titular for pessoa jurídica, confirme antes se o fechamento será com e-CNPJ ou com e-CPF do representante habilitado.</li>
            <li>Se ainda não houver certificado, o Serpro oferece e-CPF/e-CNPJ A1, A3 e SerproID em nuvem.</li>
          </ul>
        </div>
        <p className="text-sm text-emerald-700 mt-3 bg-emerald-50 p-2 rounded">
          ✨ <strong>Novidade:</strong> O novo sistema aceita DOCX e fará
          validação automática de erros formais em breve. Prefira DOCX!
        </p>
      </div>
    </div>
  );
}

function ChecklistSidebar({ loggedUser = null }) {
  const baseTasks = [
    { id: 1, text: "Definir título e categoria (PI ou MU)", done: false },
    {
      id: 2,
      text: "Realizar busca de anterioridade no BuscaWeb (várias palavras-chave)",
      done: false,
    },
    {
      id: 3,
      text: "Identificar se há direito a desconto (ensino, MEI, etc.)",
      done: false,
    },
    {
      id: 4,
      text: "Cadastrar-se como Cliente no e-INPI (login/senha)",
      done: false,
    },
    {
      id: 5,
      text: "Emitir e pagar GRU código 200 (depósito) – anotar número",
      done: false,
    },
    {
      id: 6,
      text: "Redigir Relatório Descritivo (usar o Gerador de Documentos)",
      done: false,
    },
    {
      id: 7,
      text: "Redigir Quadro Reivindicatório (usar o Gerador)",
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
      text: "Acessar e-Patentes, inserir GRU e preencher formulário",
      done: false,
    },
    { id: 12, text: "Anexar os 4 documentos e enviar", done: false },
    {
      id: 18,
      text: "Revisar e assinar o documento de veracidade com e-CPF ou e-CNPJ antes da confirmação final",
      done: false,
    },
    {
      id: 13,
      text: "Baixar comprovante de depósito (protocolo)",
      done: false,
    },
    {
      id: 14,
      text: "Cadastrar número do pedido para acompanhamento",
      done: false,
    },
    {
      id: 15,
      text: "Acompanhar a RPI semanalmente (exame formal e mérito)",
      done: false,
    },
    {
      id: 16,
      text: "Solicitar exame técnico (GRU 203) dentro de 36 meses",
      done: false,
    },
    {
      id: 17,
      text: "Pagar anuidades a partir do 2º ano (códigos 210/211)",
      done: false,
    },
  ];

  const [tasks, setTasks] = useState(baseTasks);
  const [checklistError, setChecklistError] = useState("");

  const firestoreUserId = String(
    loggedUser?.id || loggedUser?.uid || "",
  ).trim();
  const checklistFieldName = "inpi_checklist_tasks";

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
  }, [firestoreUserId]);

  const toggleTask = (id) => {
    const updatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t,
    );
    persistChecklist(updatedTasks);
  };

  const completed = tasks.filter((t) => t.done).length;
  const progress = Math.round((completed / tasks.length) * 100);

  return (
    <div className=" mx-auto">
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
        {tasks.map((task) => (
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
                task.done
                  ? "bg-emerald-600 border-emerald-600"
                  : "border-slate-400"
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
          <strong>Atenção aos prazos:</strong> Anuidades vencem no último dia do
          mês do depósito. Exame técnico tem prazo fatal de 36 meses. Acompanhe
          a RPI todas as terças-feiras.
        </div>
      </div>

      {checklistError && (
        <p className="mt-3 text-[11px] text-red-600">{checklistError}</p>
      )}
    </div>
  );
}
