import { useMemo, useRef, useState } from 'react';
import { LoaderCircle, Play, Square, Sparkles, CheckCircle2, CircleAlert } from 'lucide-react';

import { AGENT_PHASES, DEFAULT_MODEL, PRESET_PROJECTS, runAutonomousInpiAgent } from '../../services/openRouterAgentService';

const INITIAL_PHASE_STATE = AGENT_PHASES.reduce((accumulator, phase) => {
    accumulator[phase.id] = {
        status: 'idle',
        output: ''
    };
    return accumulator;
}, {});

function isTableRow(line) {
    return /^\s*\|.*\|\s*$/.test(line);
}

function isTableDivider(line) {
    return /^\s*\|\s*(:?-+:?\s*\|\s*)+$/.test(line);
}

function splitTableRow(line) {
    return line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim());
}

function isHtmlString(value) {
    if (!value || typeof value !== 'string') return false;
    return /<\s*(h[1-6]|p|ul|ol|li|table|thead|tbody|tr|td|th|strong|em|br|a|div)\b/i.test(value);
}

function renderOutputContent(text) {
    if (!text) {
        return null;
    }

    if (isHtmlString(text)) {
        return (
            <div
                className="prose prose-slate max-w-none mt-3"
                dangerouslySetInnerHTML={{ __html: text }}
            />
        );
    }

    return renderMarkdownWithTables(text);
}

function renderTextBlock(text) {
    const lines = String(text).split('\n');
    const elements = [];
    let currentList = null;
    let currentListType = null;

    const flushList = () => {
        if (!currentList) return;
        elements.push(
            React.createElement(
                currentListType === 'ol' ? 'ol' : 'ul',
                { className: 'list-disc list-inside space-y-2 text-sm text-slate-800 mb-3 ml-4' },
                currentList.map((item, idx) =>
                    React.createElement(
                        'li',
                        {
                            key: `li-${idx}`,
                            className: 'text-slate-700 bg-emerald-50/40 rounded-md px-2 py-1 inline-block'
                        },
                        item
                    )
                )
            )
        );
        currentList = null;
        currentListType = null;
    };

    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            return;
        }

        const orderedMatch = trimmed.match(/^\s*(\d+)[\.)]\s+(.*)$/);
        const unorderedMatch = trimmed.match(/^\s*(?:[-*+]\s+|✔️\s+)(.*)$/);

        if (orderedMatch) {
            if (currentListType !== 'ol') {
                flushList();
                currentListType = 'ol';
                currentList = [];
            }
            currentList.push(orderedMatch[2]);
            return;
        }

        if (unorderedMatch) {
            if (currentListType !== 'ul') {
                flushList();
                currentListType = 'ul';
                currentList = [];
            }
            currentList.push(unorderedMatch[1]);
            return;
        }

        flushList();

        if (/^\d+\)/.test(trimmed)) {
            elements.push(
                <h4 key={`h4-${idx}`} className="text-sm font-semibold text-slate-800 mt-3">
                    {trimmed}
                </h4>
            );
            return;
        }

        elements.push(
            <p key={`p-${idx}`} className="text-sm text-slate-800 leading-relaxed mb-2 border-l-4 border-emerald-200 pl-3">
                {trimmed}
            </p>
        );
    });

    flushList();

    if (!elements.length) {
        return null;
    }

    return <div className="space-y-1">{elements}</div>;
}

function renderMarkdownWithTables(text) {
    if (!text) {
        return null;
    }

    const lines = String(text).split('\n');
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
        const currentLine = lines[index];

        if (isTableRow(currentLine) && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
            const header = splitTableRow(currentLine);
            index += 2;
            const rows = [];

            while (index < lines.length && isTableRow(lines[index])) {
                rows.push(splitTableRow(lines[index]));
                index += 1;
            }

            blocks.push({ type: 'table', header, rows });
            continue;
        }

        const chunk = [];
        while (
            index < lines.length &&
            !(isTableRow(lines[index]) && index + 1 < lines.length && isTableDivider(lines[index + 1]))
        ) {
            chunk.push(lines[index]);
            index += 1;
        }
        blocks.push({ type: 'text', text: chunk.join('\n') });
    }

    return blocks.map((block, idx) => {
        if (block.type === 'table') {
            return (
                <div key={`tbl-${idx}`} className="overflow-x-auto py-2">
                    <table className="w-full text-sm border border-emerald-200 rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-emerald-100">
                            <tr>
                                {block.header.map((cell, cIdx) => (
                                    <th key={cIdx} className="border border-emerald-200 px-3 py-2 text-left font-semibold text-emerald-800">
                                        {cell}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                                    {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="border border-emerald-100 px-3 py-2 text-left text-slate-800">
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (!block.text.trim()) {
            return null;
        }

        return (
            <div
                key={`txt-${idx}`}
                className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-3"
            >
                {renderTextBlock(block.text)}
            </div>
        );
    });
}

export default function AutonomousINPIAgent({ clubProjects = [] }) {
    const [objective, setObjective] = useState('');
    const [context, setContext] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [summary, setSummary] = useState('');
    const [phaseState, setPhaseState] = useState(INITIAL_PHASE_STATE);

    const abortControllerRef = useRef(null);

    const selectedProject = useMemo(
        () => clubProjects.find((project) => String(project.id) === String(selectedProjectId)) || null,
        [clubProjects, selectedProjectId]
    );

    const canRun = useMemo(() => {
        return Boolean(selectedProject && selectedPreset && objective.trim().length >= 10 && !isRunning);
    }, [selectedProject, selectedPreset, objective, isRunning]);

    const resetPhases = () => {
        setPhaseState(INITIAL_PHASE_STATE);
        setSummary('');
        setErrorMessage('');
    };

    const applyPreset = (presetId) => {
        const preset = PRESET_PROJECTS.find((item) => item.id === presetId);
        if (!preset) {
            setSelectedPreset('');
            setObjective('');
            setContext('');
            return;
        }

        setSelectedPreset(presetId);
        setObjective(preset.objective);
        setContext(preset.context);
        setErrorMessage('');
    };

    const handleRunAgent = async () => {
        if (!canRun) {
            return;
        }

        resetPhases();
        setIsRunning(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const result = await runAutonomousInpiAgent({
                objective: objective.trim(),
                context: context.trim(),
                selectedProjectContext: [
                    `ID: ${selectedProject?.id || ''}`,
                    `Título: ${selectedProject?.titulo || selectedProject?.nome || ''}`,
                    `Descrição: ${selectedProject?.descricao || 'Não informada.'}`,
                    `Área temática: ${selectedProject?.area_tematica || 'Não informada.'}`,
                    `Tipo: ${selectedProject?.tipo || 'Não informado.'}`
                ].join('\n'),
                signal: abortController.signal,
                onPhaseUpdate: ({ phaseId, status, output }) => {
                    setPhaseState((previousState) => ({
                        ...previousState,
                        [phaseId]: {
                            ...previousState[phaseId],
                            status,
                            output: output ?? previousState[phaseId].output
                        }
                    }));
                }
            });

            setSummary(result.summary);
        } catch (error) {
            if (error?.name === 'AbortError') {
                setErrorMessage('Execução interrompida. Você pode ajustar os dados e iniciar novamente.');
            } else {
                setErrorMessage(error?.message || 'Falha ao executar o agente autônomo.');
            }
        } finally {
            setIsRunning(false);
            abortControllerRef.current = null;
        }
    };

    const handleStopAgent = () => {
        abortControllerRef.current?.abort();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-emerald-700">
                    <Sparkles className="w-5 h-5" />
                    <h2 className="text-xl font-bold text-slate-800">GUIÁ</h2>
                </div>
                <p className="text-sm text-slate-600 mb-1">
                    Este agente não cria projetos. Ele só prepara instruções e petições com base em um projeto existente do seu clube de ciências.
                </p>
                <div className="space-y-4">
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Projeto do seu clube</span>
                        <select
                            value={selectedProjectId}
                            onChange={(event) => setSelectedProjectId(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">-- Selecione um projeto do seu clube --</option>
                            {clubProjects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.titulo || project.nome || `Projeto ${project.id}`}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Prompt padrão INPI (tipo de petição)</span>
                        <select
                            value={selectedPreset}
                            onChange={(event) => applyPreset(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">-- Selecione um template --</option>
                            {PRESET_PROJECTS.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Objetivo principal</span>
                        <textarea
                            value={objective}
                            readOnly
                            placeholder="Selecione um prompt padrão INPI para preencher automaticamente."
                            rows={4}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Contexto adicional (opcional)</span>
                        <textarea
                            value={context}
                            readOnly
                            placeholder="Selecione um prompt padrão INPI para preencher automaticamente."
                            rows={4}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        />
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleRunAgent}
                            disabled={!canRun}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRunning ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Executar agente
                        </button>

                        <button
                            onClick={handleStopAgent}
                            disabled={!isRunning}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Square className="w-4 h-4" />
                            Parar
                        </button>
                    </div>

                    {!clubProjects.length && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                            Nenhum projeto encontrado no seu clube no momento. O agente só executa com projeto do clube selecionado.
                        </p>
                    )}
                </div>
            </div>

            {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
                    <CircleAlert className="w-4 h-4 mt-0.5" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Fases automáticas</h3>
                <div className="space-y-4">
                    {AGENT_PHASES.map((phase, index) => {
                        const item = phaseState[phase.id];

                        return (
                            <article key={phase.id} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{index + 1}. {phase.title}</p>
                                        <p className="text-xs text-slate-500">{phase.goal}</p>
                                    </div>
                                    <PhaseStatusBadge status={item.status} />
                                </div>

                                {item.output && (
                                    <div className="mt-3">
                                        {renderOutputContent(item.output)}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>

            {summary && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Consolidado final</h3>
                    <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 font-sans">
                        {renderOutputContent(summary)}
                    </div>
                </div>
            )}
        </div>
    );
}

function PhaseStatusBadge({ status }) {
    if (status === 'running') {
        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <LoaderCircle className="w-3 h-3 animate-spin" />
                Em execução
            </span>
        );
    }

    if (status === 'completed') {
        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                Concluída
            </span>
        );
    }

    return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Aguardando
        </span>
    );
}
