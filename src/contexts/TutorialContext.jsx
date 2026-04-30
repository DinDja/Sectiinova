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
      "Este guia acompanha você pela plataforma inteira com foco nas ações mais importantes.",
    tip: "A qualquer momento você pode pausar e retomar no ponto em que parou.",
    anchorId: "topbar-brand",
  },
  {
    id: "menu-projetos",
    badge: "Navegação",
    title: "Radar de projetos",
    description:
      "Aqui você volta para o feed principal e enxerga o que está acontecendo na rede.",
    tip: "Use este atalho quando quiser descobrir novas iniciativas e parceiros.",
    anchorId: "nav-Projetos",
    viewId: "Projetos",
  },
  {
    id: "painel-projetos",
    badge: "Projetos",
    title: "Feed com visão geral",
    description:
      "Este painel concentra atualizações, cards e atalhos para mergulhar nos detalhes.",
    tip: "Comece pelo topo da lista para acompanhar as novidades mais recentes.",
    anchorId: "content-projetos",
    viewId: "Projetos",
  },
  {
    id: "busca-inteligente",
    badge: "Produtividade",
    title: "Busca instantânea",
    description:
      "Filtre projetos por palavras-chave para chegar rápido ao tema que você precisa.",
    tip: "Combine termos de área, nome do clube e tecnologia para resultados mais precisos.",
    anchorId: "topbar-search",
    viewId: "Projetos",
  },
  {
    id: "menu-meus-projetos",
    badge: "Navegação",
    title: "Atalho para sua carteira",
    description:
      "Em Meus Projetos você encontra tudo que já participa sem precisar refazer filtros.",
    tip: "Ideal para revisar pendências antes de reuniões e mentorias.",
    anchorId: "nav-meusProjetos",
    viewId: "meusProjetos",
  },
  {
    id: "painel-meus-projetos",
    badge: "Foco",
    title: "Sua área de execução",
    description:
      "Aqui ficam seus projetos ativos, com acessos diretos para diário e página do clube.",
    tip: "Use este módulo como base da rotina diária de acompanhamento.",
    anchorId: "content-meusProjetos",
    viewId: "meusProjetos",
  },
  {
    id: "menu-trilha",
    badge: "Planejamento",
    title: "Trilha pedagógica",
    description:
      "Este módulo organiza percursos de aprendizagem e estratégia de CT&I.",
    tip: "A trilha ajuda a transformar objetivos amplos em etapas acionáveis.",
    anchorId: "nav-trilha",
    viewId: "trilha",
  },
  {
    id: "painel-trilha",
    badge: "Planejamento",
    title: "Construa jornadas",
    description:
      "No conteúdo da trilha você conecta competências, metas e entregas em sequência.",
    tip: "Comece por um objetivo macro e quebre em marcos de curta duração.",
    anchorId: "content-trilha",
    viewId: "trilha",
  },
  {
    id: "menu-pop-eventos",
    badge: "Radar 2026",
    title: "POP Eventos",
    description:
      "Este módulo concentra editais, olimpíadas e chamadas para ampliar oportunidades.",
    tip: "Reserve alguns minutos por semana para revisar oportunidades novas.",
    anchorId: "nav-popEventos",
    viewId: "popEventos",
  },
  {
    id: "painel-pop-eventos",
    badge: "Oportunidades",
    title: "Calendário estratégico",
    description:
      "Use este painel para alinhar prazos, inscrições e mobilização da equipe.",
    tip: "Crie um ritual rápido de triagem para não perder janelas de submissão.",
    anchorId: "content-popEventos",
    viewId: "popEventos",
  },
  {
    id: "menu-forum",
    badge: "Comunicação",
    title: "POP Café",
    description:
      "O fórum é o ponto de troca entre clubes para dúvidas, boas práticas e anúncios.",
    tip: "Publique updates curtos e consistentes para manter a comunidade engajada.",
    anchorId: "nav-forum",
    viewId: "forum",
  },
  {
    id: "painel-forum",
    badge: "Comunidade",
    title: "Conversa com contexto",
    description:
      "Este painel concentra discussões e respostas para acelerar colaborações.",
    tip: "Use títulos objetivos para facilitar buscas futuras no histórico.",
    anchorId: "content-forum",
    viewId: "forum",
  },
  {
    id: "menu-clube",
    badge: "Gestão",
    title: "Meu Clube",
    description:
      "Acesse rapidamente a governança do clube, equipe e visão de projetos vinculados.",
    tip: "Defina este módulo como ponto de controle para tarefas de gestão.",
    anchorId: "nav-clube",
    viewId: "clube",
  },
  {
    id: "painel-clube",
    badge: "Gestão",
    title: "Central do clube",
    description:
      "No conteúdo do clube você acompanha membros, papéis e andamento de iniciativas.",
    tip: "Revise periodicamente as solicitações de entrada para manter o time atualizado.",
    anchorId: "content-clube",
    viewId: "clube",
  },
  {
    id: "sidebar-organizacao",
    badge: "Personalização",
    title: "Organize seu menu",
    description:
      "Ative este botão para arrastar módulos e montar uma navegação sob medida.",
    tip: "Priorize os módulos que você abre todos os dias no topo da lista.",
    anchorId: "sidebar-organize",
  },
  {
    id: "perfil-acoes",
    badge: "Conta",
    title: "Menu de perfil",
    description:
      "Aqui você acessa seu perfil, contexto de clube e opções de sessão.",
    tip: "Atualize seu perfil para facilitar conexões com outros pesquisadores.",
    anchorId: "topbar-profile",
  },
  {
    id: "finale",
    badge: "Missão concluída",
    title: "Pronto para navegar",
    description:
      "Agora você conhece o fluxo completo. Explore livremente e abra o guia quando quiser.",
    tip: "Use o botão flutuante para revisar o tour completo ou retomar do módulo atual.",
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