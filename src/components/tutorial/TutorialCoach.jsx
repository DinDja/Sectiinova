import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles, X } from "lucide-react";

import { useTutorial } from "../../contexts/TutorialContext";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const findVisibleAnchor = (anchorId) => {
  if (typeof document === "undefined" || !anchorId) return null;

  const nodes = Array.from(
    document.querySelectorAll(`[data-tutorial-anchor="${anchorId}"]`),
  );

  return (
    nodes.find((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    }) || null
  );
};

const resolveSpotlightRect = (anchorId) => {
  const targetNode = findVisibleAnchor(anchorId);
  if (!targetNode) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const targetRect = targetNode.getBoundingClientRect();
  const padding = 12;

  const top = clamp(targetRect.top - padding, 6, viewportHeight - 6);
  const left = clamp(targetRect.left - padding, 6, viewportWidth - 6);
  const width = clamp(targetRect.width + padding * 2, 32, viewportWidth - left - 6);
  const height = clamp(targetRect.height + padding * 2, 32, viewportHeight - top - 6);

  return {
    top,
    left,
    width,
    height,
    viewportWidth,
    viewportHeight,
  };
};

const resolveTooltipPosition = (spotlightRect, tooltipSize) => {
  const margin = 10;
  const gap = 16;

  const clampRect = (rect) => {
    const clampedLeft = clamp(
      rect.left,
      margin,
      window.innerWidth - rect.width - margin,
    );
    const clampedTop = clamp(
      rect.top,
      margin,
      window.innerHeight - rect.height - margin,
    );

    return {
      ...rect,
      left: clampedLeft,
      top: clampedTop,
    };
  };

  const hasOverlap = (rect, anchorRect) => {
    const expandedAnchor = {
      left: anchorRect.left - 8,
      top: anchorRect.top - 8,
      right: anchorRect.left + anchorRect.width + 8,
      bottom: anchorRect.top + anchorRect.height + 8,
    };

    const rectRight = rect.left + rect.width;
    const rectBottom = rect.top + rect.height;

    return !(
      rectRight <= expandedAnchor.left ||
      rect.left >= expandedAnchor.right ||
      rectBottom <= expandedAnchor.top ||
      rect.top >= expandedAnchor.bottom
    );
  };

  const isInsideViewport = (rect) => (
    rect.left >= margin &&
    rect.top >= margin &&
    rect.left + rect.width <= window.innerWidth - margin &&
    rect.top + rect.height <= window.innerHeight - margin
  );

  const fallbackWidth = clamp(
    Number(tooltipSize?.width) || 380,
    280,
    window.innerWidth - 24,
  );
  const fallbackHeight = Number(tooltipSize?.height) || 240;

  if (!spotlightRect) {
    return {
      top: Math.max(12, (window.innerHeight - fallbackHeight) / 2),
      left: Math.max(12, (window.innerWidth - fallbackWidth) / 2),
      width: fallbackWidth,
    };
  }

  const tooltipWidth = clamp(
    Number(tooltipSize?.width) || 380,
    280,
    spotlightRect.viewportWidth - 20,
  );
  const tooltipHeight = Number(tooltipSize?.height) || 240;

  const centeredLeft =
    spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2;
  const centeredTop =
    spotlightRect.top + spotlightRect.height / 2 - tooltipHeight / 2;

  const candidateByPlacement = {
    right: {
      left: spotlightRect.left + spotlightRect.width + gap,
      top: centeredTop,
      width: tooltipWidth,
      height: tooltipHeight,
    },
    left: {
      left: spotlightRect.left - tooltipWidth - gap,
      top: centeredTop,
      width: tooltipWidth,
      height: tooltipHeight,
    },
    below: {
      left: centeredLeft,
      top: spotlightRect.top + spotlightRect.height + gap,
      width: tooltipWidth,
      height: tooltipHeight,
    },
    above: {
      left: centeredLeft,
      top: spotlightRect.top - tooltipHeight - gap,
      width: tooltipWidth,
      height: tooltipHeight,
    },
  };

  const placementOrder =
    spotlightRect.viewportWidth >= 1024
      ? ["right", "left", "below", "above"]
      : ["below", "above", "right", "left"];

  for (const placement of placementOrder) {
    const candidate = candidateByPlacement[placement];
    if (!candidate) continue;

    if (!isInsideViewport(candidate)) {
      continue;
    }

    if (!hasOverlap(candidate, spotlightRect)) {
      return {
        top: candidate.top,
        left: candidate.left,
        width: candidate.width,
      };
    }
  }

  for (const placement of placementOrder) {
    const candidate = candidateByPlacement[placement];
    if (!candidate) continue;

    const clampedCandidate = clampRect(candidate);
    if (!hasOverlap(clampedCandidate, spotlightRect)) {
      return {
        top: clampedCandidate.top,
        left: clampedCandidate.left,
        width: clampedCandidate.width,
      };
    }
  }

  const fallbackCandidate = clampRect(candidateByPlacement.below);
  return {
    top: fallbackCandidate.top,
    left: fallbackCandidate.left,
    width: fallbackCandidate.width,
  };
};

export default function TutorialCoach({ uiStyleId = "neo" }) {
  const {
    isOpen,
    steps,
    stepIndex,
    activeStep,
    progressPercent,
    isFirstStep,
    isLastStep,
    hasCompletedTutorial,
    startTutorialFromBeginning,
    startTutorialFromCurrentView,
    restartTutorial,
    dismissTutorial,
    completeTutorial,
    nextStep,
    previousStep,
  } = useTutorial();

  const isMaterialStyle = uiStyleId === "material";
  const isModernStyle = uiStyleId === "modern";
  const isEditorialStyle = uiStyleId === "editorial";

  const panelClassName = isMaterialStyle
    ? "pointer-events-auto fixed flex max-h-[calc(100vh-1.25rem)] w-[min(31rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.25)]"
    : isModernStyle
      ? "pointer-events-auto fixed flex max-h-[calc(100vh-1.25rem)] w-[min(31rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-[0_16px_38px_rgba(15,23,42,0.2)]"
      : isEditorialStyle
        ? "pointer-events-auto fixed flex max-h-[calc(100vh-1.25rem)] w-[min(31rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-[1rem] border border-[#c9b8a2] bg-[#fffaf3] shadow-[0_18px_42px_rgba(83,63,39,0.24)]"
        : "pointer-events-auto fixed flex max-h-[calc(100vh-1.25rem)] w-[min(31rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white/95 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-sm";

  const panelHeaderClassName = isMaterialStyle
    ? "relative border-b border-slate-200 bg-slate-100 px-4 pb-3 pt-3.5"
    : isModernStyle
      ? "relative border-b border-slate-200 bg-white px-4 pb-3 pt-3.5"
      : isEditorialStyle
        ? "relative border-b border-[#d7c7b2] bg-[#f6ead9] px-4 pb-3 pt-3.5"
        : "relative border-b border-slate-200 bg-gradient-to-r from-cyan-100 via-white to-amber-100 px-4 pb-3 pt-3.5";

  const previousButtonClassName = isMaterialStyle
    ? "inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
    : isModernStyle
      ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
      : isEditorialStyle
        ? "inline-flex items-center gap-1.5 rounded-md border border-[#b89f82] bg-[#fff8ee] px-3 py-2 text-[11px] font-semibold text-[#5a4633] transition-colors hover:bg-[#f3e5d2] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
        : "inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45";

  const skipButtonClassName = isMaterialStyle
    ? "inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-200"
    : isModernStyle
      ? "inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100"
      : isEditorialStyle
        ? "inline-flex items-center rounded-md border border-[#d4c2ab] bg-[#f8eee0] px-3 py-2 text-[11px] font-semibold text-[#6a5540] transition-colors hover:bg-[#f2e2cc]"
        : "inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-200";

  const nextButtonClassName = isMaterialStyle
    ? "inline-flex items-center gap-1.5 rounded-xl border border-slate-900 bg-slate-900 px-3.5 py-2 text-[11px] font-semibold text-white transition-transform hover:scale-105 active:scale-95"
    : isModernStyle
      ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[11px] font-semibold text-slate-900 transition-colors hover:bg-slate-100 active:scale-95"
      : isEditorialStyle
        ? "inline-flex items-center gap-1.5 rounded-md border border-[#8f7558] bg-[#e9d5b7] px-3.5 py-2 text-[11px] font-semibold text-[#4a3828] transition-colors hover:bg-[#dcc19e] active:scale-95"
        : "inline-flex items-center gap-1.5 rounded-full border border-slate-900 bg-slate-900 px-3.5 py-2 text-[11px] font-semibold text-white transition-transform hover:scale-105 active:scale-95";

  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 380, height: 240 });
  const panelRef = useRef(null);
  const lastStepIdRef = useRef("");

  useEffect(() => {
    if (!isOpen || !activeStep?.anchorId) {
      setSpotlightRect(null);
      return undefined;
    }

    const updateRect = () => {
      setSpotlightRect(resolveSpotlightRect(activeStep.anchorId));
    };

    updateRect();

    window.addEventListener("resize", updateRect, { passive: true });
    window.addEventListener("scroll", updateRect, true);
    const intervalId = window.setInterval(updateRect, 260);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      window.clearInterval(intervalId);
    };
  }, [isOpen, activeStep?.anchorId, stepIndex]);

  useEffect(() => {
    if (!isOpen || !activeStep?.id) return;
    if (lastStepIdRef.current === activeStep.id) return;

    lastStepIdRef.current = activeStep.id;
    const targetNode = findVisibleAnchor(activeStep.anchorId);
    if (!targetNode) return;

    const targetRect = targetNode.getBoundingClientRect();
    if (targetRect.top < 86 || targetRect.bottom > window.innerHeight - 120) {
      targetNode.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [isOpen, activeStep]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return undefined;

    const updateTooltipSize = () => {
      if (!panelRef.current) return;
      const panelRect = panelRef.current.getBoundingClientRect();
      setTooltipSize({
        width: panelRect.width,
        height: panelRect.height,
      });
    };

    updateTooltipSize();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(updateTooltipSize);
    observer.observe(panelRef.current);

    return () => observer.disconnect();
  }, [isOpen, stepIndex]);

  const tooltipPosition = useMemo(
    () => resolveTooltipPosition(spotlightRect, tooltipSize),
    [spotlightRect, tooltipSize],
  );

  const handleNextStep = () => {
    if (isLastStep) {
      completeTutorial();
      return;
    }

    nextStep();
  };

  const totalSteps = steps.length;
  const stepLabel = `${Math.min(stepIndex + 1, totalSteps)}/${totalSteps}`;
  const stepActions = Array.isArray(activeStep?.actions)
    ? activeStep.actions.filter(Boolean)
    : [];

  return (
    <>
      <AnimatePresence>
        {isOpen && activeStep && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[120]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {spotlightRect ? (
              <motion.div
                className="pointer-events-none fixed rounded-[1.2rem] border-2 border-cyan-100/95"
                style={{
                  top: spotlightRect.top,
                  left: spotlightRect.left,
                  width: spotlightRect.width,
                  height: spotlightRect.height,
                  boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.68)",
                }}
                initial={{ opacity: 0.5, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            ) : (
              <motion.div
                className="pointer-events-none fixed inset-0 bg-slate-950/70 backdrop-blur-[1px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              />
            )}

            {spotlightRect && (
              <motion.div
                className="pointer-events-none fixed rounded-[1.2rem] border border-white/85"
                style={{
                  top: spotlightRect.top,
                  left: spotlightRect.left,
                  width: spotlightRect.width,
                  height: spotlightRect.height,
                }}
                animate={{
                  opacity: [0.4, 0.9, 0.4],
                  scale: [1, 1.012, 1],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            )}

            <motion.section
              ref={panelRef}
              className={panelClassName}
              style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                width: tooltipPosition.width,
              }}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className={panelHeaderClassName}>

                <div className="pr-10">
                  <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    {activeStep.badge || "Guia"}
                  </span>
                  <h3 className="mt-2 text-base font-black uppercase tracking-wide text-slate-900">
                    {activeStep.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                    {activeStep.description}
                  </p>
                  {activeStep.details && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {activeStep.details}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={dismissTutorial}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-transform hover:scale-105 active:scale-95"
                  aria-label="Fechar tutorial"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3.5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                    Dica criativa
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900">
                    {activeStep.tip}
                  </p>
                </div>

                {stepActions.length > 0 && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                      Como aplicar nesta etapa
                    </p>
                    <ol className="mt-2 space-y-1.5">
                      {stepActions.map((action, index) => (
                        <li
                          key={`${activeStep.id}-action-${index}`}
                          className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
                        >
                          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-700">
                            {index + 1}
                          </span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="mt-3.5">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Etapa {stepLabel}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={previousStep}
                    disabled={isFirstStep}
                    className={previousButtonClassName}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={dismissTutorial}
                    className={skipButtonClassName}
                  >
                    Pular por enquanto
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className={nextButtonClassName}
                  >
                    {isLastStep ? "Concluir tour" : "Proxima etapa"}
                    {!isLastStep && <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
