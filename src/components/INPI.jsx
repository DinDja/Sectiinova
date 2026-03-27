"use client";

import React, { useEffect, useState } from 'react';
import ModalPesquisaAnterioridade from './ModalPesquisaAnterioridade';
import ModalPI from './ModalPI';
import ModalMU from './ModalMU';
import ModalLogin from './ModalLogin';
import AutonomousINPIAgent from './AutonomousINPIAgent';
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
    Download, FileDown, List, Image as ImageIcon, AlignLeft
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export default function INPI({ clubProjects = [] }) {
    const [activeTab, setActiveTab] = useState('guia');
    const [isPesquisaModalOpen, setIsPesquisaModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <header className="bg-emerald-50 text-white shadow-md">
                <div className="mx-auto px-4 py-6">
                    <div className="flex items-center gap-3">
                        <img src="/logoPatentes.svg" alt="" />
                    </div>
                </div>
            </header>

            <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 flex justify-center">
                <div className=" mx-auto px-4 flex overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('guia')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'guia' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <BookOpen className="w-5 h-5" />
                        Guia Completo
                    </button>
                    <button
                        onClick={() => setActiveTab('gerador')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'gerador' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText className="w-5 h-5" />
                        Gerador de Documentos
                    </button>
                    <button
                        onClick={() => setActiveTab('documentos')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'documentos' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <File className="w-5 h-5" />
                        Documentos Obrigatórios
                    </button>
                    <button
                        onClick={() => setActiveTab('agente')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'agente' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <img src="/Lobo.svg" alt="" className="w-5 h-5" />
                            GUIÁ
                    </button>
                </div>
            </nav>

            <ModalPesquisaAnterioridade isOpen={isPesquisaModalOpen} onClose={() => setIsPesquisaModalOpen(false)} />

            <main className=" mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-[380px_1fr] gap-8">
                    <aside className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 sticky top-20 self-start">
                        <h2 className="text-lg font-bold text-slate-800 mb-3">Checklist Completo</h2>
                        <ChecklistSidebar />
                    </aside>

                    <section>
                        {activeTab === 'guia' && <GuiaINPI onOpenPesquisa={() => setIsPesquisaModalOpen(true)} />}
                        {activeTab === 'gerador' && <GeradorDocumentos />}
                        {activeTab === 'documentos' && <DocumentosObrigatorios />}
                        {activeTab === 'agente' && <AutonomousINPIAgent clubProjects={clubProjects} />}
                    </section>
                </div>
            </main>
        </div>
    );
}

function GuiaINPI({ onOpenPesquisa }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalMUOpen, setIsModalMUOpen] = useState(false); 
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const steps = [
        {
            icon: <Search className="w-6 h-6 text-indigo-500" />,
            title: "1. Pesquisa de Anterioridade",
            desc: "Antes de tudo, faça uma busca minuciosa no Sistema BuscaWeb do INPI. Use palavras-chave, sinônimos e a classificação internacional (IPC). A invenção precisa ser novidade mundial – se já existir algo igual em qualquer lugar, não será patenteável."
        },
        {
            icon: <UserPlus className="w-6 h-6 text-blue-500" />,
            title: "2. Cadastro no e-INPI",
            desc: "Cadastre-se como 'Cliente' (pessoa física ou jurídica) ou 'Procurador' (advogado). Instituições de ensino, pesquisadores individuais e microempresas têm direito a até 60% de desconto nas taxas. Guarde seu login e senha."
        },
        {
            icon: <CreditCard className="w-6 h-6 text-emerald-500" />,
            title: "3. Pagamento da GRU",
            desc: "Emita a Guia de Recolhimento da União correspondente ao serviço no sistema PAG. O código 200 (Pedido nacional de invenção, modelo de utilidade, etc.) é o padrão para depósito. Pague a guia e anote o 'nosso número'."
        },
        {
            icon: <Upload className="w-6 h-6 text-orange-500" />,
            title: "4. Pedido no e-Patentes 4.0",
            desc: "Acesse o peticionamento eletrônico com seu login, digite o número da GRU paga e avance. O e-Patentes 4.0 não aceita DOCX apenas para depósito inicial (GRU 200), mas também para cumprimento de exigências (206, 207, 280), recursos (214) e outras petições (260, 281)."
        },
        {
            icon: <FileText className="w-6 h-6 text-purple-500" />,
            title: "5. Anexar os documentos técnicos",
            desc: "Anexe o Relatório Descritivo, Reivindicações, Resumo e Desenhos. Atenção: apenas essas partes do pedido podem ser enviadas em formato DOCX. Se você tentar enviar outros anexos em DOCX, o sistema dará erro. Dica: listagens de sequência continuam sendo recebidas exclusivamente em XML (padrão ST26)."
        },
        {
            icon: <AlertCircle className="w-6 h-6 text-red-500" />,
            title: "6. Acompanhamento e prazos",
            desc: "Acompanhe pela Revista da Propriedade Industrial (RPI) toda terça-feira. Dentro de 36 meses, você deve solicitar o exame técnico (GRU código 203). Anuidades começam a partir do 2º ano. O sigilo dura 18 meses."
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">O que é uma patente?</h2>
                <p className="text-slate-600 mb-4">
                    Uma patente é um título de propriedade temporária concedido pelo Estado, que garante ao inventor o direito exclusivo de explorar sua invenção, impedindo terceiros de produzir, usar ou vender sem autorização. No Brasil, o Instituto Nacional da Propriedade Industrial (INPI) é o órgão responsável.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                    <div
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-50 p-6 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 hover:shadow-md transition-all group"
                    >
                        <h3 className="font-bold text-blue-800 mb-2 flex items-center justify-between">
                            Patente de Invenção (PI)
                            <Info className="w-4 h-4 text-blue-500 group-hover:text-blue-700 transition-colors" />
                        </h3>
                        <p className="text-blue-900/80 text-sm">Para produtos ou processos novos, com atividade inventiva. Proteção de 20 anos a partir do depósito. Clique para saber mais.</p>
                    </div>

                    <div 
                        onClick={() => setIsModalMUOpen(true)}
                        className="bg-emerald-50 p-6 rounded-lg border border-emerald-100 cursor-pointer hover:bg-emerald-100 hover:shadow-md transition-all group"
                    >
                        <h3 className="font-bold text-emerald-800 mb-2 flex items-center justify-between">
                            Modelo de Utilidade (MU)
                            <Info className="w-4 h-4 text-emerald-500 group-hover:text-emerald-700 transition-colors" />
                        </h3>
                        <p className="text-emerald-900/80 text-sm">Para objetos de uso prático que tenham melhoria funcional em relação ao que já existe. Proteção de 15 anos. Clique para saber mais.</p>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-4">
                    <Info className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-emerald-800">Novidade: e-Patentes 4.0</h3>
                        <p className="text-emerald-700 text-sm mt-1">
                            O novo sistema permite o depósito dos documentos técnicos em formato DOCX (além do PDF). Na segunda fase, haverá verificação automática de erros formais, agilizando o processo. <strong>Recomenda-se usar DOCX</strong> para se beneficiar da validação futura.
                        </p>
                        <a href="#" className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium mt-2 hover:underline">
                            Saiba mais no site do INPI <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-6">Passo a Passo Detalhado</h2>
            <div className="space-y-4">
                {steps.map((step, idx) => (
                    <div key={idx} className="flex bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex-shrink-0 mr-6 mt-1">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                                {step.icon}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{step.title}</h3>
                            <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                            
                            {idx === 0 && (
                                <button
                                    onClick={onOpenPesquisa}
                                    className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-800"
                                >
                                    Abrir explicação detalhada da pesquisa de anterioridade
                                </button>
                            )}

                            {idx === 1 && (
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-800"
                                >
                                    Abrir explicação detalhada sobre o cadastro no INPI
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3"><DollarSign className="w-5 h-5 text-emerald-600" /> Descontos (até 60%)</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm">
                        <li>Pessoas físicas (sem participação societária em empresa do ramo)</li>
                        <li>Microempresas, MEI e empresas de pequeno porte</li>
                        <li>Instituições de ensino e pesquisa</li>
                        <li>Cooperativas e entidades sem fins lucrativos</li>
                        <li>Órgãos públicos (para atos próprios)</li>
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3"><Calendar className="w-5 h-5 text-emerald-600" /> Principais Prazos</h3>
                    <ul className="list-disc list-inside text-slate-600 space-y-1 text-sm">
                        <li><strong>Sigilo:</strong> 18 meses a partir do depósito</li>
                        <li><strong>Exame técnico:</strong> até 36 meses do depósito (código 203)</li>
                        <li><strong>Anuidades:</strong> a partir do 2º ano, até o último mês do aniversário do depósito</li>
                        <li><strong>Recurso de indeferimento:</strong> 60 dias após a decisão</li>
                        <li><strong>Concessão:</strong> pagar GRU em até 60 dias (ordinário) + 30 extras (extraordinário)</li>
                    </ul>
                </div>
            </div>

            <ModalPI isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <ModalMU isOpen={isModalMUOpen} onClose={() => setIsModalMUOpen(false)} />
            <ModalLogin isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </div>
    );
}

function GeradorDocumentos() {
    const [copiedText, setCopiedText] = useState(false);
    const [activeTab, setActiveTab] = useState('relatorio'); 

    const [formData, setFormData] = useState({
        titulo: '',
        campo: '',
        estadoTecnica: '',
        problema: '',
        desenhos: '',
        descricao: '',
        exemplos: '',
        reivindicacao: '',
        resumo: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    useEffect(() => {
        try {
            const json = localStorage.getItem('inpi_agent_autodoc');
            if (!json) return;
            const data = JSON.parse(json);
            if (!data || typeof data !== 'object') return;

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
                    resumo: data.resumo || prev.resumo
                }
            }));
        } catch (error) {
            console.warn('Não foi possível carregar conteúdo do Agente IA para o Gerador de Documentos.', error);
        }
    }, []);

    const HelpBox = ({ text }) => (
        <div className="mt-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{text}</span>
            </p>
        </div>
    );

    const generators = {
        relatorio: () => `${formData.titulo.toUpperCase() || '[TÍTULO DO SEU PEDIDO DE PATENTE]'}

Campo da invenção
${formData.campo || '[Descreva aqui o setor técnico ao qual se refere sua invenção.]'}

Fundamentos da invenção
${formData.estadoTecnica || '[Escreva aqui o estado da técnica relacionado à sua invenção.]'}
${formData.problema || '[Apresente o problema técnico e como sua invenção resolve esse problema.]'}

Breve descrição dos desenhos
${formData.desenhos || '[Se o seu pedido tiver desenhos, descreva de forma breve as informações apresentadas em cada um.]'}

Descrição da invenção
${formData.descricao || '[Apresente de forma detalhada sua invenção nessa seção e inclua todas as suas possibilidades de concretização.]'}

Exemplos de concretizações da invenção
${formData.exemplos || '[Apresente exemplos de concretizações da sua invenção. Indique a forma preferida de concretizar.]'}`,

        reivindicacoes: () => `REIVINDICAÇÕES

1. ${formData.reivindicacao || '[Preâmbulo] caracterizado por [Matéria Pleiteada].'}`,

        desenhos: () => `DESENHOS

[Insira aqui sua figura - Exclua este texto no Word e cole a imagem]

Figura 1

[Insira aqui sua figura - Exclua este texto no Word e cole a imagem]

Figura 2`,

        resumo: () => `RESUMO
${formData.titulo.toUpperCase() || '[TÍTULO DO SEU PEDIDO DE PATENTE]'}

${formData.resumo || '[Escreva um resumo da sua invenção aqui em um único parágrafo com 50 a 200 palavras, não excedendo uma página.]'}`
    };

    const generateCurrentText = () => {
        return generators[activeTab]().trim();
    };

    const copyToClipboard = () => {
        const textArea = document.createElement("textarea");
        textArea.value = generateCurrentText();
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopiedText(true);
            setTimeout(() => setCopiedText(false), 2000);
        } catch (err) {
            console.error('Falha ao copiar', err);
        }
        document.body.removeChild(textArea);
    };

const exportToDocx = async () => {
    const textToExport = generateCurrentText();
    const lines = textToExport.split('\n');
    const paragraphs = [];
    
    let paragraphCounter = 1; 

    const subtitulos = [
        "Campo da invenção",
        "Fundamentos da invenção",
        "Breve descrição dos desenhos",
        "Descrição da invenção",
        "Exemplos de concretizações da invenção"
    ];

    for (let line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) continue;

        const isMainTitle = trimmedLine === (formData.titulo.toUpperCase() || '[TÍTULO DO SEU PEDIDO DE PATENTE]') 
                         || ["RESUMO", "REIVINDICAÇÕES", "DESENHOS"].includes(trimmedLine);
                         
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
                            color: "000000"
                        })
                    ]
                })
            );
            continue;
        }

        if (subtitulos.includes(trimmedLine) || trimmedLine.startsWith("Figura ")) {
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
                            color: "000000"
                        })
                    ]
                })
            );
            continue;
        }

        let prefix = "";
        
        if (activeTab === 'relatorio') {
            const paddedCounter = String(paragraphCounter).padStart(4, '0');
            prefix = `[${paddedCounter}] `;
            paragraphCounter++;
        }

        paragraphs.push(
            new Paragraph({
                alignment: AlignmentType.JUSTIFIED, 
                spacing: { 
                    after: 120, 
                    line: 360   
                },
                children: [
                    new TextRun({
                        text: prefix + trimmedLine,
                        font: "Arial",
                        size: 24, 
                        color: "000000"
                    })
                ]
            })
        );
    }

    const doc = new Document({
        sections: [{
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
            children: paragraphs
        }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${activeTab}_patente.docx`;
    saveAs(blob, fileName);
};

    const tabs = [
        { id: 'relatorio', label: 'Relatório Descritivo', icon: <FileText className="w-4 h-4" /> },
        { id: 'reivindicacoes', label: 'Quadro Reivindicatório', icon: <List className="w-4 h-4" /> },
        { id: 'desenhos', label: 'Desenhos', icon: <ImageIcon className="w-4 h-4" /> },
        { id: 'resumo', label: 'Resumo', icon: <AlignLeft className="w-4 h-4" /> }
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${activeTab === tab.id
                                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-between gap-4 mb-3">
                <p className="text-sm text-slate-500">Dados importados do Agente IA serão carregados automaticamente.</p>
                <button
                    onClick={() => {
                        const json = localStorage.getItem('inpi_agent_autodoc');
                        if (!json) {
                            return;
                        }
                        try {
                            const data = JSON.parse(json);
                            setFormData((prev) => ({ ...prev, ...data }));
                        } catch (err) {
                            console.error(err);
                        }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                    Atualizar com dados do Agente IA
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        {tabs.find(t => t.id === activeTab)?.label}
                    </h2>

                    <form className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {activeTab === 'relatorio' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Título da Invenção</label>
                                    <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Use um título técnico, específico e direto, sem nomes comerciais. Esse título deve ser o mesmo no Relatório e no Resumo." />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Campo da Invenção</label>
                                    <textarea name="campo" value={formData.campo} onChange={handleChange} rows="2" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Informe a área técnica da invenção (ex.: engenharia mecânica, biotecnologia, software embarcado), sem explicar ainda a solução completa." />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Fundamentos (Estado da Técnica)</label>
                                    <textarea name="estadoTecnica" value={formData.estadoTecnica} onChange={handleChange} rows="3" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Descreva o que já existe no mercado ou na literatura e as limitações das soluções conhecidas, com linguagem objetiva." />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Problema Técnico & Vantagens</label>
                                    <textarea name="problema" value={formData.problema} onChange={handleChange} rows="3" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Explique qual problema técnico sua invenção resolve e quais vantagens mensuráveis ela oferece em relation ao estado da técnica." />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Breve Descrição dos Desenhos</label>
                                    <textarea name="desenhos" value={formData.desenhos} onChange={handleChange} rows="2" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Liste cada figura de forma curta (Figura 1, Figura 2...) e diga o que cada uma representa, sem detalhamento excessivo." />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição Detalhada da Invenção</label>
                                    <textarea name="descricao" value={formData.descricao} onChange={handleChange} rows="5" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Descreva estrutura, componentes, funcionamento e variações de execução, com detalhes suficientes para reprodução técnica." />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Exemplos de Concretização</label>
                                    <textarea name="exemplos" value={formData.exemplos} onChange={handleChange} rows="3" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Inclua ao menos um exemplo prático de aplicação da invenção, destacando a forma preferida de implementação." />
                                </div>
                            </>
                        )}

                        {activeTab === 'reivindicacoes' && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Reivindicações</label>
                                <p className="text-xs text-slate-500 mb-2">Formato: Preâmbulo + "caracterizado por" + essência da invenção. Use ponto final único por reivindicação.</p>
                                <textarea name="reivindicacao" value={formData.reivindicacao} onChange={handleChange} rows="8" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                <HelpBox text="Comece pela reivindicação independente (núcleo da proteção) e, em seguida, escreva as dependentes com características adicionais de forma clara e sem ambiguidades." />
                            </div>
                        )}

                        {activeTab === 'desenhos' && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <p className="text-sm text-slate-700 text-center">
                                    Esta seção gera apenas o documento base com a numeração das figuras. Você deve exportar o documento para o Word (DOCX) e colar suas imagens diretamente no arquivo final antes de submeter.
                                </p>
                            </div>
                        )}

                        {activeTab === 'resumo' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Título da Invenção</label>
                                    <p className="text-xs text-slate-500 mb-2">Deve ser idêntico ao informado no Relatório Descritivo.</p>
                                    <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Repita exatamente o mesmo título usado no Relatório Descritivo para manter consistência formal do pedido." />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Resumo (50 a 200 palavras)</label>
                                    <textarea name="resumo" value={formData.resumo} onChange={handleChange} rows="6" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    <HelpBox text="Escreva um único parágrafo técnico com objetivo, solução e principal aplicação da invenção, sem linguagem promocional e sem reivindicações." />
                                </div>
                            </>
                        )}
                    </form>
                </div>

                <div className="flex flex-col h-full lg:h-auto">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <h2 className="text-xl font-bold text-slate-800">Pré-visualização</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                            >
                                {copiedText ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
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

                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-inner border border-slate-300 flex-grow overflow-y-auto font-serif text-sm text-slate-700 whitespace-pre-wrap leading-relaxed h-[400px]">
                        {generateCurrentText()}
                    </div>

                    <div className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 flex items-start gap-2">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span><strong>Dica e-Patentes 4.0:</strong> Clique em "Gerar DOCX" para baixar este documento formatado corretamente e pronto para submissão ou para a inserção das imagens (no caso dos Desenhos).</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DocumentosObrigatorios() {
    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Documentos Técnicos para o Pedido de Patente</h2>
            <p className="text-slate-500 mb-6">Todo pedido de patente (PI ou MU) deve conter os quatro documentos abaixo, em arquivos separados, nos formatos DOCX ou PDF.</p>

            <div className="space-y-8">
                <div className="border-l-4 border-emerald-500 pl-5">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <FileText className="w-6 h-6 text-emerald-600" /> 1. Relatório Descritivo
                    </h3>
                    <p className="text-slate-600 mt-2">Descreve a invenção de forma clara e completa, permitindo a reprodução por um técnico no assunto. Deve conter:</p>
                    <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1 ml-4">
                        <li>Campo da invenção (setor técnico)</li>
                        <li>Fundamentos da invenção / estado da técnica</li>
                        <li>Problema técnico e solução proposta</li>
                        <li>Descrição detalhada (materiais, dimensões, funcionamento)</li>
                        <li>Exemplos de concretização (se houver)</li>
                        <li>Breve descrição dos desenhos (quando houver)</li>
                    </ul>
                    <p className="text-sm text-slate-500 mt-2">Use o <strong>Gerador de Documentos</strong> desta ferramenta para estruturar seu relatório.</p>
                </div>

                <div className="border-l-4 border-emerald-500 pl-5">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <FileText className="w-6 h-6 text-emerald-600" /> 2. Quadro Reivindicatório
                    </h3>
                    <p className="text-slate-600 mt-2">Define o escopo de proteção legal. As reivindicações delimitam o que você quer proteger. Devem ser claras, concisas e apoiadas no relatório descritivo.</p>
                    <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1 ml-4">
                        <li><strong>Reivindicação independente:</strong> define a essência da invenção (formato: "preâmbulo" + "caracterizado por" + matéria pleiteada).</li>
                        <li><strong>Reivindicações dependentes:</strong> acrescentam características adicionais.</li>
                        <li><strong>Numeração sequencial</strong> e redação em um único período.</li>
                    </ul>
                </div>

                <div className="border-l-4 border-emerald-500 pl-5">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <FileText className="w-6 h-6 text-emerald-600" /> 3. Resumo
                    </h3>
                    <p className="text-slate-600 mt-2">Um parágrafo de 50 a 200 palavras que serve para divulgação da invenção. Deve indicar o título, o setor técnico e a principal característica da invenção. <strong>Não deve conter reivindicações</strong> nem ser usado para interpretação do escopo.</p>
                </div>

                <div className="border-l-4 border-emerald-500 pl-5">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <FileText className="w-6 h-6 text-emerald-600" /> 4. Desenhos (se houver)
                    </h3>
                    <p className="text-slate-600 mt-2">Ilustrações técnicas (figuras, gráficos, fluxogramas) necessárias para o entendimento da invenção. Devem ser numeradas sequencialmente (Figura 1, Figura 2...), com legendas claras.</p>
                    <p className="text-sm text-slate-500 mt-2">Se a invenção não precisar de desenhos, você pode declarar "não se aplica" no campo correspondente.</p>
                </div>
            </div>

            <div className="mt-8 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-2"><Download className="w-5 h-5 text-emerald-600" /> Como enviar no e-Patentes 4.0</h3>
                <ol className="list-decimal list-inside text-slate-600 space-y-1 ml-4">
                    <li>Acesse o <strong>sistema e-Patentes</strong> com seu login.</li>
                    <li>Informe o número da GRU já paga (código 200).</li>
                    <li>Preencha o formulário eletrônico (dados do depositante, inventor, classificação).</li>
                    <li>Na seção "Documentos", anexe cada um dos 4 arquivos (Relatório, Reivindicações, Resumo, Desenhos) em <strong>DOCX ou PDF</strong>.</li>
                    <li>Confirme e envie. Guarde o comprovante de protocolo.</li>
                </ol>
                <p className="text-sm text-emerald-700 mt-3 bg-emerald-50 p-2 rounded">✨ <strong>Novidade:</strong> O novo sistema aceita DOCX e fará validação automática de erros formais em breve. Prefira DOCX!</p>
            </div>
        </div>
    );
}

function ChecklistSidebar() {
    const [tasks, setTasks] = useState([
        { id: 1, text: 'Definir título e categoria (PI ou MU)', done: false },
        { id: 2, text: 'Realizar busca de anterioridade no BuscaWeb (várias palavras-chave)', done: false },
        { id: 3, text: 'Identificar se há direito a desconto (ensino, MEI, etc.)', done: false },
        { id: 4, text: 'Cadastrar-se como Cliente no e-INPI (login/senha)', done: false },
        { id: 5, text: 'Emitir e pagar GRU código 200 (depósito) – anotar número', done: false },
        { id: 6, text: 'Redigir Relatório Descritivo (usar o Gerador de Documentos)', done: false },
        { id: 7, text: 'Redigir Quadro Reivindicatório (usar o Gerador)', done: false },
        { id: 8, text: 'Redigir Resumo (usar o Gerador)', done: false },
        { id: 9, text: 'Preparar Desenhos (se houver), numerar figuras', done: false },
        { id: 10, text: 'Salvar os 4 documentos em arquivos separados (DOCX ou PDF)', done: false },
        { id: 11, text: 'Acessar e-Patentes, inserir GRU e preencher formulário', done: false },
        { id: 12, text: 'Anexar os 4 documentos e enviar', done: false },
        { id: 13, text: 'Baixar comprovante de depósito (protocolo)', done: false },
        { id: 14, text: 'Cadastrar número do pedido para acompanhamento', done: false },
        { id: 15, text: 'Acompanhar a RPI semanalmente (exame formal e mérito)', done: false },
        { id: 16, text: 'Solicitar exame técnico (GRU 203) dentro de 36 meses', done: false },
        { id: 17, text: 'Pagar anuidades a partir do 2º ano (códigos 210/211)', done: false }
    ]);

    const toggleTask = (id) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const completed = tasks.filter(t => t.done).length;
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
                <div className="bg-emerald-600 h-2 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${task.done ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'}`}
                    >
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border ${task.done ? 'bg-emerald-600 border-emerald-600' : 'border-slate-400'}`}>
                            {task.done && <CheckSquare className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm text-slate-700 ${task.done ? 'line-through text-slate-500' : ''}`}>
                            {task.text}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800">
                    <strong>Atenção aos prazos:</strong> Anuidades vencem no último dia do mês do depósito. Exame técnico tem prazo fatal de 36 meses. Acompanhe a RPI todas as terças-feiras.
                </div>
            </div>
        </div>
    );
}