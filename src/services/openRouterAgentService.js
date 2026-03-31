const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

function markdownToPlainText(markdown = '') {
    if (!markdown) {
        return '';
    }

    return markdown
        .replace(/\r\n/g, '\n')
        .replace(/^```[\w-]*\s*$/gm, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s{0,3}>\s?/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '• ')
        .replace(/^\s*\d+\.\s+/gm, '• ')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/^\s*([-*_])\1{2,}\s*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

const AGENT_PHASES = [
    {
        id: 'pesquisa_anterioridade',
        title: 'Pesquisa de Anterioridade',
        goal: 'Gerar instrução operacional para fazer busca no BuscaWeb do INPI com IPC, termos, sinônimos e análise de resultados similares.'
    },
    {
        id: 'cadastro_e_inpi',
        title: 'Cadastro e-INPI e GRU',
        goal: 'Guiar o usuário no cadastro correto (Cliente/Procurador), identificação de descontos e emissão/pagamento da GRU (códigos 200/203).' 
    },
    {
        id: 'peticionamento',
        title: 'Peticionamento e Documentos',
        goal: 'Auxiliar na preparação do pedido no e-Patentes 4.0 e checklist de anexos: Relatório, Reivindicações, Resumo, Desenhos.'
    },
    {
        id: 'validacao',
        title: 'Validação e Acompanhamento',
        goal: 'Revisar checklist completo, indicar como acompanhar a RPI e avisar sobre anuidades e prazos de exame.'
    }
];

function getApiKey() {
    const apiKey =  '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';

    if (!apiKey) {
        throw new Error('A chave da OpenRouter não foi configurada. Defina VITE_OPENROUTER_API_KEY no arquivo .env.local.');
    }

    return apiKey;
}

function getBaseSystemPrompt() {
    return [
        'Você é um agente especialista em processo de patentes no INPI e seu papel é exclusivamente orientar o usuário.',
        'NUNCA crie, gere ou preencha documentos automaticamente; forneça apenas instruções e recomendações práticas para o clube de ciências tirar a patente.',
        'Responda em português do Brasil.',
        'Seja objetivo, claro e prático.',
        'Nunca invente leis, prazos ou códigos. Quando não tiver certeza, sinalize a incerteza.',
        'Sempre entregue saída estruturada em blocos curtos com títulos e checklist.',
        'Produza saída visualmente atraente e colorida: use HTML com classes Tailwind (ex: bg-emerald-50, text-emerald-800, border-emerald-200, rounded-xl, shadow-sm, p-4, bg-amber-50, text-amber-700, bg-red-100, text-red-700).',
        'Use elementos como cartões, tabelas, listas e badges de status para separar seções e dar destaque.',
        'Quando possível, forneça a resposta em HTML simples com tags <h2>, <p>, <ul>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td> e utilize classes Tailwind CSS (por exemplo, table-auto, w-full, text-slate-700, bg-slate-100, border, rounded) dentro de className para enriquecer o visual. Se não for possível, use Markdown.',
        'Evite usar a cor vermelha para não alarmar o usuário; prefira tons de verde para ações recomendadas, amarelo para cautela e cinza para informações neutras.',
        'Use o processo prático explicativo do INPI: pesquisa de anterioridade, cadastro e-INPI, pagamento da GRU, protocolo no e-Patentes 4.0, anexação de Relatório Descritivo/Reivindicações/Resumo/Desenhos e acompanhamento pela RPI.'
    ].join(' ');
}

async function createCompletion({ messages, signal }) {
    const apiKey = getApiKey();

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Projeto INPI - Agente Autônomo'
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            temperature: 0.2,
            messages
        }),
        signal
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Falha ao consultar OpenRouter (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = String(data?.choices?.[0]?.message?.content || '').trim();
    return content || 'Sem conteúdo retornado pelo modelo.';
}

export async function runAutonomousInpiAgent({ objective, context, selectedProjectContext, onPhaseUpdate, signal }) {
    const conversation = [
        { role: 'system', content: getBaseSystemPrompt() },
        {
            role: 'user',
            content: [
                'Objetivo principal do usuário:',
                objective,
                '',
                'Contexto adicional:',
                context || 'Não informado.',
                '',
                'Projeto selecionado do clube de ciência:',
                selectedProjectContext || 'Não informado.',
                '',
                'Use, obrigatoriamente, estes passos do fluxo INPI:',
                '- Pesquisa de anterioridade (BuscaWeb INPI com IPC, sinônimos e palavras-chave).',
                '- Cadastro no e-INPI (Cliente/Procurador).',
                '- Pagamento de GRU (código 200 para pedido nacional e 203 para exame técnico).',
                '- Peticionamento no e-Patentes 4.0 (depósito de pedido, exigências e recursos).',
                '- Anexação de Relatório Descritivo, Reivindicações, Resumo e Desenhos (DOCX/PDF).',
                '- Acompanhamento via RPI e cobrança de anuidades.',
                '',
                'Regra obrigatória: não crie projeto novo. Trabalhe apenas com o projeto selecionado e produza somente instruções e petições vinculadas a ele.'
            ].join('\n')
        }
    ];

    const phaseOutputs = [];

    for (const phase of AGENT_PHASES) {
        onPhaseUpdate?.({ phaseId: phase.id, status: 'running' });

        const prompt = [
            `Fase atual: ${phase.title}`,
            `Meta da fase: ${phase.goal}`,
            '',
            'Sempre ancore suas respostas na sequência prática do INPI (Pesquisa de Anterioridade, Cadastro e-INPI, GRU, e-Patentes 4.0, Documentos técnicos e Acompanhamento/RPI).',
            'Com base no objetivo e no histórico anterior, gere a resposta desta fase.',
            'Formato obrigatório:',
            '1) Ações práticas (checklist com 4-7 itens, incluindo itens do processo INPI)',
            '2) Saída esperada desta fase',
            '3) Riscos e mitigação (máx. 3 itens)'
        ].join('\n');

        const content = await createCompletion({
            messages: [
                ...conversation,
                {
                    role: 'user',
                    content: phaseOutputs.length
                        ? `Histórico resumido das fases anteriores:\n${phaseOutputs.map((item) => `- ${item.title}: ${item.output}`).join('\n\n')}\n\n${prompt}`
                        : prompt
                }
            ],
            signal
        });

        phaseOutputs.push({ id: phase.id, title: phase.title, output: content });
        conversation.push({ role: 'assistant', content });

        onPhaseUpdate?.({
            phaseId: phase.id,
            status: 'completed',
            output: content
        });
    }

    return {
        summary: phaseOutputs
            .map((item, index) => `Fase ${index + 1} - ${item.title}\n${item.output}`)
            .join('\n\n'),
        phases: phaseOutputs
    };
}

const PRESET_PROJECTS = [
    {
        id: 'deposito-pi',
        name: 'Depósito inicial de PI',
        objective: 'Preparar as petições e o checklist para depósito inicial de Patente de Invenção (PI) no INPI.',
        context: 'Foco em GRU 200, consistência entre Relatório, Reivindicações, Resumo e Desenhos e protocolo no e-Patentes 4.0.'
    },
    {
        id: 'deposito-mu',
        name: 'Depósito inicial de MU',
        objective: 'Preparar as petições e o checklist para depósito inicial de Modelo de Utilidade (MU) no INPI.',
        context: 'Foco em melhoria funcional de objeto de uso prático, GRU 200 e organização dos anexos técnicos.'
    },
    {
        id: 'exigencia-formal',
        name: 'Cumprimento de exigência',
        objective: 'Elaborar instruções de resposta para cumprimento de exigência formal/técnica no processo já existente.',
        context: 'Foco em petição de cumprimento de exigência com ajustes documentais e justificativas técnicas.'
    },
    {
        id: 'pedido-exame',
        name: 'Pedido de exame técnico',
        objective: 'Preparar a petição para requerer exame técnico dentro do prazo legal do processo de patente.',
        context: 'Foco em GRU 203, checagem de prazos e documentação de suporte ao pedido de exame.'
    }
];

export { AGENT_PHASES, DEFAULT_MODEL, PRESET_PROJECTS };
