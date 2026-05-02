import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Map as MapIcon,
    FolderKanban,
    Users,
    BookOpen,
    Microscope,
    ExternalLink,
    GraduationCap,
    FileText,
    Building2,
    Eye,
    Clock3
} from 'lucide-react';
import EmptyState from '../shared/EmptyState';
import ModalPerfil from './ModalPerfil';
import { CLUB_REQUIRED_DOCUMENTS } from '../../constants/appConstants';
import { normalizeClubBannerMode } from '../../constants/clubBannerModes';
import { getAvatarSrc, getInitials, getLattesAreas, getLattesLink, getLattesSummary } from '../../utils/helpers';
import PioneerSealSymbol from './PioneerSealSymbol';
import { hasPioneerSeal, PIONEER_SEAL_LABEL, PIONEER_SEAL_REASON } from '../../utils/pioneerClub';

const normalizeText = (value) => String(value || '').trim();

const normalizeExternalUrl = (value) => {
    const raw = normalizeText(value);
    if (!raw) return '';
    if (raw.startsWith('data:')) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
};

const resolveClubBannerMode = (club) => normalizeClubBannerMode(club?.banner_mode || club?.banner_modo);

const getModalBannerModeConfig = (mode) => {
    if (mode === 'contain') {
        return {
            containerClass: 'bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_60%,#ffffff_100%)] p-4 md:p-6',
            frameClass: 'h-full w-full overflow-hidden rounded-[2rem] border-[2px] border-slate-900/55 bg-white/90',
            imageClass: 'h-full w-full object-contain',
            overlayClass: 'absolute inset-0 bg-gradient-to-t from-white/90 via-white/35 to-transparent'
        };
    }

    if (mode === 'focus') {
        return {
            containerClass: 'bg-slate-100',
            frameClass: 'h-full w-full overflow-hidden',
            imageClass: 'h-full w-full object-cover scale-[1.08] saturate-125 contrast-110 transition-transform duration-1000',
            overlayClass: 'absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.44)_0%,rgba(15,23,42,0.18)_40%,rgba(255,255,255,0)_100%)]'
        };
    }

    if (mode === 'poster') {
        return {
            containerClass: 'bg-[repeating-linear-gradient(130deg,#e2e8f0_0px,#e2e8f0_16px,#f8fafc_16px,#f8fafc_32px)] p-4 md:p-6',
            frameClass: 'h-full w-full overflow-hidden rounded-[2rem] border-[3px] border-slate-900 bg-white p-2 shadow-[6px_6px_0px_0px_rgba(15,23,42,0.3)]',
            imageClass: 'h-full w-full rounded-[1.1rem] border-[2px] border-slate-900/65 object-cover',
            overlayClass: 'absolute inset-0 bg-gradient-to-t from-white/75 via-white/15 to-transparent'
        };
    }

    return {
        containerClass: 'bg-slate-100',
        frameClass: 'h-full w-full overflow-hidden',
        imageClass: 'h-full w-full object-cover',
        overlayClass: 'absolute inset-0 bg-gradient-to-t from-white via-white/90 to-white/20'
    };
};


const MemberCard = ({ person, roleLabel, roleTone = 'mentor', onOpenProfile }) => {
    const summary = getLattesSummary(person);
    const areas = getLattesAreas(person).slice(0, 3);
    const lattesLink = normalizeExternalUrl(getLattesLink(person));
    const avatarSrc = getAvatarSrc(person);
    const roleToneClasses = roleTone === 'investigador'
        ? 'bg-cyan-300 text-slate-900'
        : 'bg-pink-500 text-white';

    return (
        <article
            className="rounded-[1.7rem] border-[3px] border-slate-900 bg-white p-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-3">
                <button
                    type="button"
                    onClick={() => onOpenProfile(person)}
                    className="min-w-0 flex flex-1 items-center gap-3 text-left"
                >
                    <div className={`h-14 w-14 shrink-0 overflow-hidden rounded-full border-[3px] border-slate-900 ${roleTone === 'investigador' ? 'bg-cyan-300' : 'bg-pink-400'} flex items-center justify-center`}>
                        {avatarSrc ? (
                            <img src={avatarSrc} alt={person?.nome || 'Membro do clube'} className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-sm font-black uppercase text-slate-900">
                                {getInitials(person?.nome || '')}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black uppercase tracking-wider text-slate-900">
                            {person?.nome || 'Membro sem nome'}
                        </p>
                        <span className={`mt-2 inline-flex rounded-full border-[2px] border-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${roleToneClasses}`}>
                            {roleLabel}
                        </span>
                    </div>
                </button>

                {lattesLink && (
                    <a
                        href={lattesLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-slate-900 bg-yellow-300 text-slate-900 shadow-sm transition-transform hover:scale-105 active:scale-95"
                        title="Abrir Lattes"
                    >
                        <ExternalLink className="h-4 w-4 stroke-[3]" />
                    </a>
                )}
            </div>

            {summary && (
                <p className="mt-3 line-clamp-2 text-xs font-bold leading-relaxed text-slate-600">
                    {summary}
                </p>
            )}

            {areas.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {areas.map((area) => (
                        <span
                            key={`${person?.id || person?.uid || area}-${area}`}
                            className="rounded-full border-[2px] border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600"
                        >
                            {area}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
};

export default function ModalClubView({
    isOpen,
    onClose,
    viewingClub,
    viewingClubSchool,
    viewingClubProjects = [],
    viewingClubUsers = [],
    viewingClubOrientadores = [],
    viewingClubCoorientadores = [],
    viewingClubInvestigadores = [],
    viewingClubDiaryCount = 0,
    setSelectedClubId,
    setSelectedProjectId,
    setCurrentView
}) {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    const mentorPeople = useMemo(() => {
        const byId = new Map();

        (Array.isArray(viewingClubOrientadores) ? viewingClubOrientadores : []).forEach((person) => {
            const personId = normalizeText(person?.id || person?.uid || person?.email || person?.nome);
            if (!personId) return;
            byId.set(personId, { ...person, roleLabel: 'Mentor' });
        });

        (Array.isArray(viewingClubCoorientadores) ? viewingClubCoorientadores : []).forEach((person) => {
            const personId = normalizeText(person?.id || person?.uid || person?.email || person?.nome);
            if (!personId) return;
            if (byId.has(personId)) {
                const previous = byId.get(personId);
                byId.set(personId, { ...previous, roleLabel: 'Mentor e Co-mentor' });
                return;
            }
            byId.set(personId, { ...person, roleLabel: 'Co-mentor' });
        });

        return [...byId.values()];
    }, [viewingClubCoorientadores, viewingClubOrientadores]);

    const investigatorPeople = useMemo(() => {
        const byId = new Map();
        (Array.isArray(viewingClubInvestigadores) ? viewingClubInvestigadores : []).forEach((person) => {
            const personId = normalizeText(person?.id || person?.uid || person?.email || person?.nome);
            if (!personId || byId.has(personId)) return;
            byId.set(personId, person);
        });
        return [...byId.values()];
    }, [viewingClubInvestigadores]);

    const memberCount = useMemo(() => {
        if (Array.isArray(viewingClubUsers) && viewingClubUsers.length > 0) {
            return viewingClubUsers.length;
        }
        return mentorPeople.length + investigatorPeople.length;
    }, [investigatorPeople.length, mentorPeople.length, viewingClubUsers]);

    const investigatorRatio = useMemo(() => {
        if (!memberCount) return 0;
        return Math.round((investigatorPeople.length / memberCount) * 100);
    }, [investigatorPeople.length, memberCount]);

    const clubDescription = normalizeText(viewingClub?.descricao)
        || 'Clube ativo com foco em pesquisa, ciencia, tecnologia e inovacao.';

    const schoolName = normalizeText(
        viewingClubSchool?.nome
        || viewingClub?.escola_nome
        || viewingClub?.escola
    ) || 'Unidade escolar nao vinculada';

    const schoolMeta = useMemo(() => {
        const pairs = [
            { label: 'SEC', value: normalizeText(viewingClubSchool?.cod_sec || viewingClubSchool?.sec || viewingClubSchool?.codigo_sec || viewingClub?.codigo_sec) },
            { label: 'INEP', value: normalizeText(viewingClubSchool?.cod_inep || viewingClubSchool?.inep || viewingClub?.codigo_inep) },
            { label: 'Municipio', value: normalizeText(viewingClubSchool?.municipio || viewingClub?.municipio) },
            { label: 'UF', value: normalizeText(viewingClubSchool?.uf || viewingClub?.uf) },
            { label: 'Tipo', value: normalizeText(viewingClubSchool?.tipo_unidade || viewingClub?.tipo_unidade) }
        ];
        return pairs.filter((item) => Boolean(item.value));
    }, [viewingClub, viewingClubSchool]);

    const clubDocuments = useMemo(() => {
        const source = viewingClub?.documentos && typeof viewingClub.documentos === 'object'
            ? viewingClub.documentos
            : {};

        return CLUB_REQUIRED_DOCUMENTS.map((requiredDoc) => {
            const rawDoc = source?.[requiredDoc.key];
            const url = normalizeText(
                typeof rawDoc === 'string'
                    ? rawDoc
                    : rawDoc?.data_url || rawDoc?.dataUrl || rawDoc?.url || rawDoc?.base64
            );
            const fileName = normalizeText(rawDoc?.nome_arquivo || rawDoc?.file_name || rawDoc?.name) || `${requiredDoc.key}.pdf`;
            const chunkCount = Number(rawDoc?.chunk_count || rawDoc?.chunkCount || 0);
            const isAvailable = Boolean(url) || chunkCount > 0;

            return {
                key: requiredDoc.key,
                label: requiredDoc.label,
                isAvailable,
                canOpen: Boolean(url),
                url,
                fileName,
                chunkCount: Number.isFinite(chunkCount) ? chunkCount : 0
            };
        });
    }, [viewingClub?.documentos]);

    const availableDocumentsCount = useMemo(
        () => clubDocuments.filter((documentItem) => documentItem.isAvailable).length,
        [clubDocuments]
    );

    const hasClubPioneerSeal = useMemo(() => hasPioneerSeal(viewingClub), [viewingClub]);

    const clubBannerUrl = normalizeText(viewingClub?.banner_url || viewingClub?.banner || viewingClub?.cover);
    const clubBannerMode = resolveClubBannerMode(viewingClub);
    const modalBannerModeConfig = getModalBannerModeConfig(clubBannerMode);
    const clubLogoUrl = normalizeText(viewingClub?.logo_url || viewingClub?.logo || viewingClub?.emblem);

    const shouldRender = Boolean(isOpen && viewingClub);

    const handleOpenProfile = (person) => {
        const enrichedUser = {
            ...person,
            clube: person?.clube || viewingClub?.nome || person?.clube_nome || '',
            projetosCount: person?.projetosCount ?? person?.projetos?.length ?? person?.projetos_ids?.length ?? person?.projetosIds?.length ?? 0
        };

        setSelectedUser(enrichedUser);
        setIsProfileModalOpen(true);
    };

    const handleOpenDiary = (projectId) => {
        const clubId = normalizeText(viewingClub?.id);
        const normalizedProjectId = normalizeText(projectId);
        if (!normalizedProjectId) return;

        if (typeof setSelectedClubId === 'function') {
            setSelectedClubId(clubId);
        }
        if (typeof setSelectedProjectId === 'function') {
            setSelectedProjectId(normalizedProjectId);
        }
        if (typeof setCurrentView === 'function') {
            setCurrentView('diario');
        }
        onClose();
    };

    const handleOpenDocument = (documentItem) => {
        if (!documentItem?.canOpen) return;
        const resolvedUrl = normalizeExternalUrl(documentItem.url);
        if (!resolvedUrl) return;
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    };

    if (!shouldRender) return null;

    const modalContent = (
        <>
            <style>{`
                .modal-club-scrollbar::-webkit-scrollbar { width: 9px; height: 9px; }
                .modal-club-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .modal-club-scrollbar::-webkit-scrollbar-thumb {
                    background: #0f172a;
                    border-radius: 999px;
                    border: 2px solid #f8fafc;
                }
            `}</style>

            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
                onClick={onClose}
            >
                <div
                    className="relative flex max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2.5rem] border-[4px] border-slate-900 bg-[#FAFAFA] shadow-[14px_14px_0px_0px_#0f172a]"
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-6 top-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-slate-900 bg-white text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0"
                        title="Fechar modal do clube"
                    >
                        <X className="h-6 w-6 stroke-[3]" />
                    </button>

                    <div className="modal-club-scrollbar h-full overflow-y-auto p-6 md:p-10">
                        <section className="relative overflow-hidden rounded-[2.5rem] border-[3px] border-slate-900 bg-white shadow-lg">
                            <div className={`absolute inset-0 ${modalBannerModeConfig.containerClass}`}>
                                {clubBannerUrl ? (
                                    <div className={modalBannerModeConfig.frameClass}>
                                        <img
                                            src={clubBannerUrl}
                                            alt={`Banner do clube ${viewingClub?.nome || ''}`}
                                            className={modalBannerModeConfig.imageClass}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full w-full bg-[linear-gradient(130deg,#fde047_0%,#67e8f9_52%,#f9a8d4_100%)]" />
                                )}
                                <div className={modalBannerModeConfig.overlayClass} />
                            </div>

                            <div className="relative z-10 flex min-h-[320px] flex-col justify-end gap-6 p-6 md:p-10">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="flex min-w-0 flex-1 flex-col items-start gap-5 md:flex-row md:items-end">
                                        <div className="mr-5 h-24 w-24 shrink-0 aspect-square overflow-hidden rounded-[1.8rem] border-[3px] border-slate-900 bg-white shadow-sm md:h-32 md:w-32">
                                            {clubLogoUrl ? (
                                                <img
                                                    src={clubLogoUrl}
                                                    alt={`Logo do clube ${viewingClub?.nome || ''}`}
                                                    className="h-full w-full object-contain p-2"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <span className="text-3xl font-black uppercase text-slate-900">
                                                        {getInitials(viewingClub?.nome || '')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 md:text-5xl">
                                                {viewingClub?.nome || 'Clube sem nome'}
                                            </h1>

                                            <div className="mt-4 flex flex-wrap items-center gap-2.5">
                                                <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-slate-900 bg-yellow-300 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-900">
                                                    <MapIcon className="h-4 w-4 stroke-[3]" />
                                                    {schoolName}
                                                </span>

                                                {hasClubPioneerSeal && (
                                                    <div
                                                        className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-amber-300 bg-slate-950/95 px-2 py-1.5 shadow-sm"
                                                        title={PIONEER_SEAL_REASON}
                                                    >
                                                        <PioneerSealSymbol
                                                            className="h-12 w-12 shrink-0"
                                                            title={`${PIONEER_SEAL_LABEL} - ${viewingClub?.nome || 'Clube'}`}
                                                        />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-100">
                                                            {PIONEER_SEAL_LABEL}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-[420px]">
                                        {[
                                            { icon: FolderKanban, value: viewingClubProjects.length, label: 'Projetos', color: 'bg-cyan-300' },
                                            { icon: Users, value: memberCount, label: 'Membros', color: 'bg-yellow-300' },
                                            { icon: GraduationCap, value: mentorPeople.length, label: 'Mentores', color: 'bg-pink-400 text-white' },
                                        ].map((stat) => (
                                            <article
                                                key={stat.label}
                                                className={`rounded-[1.2rem] border-[3px] border-slate-900 p-3 text-center shadow-sm ${stat.color}`}
                                            >
                                                <stat.icon className="mx-auto h-5 w-5 stroke-[3]" />
                                                <p className="mt-2 text-2xl font-black leading-none">{stat.value}</p>
                                                <p className="mt-2 text-[9px] font-black uppercase tracking-widest">{stat.label}</p>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
                            <article className="xl:col-span-5 rounded-[2.2rem] border-[3px] border-slate-900 bg-white p-6 shadow-sm md:p-8">
                                <h3 className="mb-4 flex items-center gap-3 border-b-[3px] border-slate-900 pb-4 text-2xl font-black uppercase tracking-tight text-slate-900">
                                    <BookOpen className="h-7 w-7 stroke-[2.8] text-pink-500" />
                                    Descricao do clube
                                </h3>
                                <p className="whitespace-pre-line text-sm font-bold leading-relaxed text-slate-700">
                                    {clubDescription}
                                </p>
                            </article>
                        </section>

                        <section className="mt-8 rounded-[2.2rem] border-[3px] border-slate-900 bg-white p-6 shadow-sm md:p-8">
                            <div className="mb-6 flex items-center justify-between gap-4 border-b-[3px] border-slate-900 pb-4">
                                <h3 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900">
                                    <FileText className="h-7 w-7 stroke-[2.8] text-cyan-500" />
                                    Documentos do clube
                                </h3>
                                <span className="inline-flex items-center justify-center rounded-full border-[3px] border-slate-900 bg-yellow-300 px-4 py-1.5 text-sm font-black text-slate-900">
                                    {availableDocumentsCount}/{clubDocuments.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {clubDocuments.map((documentItem) => (
                                    <article
                                        key={documentItem.key}
                                        className={`rounded-[1.4rem] border-[3px] border-slate-900 p-4 ${
                                            documentItem.isAvailable ? 'bg-cyan-50' : 'bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                                                    {documentItem.label}
                                                </p>
                                                <p className="mt-1 truncate text-[11px] font-bold text-slate-600">
                                                    {documentItem.isAvailable ? documentItem.fileName : 'Documento nao enviado'}
                                                </p>
                                                {!documentItem.canOpen && documentItem.isAvailable && (
                                                    <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-amber-700">
                                                        Disponivel apenas no painel do clube
                                                    </p>
                                                )}
                                            </div>

                                            {documentItem.canOpen ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDocument(documentItem)}
                                                    className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-sm transition-transform hover:scale-105 active:scale-95"
                                                >
                                                    <Eye className="h-3.5 w-3.5 stroke-[3]" />
                                                    Ver
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                    <Clock3 className="h-3.5 w-3.5 stroke-[3]" />
                                                    {documentItem.isAvailable ? 'No painel' : 'Pendente'}
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <article className="rounded-[2.2rem] border-[3px] border-slate-900 bg-white p-6 shadow-sm">
                                <div className="mb-5 flex items-center justify-between gap-3 border-b-[3px] border-slate-900 pb-4">
                                    <h3 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900">
                                        <GraduationCap className="h-7 w-7 stroke-[2.8] text-pink-500" />
                                        Mentores
                                    </h3>
                                    <span className="inline-flex rounded-full border-[3px] border-slate-900 bg-pink-400 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-white">
                                        {mentorPeople.length}
                                    </span>
                                </div>

                                <div className="modal-club-scrollbar max-h-[360px] space-y-3 overflow-y-auto pr-1">
                                    {mentorPeople.length === 0 ? (
                                        <div className="rounded-[1.7rem] border-[3px] border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold uppercase tracking-widest text-slate-500">
                                            Sem mentores vinculados.
                                        </div>
                                    ) : (
                                        mentorPeople.map((person) => (
                                            <MemberCard
                                                key={normalizeText(person?.id || person?.uid || person?.email || person?.nome)}
                                                person={person}
                                                roleLabel={person.roleLabel || 'Mentor'}
                                                roleTone="mentor"
                                                onOpenProfile={handleOpenProfile}
                                            />
                                        ))
                                    )}
                                </div>
                            </article>

                            <article className="rounded-[2.2rem] border-[3px] border-slate-900 bg-white p-6 shadow-sm">
                                <div className="mb-5 flex items-center justify-between gap-3 border-b-[3px] border-slate-900 pb-4">
                                    <h3 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900">
                                        <Microscope className="h-7 w-7 stroke-[2.8] text-cyan-500" />
                                        Clubistas
                                    </h3>
                                    <span className="inline-flex rounded-full border-[3px] border-slate-900 bg-cyan-300 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-slate-900">
                                        {investigatorPeople.length}
                                    </span>
                                </div>

                                <div className="modal-club-scrollbar max-h-[360px] space-y-3 overflow-y-auto pr-1">
                                    {investigatorPeople.length === 0 ? (
                                        <div className="rounded-[1.7rem] border-[3px] border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold uppercase tracking-widest text-slate-500">
                                            Nenhum clubista neste clube.
                                        </div>
                                    ) : (
                                        investigatorPeople.map((person) => (
                                            <MemberCard
                                                key={normalizeText(person?.id || person?.uid || person?.email || person?.nome)}
                                                person={person}
                                                roleLabel="Clubista"
                                                roleTone="investigador"
                                                onOpenProfile={handleOpenProfile}
                                            />
                                        ))
                                    )}
                                </div>
                            </article>
                        </section>

                        <section className="mt-8 rounded-[2.2rem] border-[3px] border-slate-900 bg-white p-6 shadow-sm md:p-8">
                            <h3 className="mb-6 flex items-center gap-3 border-b-[3px] border-slate-900 pb-4 text-2xl font-black uppercase tracking-tight text-slate-900">
                                <FolderKanban className="h-7 w-7 stroke-[2.8] text-cyan-500" />
                                Projetos do clube
                            </h3>

                            {viewingClubProjects.length === 0 ? (
                                <div className="rounded-[2rem] border-[3px] border-dashed border-slate-300 bg-slate-50 p-10">
                                    <EmptyState
                                        icon={FolderKanban}
                                        title="Nenhum projeto cadastrado"
                                        description="Este clube ainda nao possui projetos com publicacao no feed."
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {viewingClubProjects.map((project, index) => {
                                        const projectId = normalizeText(project?.id);
                                        const projectStatus = normalizeText(project?.status) || 'Em andamento';
                                        const projectImage = normalizeText(project?.imagens?.[0] || project?.imagem);
                                        const areaTematica = normalizeText(project?.area_tematica);
                                        const projectDescription = normalizeText(project?.descricao || project?.introducao)
                                            || 'Projeto aguardando descricao detalhada.';

                                        return (
                                            <article
                                                key={projectId || `project-${normalizeText(project?.titulo || 'sem-titulo')}-${index}`}
                                                className="flex min-h-[420px] flex-col overflow-hidden rounded-[1.8rem] border-[3px] border-slate-900 bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
                                            >
                                                <div className="relative h-44 border-b-[3px] border-slate-900 bg-slate-100">
                                                    {projectImage ? (
                                                        <img
                                                            src={projectImage}
                                                            alt={project?.titulo || 'Projeto do clube'}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(130deg,#fde047_0%,#67e8f9_100%)]">
                                                            <FolderKanban className="h-10 w-10 stroke-[2.5] text-slate-900" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-1 flex-col p-5">
                                                    <span className="inline-flex w-fit rounded-full border-[3px] border-slate-900 bg-yellow-300 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-900">
                                                        {projectStatus}
                                                    </span>

                                                    <h4 className="mt-4 line-clamp-2 text-xl font-black uppercase tracking-tight text-slate-900">
                                                        {project?.titulo || 'Projeto sem titulo'}
                                                    </h4>

                                                    <p className="mt-3 line-clamp-3 text-sm font-bold leading-relaxed text-slate-600">
                                                        {projectDescription}
                                                    </p>

                                                    {areaTematica && (
                                                        <span className="mt-4 inline-flex w-fit rounded-full border-[2px] border-slate-900 bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-900">
                                                            {areaTematica}
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDiary(projectId)}
                                                        className="mt-auto inline-flex w-full items-center justify-center rounded-full border-[3px] border-slate-900 bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm transition-transform hover:scale-[1.01] active:scale-95"
                                                    >
                                                        Acessar diario
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>

            <ModalPerfil
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                usuario={selectedUser}
                club={viewingClub}
                clubProjects={viewingClubProjects}
                clubUsers={viewingClubUsers}
            />
        </>
    );

    if (typeof document === 'undefined') {
        return modalContent;
    }

    return createPortal(modalContent, document.body);
}
