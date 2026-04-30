import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const TUTORIAL_VERSION = "2026-04-system-tour-v1";
const STORAGE_PREFIX = "secti:tutorial:state:";
const DISMISS_COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;

const SYSTEM_TUTORIAL_STEPS = [
  {
    id: "intro-cockpit",
    badge: "Modo guiado",
    title: "Seu cockpit de inovação",
    description:
      "Este guia percorre os principais módulos do sistema para mostrar, com contexto real, onde cada ação deve ser executada.",
    details:
      "Você vai entender a lógica da navegação, quando usar cada área e como evitar retrabalho no dia a dia de acompanhamento de projetos, clube e eventos.",
    tip: "Avance no seu ritmo: você pode pausar, fechar e retomar exatamente de onde parou.",
    actions: [
      "Use este tour completo na primeira semana de uso da plataforma.",
      "Depois, rode o modo rápido quando entrar em um módulo que usa pouco.",
      "Se surgir dúvida, volte uma etapa para revisar o contexto anterior.",
    ],
    anchorId: "topbar-brand",
  },
  {
    id: "menu-projetos",
    badge: "Navegação",
    title: "Radar de projetos",
    description:
      "Este item leva ao feed geral, onde você enxerga o panorama da rede e identifica iniciativas alinhadas ao seu foco.",
    details:
      "Pense nele como a porta de entrada estratégica: é aqui que você observa tendências, projetos ativos e potenciais conexões com outras equipes.",
    tip: "Quando estiver perdido no fluxo, volte ao feed para recuperar visão global.",
    actions: [
      "Abra o feed no início da rotina para mapear novidades do dia.",
      "Observe projetos com temas parecidos para buscar referências.",
      "Use o feed para identificar clubes com potencial de colaboração.",
    ],
    anchorId: "nav-Projetos",
    viewId: "Projetos",
  },
  {
    id: "painel-projetos",
    badge: "Projetos",
    title: "Feed com visão geral",
    description:
      "Neste painel você acompanha cards de projeto, dados de contexto e atalhos para abrir clube, diário e informações complementares.",
    details:
      "A leitura correta do feed evita dispersão: primeiro filtre por relevância, depois aprofunde apenas nos projetos que impactam sua meta atual.",
    tip: "Priorize qualidade de leitura: menos cards com atenção total geram melhores decisões.",
    actions: [
      "Faça uma varredura rápida dos títulos e selecione os projetos-chave.",
      "Abra detalhes somente quando houver conexão clara com sua pauta.",
      "Registre mentalmente parceiros e temas que valem contato futuro.",
    ],
    anchorId: "content-projetos",
    viewId: "Projetos",
  },
  {
    id: "busca-inteligente",
    badge: "Produtividade",
    title: "Busca instantânea",
    description:
      "A busca reduz ruído e acelera decisões, permitindo localizar rapidamente projetos por tema, tecnologia, clube ou palavra-chave.",
    details:
      "Ela é mais eficiente quando você combina termos específicos. Em vez de procurar por algo genérico, use pares de contexto para ganhar precisão.",
    tip: "Combine dois ou três termos objetivos para resultados mais úteis e menos dispersos.",
    actions: [
      "Teste combinações como tema + tecnologia (ex.: energia + sensores).",
      "Use nomes de clubes quando quiser localizar iniciativas de um grupo específico.",
      "Ajuste a busca após a primeira leitura para refinar o resultado.",
    ],
    anchorId: "topbar-search",
    viewId: "Projetos",
  },
  {
    id: "menu-meus-projetos",
    badge: "Navegação",
    title: "Atalho para sua carteira",
    description:
      "Este item abre sua carteira pessoal de atuação. Aqui entram apenas os projetos nos quais você já tem vínculo direto.",
    details:
      "É o melhor caminho para rotina operacional: revisão de pendências, acompanhamento de entregas e preparação de reuniões de mentoria.",
    tip: "Use esta área como checklist principal da semana.",
    actions: [
      "Abra Meus Projetos antes de reuniões para revisar status rapidamente.",
      "Identifique projetos sem atualização recente e priorize follow-up.",
      "Use os atalhos para entrar no diário e registrar evolução.",
    ],
    anchorId: "nav-meusProjetos",
    viewId: "meusProjetos",
  },
  {
    id: "painel-meus-projetos",
    badge: "Foco",
    title: "Sua área de execução",
    description:
      "Aqui você concentra execução real: projetos ativos, acessos para diário de bordo e navegação para o clube responsável.",
    details:
      "Ao tratar este painel como centro de comando, você diminui alternância de tela e melhora consistência no acompanhamento das tarefas.",
    tip: "Finalize cada sessão com uma atualização de progresso no projeto mais crítico.",
    actions: [
      "Priorize primeiro projetos com prazo mais próximo.",
      "Abra o diário sempre que houver avanço, bloqueio ou decisão importante.",
      "Mantenha o clube sincronizado com mudanças relevantes do projeto.",
    ],
    anchorId: "content-meusProjetos",
    viewId: "meusProjetos",
  },
  {
    id: "menu-trilha",
    badge: "Planejamento",
    title: "Trilha pedagógica",
    description:
      "Este módulo organiza o percurso formativo e a estratégia pedagógica de CT&I, conectando objetivos com etapas de aprendizado.",
    details:
      "Ele é essencial para transformar intenção em roteiro: do objetivo geral até marcos concretos, com clareza para equipe e mentoria.",
    tip: "Não planeje tudo de uma vez: evolua a trilha por ciclos curtos.",
    actions: [
      "Defina um objetivo macro claro para o período atual.",
      "Quebre esse objetivo em etapas curtas e verificáveis.",
      "Revise a trilha após cada entrega relevante do projeto.",
    ],
    anchorId: "nav-trilha",
    viewId: "trilha",
  },
  {
    id: "painel-trilha",
    badge: "Planejamento",
    title: "Construa jornadas",
    description:
      "No conteúdo da trilha você conecta competências, metas, evidências e entregas em uma sequência didática coerente.",
    details:
      "Uma trilha bem estruturada facilita acompanhamento, reduz ambiguidades e melhora a comunicação entre orientadores e estudantes.",
    tip: "Use marcos mensais para manter ritmo sem perder qualidade.",
    actions: [
      "Associe cada etapa a uma evidência observável de aprendizagem.",
      "Identifique riscos antecipadamente e ajuste prazos com antecedência.",
      "Compartilhe o plano com a equipe para alinhar expectativa comum.",
    ],
    anchorId: "content-trilha",
    viewId: "trilha",
  },
  {
    id: "menu-pop-eventos",
    badge: "Radar 2026",
    title: "POP Eventos",
    description:
      "Aqui você acessa um radar de oportunidades com editais, olimpíadas, chamadas e eventos relevantes para o ciclo atual.",
    details:
      "Use este módulo para ampliar repertório e captar chances estratégicas de participação, visibilidade e desenvolvimento da equipe.",
    tip: "A revisão semanal evita perder janelas importantes de inscrição.",
    actions: [
      "Faça triagem por tema, público e prazo de inscrição.",
      "Marque oportunidades aderentes ao perfil do clube.",
      "Converta oportunidades selecionadas em plano de ação interno.",
    ],
    anchorId: "nav-popEventos",
    viewId: "popEventos",
  },
  {
    id: "painel-pop-eventos",
    badge: "Oportunidades",
    title: "Calendário estratégico",
    description:
      "Este painel permite filtrar oportunidades e acompanhar dados-chave para tomada de decisão rápida: prazo, fonte e aderência ao objetivo.",
    details:
      "Quando a equipe usa o calendário de forma ativa, melhora previsibilidade e distribui melhor as tarefas de submissão e preparação.",
    tip: "Transforme oportunidade em tarefa concreta com responsável e data.",
    actions: [
      "Selecione eventos por prioridade e urgência, não por volume.",
      "Defina responsável por inscrição, documentação e acompanhamento.",
      "Revise semanalmente o que foi inscrito, perdido e reagendado.",
    ],
    anchorId: "content-popEventos",
    viewId: "popEventos",
  },
  {
    id: "menu-forum",
    badge: "Comunicação",
    title: "POP Café",
    description:
      "O POP Café é o espaço de troca da comunidade: dúvidas, boas práticas, avisos e articulação entre clubes.",
    details:
      "Use esta área para construir inteligência coletiva. Perguntas bem formuladas e relatos objetivos aceleram a resposta da rede.",
    tip: "Contribuição breve e frequente vale mais que publicação longa e rara.",
    actions: [
      "Publique dúvidas com contexto, objetivo e estágio atual.",
      "Compartilhe aprendizados que possam ser reaplicados por outros clubes.",
      "Use linguagem direta para facilitar leitura e busca futura.",
    ],
    anchorId: "nav-forum",
    viewId: "forum",
  },
  {
    id: "painel-forum",
    badge: "Comunidade",
    title: "Conversa com contexto",
    description:
      "Neste painel ficam os tópicos e respostas da comunidade, permitindo localizar rapidamente soluções já discutidas.",
    details:
      "Uma boa estrutura de postagem reduz retrabalho: título claro, problema específico e resultado esperado tornam a colaboração mais eficiente.",
    tip: "Nomeie o tópico como se ele fosse ser encontrado por outra pessoa daqui a seis meses.",
    actions: [
      "Antes de abrir novo tópico, faça uma busca rápida no histórico.",
      "Ao responder, inclua passo a passo para facilitar replicação.",
      "Feche discussões com síntese do que funcionou.",
    ],
    anchorId: "content-forum",
    viewId: "forum",
  },
  {
    id: "menu-clube",
    badge: "Gestão",
    title: "Meu Clube",
    description:
      "Este atalho abre a área de governança do clube, com visão de equipe, projetos vinculados e decisões de gestão.",
    details:
      "É o ponto de controle para manter papéis organizados, acompanhar adesões e garantir que o planejamento esteja alinhado com execução.",
    tip: "Use o Clube como referência oficial do estado atual da equipe.",
    actions: [
      "Valide periodicamente composição da equipe e responsabilidades.",
      "Acompanhe solicitações e entradas com critério de prioridade.",
      "Mantenha projetos vinculados coerentes com os objetivos do clube.",
    ],
    anchorId: "nav-clube",
    viewId: "clube",
  },
  {
    id: "painel-clube",
    badge: "Gestão",
    title: "Central do clube",
    description:
      "No conteúdo do clube você acompanha membros, papéis, solicitações, projetos e indicadores operacionais do grupo.",
    details:
      "Quando esta área é atualizada com frequência, fica mais fácil tomar decisões, justificar prioridades e distribuir cargas de trabalho.",
    tip: "Rotina curta de revisão semanal já melhora muito a governança.",
    actions: [
      "Confira solicitações pendentes e responda com agilidade.",
      "Revise papéis para evitar sobreposição de responsabilidade.",
      "Registre mudanças importantes para manter histórico confiável.",
    ],
    anchorId: "content-clube",
    viewId: "clube",
  },
  {
    id: "sidebar-organizacao",
    badge: "Personalização",
    title: "Organize seu menu",
    description:
      "Use este botão para rearranjar os módulos da barra lateral de acordo com sua rotina de trabalho.",
    details:
      "A personalização da ordem reduz cliques desnecessários e torna seu fluxo mais previsível durante tarefas repetitivas.",
    tip: "Coloque no topo os módulos que você abre diariamente.",
    actions: [
      "Arraste para cima os três módulos mais usados da semana.",
      "Deixe módulos sazonais mais abaixo para reduzir distração.",
      "Reavalie a ordem sempre que seu foco mudar de fase.",
    ],
    anchorId: "sidebar-organize",
  },
  {
    id: "perfil-acoes",
    badge: "Conta",
    title: "Menu de perfil",
    description:
      "Neste menu você acessa seu perfil, dados de contexto e ações pessoais de sessão e navegação.",
    details:
      "Manter seu perfil atualizado melhora identificação dentro da rede e facilita colaboração entre clubes e orientadores.",
    tip: "Perfil claro acelera conexões e reduz ruído de comunicação.",
    actions: [
      "Revise nome, contato e informações relevantes de atuação.",
      "Use o menu para alternar rapidamente para áreas pessoais.",
      "Mantenha consistência entre perfil e papel exercido no clube.",
    ],
    anchorId: "topbar-profile",
  },
  {
    id: "finale",
    badge: "Missão concluída",
    title: "Pronto para navegar",
    description:
      "Você concluiu o percurso principal e já tem base para navegar com autonomia pelos fluxos de projetos, clube, fórum, trilha e oportunidades.",
    details:
      "A partir daqui, o ganho vem da constância: pequenos rituais de uso e revisão tornam a operação mais leve, previsível e eficiente.",
    tip: "Volte ao guia sempre que um módulo ficar sem uso por muito tempo.",
    actions: [
      "Defina um mini-ritual semanal para revisar módulos críticos.",
      "Reabra o tutorial por contexto quando mudar de etapa de trabalho.",
      "Compartilhe o guia com novos membros para acelerar onboarding.",
    ],
    anchorId: "main-content",
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const readTutorialState = (storageKey) => {
  if (typeof window === "undefined" || !storageKey) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("Falha ao ler estado do tutorial:", error);
    return {};
  }
};

const writeTutorialState = (storageKey, payload) => {
  if (typeof window === "undefined" || !storageKey) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (error) {
    console.warn("Falha ao salvar estado do tutorial:", error);
  }
};

const resolveViewerId = (loggedUser = {}) => {
  const directId = String(
    loggedUser?.uid || loggedUser?.id || loggedUser?.user_id || loggedUser?.email || "",
  )
    .trim()
    .toLowerCase();

  return directId || "anon";
};

const TutorialContext = createContext(null);

export function TutorialProvider({
  children,
  currentView,
  setCurrentView,
  loggedUser,
}) {
  const normalizedCurrentView = String(currentView || "").trim();
  const viewerId = useMemo(() => resolveViewerId(loggedUser), [loggedUser]);
  const storageKey = useMemo(() => `${STORAGE_PREFIX}${viewerId}`, [viewerId]);
  const autoStartRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tutorialState, setTutorialState] = useState(() =>
    readTutorialState(storageKey),
  );

  const steps = useMemo(() => SYSTEM_TUTORIAL_STEPS, []);
  const safeMaxStepIndex = Math.max(steps.length - 1, 0);

  useEffect(() => {
    setTutorialState(readTutorialState(storageKey));
    setIsOpen(false);
    setStepIndex(0);
    autoStartRef.current = false;
  }, [storageKey]);

  useEffect(() => {
    if (stepIndex <= safeMaxStepIndex) return;
    setStepIndex(safeMaxStepIndex);
  }, [stepIndex, safeMaxStepIndex]);

  const activeStep = steps[stepIndex] || null;
  const isFirstStep = stepIndex <= 0;
  const isLastStep = stepIndex >= safeMaxStepIndex;
  const progressPercent =
    steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;

  const persistState = useCallback(
    (patch = {}) => {
      setTutorialState((current) => {
        const nextState = {
          ...(current || {}),
          ...patch,
          version: TUTORIAL_VERSION,
        };
        writeTutorialState(storageKey, nextState);
        return nextState;
      });
    },
    [storageKey],
  );

  const startTutorial = useCallback(
    (mode = "full") => {
      const normalizedMode = String(mode || "full").trim().toLowerCase();
      let nextIndex = 0;

      if (normalizedMode === "current-view") {
        const matchingIndex = steps.findIndex(
          (step) => step.viewId === normalizedCurrentView,
        );
        if (matchingIndex >= 0) {
          nextIndex = matchingIndex;
        }
      }

      setStepIndex(clamp(nextIndex, 0, safeMaxStepIndex));
      setIsOpen(true);
    },
    [steps, normalizedCurrentView, safeMaxStepIndex],
  );

  const startTutorialFromBeginning = useCallback(() => {
    startTutorial("full");
  }, [startTutorial]);

  const startTutorialFromCurrentView = useCallback(() => {
    startTutorial("current-view");
  }, [startTutorial]);

  const dismissTutorial = useCallback(() => {
    setIsOpen(false);
    persistState({ dismissedAt: Date.now() });
  }, [persistState]);

  const completeTutorial = useCallback(() => {
    setIsOpen(false);
    persistState({
      completed: true,
      completedAt: Date.now(),
      dismissedAt: Date.now(),
    });
  }, [persistState]);

  const nextStep = useCallback(() => {
    if (isLastStep) {
      completeTutorial();
      return;
    }

    setStepIndex((current) => clamp(current + 1, 0, safeMaxStepIndex));
  }, [isLastStep, completeTutorial, safeMaxStepIndex]);

  const previousStep = useCallback(() => {
    setStepIndex((current) => clamp(current - 1, 0, safeMaxStepIndex));
  }, [safeMaxStepIndex]);

  const restartTutorial = useCallback(() => {
    persistState({
      completed: false,
      completedAt: 0,
      dismissedAt: 0,
    });
    startTutorialFromBeginning();
  }, [persistState, startTutorialFromBeginning]);

  const hasCompletedTutorial =
    tutorialState?.version === TUTORIAL_VERSION &&
    Boolean(tutorialState?.completed);

  const dismissedRecently =
    Number(tutorialState?.dismissedAt || 0) > 0 &&
    Date.now() - Number(tutorialState?.dismissedAt || 0) <
    DISMISS_COOLDOWN_MS;

  useEffect(() => {
    if (!isOpen || !activeStep?.viewId || typeof setCurrentView !== "function") {
      return;
    }

    if (activeStep.viewId !== normalizedCurrentView) {
      setCurrentView(activeStep.viewId);
    }
  }, [
    isOpen,
    activeStep?.viewId,
    setCurrentView,
    normalizedCurrentView,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !loggedUser) {
      return undefined;
    }

    if (autoStartRef.current) {
      return undefined;
    }

    autoStartRef.current = true;

    if (isOpen || hasCompletedTutorial || dismissedRecently) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      startTutorialFromCurrentView();
    }, 1200);

    return () => window.clearTimeout(timerId);
  }, [
    isOpen,
    loggedUser,
    hasCompletedTutorial,
    dismissedRecently,
    startTutorialFromCurrentView,
  ]);

  const contextValue = useMemo(
    () => ({
      isOpen,
      steps,
      stepIndex,
      activeStep,
      progressPercent,
      isFirstStep,
      isLastStep,
      hasCompletedTutorial,
      startTutorial,
      startTutorialFromBeginning,
      startTutorialFromCurrentView,
      dismissTutorial,
      completeTutorial,
      restartTutorial,
      nextStep,
      previousStep,
    }),
    [
      isOpen,
      steps,
      stepIndex,
      activeStep,
      progressPercent,
      isFirstStep,
      isLastStep,
      hasCompletedTutorial,
      startTutorial,
      startTutorialFromBeginning,
      startTutorialFromCurrentView,
      dismissTutorial,
      completeTutorial,
      restartTutorial,
      nextStep,
      previousStep,
    ],
  );

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial precisa ser usado dentro de TutorialProvider");
  }
  return context;
}