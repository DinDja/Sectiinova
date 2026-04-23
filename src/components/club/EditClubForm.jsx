import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Camera, FileText, ImagePlus, UploadCloud, Users, X, Check, Trash2, RotateCcw } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '../../../firebase';
import { getInitials } from '../../utils/helpers';
import { CLUB_REQUIRED_DOCUMENTS } from '../../constants/appConstants';
import { getUserSchoolIds, normalizeIdList, normalizePerfil } from '../../services/projectService';

const STUDENT_PROFILES = new Set(['estudante', 'investigador', 'aluno']);
const MENTOR_PROFILES = new Set(['orientador', 'coorientador']);

const normalizeSchoolName = (value) => String(value || '').trim().toLowerCase();
const normalizeIdentityValue = (value) => String(value || '').trim().toLowerCase();
const buildUserIdentityKeys = (user = {}) => {
    const keys = new Set();
    const addKey = (prefix, value) => {
        const normalized = normalizeIdentityValue(value);
        if (!normalized) return;
        keys.add(`${prefix}:${normalized}`);
    };

    addKey('uid', user?.uid);
    addKey('email', user?.email || user?.emailPrincipal || user?.email_usuario);
    addKey('matricula', user?.matricula || user?.codigo);
    addKey('id', user?.id);

    const normalizedName = normalizeIdentityValue(user?.nome);
    const normalizedSchoolId = normalizeIdentityValue(user?.escola_id);
    if (normalizedName) {
        keys.add(`nome:${normalizedName}|escola:${normalizedSchoolId}`);
    }

    return [...keys];
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const getClubBannerUrl = (club) => String(club?.banner_url || club?.banner || '').trim();
const getClubLogoUrl = (club) => String(club?.logo_url || club?.logo || '').trim();

export default function EditClubForm({
    isOpen,
    onClose,
    viewingClub,
    loggedUser,
    schools = [],
    users = [],
    isSubmitting = false,
    onSubmit
}) {
    const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();

    const [form, setForm] = useState({
        nome: '',
        descricao: '',
        periodicidade: 'Quinzenal',
        escola_id: ''
    });
    const [membersSearch, setMembersSearch] = useState('');
    const [mentorSearch, setMentorSearch] = useState('');
    const [selectedMentors, setSelectedMentors] = useState([]);
    const [selectedClubistas, setSelectedClubistas] = useState([]);
    const [bannerFile, setBannerFile] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState('');
    const [logoPreview, setLogoPreview] = useState('');
    const [bannerWarning, setBannerWarning] = useState('');
    const [documentChanges, setDocumentChanges] = useState({});
    const [error, setError] = useState('');
    const [liveSchoolUsers, setLiveSchoolUsers] = useState([]);
    const [isRefreshingClubistas, setIsRefreshingClubistas] = useState(false);

    const mergedUsers = useMemo(() => {
        const usersById = new Map();
        const identityKeyToUserId = new Map();

        [...users, ...liveSchoolUsers].forEach((user) => {
            if (!user) return;
            const userId = String(user.id || user.uid || '').trim();
            if (!userId) return;

            const normalizedUser = {
                ...user,
                id: userId,
            };
            const identityKeys = buildUserIdentityKeys(normalizedUser);
            const existingUserId = identityKeys
                .map((key) => identityKeyToUserId.get(key))
                .find(Boolean);
            const resolvedUserId = existingUserId || userId;
            const previousUser = usersById.get(resolvedUserId) || {};

            usersById.set(resolvedUserId, {
                ...previousUser,
                ...normalizedUser,
                id: resolvedUserId,
            });

            identityKeys.forEach((key) => identityKeyToUserId.set(key, resolvedUserId));
            identityKeyToUserId.set(`id:${normalizeIdentityValue(userId)}`, resolvedUserId);
        });

        return [...usersById.values()];
    }, [users, liveSchoolUsers]);

    const selectedSchool = useMemo(() => {
        const selectedSchoolId = String(form.escola_id || '').trim();
        return schools.find((school) => String(school?.id || school?.escola_id || '').trim() === selectedSchoolId) || null;
    }, [schools, form.escola_id]);

    const mentorSchoolIds = useMemo(() => getUserSchoolIds(loggedUser), [loggedUser]);

    const availableMentors = useMemo(() => {
        if (!form.escola_id) return [];

        const selectedSchoolId = String(form.escola_id || '').trim();
        const selectedSchoolName = normalizeSchoolName(selectedSchool?.nome);
        const queryText = String(mentorSearch || '').trim().toLowerCase();
        const selectedMentorIds = new Set(selectedMentors.map((id) => String(id || '').trim()));

        return mergedUsers
            .filter((user) => {
                const userId = String(user?.id || user?.uid || '').trim();
                if (!user || !userId || userId === loggedUserId) return false;
                if (!MENTOR_PROFILES.has(normalizePerfil(user.perfil))) return false;

                const userSchoolIds = normalizeIdList([...(user?.escolas_ids || []), user?.escola_id]);
                const hasSchoolIdMatch = userSchoolIds.includes(selectedSchoolId);
                const hasSchoolNameMatch = selectedSchoolName
                    && normalizeSchoolName(user?.escola_nome) === selectedSchoolName;
                const isSelected = selectedMentorIds.has(userId);
                if (!hasSchoolIdMatch && !hasSchoolNameMatch && !isSelected) return false;

                if (!queryText) return true;

                const text = [
                    user.nome,
                    user.email,
                    user.matricula,
                ]
                    .map((value) => String(value || '').toLowerCase())
                    .join(' ');

                return text.includes(queryText);
            })
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    }, [form.escola_id, selectedSchool?.nome, mentorSearch, mergedUsers, selectedMentors, loggedUserId]);

    const availableClubistas = useMemo(() => {
        if (!form.escola_id) return [];

        const selectedSchoolId = String(form.escola_id || '').trim();
        const selectedSchoolName = normalizeSchoolName(selectedSchool?.nome);
        const queryText = String(membersSearch || '').trim().toLowerCase();

        return mergedUsers
            .filter((user) => {
                const userId = String(user?.id || user?.uid || '').trim();
                if (!user || !userId || userId === loggedUserId) return false;
                if (!STUDENT_PROFILES.has(normalizePerfil(user.perfil))) return false;

                const userSchoolIds = normalizeIdList([...(user?.escolas_ids || []), user?.escola_id]);
                const hasSchoolIdMatch = userSchoolIds.includes(selectedSchoolId);
                const hasSchoolNameMatch = selectedSchoolName
                    && normalizeSchoolName(user?.escola_nome) === selectedSchoolName;
                if (!hasSchoolIdMatch && !hasSchoolNameMatch) return false;

                if (!queryText) return true;

                const text = [
                    user.nome,
                    user.email,
                    user.matricula,
                ]
                    .map((value) => String(value || '').toLowerCase())
                    .join(' ');

                return text.includes(queryText);
            })
            .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    }, [form.escola_id, selectedSchool?.nome, membersSearch, mergedUsers, loggedUserId]);

    const selectedClubistasSet = useMemo(
        () => new Set(selectedClubistas.map((id) => String(id || '').trim())),
        [selectedClubistas]
    );

    const selectedMentorsSet = useMemo(
        () => new Set(selectedMentors.map((id) => String(id || '').trim())),
        [selectedMentors]
    );

    useEffect(() => {
        if (!isOpen || !viewingClub) return;

        const schoolId = String(viewingClub?.escola_id || '').trim();
        const normalizedSchoolIds = normalizeIdList([schoolId, ...mentorSchoolIds]);

        if (mentorSchoolIds.length > 0 && schoolId && !mentorSchoolIds.includes(schoolId)) {
            setError('Este clube pertence a uma unidade fora das suas vinculações escolares.');
        } else {
            setError('');
        }

        setForm({
            nome: String(viewingClub?.nome || '').trim(),
            descricao: String(viewingClub?.descricao || '').trim(),
            periodicidade: String(viewingClub?.periodicidade || 'Quinzenal').trim() || 'Quinzenal',
            escola_id: normalizedSchoolIds[0] || schoolId
        });

        setSelectedMentors(
            normalizeIdList([
                ...(viewingClub?.coorientador_ids || []),
                ...(viewingClub?.coorientadores_ids || [])
            ]).filter((id) => id !== loggedUserId)
        );
        setSelectedClubistas(normalizeIdList(viewingClub?.clubistas_ids || []));
        setMentorSearch('');
        setMembersSearch('');
        setBannerFile(null);
        setLogoFile(null);
        setBannerPreview(getClubBannerUrl(viewingClub));
        setLogoPreview(getClubLogoUrl(viewingClub));
        setBannerWarning('');
        setDocumentChanges({});
    }, [isOpen, viewingClub, mentorSchoolIds, loggedUserId]);

    useEffect(() => {
        if (!isOpen || !form.escola_id) {
            setLiveSchoolUsers([]);
            return;
        }

        let active = true;

        const refreshSchoolUsers = async () => {
            const selectedSchoolId = String(form.escola_id || '').trim();
            if (!selectedSchoolId) {
                if (active) {
                    setLiveSchoolUsers([]);
                }
                return;
            }

            setIsRefreshingClubistas(true);

            try {
                const usuariosRef = collection(db, 'usuarios');
                const [byPrimarySchool, bySchoolArray] = await Promise.all([
                    getDocs(query(usuariosRef, where('escola_id', '==', selectedSchoolId))),
                    getDocs(query(usuariosRef, where('escolas_ids', 'array-contains', selectedSchoolId))),
                ]);

                if (!active) return;

                const usersById = new Map();
                [...byPrimarySchool.docs, ...bySchoolArray.docs].forEach((docSnap) => {
                    usersById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
                });

                setLiveSchoolUsers([...usersById.values()]);
            } catch (refreshError) {
                console.error('Erro ao atualizar lista de clubistas na edicao:', refreshError);
            } finally {
                if (active) {
                    setIsRefreshingClubistas(false);
                }
            }
        };

        void refreshSchoolUsers();

        return () => {
            active = false;
        };
    }, [isOpen, form.escola_id]);

    if (!isOpen || !viewingClub) return null;

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const toggleClubista = (userId) => {
        const normalizedId = String(userId || '').trim();
        if (!normalizedId) return;

        setSelectedClubistas((prev) => {
            if (prev.includes(normalizedId)) {
                return prev.filter((id) => id !== normalizedId);
            }
            return [...prev, normalizedId];
        });
    };

    const toggleMentor = (userId) => {
        const normalizedId = String(userId || '').trim();
        if (!normalizedId) return;

        setSelectedMentors((prev) => {
            if (prev.includes(normalizedId)) {
                return prev.filter((id) => id !== normalizedId);
            }
            return [...prev, normalizedId];
        });
    };

    const handleBannerChange = async (file) => {
        setBannerFile(file || null);
        setBannerWarning('');

        if (!file) {
            setBannerPreview(getClubBannerUrl(viewingClub));
            return;
        }

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > 1) {
            setBannerWarning('A imagem do banner está maior que 1MB e será comprimida automaticamente antes de salvar.');
        }

        try {
            const preview = await readFileAsDataUrl(file);
            setBannerPreview(preview);
        } catch (readError) {
            console.error('Falha ao carregar preview do banner:', readError);
            setBannerPreview(getClubBannerUrl(viewingClub));
        }
    };

    const handleLogoChange = async (file) => {
        setLogoFile(file || null);

        if (!file) {
            setLogoPreview(getClubLogoUrl(viewingClub));
            return;
        }

        try {
            const preview = await readFileAsDataUrl(file);
            setLogoPreview(preview);
        } catch (readError) {
            console.error('Falha ao carregar preview da logo:', readError);
            setLogoPreview(getClubLogoUrl(viewingClub));
        }
    };

    const resolveExistingDocumentData = (documentKey) => {
        const rawDocument = viewingClub?.documentos?.[documentKey];
        const url = typeof rawDocument === 'string'
            ? String(rawDocument || '').trim()
            : String(
                rawDocument?.data_url
                || rawDocument?.dataUrl
                || rawDocument?.url
                || rawDocument?.base64
                || ''
            ).trim();
        const storageMode = String(rawDocument?.storage_mode || rawDocument?.storageMode || '').trim();
        const chunkCount = Math.max(0, Number(rawDocument?.chunk_count || rawDocument?.chunkCount || 0));
        const fileName = typeof rawDocument === 'string'
            ? ''
            : String(
                rawDocument?.nome_arquivo
                || rawDocument?.file_name
                || rawDocument?.name
                || ''
            ).trim();

        return {
            hasDocument: Boolean(url) || storageMode === 'firestore_chunks' || chunkCount > 0,
            url,
            fileName,
        };
    };

    const handleDocumentFileChange = (documentKey, file) => {
        setDocumentChanges((prev) => {
            const next = { ...prev };
            if (!file) {
                delete next[documentKey];
                return next;
            }

            next[documentKey] = file;
            return next;
        });
    };

    const handleMarkDocumentForRemoval = (documentKey) => {
        setDocumentChanges((prev) => ({
            ...prev,
            [documentKey]: null,
        }));
    };

    const handleResetDocumentChange = (documentKey) => {
        setDocumentChanges((prev) => {
            const next = { ...prev };
            delete next[documentKey];
            return next;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        const nome = String(form.nome || '').trim();
        const descricao = String(form.descricao || '').trim();
        const periodicidade = String(form.periodicidade || 'Quinzenal').trim() || 'Quinzenal';
        const coorientadoresIds = normalizeIdList(selectedMentors);
        const clubistasIds = normalizeIdList(selectedClubistas);

        if (!nome) {
            setError('Informe o nome do clube.');
            return;
        }

        try {
            await onSubmit?.({
                clube_id: viewingClub.id,
                nome,
                descricao,
                periodicidade,
                coorientador_ids: coorientadoresIds,
                clubistas_ids: clubistasIds,
                banner_file: bannerFile,
                logo_file: logoFile,
                documentos: documentChanges
            });

            onClose?.();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Falha ao atualizar clube.';
            setError(message);
        }
    };

    const inputClasses = "w-full rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all placeholder:text-slate-400";
    const labelClasses = "text-xs font-black uppercase tracking-widest text-slate-900 mb-2 block";
    const sectionTitleClasses = "text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3";

    const modalContent = (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            {/* INJEÇÃO DE CSS DA SCROLLBAR */}
            <style>{`
                .neo-scrollbar::-webkit-scrollbar { width: 8px; }
                .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
            `}</style>

            <div className="w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl bg-[#FAFAFA] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] overflow-hidden animate-in zoom-in-[0.97] duration-200">
                
                {/* HEADER NEO-BRUTALISTA */}
                <div className="flex items-center justify-between px-8 py-6 border-b-4 border-slate-900 bg-blue-300">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <Building2 className="w-8 h-8 stroke-[3]" /> Editar Clube
                        </h2>
                        <p className="text-sm font-bold text-slate-900 mt-2 bg-white inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transform -rotate-1">
                            Atualize nome, identidade visual e equipe de mentores e clubistas.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:bg-slate-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center shrink-0"
                        aria-label="Fechar formulário de edição do clube"
                    >
                        <X className="w-6 h-6 stroke-[3]" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto neo-scrollbar p-8">
                    <form id="edit-club-form" onSubmit={handleSubmit} className="space-y-10">
                        
                        {/* INFORMAÇÕES BÁSICAS */}
                        <section className="rounded-3xl border-4 border-slate-900 p-6 bg-cyan-300 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className={sectionTitleClasses}>
                                <FileText className="w-7 h-7 stroke-[3]" /> Informações Básicas
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className={labelClasses}>Nome do clube *</label>
                                    <input
                                        type="text"
                                        value={form.nome}
                                        onChange={(event) => updateField('nome', event.target.value)}
                                        className={inputClasses}
                                        maxLength={140}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className={labelClasses}>Periodicidade mínima dos encontros</label>
                                    <input
                                        type="text"
                                        value={form.periodicidade}
                                        onChange={(event) => updateField('periodicidade', event.target.value)}
                                        className={inputClasses}
                                        maxLength={60}
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className={labelClasses}>Unidade escolar *</label>
                                <input
                                    type="text"
                                    value={selectedSchool?.nome || viewingClub?.escola_nome || 'Não informada'}
                                    readOnly
                                    className="w-full rounded-xl border-2 border-slate-900 bg-slate-200 px-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className={labelClasses}>Descrição do clube *</label>
                                <textarea
                                    value={form.descricao}
                                    onChange={(event) => updateField('descricao', event.target.value)}
                                    rows={4}
                                    className={`${inputClasses} resize-none`}
                                    required
                                />
                            </div>
                        </section>

                        {/* IDENTIDADE VISUAL */}
                        <section className="rounded-3xl border-4 border-slate-900 p-6 bg-pink-300 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className={sectionTitleClasses}>
                                <ImagePlus className="w-7 h-7 stroke-[3]" /> Identidade Visual
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Banner */}
                                <div className="rounded-2xl border-4 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_#0f172a] flex flex-col">
                                    <p className={labelClasses}>Banner do Header</p>
                                    <div className="aspect-[16/7] rounded-xl overflow-hidden border-2 border-slate-900 bg-slate-100 mb-4 shadow-[2px_2px_0px_0px_#0f172a]">
                                        {bannerPreview ? (
                                            <img src={bannerPreview} alt="Preview do banner" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-200" />
                                        )}
                                    </div>

                                    <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 border-2 border-slate-900 text-xs font-black text-slate-900 uppercase tracking-widest cursor-pointer hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all">
                                        <UploadCloud className="w-5 h-5 stroke-[3]" />
                                        <span>{bannerFile ? 'Trocar banner' : 'Selecionar banner'}</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/png,image/jpeg,image/jpg,image/webp"
                                            onChange={(event) => void handleBannerChange(event.target.files?.[0] || null)}
                                        />
                                    </label>
                                    {bannerFile && (
                                        <p className="text-[10px] font-bold text-slate-600 mt-3 truncate bg-slate-100 p-2 border border-slate-900 rounded-lg">
                                            {bannerFile.name}
                                        </p>
                                    )}
                                    {bannerWarning && (
                                        <p className="text-[10px] font-bold text-slate-900 bg-yellow-300 p-2 border-2 border-slate-900 rounded-lg mt-3 transform -rotate-1 shadow-[2px_2px_0px_0px_#0f172a]">
                                            ! {bannerWarning}
                                        </p>
                                    )}
                                </div>

                                {/* Logo */}
                                <div className="rounded-2xl border-4 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_0px_#0f172a] flex flex-col">
                                    <p className={labelClasses}>Logo do Clube</p>
                                    <div className="h-[170px] rounded-xl border-2 border-slate-900 bg-slate-100 mb-4 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center">
                                        <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] bg-white flex items-center justify-center">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Preview da logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl font-black text-slate-600">{getInitials(viewingClub?.nome)}</span>
                                            )}
                                        </div>
                                    </div>

                                    <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 border-2 border-slate-900 text-xs font-black text-slate-900 uppercase tracking-widest cursor-pointer hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all">
                                        <Camera className="w-5 h-5 stroke-[3]" />
                                        <span>{logoFile ? 'Trocar logo' : 'Selecionar logo'}</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/png,image/jpeg,image/jpg,image/webp"
                                            onChange={(event) => void handleLogoChange(event.target.files?.[0] || null)}
                                        />
                                    </label>
                                    {logoFile && (
                                        <p className="text-[10px] font-bold text-slate-600 mt-3 truncate bg-slate-100 p-2 border border-slate-900 rounded-lg">
                                            {logoFile.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* DOCUMENTOS DE CRIACAO */}
                        <section className="rounded-3xl border-4 border-slate-900 p-6 bg-lime-300 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className={sectionTitleClasses}>
                                <FileText className="w-7 h-7 stroke-[3]" /> Documentos de Criacao
                            </h3>

                            <p className="text-xs font-black uppercase tracking-widest text-slate-900 bg-white inline-block px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] mb-6">
                                Voce pode anexar novos arquivos, substituir ou remover documentos existentes.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CLUB_REQUIRED_DOCUMENTS.map((requiredDocument) => {
                                    const existingDocument = resolveExistingDocumentData(requiredDocument.key);
                                    const hasPendingChange = Object.prototype.hasOwnProperty.call(documentChanges, requiredDocument.key);
                                    const pendingValue = hasPendingChange ? documentChanges[requiredDocument.key] : undefined;
                                    const pendingFile = pendingValue instanceof File ? pendingValue : null;
                                    const isMarkedForRemoval = hasPendingChange && pendingValue === null;
                                    const fileName = pendingFile?.name
                                        || (!isMarkedForRemoval && existingDocument.fileName)
                                        || '';

                                    return (
                                        <div
                                            key={requiredDocument.key}
                                            className={`rounded-2xl border-2 border-slate-900 p-5 shadow-[4px_4px_0px_0px_#0f172a] ${
                                                isMarkedForRemoval ? 'bg-red-200' : 'bg-white'
                                            }`}
                                        >
                                            <p className="text-sm font-black text-slate-900 uppercase mb-3">{requiredDocument.label}</p>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-3">
                                                {pendingFile
                                                    ? 'Novo arquivo selecionado'
                                                    : isMarkedForRemoval
                                                        ? 'Marcado para remover'
                                                        : existingDocument.hasDocument
                                                            ? 'Documento atual'
                                                            : 'Documento nao enviado'}
                                            </p>

                                            {fileName && (
                                                <p className="text-[10px] font-bold text-slate-700 truncate bg-slate-100 p-2 border border-slate-900 rounded-lg mb-3">
                                                    {fileName}
                                                </p>
                                            )}

                                            {!pendingFile && !isMarkedForRemoval && existingDocument.hasDocument && (
                                                <a
                                                    href={existingDocument.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-blue-300 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] mb-3"
                                                >
                                                    Ver atual
                                                </a>
                                            )}

                                            <div className="flex flex-wrap items-center gap-2">
                                                <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border-2 border-slate-900 text-[10px] font-black text-slate-900 uppercase tracking-widest cursor-pointer hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all">
                                                    <UploadCloud className="w-4 h-4 stroke-[3]" />
                                                    <span>{existingDocument.hasDocument ? 'Substituir' : 'Anexar'}</span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept=".pdf,.doc,.docx,.odt,.rtf,.png,.jpg,.jpeg,.webp"
                                                        onChange={(event) => handleDocumentFileChange(requiredDocument.key, event.target.files?.[0] || null)}
                                                    />
                                                </label>

                                                {hasPendingChange ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResetDocumentChange(requiredDocument.key)}
                                                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border-2 border-slate-900 text-[10px] font-black text-slate-900 uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all"
                                                    >
                                                        <RotateCcw className="w-4 h-4 stroke-[3]" /> Desfazer
                                                    </button>
                                                ) : (
                                                    existingDocument.hasDocument && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMarkDocumentForRemoval(requiredDocument.key)}
                                                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-300 border-2 border-slate-900 text-[10px] font-black text-slate-900 uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4 stroke-[3]" /> Remover
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* LISTA DE CO-MENTORES */}
                        <section className="rounded-3xl border-4 border-slate-900 p-6 bg-lime-300 shadow-[8px_8px_0px_0px_#0f172a]">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                                    <Users className="w-7 h-7 stroke-[3]" />
                                    Co-mentores 
                                </h3>
                                <span className="text-sm font-black px-4 py-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] bg-white text-slate-900">
                                    {`${selectedMentors.length} selecionados`}
                                </span>
                            </div>

                            <p className="text-xs font-bold text-slate-900 mb-4 bg-white/70 border-2 border-slate-900 rounded-xl px-3 py-2">
                                O mentor responsavel permanece no clube. Aqui voce pode adicionar ou remover co-mentores da unidade.
                            </p>

                            <input
                                type="text"
                                value={mentorSearch}
                                onChange={(event) => setMentorSearch(event.target.value)}
                                placeholder="FILTRAR MENTORES DA UNIDADE..."
                                className="w-full rounded-xl border-2 border-slate-900 bg-white px-4 py-4 text-sm font-black text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all uppercase placeholder:text-slate-400 mb-6"
                            />

                            <div className="max-h-52 overflow-y-auto neo-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                                {availableMentors.length === 0 ? (
                                    <p className="text-sm font-bold text-slate-800 md:col-span-2 bg-white/50 p-4 rounded-xl border-2 border-slate-900 border-dashed">
                                        Nenhum mentor elegivel encontrado para a unidade selecionada.
                                    </p>
                                ) : (
                                    availableMentors.map((mentor) => {
                                        const isSelected = selectedMentorsSet.has(String(mentor.id));
                                        return (
                                            <label
                                                key={mentor.id}
                                                className={`flex items-center gap-4 rounded-2xl border-2 border-slate-900 px-4 py-3 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] ${
                                                    isSelected ? 'bg-teal-400 shadow-[4px_4px_0px_0px_#0f172a]' : 'bg-white shadow-[2px_2px_0px_0px_#0f172a]'
                                                }`}
                                            >
                                                <div className="relative w-8 h-8 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleMentor(mentor.id)}
                                                        className="sr-only"
                                                    />
                                                    <div className={`absolute inset-0 rounded-lg border-2 border-slate-900 flex items-center justify-center transition-colors ${isSelected ? 'bg-slate-900' : 'bg-white'}`}>
                                                        {isSelected && <Check className="w-5 h-5 text-teal-400 stroke-[3]" />}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block text-sm font-black text-slate-900 uppercase truncate">{mentor.nome}</span>
                                                    <span className="block text-[10px] font-bold text-slate-700 truncate">{mentor.email || mentor.matricula || 'SEM CONTATO'}</span>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        {/* LISTA DE CLUBISTAS */}
                        <section className="rounded-3xl border-4 border-slate-900 p-6 bg-yellow-300 shadow-[8px_8px_0px_0px_#0f172a]">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                                    <Users className="w-7 h-7 stroke-[3]" />
                                    {'Clubistas'}
                                </h3>
                                <span className="text-sm font-black px-4 py-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] bg-white text-slate-900">
                                    {`${selectedClubistas.length} selecionados`}
                                </span>
                            </div>

                            <input
                                type="text"
                                value={membersSearch}
                                onChange={(event) => setMembersSearch(event.target.value)}
                                placeholder="FILTRAR CLUBISTAS DA UNIDADE..."
                                className="w-full rounded-xl border-2 border-slate-900 bg-white px-4 py-4 text-sm font-black text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all uppercase placeholder:text-slate-400 mb-6"
                            />

                            <div className="max-h-60 overflow-y-auto neo-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                                {isRefreshingClubistas && (
                                    <p className="text-sm font-black text-slate-800 md:col-span-2 bg-white/50 p-4 rounded-xl border-2 border-slate-900">
                                        ATUALIZANDO BASE DE DADOS DE ESTUDANTES...
                                    </p>
                                )}

                                {availableClubistas.length === 0 && !isRefreshingClubistas ? (
                                    <p className="text-sm font-bold text-slate-800 md:col-span-2 bg-white/50 p-4 rounded-xl border-2 border-slate-900 border-dashed">
                                        Nenhum estudante elegível encontrado.
                                    </p>
                                ) : (
                                    availableClubistas.map((clubista) => {
                                        const isSelected = selectedClubistasSet.has(String(clubista.id));
                                        return (
                                            <label
                                                key={clubista.id}
                                                className={`flex items-center gap-4 rounded-2xl border-2 border-slate-900 px-4 py-3 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] ${
                                                    isSelected ? 'bg-teal-400 shadow-[4px_4px_0px_0px_#0f172a]' : 'bg-white shadow-[2px_2px_0px_0px_#0f172a]'
                                                }`}
                                            >
                                                <div className="relative w-8 h-8 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleClubista(clubista.id)}
                                                        className="sr-only"
                                                    />
                                                    <div className={`absolute inset-0 rounded-lg border-2 border-slate-900 flex items-center justify-center transition-colors ${isSelected ? 'bg-slate-900' : 'bg-white'}`}>
                                                        {isSelected && <Check className="w-5 h-5 text-teal-400 stroke-[3]" />}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="block text-sm font-black text-slate-900 uppercase truncate">{clubista.nome}</span>
                                                    <span className="block text-[10px] font-bold text-slate-700 truncate">{clubista.email || clubista.matricula || 'SEM CONTATO'}</span>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        {error && (
                            <div className="rounded-2xl border-4 border-slate-900 bg-red-400 px-6 py-4 text-sm font-black text-slate-900 shadow-[6px_6px_0px_0px_#0f172a] uppercase flex items-center gap-3">
                                <span className="text-2xl">!</span> {error}
                            </div>
                        )}
                    </form>
                </div>

                {/* FOOTER (BOTÕES DE AÇÃO) */}
                <div className="px-8 py-6 border-t-4 border-slate-900 bg-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-slate-900 bg-white text-slate-900 font-black uppercase tracking-widest hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        form="edit-club-form"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-slate-900 bg-teal-400 text-slate-900 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <Building2 className="w-5 h-5 stroke-[3]" />
                        {isSubmitting ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}
