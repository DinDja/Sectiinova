import React, { useMemo, useState } from 'react';
import { 
    BookOpen, Target, User, Users, Map as MapIcon, Database, 
    CheckCircle, Calendar, Clock, Lightbulb, AlertCircle, 
    ArrowRight, Plus, ExternalLink, GraduationCap, Download,
    FileText, Sparkles, LayoutDashboard, Flag 
} from 'lucide-react';

// --- MOCKS E STUBS DE DEPENDÊNCIAS EXTERNAS ---
const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getLattesAreas = (person) => person?.lattes_areas || [];
const getLattesEducation = (person) => person?.lattes_education || [];
const getLattesSummary = (person) => person?.lattes_summary || person?.resumo_lattes || null;
const getLattesUpdatedAt = (person) => person?.lattes_updated_at || null;
const SEC_LOGO_PATH = '/images/Secti_Vertical.png';

const normalizeText = (value, fallback = 'Nao informado') => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text || fallback;
};

const slugifyFileName = (value, fallback = 'documento') => {
    const normalized = normalizeText(value, fallback)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || fallback;
};

const extractProjectImages = (project) => {
    const candidates = [];

    if (Array.isArray(project?.imagens)) {
        candidates.push(...project.imagens);
    }

    if (typeof project?.imagem === 'string') {
        candidates.push(project.imagem);
    }

    return [...new Set(candidates.map((item) => String(item || '').trim()).filter(Boolean))];
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

const toPdfImageDataUrl = async (source) => {
    const normalizedSource = String(source || '').trim();
    if (!normalizedSource) return '';

    if (/^data:image\//i.test(normalizedSource)) {
        return normalizedSource;
    }

    const response = await fetch(normalizedSource, { mode: 'cors' });
    if (!response.ok) {
        throw new Error(`Falha ao carregar imagem (${response.status}).`);
    }

    const blob = await response.blob();
    return blobToDataUrl(blob);
};

const getPdfImageFormat = (dataUrl) => {
    if (/^data:image\/png/i.test(String(dataUrl || ''))) {
        return 'PNG';
    }

    return 'JPEG';
};

const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto">
        {Icon && (
            <div className="w-24 h-24 bg-yellow-300 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] rounded-2xl flex items-center justify-center mb-8 transform -rotate-3">
                <Icon className="w-12 h-12 text-slate-900 stroke-[2.5]" />
            </div>
        )}
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">{title}</h3>
        <p className="text-lg font-bold text-slate-700">{description}</p>
    </div>
);

// --- COMPONENTES SECUNDÁRIOS ---
const MentorBadge = ({ person, getLattesLink }) => {
    const lattesLink = getLattesLink(person);
    const summary = getLattesSummary(person);
    const updatedAt = getLattesUpdatedAt(person);
    const areas = getLattesAreas(person).slice(0, 3);
    const education = getLattesEducation(person).slice(0, 2);
    
    return (
        <article className="group relative min-w-[280px] flex-1 rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[6px_6px_0px_0px_#0f172a] hover:shadow-[10px_10px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 overflow-hidden">
            <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-pink-400 border-2 border-slate-900 text-xl font-black text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] group-hover:bg-yellow-300 transition-colors duration-300">
                        {getInitials(person.nome)}
                    </div>
                    <div>
                        <h5 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">{person.nome}</h5>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mt-1 bg-slate-100 border-2 border-slate-900 inline-block px-2 py-0.5 shadow-[2px_2px_0px_0px_#0f172a]">
                            {person.perfil || 'Mentoria'}
                        </p>
                    </div>
                </div>
                {lattesLink ? (
                    <a 
                        href={lattesLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex shrink-0 items-center justify-center w-10 h-10 rounded-xl border-2 border-slate-900 bg-blue-400 text-slate-900 transition-all hover:bg-yellow-300 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a]" 
                        title="Abrir Lattes"
                    >
                        <ExternalLink className="h-5 w-5 stroke-[2.5]" />
                    </a>
                ) : (
                    <span className="rounded-lg border-2 border-slate-900 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500 shadow-[2px_2px_0px_0px_#0f172a]">Sem link</span>
                )}
            </div>

            {(summary || updatedAt || areas.length > 0 || education.length > 0) && (
                <div className="mt-6 space-y-4 relative z-10 border-t-4 border-slate-900 pt-6 border-dashed">
                    {summary && (
                        <div className="rounded-xl bg-[#FAFAFA] border-2 border-slate-900 p-4 text-xs leading-relaxed text-slate-800 font-bold shadow-[2px_2px_0px_0px_#0f172a]">
                            <div className="mb-2 flex items-center gap-2 font-black uppercase tracking-widest text-slate-900 text-[10px]">
                                <FileText className="h-4 w-4 stroke-[2.5]" /> Resumo
                            </div>
                            <p className="line-clamp-3">{summary}</p>
                        </div>
                    )}

                    {areas.length > 0 && (
                        <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-900">Áreas de atuação</p>
                            <div className="flex flex-wrap gap-2">
                                {areas.map((area) => (
                                    <span key={area} className="rounded-md border-2 border-slate-900 bg-teal-400 px-2.5 py-1 text-[10px] font-black text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] uppercase">
                                        {area}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {education.length > 0 && (
                        <div className="bg-slate-100 border-2 border-slate-900 rounded-xl p-4 shadow-[2px_2px_0px_0px_#0f172a]">
                            <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-900">
                                <GraduationCap className="h-4 w-4 stroke-[2.5]" /> Formação Principal
                            </p>
                            <div className="space-y-2 text-xs font-bold text-slate-800">
                                {education.map((item) => (
                                    <p key={item} className="flex items-start gap-2">
                                        <span className="text-pink-500 font-black mt-0.5">*</span> {item}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {updatedAt && (
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 inline-block px-2 py-1 border border-slate-300 rounded-md">
                            Atualizado: {updatedAt}
                        </div>
                    )}
                </div>
            )}
        </article>
    );
};

const DiaryEntryCard = ({ entry }) => (
    <div className="group relative bg-[#FAFAFA] border-4 border-slate-900 rounded-[2rem] shadow-[8px_8px_0px_0px_#0f172a] hover:shadow-[12px_12px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 overflow-hidden w-full">
        
        {/* Header do Cartão de Diário */}
        <div className="bg-yellow-300 border-b-4 border-slate-900 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-3">{entry.title}</h4>
                <div className="flex flex-wrap items-center text-xs font-black text-slate-900 gap-3 uppercase">
                    <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                        <Calendar className="w-4 h-4 stroke-[2.5]" /> {entry.date}
                    </span>
                    <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                        <Clock className="w-4 h-4 stroke-[2.5]" /> {entry.duration}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#cbd5e1]">
                        <User className="w-4 h-4 stroke-[2.5]" /> {entry.author}
                    </span>
                </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-pink-400 text-slate-900 border-4 border-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] shrink-0 transform rotate-2">
                <Flag className="w-4 h-4 stroke-[3]" /> {entry.stage}
            </div>
        </div>

        {/* Corpo do Cartão de Diário */}
        <div className="p-6 sm:p-8 space-y-6">
            {entry.images?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {entry.images.map((imageSrc, index) => (
                        <img
                            key={index}
                            src={imageSrc}
                            alt={`Foto do diário ${index + 1}`}
                            className="h-52 w-full rounded-[2rem] border-4 border-slate-900 object-cover shadow-[4px_4px_0px_0px_#0f172a]"
                        />
                    ))}
                </div>
            )}
            
            <div className="bg-teal-400 border-4 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#0f172a]">
                <h5 className="flex items-center text-sm font-black text-slate-900 uppercase tracking-widest mb-3">
                    <CheckCircle className="w-5 h-5 mr-3 stroke-[3]" /> O que foi construído?
                </h5>
                <p className="text-slate-900 text-base leading-relaxed font-bold bg-white p-4 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a]">
                    {entry.whatWasDone}
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-400 p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                    <h5 className="flex items-center text-sm font-black text-slate-900 uppercase tracking-widest mb-3">
                        <Lightbulb className="w-5 h-5 mr-3 stroke-[3]" /> Principais Descobertas
                    </h5>
                    <p className="text-slate-900 text-sm leading-relaxed font-bold bg-white p-4 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a]">
                        {entry.discoveries}
                    </p>
                </div>
                <div className="bg-orange-400 p-6 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
                    <h5 className="flex items-center text-sm font-black text-slate-900 uppercase tracking-widest mb-3">
                        <AlertCircle className="w-5 h-5 mr-3 stroke-[3]" /> Gestão de Obstáculos
                    </h5>
                    <p className="text-slate-900 text-sm leading-relaxed font-bold bg-white p-4 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#0f172a]">
                        {entry.obstacles}
                    </p>
                </div>
            </div>
            
            <div className="pt-8 border-t-4 border-slate-900 border-dashed flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 bg-slate-100 p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] w-full">
                    <h5 className="flex items-center text-sm font-black text-slate-900 uppercase tracking-widest mb-3">
                        <ArrowRight className="w-5 h-5 mr-3 stroke-[3]" /> Próximos Passos
                    </h5>
                    <p className="text-slate-800 text-sm font-bold bg-white p-3 border-2 border-slate-900 rounded-lg shadow-inner">
                        {entry.nextSteps}
                    </p>
                </div>

                {entry.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 md:justify-end shrink-0 w-full md:w-auto">
                        {entry.tags.map((tag) => (
                            <span key={tag} className="bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function DiaryBoard({
    selectedProject,
    selectedClub,
    selectedSchool,
    selectedTeam,
    derivedDiaryEntries = [],
    canViewDiary = false,
    canEditDiary,
    setIsModalOpen,
    getInvestigatorDisplayNames = () => [],
    getLattesLink = () => ''
}) {
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [pdfExportError, setPdfExportError] = useState('');
    
    const uniqueMentors = useMemo(() => {
        if (!selectedTeam) return [];
        const combined = [...(selectedTeam.orientadores || []), ...(selectedTeam.coorientadores || [])];
        return combined.filter((person, index, arr) => arr.findIndex((item) => item.id === person.id) === index);
    }, [selectedTeam]);

    const investigatorNames = useMemo(() => {
        return getInvestigatorDisplayNames(selectedProject, selectedTeam, derivedDiaryEntries).join(', ');
    }, [getInvestigatorDisplayNames, selectedProject, selectedTeam, derivedDiaryEntries]);

    const clubLogoUrl = useMemo(() => {
        return String(selectedClub?.logo_url || selectedClub?.logo || '').trim();
    }, [selectedClub]);

    const projectImageUrls = useMemo(() => {
        return extractProjectImages(selectedProject);
    }, [selectedProject]);

    const diaryEntriesForExport = useMemo(() => {
        const nonSummaryEntries = derivedDiaryEntries.filter((entry) => !String(entry?.id || '').endsWith('-summary'));
        return nonSummaryEntries.length > 0 ? nonSummaryEntries : derivedDiaryEntries;
    }, [derivedDiaryEntries]);

const handleExportProjectDiaryPdf = async () => {
        if (isExportingPdf) return;

        setIsExportingPdf(true);
        setPdfExportError('');

        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            // Margem aumentada para padrão editorial (15mm)
            const margin = 15; 
            const contentWidth = pageWidth - (margin * 2);
            let cursorY = margin;

            // Paleta Institucional (Padrão Gov Bahia / SEC)
            const colors = {
                baBlue: [14, 61, 137],     // Azul institucional escuro
                baRed: [226, 24, 54],      // Vermelho baiano (destaque)
                textMain: [30, 41, 59],    // Slate 800 (Títulos e labels)
                textMuted: [71, 85, 105],  // Slate 600 (Corpo de texto)
                border: [203, 213, 225],   // Slate 300 (Linhas divisórias)
                bgLight: [248, 250, 252]   // Slate 50 (Fundo de cards)
            };

            const safeLoadImage = async (source) => {
                try {
                    return await toPdfImageDataUrl(source);
                } catch (error) {
                    console.warn('Imagem ignorada na exportacao PDF:', error);
                    return '';
                }
            };

            const addNewPage = () => {
                doc.addPage();
                cursorY = margin + 5; // Respiro maior no topo de novas páginas
                
                // Barra de topo institucional em todas as páginas
                doc.setFillColor(...colors.baRed);
                doc.rect(0, 0, pageWidth, 3, 'F');
            };

            const ensureSpace = (heightNeeded = 20) => {
                if (cursorY + heightNeeded > pageHeight - margin - 15) { // -15 reserva espaço pro rodapé
                    addNewPage();
                }
            };

            // Título de Seção Padrão Relatório Executivo
            const addSectionTitle = (title) => {
                ensureSpace(18);
                doc.setFillColor(...colors.baBlue);
                doc.rect(margin, cursorY, 2, 7, 'F'); // Barra lateral de destaque
                
                doc.setTextColor(...colors.baBlue);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text(title.toUpperCase(), margin + 5, cursorY + 5.5);
                
                // Linha fina abaixo do título
                doc.setDrawColor(...colors.border);
                doc.setLineWidth(0.2);
                doc.line(margin, cursorY + 9, pageWidth - margin, cursorY + 9);
                
                cursorY += 16;
            };

            const addParagraph = (title, body, bodyFallback = 'Não informado') => {
                const resolvedBody = normalizeText(body, bodyFallback);
                ensureSpace(14);

                doc.setTextColor(...colors.textMain);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(title + ':', margin, cursorY);

                doc.setTextColor(...colors.textMuted);
                doc.setFont('helvetica', 'normal');
                
                // Indentação e quebra do texto
                const textIndent = margin + doc.getTextWidth(title + ': ') + 1;
                const availableTextWidth = contentWidth - (textIndent - margin);
                
                const lines = doc.splitTextToSize(resolvedBody, availableTextWidth);
                const lineHeight = 4.5;
                const blockHeight = (lines.length * lineHeight);
                
                ensureSpace(blockHeight);
                doc.text(lines, textIndent, cursorY);
                cursorY += Math.max(blockHeight + 3, 7); // Avança com respiro
            };

            const addImageWithinBox = (imageData, x, y, width, height) => {
                if (!imageData) return;
                try {
                    const props = doc.getImageProperties(imageData);
                    const ratio = Math.min(width / props.width, height / props.height);
                    const renderWidth = Math.max(1, props.width * ratio);
                    const renderHeight = Math.max(1, props.height * ratio);
                    const renderX = x + ((width - renderWidth) / 2);
                    const renderY = y + ((height - renderHeight) / 2);

                    doc.addImage(
                        imageData,
                        getPdfImageFormat(imageData),
                        renderX, renderY, renderWidth, renderHeight, undefined, 'FAST'
                    );
                } catch (error) {
                    console.warn('Falha ao desenhar imagem:', error);
                }
            };

            const addImageGallery = (title, images = []) => {
                const filteredImages = images.filter(Boolean);
                if (filteredImages.length === 0) return;

                addSectionTitle(title);
                const gap = 5;
                const imageBoxWidth = (contentWidth - gap) / 2;
                const imageBoxHeight = 55;

                for (let i = 0; i < filteredImages.length; i += 2) {
                    ensureSpace(imageBoxHeight + 8);

                    const leftImage = filteredImages[i];
                    const rightImage = filteredImages[i + 1];

                    doc.setDrawColor(...colors.border);
                    doc.setLineWidth(0.3);
                    
                    doc.roundedRect(margin, cursorY, imageBoxWidth, imageBoxHeight, 1, 1, 'S');
                    addImageWithinBox(leftImage, margin + 1.5, cursorY + 1.5, imageBoxWidth - 3, imageBoxHeight - 3);

                    if (rightImage) {
                        const rightX = margin + imageBoxWidth + gap;
                        doc.roundedRect(rightX, cursorY, imageBoxWidth, imageBoxHeight, 1, 1, 'S');
                        addImageWithinBox(rightImage, rightX + 1.5, cursorY + 1.5, imageBoxWidth - 3, imageBoxHeight - 3);
                    }

                    cursorY += imageBoxHeight + 6;
                }
            };

            // --- CARREGAMENTO DE DADOS ---
            const [secLogoDataUrl, clubLogoDataUrl] = await Promise.all([
                safeLoadImage(SEC_LOGO_PATH),
                safeLoadImage(clubLogoUrl)
            ]);

            const loadedProjectImages = [];
            for (const imageUrl of projectImageUrls.slice(0, 20)) {
                const imageData = await safeLoadImage(imageUrl);
                if (imageData) loadedProjectImages.push(imageData);
            }

            const diaryImagesByEntry = new Map();
            for (const entry of diaryEntriesForExport) {
                const loadedImages = [];
                const entryImages = Array.isArray(entry?.images) ? entry.images : [];
                for (const imageUrl of entryImages.slice(0, 8)) {
                    const imageData = await safeLoadImage(imageUrl);
                    if (imageData) loadedImages.push(imageData);
                }
                diaryImagesByEntry.set(String(entry?.id || ''), loadedImages);
            }

            // --- HEADER INSTITUCIONAL ---
            // Barra vermelha no topo
            doc.setFillColor(...colors.baRed);
            doc.rect(0, 0, pageWidth, 3, 'F');
            
            cursorY += 5;

            if (secLogoDataUrl) {
                addImageWithinBox(secLogoDataUrl, margin, cursorY, 30, 18);
            }
            if (clubLogoDataUrl) {
                addImageWithinBox(clubLogoDataUrl, pageWidth - margin - 18, cursorY, 18, 18);
            }

            doc.setTextColor(...colors.baBlue);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('Relatório Integrado', margin + 35, cursorY + 6);
            
            doc.setTextColor(...colors.textMuted);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text('Projeto de Investigação e Diário de Bordo', margin + 35, cursorY + 12);
            doc.text(normalizeText(selectedClub?.nome, 'Clube não identificado'), margin + 35, cursorY + 17);
            
            cursorY += 24;
            
            // Linha divisória do header
            doc.setDrawColor(...colors.border);
            doc.setLineWidth(0.5);
            doc.line(margin, cursorY, pageWidth - margin, cursorY);
            cursorY += 8;

            // --- CORPO DO DOCUMENTO ---
            addSectionTitle('Resumo do Projeto');
            addParagraph('Título', selectedProject?.titulo, 'Projeto sem título');
            addParagraph('Área Temática', selectedProject?.area_tematica || selectedProject?.tipo, 'Área não informada');
            addParagraph('Status', selectedProject?.status, 'Status não informado');
            addParagraph('Unidade Escolar', selectedSchool?.nome, 'Unidade não informada');
            addParagraph('Equipe Investigadora', investigatorNames, 'Equipe em formação');
            
            // Para introdução e descrição, deixamos bloco de texto inteiro em vez de inline
            const addTextBlock = (title, body) => {
                ensureSpace(20);
                doc.setTextColor(...colors.textMain);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(title + ':', margin, cursorY);
                cursorY += 5;
                
                doc.setTextColor(...colors.textMuted);
                doc.setFont('helvetica', 'normal');
                const lines = doc.splitTextToSize(normalizeText(body, 'Sem registro.'), contentWidth);
                const blockHeight = lines.length * 4.5;
                ensureSpace(blockHeight + 5);
                doc.text(lines, margin, cursorY);
                cursorY += blockHeight + 6;
            };

            addTextBlock('Introdução', selectedProject?.introducao);
            addTextBlock('Descrição', selectedProject?.descricao);

            addImageGallery('Galeria do Projeto', loadedProjectImages);

            // --- DIÁRIO DE BORDO ---
            addSectionTitle(`Diário de Bordo (${diaryEntriesForExport.length} registros)`);

            if (diaryEntriesForExport.length === 0) {
                addTextBlock('Registros', 'Ainda não há registros no diário para este projeto.');
            } else {
                diaryEntriesForExport.forEach((entry, index) => {
                    ensureSpace(40);

                    // Fundo leve para separar cada registro do diário
                    doc.setFillColor(...colors.bgLight);
                    doc.setDrawColor(...colors.border);
                    doc.setLineWidth(0.2);
                    doc.roundedRect(margin, cursorY, contentWidth, 16, 1, 1, 'FD');
                    
                    // Barra azul esquerda do card
                    doc.setFillColor(...colors.baBlue);
                    doc.path([
                        {op: 'm', c: [margin, cursorY + 1]},
                        {op: 'l', c: [margin + 1.5, cursorY]},
                        {op: 'l', c: [margin + 1.5, cursorY + 16]},
                        {op: 'l', c: [margin, cursorY + 15]}
                    ]);
                    doc.rect(margin, cursorY, 1.5, 16, 'F');

                    doc.setTextColor(...colors.textMain);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    const entryTitle = normalizeText(entry?.title, `Registro ${index + 1}`);
                    doc.text(`Registro #${index + 1} — ${entryTitle}`, margin + 4, cursorY + 6);

                    // Metadados em formato tabular limpo
                    doc.setTextColor(...colors.textMuted);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8.5);
                    
                    const col1 = `Data: ${normalizeText(entry?.date, '--')}    |    Duração: ${normalizeText(entry?.duration, '--')}`;
                    const col2 = `Etapa: ${normalizeText(entry?.stage, '--')}`;
                    const col3 = `Autor: ${normalizeText(entry?.author, '--')}`;
                    
                    doc.text(col1, margin + 4, cursorY + 10.5);
                    doc.text(col2, margin + 4, cursorY + 14);
                    doc.text(col3, margin + contentWidth / 2, cursorY + 14);

                    cursorY += 22;

                    addTextBlock('O que foi construído', entry?.whatWasDone);
                    addTextBlock('Descobertas', entry?.discoveries);
                    addTextBlock('Obstáculos', entry?.obstacles);
                    addTextBlock('Próximos passos', entry?.nextSteps);

                    const tags = Array.isArray(entry?.tags) ? entry.tags.filter(Boolean).join(', ') : '';
                    if (tags) {
                        addParagraph('Tags', tags);
                    }

                    const entryImages = diaryImagesByEntry.get(String(entry?.id || '')) || [];
                    if (entryImages.length > 0) {
                        addImageGallery(`Anexos do Registro #${index + 1}`, entryImages);
                    }

                    // Espaço extra entre registros
                    cursorY += 8; 
                });
            }

            // --- RODAPÉ OFICIAL (TODAS AS PÁGINAS) ---
            const totalPages = doc.getNumberOfPages();
            const dateStr = new Date().toLocaleDateString('pt-BR');
            
            for (let page = 1; page <= totalPages; page += 1) {
                doc.setPage(page);
                
                // Linha do rodapé
                doc.setDrawColor(...colors.border);
                doc.setLineWidth(0.3);
                doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(...colors.textMuted);
                
                // Texto Oficial à esquerda
                doc.text('Governo do Estado da Bahia — Secretaria da Educação', margin, pageHeight - 7);
                // Data de geração no meio
                doc.text(`Gerado em: ${dateStr}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
                // Paginação à direita
                doc.setFont('helvetica', 'bold');
                doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
            }

            const fileName = `relatorio-integrado-${slugifyFileName(selectedProject?.titulo, 'projeto')}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Erro ao exportar PDF do projeto e diario:', error);
            setPdfExportError('Não foi possível gerar o PDF agora. Verifique se as imagens do projeto/diário estão carregadas e tente novamente.');
        } finally {
            setIsExportingPdf(false);
        }
    };

    if (!selectedProject) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center p-10 bg-[#FAFAFA] rounded-[3rem] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] relative overflow-hidden mt-6">
                <div className="relative z-10 text-center">
                    <EmptyState 
                        icon={LayoutDashboard} 
                        title="Nenhum projeto selecionado"
                        description="Diário de Bordo Indisponível. Selecione um projeto no Radar para acessar suas documentações, descobertas e próximos passos." 
                    />
                </div>
            </div>
        );
    }

    if (!canViewDiary) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center p-10 bg-red-400 rounded-[3rem] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] relative overflow-hidden mt-6">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=')] opacity-20"></div>
                <div className="relative z-10 text-center bg-white p-12 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] transform ">
                    <EmptyState
                        icon={BookOpen}
                        title="Acesso Restrito"
                        description="Somente integrantes vinculados ao projeto podem visualizar o Diário de Bordo."
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 mx-auto font-sans text-slate-900 max-w-7xl pt-8 pb-20">
            
            {/* Header do Projeto */}
            <section className="relative overflow-hidden bg-blue-300 border-4 border-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-[16px_16px_0px_0px_#0f172a]">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=')] opacity-10"></div>
                
                <div className="relative z-10">
                    <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-2">
                            <Target className="w-5 h-5 stroke-[3] text-slate-900" /> 
                            <span className="text-xs font-black tracking-widest uppercase text-slate-900">
                                {selectedClub?.nome || 'Clube não identificado'}
                            </span>
                        </div>
                        <span className="bg-yellow-300 border-4 border-slate-900 text-slate-900 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] transform ">
                            {selectedProject.area_tematica || selectedProject.tipo || 'Área não informada'}
                        </span>
                    </header>

                    <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9] mb-8 bg-white/80 backdrop-blur-sm inline-block p-4 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a]">
                        {selectedProject.titulo || 'Projeto em Desenvolvimento'}
                    </h2>
                    
                    <div className="bg-white rounded-3xl p-8 border-4 border-slate-900 mb-10 max-w-4xl shadow-[8px_8px_0px_0px_#0f172a]">
                        <div className="flex items-center gap-3 mb-4 text-slate-900 font-black uppercase tracking-widest text-sm border-b-4 border-slate-900 pb-4">
                            <Sparkles className="w-6 h-6 stroke-[3] text-teal-500" /> Escopo do Projeto
                        </div>
                        <div className="space-y-4 text-slate-800 font-bold leading-relaxed text-base">
                            {selectedProject.introducao && <p>{selectedProject.introducao}</p>}
                            {selectedProject.descricao && <p>{selectedProject.descricao}</p>}
                            {!(selectedProject.introducao || selectedProject.descricao) && (
                                <p className="italic text-slate-500 bg-slate-100 p-4 border-2 border-dashed border-slate-300 rounded-xl">A documentação descritiva deste projeto ainda não foi inserida no sistema.</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                        <div className="bg-pink-400 border-4 border-slate-900 rounded-2xl p-5 flex flex-col justify-center shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all transform ">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2 flex items-center gap-2 bg-white px-2 py-1 border-2 border-slate-900 w-max"><MapIcon className="w-4 h-4 stroke-[3]"/> Unidade</span>
                            <span className="text-base font-black text-slate-900 line-clamp-2 uppercase">{selectedSchool?.nome || 'Não informada'}</span>
                        </div>
                        <div className="bg-teal-400 border-4 border-slate-900 rounded-2xl p-5 flex flex-col justify-center shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all transform -">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2 flex items-center gap-2 bg-white px-2 py-1 border-2 border-slate-900 w-max"><Database className="w-4 h-4 stroke-[3]"/> Status</span>
                            <span className="text-base font-black text-slate-900 flex items-center gap-2 uppercase">
                                <span className="w-3 h-3 rounded-full bg-slate-900 border-2 border-white animate-pulse"></span> {selectedProject.status || 'Não informado'}
                            </span>
                        </div>
                        <div className="bg-white border-4 border-slate-900 rounded-2xl p-5 flex flex-col justify-center shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all md:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2 flex items-center gap-2 bg-yellow-300 px-2 py-1 border-2 border-slate-900 w-max"><Users className="w-4 h-4 stroke-[3]"/> Força Investigadora</span>
                            <span className="text-base font-black text-slate-900 line-clamp-2 uppercase">{investigatorNames || 'Equipe em formação'}</span>
                        </div>
                    </div>

                    {selectedProject.imagens?.length > 0 && (
                        <div className="mb-10 pt-8 border-t-4 border-slate-900 border-dashed">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">Evidências Visuais</h4>
                            <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
                                {selectedProject.imagens.map((img, index) => (
                                    <div key={index} className="shrink-0 w-[280px] h-[200px] border-4 border-slate-900 rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_#0f172a] bg-white group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] transition-all">
                                        <img src={img} alt={`Evidência ${index + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {uniqueMentors.length > 0 && (
                        <div className="pt-8 border-t-4 border-slate-900 border-dashed">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3 bg-white inline-block px-4 py-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform ">
                                <GraduationCap className="w-6 h-6 stroke-[3] text-blue-500" /> Equipe de Orientação
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pt-4">
                                {uniqueMentors.map((person) => (
                                    <MentorBadge key={person.id} person={person} getLattesLink={getLattesLink} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* SEÇÃO DO DIÁRIO DE BORDO */}
            <section className="bg-[#FAFAFA] rounded-[3rem] p-8 md:p-12 border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-8 mb-16 border-b-4 border-slate-900 pb-8">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-4 bg-teal-400 border-2 border-slate-900"></div>
                            <h3 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Diário de Bordo</h3>
                        </div>
                        {!canEditDiary && (
                            <p className="text-base font-bold text-slate-600 max-w-xl bg-white p-3 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">Modo leitura ativado. Somente a equipe vinculada ao projeto possui credenciais para documentar novos avanços.</p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleExportProjectDiaryPdf}
                            disabled={isExportingPdf}
                            className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-slate-900 border-4 border-slate-900 text-white font-black text-sm uppercase tracking-widest shadow-[6px_6px_0px_0px_#0f172a] hover:bg-slate-700 hover:shadow-[10px_10px_0px_0px_#0f172a] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:shadow-[6px_6px_0px_0px_#0f172a] shrink-0"
                        >
                            <Download className="w-5 h-5 stroke-[3]" />
                            {isExportingPdf ? 'Gerando PDF...' : 'Baixar PDF Projeto + Diario'}
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            disabled={!canEditDiary}
                            className="inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-teal-400 border-4 border-slate-900 text-slate-900 font-black text-base uppercase tracking-widest shadow-[6px_6px_0px_0px_#0f172a] hover:shadow-[10px_10px_0px_0px_#0f172a] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[6px_6px_0px_0px_#0f172a] shrink-0 transform -"
                        >
                            <Plus className="w-6 h-6 stroke-[3]" /> Novo Registro
                        </button>
                    </div>
                </div>

                {pdfExportError && (
                    <div className="mb-8 rounded-2xl border-4 border-red-700 bg-red-100 px-5 py-4 text-sm font-black text-red-800 uppercase tracking-wider shadow-[4px_4px_0px_0px_#7f1d1d]">
                        {pdfExportError}
                    </div>
                )}

                <div className="space-y-8">
                    {derivedDiaryEntries.length === 0 ? (
                        <div className="bg-white border-4 border-dashed border-slate-900 rounded-[2.5rem] p-16 text-center shadow-[8px_8px_0px_0px_#0f172a]">
                            <EmptyState 
                                icon={BookOpen} 
                                title="Diário em Branco" 
                                description="O sistema organizou os metadados do projeto. Registre o primeiro encontro para iniciar a linha do tempo de descobertas." 
                            />
                        </div>
                    ) : (
                        <div className="relative border-l-8 border-slate-900 ml-4 md:ml-10 space-y-16 pb-10">
                            {derivedDiaryEntries.map((entry) => (
                                <div key={entry.id} className="group relative pl-8 md:pl-12">
                                    
                                    {/* Ponto da Timeline Neo-Brutalista */}
                                    <div className="absolute -left-[20px] top-8 w-8 h-8 rounded-full bg-yellow-300 border-4 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] z-10 transition-transform duration-300 group-hover:scale-125 group-hover:bg-teal-400"></div>
                                    
                                    <DiaryEntryCard entry={entry} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}