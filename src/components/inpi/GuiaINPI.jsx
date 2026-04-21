import React, { useState } from "react";
import { 
  BookOpen, CheckSquare, Clock3, File, FileText, X,
  AlertCircle, Calendar, CheckCircle2, CreditCard, DollarSign,
  ExternalLink, Info, Search, Sparkles, Upload, UserPlus
} from "lucide-react";
import RealModalLogin from "./ModalLogin";
import RealModalMU from "./ModalMU";
import RealModalPI from "./ModalPI";

// --- COMPONENTE GUIA INPI ---
export default function GuiaINPI({ onOpenPesquisa, viewMode = "leitura_rapida" }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalMUOpen, setIsModalMUOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentBeginnerStep, setCurrentBeginnerStep] = useState(0);

  const steps = [
    {
      icon: <Search className="w-8 h-8 text-slate-900 stroke-[2.5]" />,
      iconBg: "bg-indigo-400",
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
      icon: <UserPlus className="w-8 h-8 text-slate-900 stroke-[2.5]" />,
      iconBg: "bg-blue-400",
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
      icon: <CreditCard className="w-8 h-8 text-slate-900 stroke-[2.5]" />,
      iconBg: "bg-emerald-400",
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
      icon: <FileText className="w-8 h-8 text-slate-900 stroke-[2.5]" />,
      iconBg: "bg-purple-400",
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
      icon: <Upload className="w-8 h-8 text-slate-900 stroke-[2.5]" />,
      iconBg: "bg-orange-400",
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
      icon: <AlertCircle className="w-8 h-8 text-slate-900 stroke-[2.5]" />,
      iconBg: "bg-red-400",
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
      <div className="space-y-10 animate-in fade-in duration-500 relative">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] transform hover:rotate-0 transition-transform">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-4 leading-none">
            Leitura Rápida <br/>
            <span className="bg-yellow-300 px-3 py-1 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] inline-block mt-2 transform ">
              do Processo
            </span>
          </h2>
          <p className="text-base md:text-lg font-bold text-slate-800 bg-slate-100 border-2 border-slate-900 p-4 rounded-xl shadow-[4px_4px_0px_0px_#cbd5e1] inline-block mt-4">
            Roteiro para sair da ideia ao protocolo sem se perder.
          </p>
          
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border-4 border-slate-900 bg-pink-400 px-6 py-5 shadow-[4px_4px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2 bg-white px-2 py-1 inline-block border-2 border-slate-900">
                Horizonte
              </p>
              <p className="text-2xl font-black text-slate-900">4 ETAPAS</p>
            </div>
            <div className="rounded-2xl border-4 border-slate-900 bg-blue-400 px-6 py-5 shadow-[4px_4px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2 bg-white px-2 py-1 inline-block border-2 border-slate-900">
                Janela típica
              </p>
              <p className="text-2xl font-black text-slate-900">3h a 8h</p>
            </div>
            <div className="rounded-2xl border-4 border-slate-900 bg-teal-400 px-6 py-5 shadow-[4px_4px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2 bg-white px-2 py-1 inline-block border-2 border-slate-900">
                Resultado final
              </p>
              <p className="text-xl font-black text-slate-900 leading-tight">PEDIDO <br/> PROTOCOLADO</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {quickReadSteps.map((step, index) => {
            const isCurrent = index === currentBeginnerStep;
            const isDone = index < currentBeginnerStep;

            return (
              <div
                key={step.title}
                className={`rounded-[2rem] border-4 border-slate-900 p-8 md:p-10 transition-all duration-300 ${
                  isCurrent
                    ? "bg-teal-300 shadow-[12px_12px_0px_0px_#0f172a] transform -6px"
                    : isDone
                      ? "bg-slate-200 opacity-80"
                      : "bg-white shadow-[6px_6px_0px_0px_#0f172a]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
                  <div className="max-w-2xl">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                      {step.title}
                    </h3>
                    <p className="text-base font-bold text-slate-800 bg-white border-2 border-slate-900 p-4 rounded-xl shadow-[4px_4px_0px_0px_#cbd5e1]">{step.objective}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest rounded-xl bg-yellow-300 border-2 border-slate-900 text-slate-900 px-4 py-2 shadow-[2px_2px_0px_0px_#0f172a] flex items-center gap-2">
                      <Clock3 className="w-4 h-4 stroke-[3]" /> Tempo: {step.eta}
                    </span>
                    {isDone && (
                      <span className="text-[10px] font-black uppercase tracking-widest rounded-xl bg-teal-400 border-2 border-slate-900 text-slate-900 px-4 py-2 shadow-[2px_2px_0px_0px_#0f172a] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 stroke-[3]" /> Concluído
                      </span>
                    )}
                  </div>
                </div>

                {(isCurrent || isDone) && (
                  <div className="mt-8 grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border-4 border-slate-900 bg-blue-300 px-6 py-5 shadow-[4px_4px_0px_0px_#0f172a]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3 bg-white px-3 py-1 inline-block border-2 border-slate-900 transform -">
                        Entregável
                      </p>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed bg-white/60 p-3 rounded-lg border-2 border-slate-900">{step.deliverable}</p>
                    </div>
                    <div className="rounded-2xl border-4 border-slate-900 bg-orange-400 px-6 py-5 shadow-[4px_4px_0px_0px_#0f172a]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3 bg-white px-3 py-1 inline-block border-2 border-slate-900 transform ">
                        Risco comum
                      </p>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed bg-white/60 p-3 rounded-lg border-2 border-slate-900">{step.risk}</p>
                    </div>
                  </div>
                )}

                {isCurrent && step.cta && step.onClick && (
                  <button
                    onClick={step.onClick}
                    className="mt-8 inline-flex items-center justify-center gap-3 w-full sm:w-auto rounded-xl border-4 border-slate-900 bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all"
                  >
                    <ExternalLink className="w-5 h-5 stroke-[3]" />
                    {step.cta}
                  </button>
                )}

                {isCurrent && (
                  <div className="mt-8 pt-6 border-t-4 border-slate-900 border-dashed">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white px-4 py-2 border-2 border-slate-900 rounded-full shadow-[2px_2px_0px_0px_#0f172a]">
                      Etapa {currentBeginnerStep + 1} de {quickReadSteps.length}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-[2rem] border-4 border-slate-900 bg-pink-400 p-8 md:p-10 shadow-[12px_12px_0px_0px_#0f172a] transform 6px">
          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 mb-4">
            Assinatura digital no documento de veracidade
          </h3>
          <p className="text-base md:text-lg font-bold text-slate-900 leading-relaxed bg-white p-6 border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a]">
            No fechamento do protocolo, o e-Patentes pode exigir a revisão do
            documento de veracidade e a assinatura por certificado digital
            ICP-Brasil. Neste contexto, assinatura feita apenas com conta
            gov.br não supre a exigência: organize antes quem vai assinar com
            e-CPF ou e-CNPJ e deixe o certificado já emitido e funcionando.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-6">
          <button
            onClick={() =>
              setCurrentBeginnerStep((prev) => Math.max(prev - 1, 0))
            }
            disabled={currentBeginnerStep === 0}
            className="flex-1 sm:flex-none rounded-xl border-4 border-slate-900 bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_#0f172a]"
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
            className="flex-1 sm:flex-none rounded-xl border-4 border-slate-900 bg-teal-400 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_#0f172a]"
          >
            Próxima etapa
          </button>
        </div>

        <RealModalPI isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        <RealModalMU
          isOpen={isModalMUOpen}
          onClose={() => setIsModalMUOpen(false)}
        />
        <RealModalLogin
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 relative">
      
      {/* Guia Aprofundado Intro */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a]">
          <div className="inline-flex items-center gap-3 bg-yellow-300 px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform mb-6">
            <Sparkles className="w-5 h-5 stroke-[3] text-slate-900" />
            <span className="font-black uppercase tracking-widest text-xs text-slate-900">Modo Completo</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-6">
            Guia aprofundado do processo de patentes no INPI
          </h2>
          <p className="text-lg font-bold text-slate-700 leading-relaxed bg-slate-100 p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#cbd5e1] mb-8">
            Este guia foi estruturado para ir além do depósito inicial. Ele cobre
            o raciocínio de patenteabilidade, a formação do pacote técnico, a
            lógica do peticionamento eletrônico e os marcos processuais que
            mantêm o pedido vivo até a decisão final.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {completeGuideHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border-4 border-slate-900 bg-pink-400 px-5 py-4 shadow-[4px_4px_0px_0px_#0f172a] transform 6px hover:rotate-0 transition-transform"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-slate-900 bg-white px-3 py-2 border-2 border-slate-900 rounded-xl leading-snug">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border-4 border-slate-900 bg-slate-900 p-8 md:p-12 text-slate-50 shadow-[12px_12px_0px_0px_#0f172a] transform 6px flex flex-col justify-center">
          <h3 className="text-3xl font-black uppercase tracking-tighter mb-6 bg-yellow-300 text-slate-900 inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#ffffff] transform -">
            Leitura estratégica
          </h3>
          <p className="text-base md:text-lg font-bold text-slate-200 leading-relaxed mb-6 border-l-4 border-teal-400 pl-4">
            O pedido de patente no INPI protege inicialmente apenas o território
            brasileiro, entra em sigilo por até 18 meses, exige pedido de exame
            em até 36 meses e passa a gerar anuidades a partir do 24º mês.
          </p>
          <ul className="space-y-4 text-sm font-bold text-slate-200">
            {strategicWarnings.map((warning) => (
              <li key={warning} className="flex items-start gap-3">
                 <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                 {warning}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Enquadramento */}
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[12px_12px_0px_0px_#0f172a] border-4 border-slate-900">
        <div className="max-w-4xl mb-10 border-l-8 border-teal-400 pl-6">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-none">
            Enquadramento do pedido e critérios
          </h2>
          <p className="text-lg font-bold text-slate-700 leading-relaxed">
            Patente não é selo genérico de inovação. O pedido precisa se
            encaixar juridicamente no sistema de patentes e sobreviver ao exame
            técnico. A primeira decisão crítica é definir se o caso é Patente
            de Invenção, Modelo de Utilidade ou se outro instrumento de
            propriedade intelectual faz mais sentido.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-400 p-8 rounded-[2rem] border-4 border-slate-900 cursor-pointer shadow-[8px_8px_0px_0px_#0f172a] hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[16px_16px_0px_0px_#0f172a] transition-all group flex flex-col justify-between"
          >
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-4 flex items-center justify-between bg-white px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform group-hover:rotate-0 transition-transform">
              Patente de Invenção (PI)
              <Info className="w-6 h-6 stroke-[3]" />
            </h3>
            <p className="text-slate-900 font-bold text-base leading-relaxed bg-white/60 p-4 border-2 border-slate-900 rounded-xl mt-4">
              Indicada para produto ou processo novo com atividade inventiva e
              aplicação industrial. A proteção dura 20 anos contados do depósito,
              se o pedido for concedido e mantido regularmente.
            </p>
          </div>

          <div
            onClick={() => setIsModalMUOpen(true)}
            className="bg-emerald-400 p-8 rounded-[2rem] border-4 border-slate-900 cursor-pointer shadow-[8px_8px_0px_0px_#0f172a] hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[16px_16px_0px_0px_#0f172a] transition-all group flex flex-col justify-between"
          >
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-4 flex items-center justify-between bg-white px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform 6px group-hover:rotate-0 transition-transform">
              Modelo de Utilidade (MU)
              <Info className="w-6 h-6 stroke-[3]" />
            </h3>
            <p className="text-slate-900 font-bold text-base leading-relaxed bg-white/60 p-4 border-2 border-slate-900 rounded-xl mt-4">
              Voltado a objeto de uso prático com nova forma ou disposição que
              produza melhoria funcional. A proteção dura 15 anos contados do
              depósito, desde que o pedido seja concedido e mantido ativo.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-4 md:grid-cols-2 mt-12">
          {patentabilityCriteria.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_#0f172a]"
            >
              <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-3 bg-yellow-300 px-3 py-1 border-2 border-slate-900 inline-block transform -">{item.title}</h3>
              <p className="text-sm font-bold text-slate-700 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border-4 border-slate-900 bg-orange-400 p-6 shadow-[8px_8px_0px_0px_#0f172a]">
          <p className="text-base font-bold text-slate-900 leading-relaxed bg-white p-4 border-2 border-slate-900 rounded-xl">
            Nem toda inovação deve virar patente. Dependendo da natureza da
            solução, pode ser mais adequado avaliar sigilo, desenho industrial,
            marca, programa de computador ou estratégia contratual. <span className="bg-yellow-300 px-1 font-black">O erro mais caro é insistir em patente para matéria mal enquadrada.</span>
          </p>
        </div>
      </div>

      <div className="bg-teal-400 p-8 md:p-12 rounded-[2rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] transform -6px">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="w-20 h-20 bg-white rounded-2xl border-4 border-slate-900 flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_#0f172a] transform rotate-3">
             <Info className="w-10 h-10 stroke-[3] text-slate-900" />
          </div>
          <div className="flex-1">
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] mb-6 transform -6px">
              Novidade: e-Patentes 4.0
            </h3>
            <p className="text-slate-900 font-bold text-lg leading-relaxed bg-white/60 p-6 border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a]">
              O novo sistema permite o depósito dos documentos técnicos em
              formato DOCX (além do PDF). Na segunda fase, haverá verificação
              automática de erros formais, agilizando o processo.{" "}
              <strong className="bg-yellow-300 px-1 border-2 border-slate-900">Recomenda-se usar DOCX</strong> para se beneficiar da
              validação futura.
            </p>
            <a
              href="https://www.gov.br/inpi/pt-br/servicos/patentes/e-patentes"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 bg-slate-900 text-white font-black uppercase tracking-widest text-xs px-6 py-4 mt-6 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#cbd5e1] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#cbd5e1] transition-all"
            >
              Saiba mais no site do INPI <ExternalLink className="w-5 h-5 stroke-[3]" />
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border-4 border-slate-900 bg-pink-400 p-8 md:p-12 shadow-[12px_12px_0px_0px_#0f172a] transform 6px">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="w-20 h-20 bg-white rounded-2xl border-4 border-slate-900 flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-3">
            <CheckCircle2 className="w-10 h-10 stroke-[3] text-slate-900" />
          </div>
          <div className="flex-1">
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] mb-6 transform 6px">
              Documento de veracidade e assinatura digital
            </h3>
            <p className="text-slate-900 font-bold text-lg leading-relaxed bg-white/60 p-6 border-4 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] mb-8">
              Além dos anexos técnicos, o fechamento do peticionamento exige
              atenção ao documento de veracidade apresentado pelo sistema. Ele
              funciona como a confirmação formal de que os dados, a titularidade
              e os arquivos anexados correspondem ao que está sendo protocolado.
            </p>
            
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <div className="rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_#0f172a]">
                <p className="text-sm font-black uppercase tracking-widest text-slate-900 bg-red-400 inline-block px-3 py-1 border-2 border-slate-900 transform - mb-4">
                  O que não serve
                </p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  A assinatura eletrônica comum da conta gov.br, embora válida
                  para vários serviços públicos, não substitui a exigência de
                  certificado digital ICP-Brasil quando o fluxo pede assinatura
                  com e-CPF ou e-CNPJ.
                </p>
              </div>

              <div className="rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_#0f172a]">
                <p className="text-sm font-black uppercase tracking-widest text-slate-900 bg-teal-400 inline-block px-3 py-1 border-2 border-slate-900 transform  mb-4">
                  O que normalmente é aceito
                </p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  Certificado ICP-Brasil do tipo e-CPF para pessoa física,
                  inventor ou procurador signatário, e e-CNPJ quando a assinatura
                  for feita pela pessoa jurídica competente no fluxo adotado.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border-4 border-slate-900 bg-yellow-300 p-6 shadow-[4px_4px_0px_0px_#0f172a]">
              <p className="text-base font-black uppercase tracking-widest text-slate-900 bg-white inline-block px-3 py-1 border-2 border-slate-900 mb-6">
                Como conseguir pelo Serpro
              </p>
              <ol className="space-y-3 text-sm font-bold text-slate-900 list-decimal list-outside ml-6 marker:font-black">
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

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://store.serpro.gov.br/certificado-digital/product/Certificado"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all"
                >
                  Certificação Digital Serpro <ExternalLink className="w-4 h-4 stroke-[3]" />
                </a>
                <a
                  href="https://store.serpro.gov.br/serproid/product/serproid"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all"
                >
                  SerproID em nuvem <ExternalLink className="w-4 h-4 stroke-[3]" />
                </a>
                <a
                  href="https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all"
                >
                  Entender a assinatura gov.br <ExternalLink className="w-4 h-4 stroke-[3]" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fluxo Completo do Pedido */}
      <div className="pt-10">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-10 bg-white inline-block px-6 py-4 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] transform -6px">
          Fluxo Completo do Pedido de Patente
        </h2>
        <div className="space-y-10">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-white p-8 md:p-12 rounded-[2rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] relative overflow-hidden"
            >
              {/* Número de fundo gigante */}
              <div className="absolute -top-10 -right-10 text-[15rem] font-black text-slate-100 pointer-events-none select-none z-0">
                {idx + 1}
              </div>

              <div className="relative flex flex-col lg:flex-row gap-10">
                <div className="flex-shrink-0">
                  <div className={`w-20 h-20 border-4 border-slate-900 rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-3 ${step.iconBg}`}>
                    {step.icon}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b-4 border-slate-900 pb-6">
                    <div className="max-w-3xl">
                      <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-none">
                        {step.title.substring(3)} {/* Remove o número do título */}
                      </h3>
                      <p className="text-lg font-bold text-slate-700 leading-relaxed bg-slate-100 p-5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#cbd5e1]">{step.desc}</p>
                    </div>
                    <span className="inline-flex items-center justify-center rounded-xl border-4 border-slate-900 bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] shrink-0 transform ">
                      {step.deadline}
                    </span>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-3">
                    <div className="rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_#0f172a]">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 bg-slate-200 inline-block px-3 py-1 border-2 border-slate-900">
                        O que fazer
                      </p>
                      <ul className="space-y-3 text-sm font-bold text-slate-800 list-none">
                        {step.checklist.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="font-black text-slate-900">-</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border-4 border-slate-900 bg-blue-300 p-6 shadow-[4px_4px_0px_0px_#0f172a]">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 bg-white inline-block px-3 py-1 border-2 border-slate-900 transform -6px">
                        Saída esperada
                      </p>
                      <ul className="space-y-3 text-sm font-bold text-slate-900 list-none">
                        {step.outputs.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="font-black bg-white px-1 border border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] leading-none h-fit mt-0.5">&gt;</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border-4 border-slate-900 bg-orange-400 p-6 shadow-[4px_4px_0px_0px_#0f172a]">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 bg-white inline-block px-3 py-1 border-2 border-slate-900 transform 6px">
                        Pontos de atenção
                      </p>
                      <ul className="space-y-3 text-sm font-bold text-slate-900 list-none">
                        {step.alerts.map((item) => (
                          <li key={item} className="flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[3]" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {step.ctaLabel && step.onClick && (
                    <button
                      onClick={step.onClick}
                      className="mt-8 inline-flex items-center justify-center gap-3 rounded-xl border-4 border-slate-900 bg-teal-400 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-[2px_2px_0px_0px_#0f172a] transition-all w-full sm:w-auto"
                    >
                      <ExternalLink className="w-5 h-5 stroke-[3]" />
                      {step.ctaLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-400 p-8 md:p-12 rounded-[2rem] shadow-[12px_12px_0px_0px_#0f172a] border-4 border-slate-900 mt-16 transform 6px hover:rotate-0 transition-transform">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -6px">
          O que acontece depois do protocolo
        </h2>
        <p className="text-lg font-bold text-slate-900 mb-8 leading-relaxed max-w-4xl bg-white/60 p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
          O Guia Básico do INPI resume o andamento em cinco grandes marcos:
          depósito, exame formal, publicação, exame técnico e decisão. Em cada
          um deles podem surgir exigências específicas, e a omissão do
          depositante pode comprometer o pedido.
        </p>

        <div className="grid gap-6 xl:grid-cols-5 md:grid-cols-2">
          {postFilingPhases.map((phase) => (
            <div
              key={phase.title}
              className="rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[6px_6px_0px_0px_#0f172a] flex flex-col"
            >
              <h3 className="font-black text-xl uppercase tracking-tighter text-slate-900 bg-yellow-300 px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] self-start mb-4">{phase.title}</h3>
              <p className="text-sm font-bold text-slate-700 leading-relaxed mb-6 flex-1">
                {phase.desc}
              </p>
              <div className="rounded-xl border-4 border-slate-900 bg-slate-100 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">
                  Vigiar
                </p>
                <p className="text-xs font-bold text-slate-900 leading-relaxed">
                  {phase.watch}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-4 md:grid-cols-2 gap-8 mt-16">
        <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] flex flex-col">
          <h3 className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-slate-900 mb-6 bg-pink-400 px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] self-start transform -">
            <DollarSign className="w-6 h-6 stroke-[3]" /> Descontos (até 60%)
          </h3>
          <ul className="list-none text-slate-800 font-bold space-y-3 text-sm leading-relaxed mb-6 flex-1">
            <li className="flex gap-2"><span className="font-black">-</span> Pessoas físicas (sem participação societária em empresa do ramo)</li>
            <li className="flex gap-2"><span className="font-black">-</span> Microempresas, MEI e empresas de pequeno porte</li>
            <li className="flex gap-2"><span className="font-black">-</span> Instituições de ensino e pesquisa</li>
            <li className="flex gap-2"><span className="font-black">-</span> Cooperativas e entidades sem fins lucrativos</li>
            <li className="flex gap-2"><span className="font-black">-</span> Órgãos públicos (para atos próprios)</li>
          </ul>
          <p className="text-xs font-bold text-slate-600 leading-relaxed p-4 bg-slate-100 border-2 border-slate-900 rounded-xl mb-6">
            O enquadramento precisa refletir a realidade do depositante. Custos
            e pagamentos oficiais devem ser sempre conferidos no portal do INPI.
          </p>
          <a
            href="https://www.gov.br/inpi/pt-br/servicos/patentes/custos"
            target="_blank"
            rel="noreferrer"
            className="mt-auto inline-flex items-center justify-center gap-2 text-slate-900 bg-teal-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest"
          >
            Ver custos e pagamentos <ExternalLink className="w-4 h-4 stroke-[3]" />
          </a>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] flex flex-col">
          <h3 className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-slate-900 mb-6 bg-yellow-300 px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] self-start transform 6px">
            <Calendar className="w-6 h-6 stroke-[3]" /> Principais Prazos
          </h3>
          <ul className="list-none text-slate-800 font-bold space-y-4 text-sm leading-relaxed">
            <li className="flex gap-2"><span className="bg-slate-900 text-white px-1 border border-slate-900 font-black shrink-0 h-fit mt-0.5">18m</span> <strong>Sigilo:</strong> 18 meses a partir do depósito</li>
            <li className="flex gap-2"><span className="bg-slate-900 text-white px-1 border border-slate-900 font-black shrink-0 h-fit mt-0.5">36m</span> <strong>Exame técnico:</strong> até 36 meses do depósito</li>
            <li className="flex gap-2"><span className="bg-slate-900 text-white px-1 border border-slate-900 font-black shrink-0 h-fit mt-0.5">24m</span> <strong>Anuidades:</strong> primeiro pagamento a partir do 24º mês</li>
            <li className="flex gap-2"><span className="bg-slate-900 text-white px-1 border border-slate-900 font-black shrink-0 h-fit mt-0.5">60d</span> <strong>Recurso de indeferimento:</strong> 60 dias após a decisão</li>
            <li className="flex gap-2"><span className="bg-slate-900 text-white px-1 border border-slate-900 font-black shrink-0 h-fit mt-0.5">12m</span> <strong>Exterior:</strong> em regra, até 12 meses para prioridade</li>
          </ul>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] flex flex-col">
          <h3 className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-slate-900 mb-6 bg-teal-400 px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] self-start transform -6px">
            <CheckCircle2 className="w-6 h-6 stroke-[3]" /> Monitoramento
          </h3>
          <ul className="list-none text-slate-800 font-bold space-y-4 text-sm leading-relaxed">
            <li className="flex gap-2"><CheckSquare className="w-5 h-5 shrink-0 stroke-[3] text-teal-500 mt-0.5" /> Consultar a RPI toda terça-feira.</li>
            <li className="flex gap-2"><CheckSquare className="w-5 h-5 shrink-0 stroke-[3] text-teal-500 mt-0.5" /> Cadastrar o pedido em Meus Pedidos como apoio.</li>
            <li className="flex gap-2"><CheckSquare className="w-5 h-5 shrink-0 stroke-[3] text-teal-500 mt-0.5" /> Tratar alertas por e-mail como apoio, nunca como substituto da RPI.</li>
            <li className="flex gap-2"><CheckSquare className="w-5 h-5 shrink-0 stroke-[3] text-teal-500 mt-0.5" /> Guardar protocolo, respostas, pareceres e comprovantes organizados.</li>
          </ul>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] flex flex-col">
          <h3 className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-slate-900 mb-6 bg-blue-400 px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] self-start transform ">
            <ExternalLink className="w-6 h-6 stroke-[3]" /> Estratégia intl.
          </h3>
          <p className="text-slate-800 font-bold text-sm leading-relaxed flex-1">
            O depósito no INPI não gera proteção automática em outros países.
            Se houver plano de exploração fora do Brasil, a regra prática é
            estruturar o uso da prioridade da CUP ou do PCT em até 12 meses do
            primeiro depósito.
          </p>
          <a
            href="https://www.gov.br/inpi/pt-br/uso-estrategico-da-pi/deposito-internacional-de-patentes-pct-cup"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 text-slate-900 bg-yellow-300 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-center"
          >
            Ver orientação sobre CUP e PCT <ExternalLink className="w-4 h-4 stroke-[3]" />
          </a>
        </div>
      </div>

      <div className="bg-red-400 p-8 md:p-12 rounded-[2rem] shadow-[12px_12px_0px_0px_#0f172a] border-4 border-slate-900 mt-16 mb-20 transform hover:rotate-0 transition-transform">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform 6px">
          Erros que mais enfraquecem um pedido
        </h2>
        <p className="text-lg font-bold text-slate-900 mb-8 leading-relaxed max-w-4xl bg-white/60 p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
          Em patentes, os maiores prejuízos normalmente não vêm de um único erro
          técnico, mas da soma entre estratégia ruim, redação fraca e gestão de
          prazo desorganizada.
        </p>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {commonMistakes.map((mistake) => (
            <div
              key={mistake}
              className="rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_#0f172a] text-sm text-slate-900 font-bold leading-relaxed flex items-start gap-3"
            >
              <X className="w-6 h-6 shrink-0 text-red-500 stroke-[4]" />
              {mistake}
            </div>
          ))}
        </div>
      </div>

      <RealModalPI isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <RealModalMU isOpen={isModalMUOpen} onClose={() => setIsModalMUOpen(false)} />
      <RealModalLogin
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
