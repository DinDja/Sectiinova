import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Camera, ImagePlus, UploadCloud, Users, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '../../../firebase';
import { getInitials } from '../../utils/helpers';
import { getUserSchoolIds, normalizeIdList, normalizePerfil } from '../../services/projectService';

const STUDENT_PROFILES = new Set(['estudante', 'investigador', 'aluno']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const normalizeSchoolName = (value) => String(value || '').trim().toLowerCase();

const isLocalhostEnvironment = () => {
    if (typeof window === 'undefined') return false;
    return LOCAL_HOSTNAMES.has(String(window.location?.hostname || '').toLowerCase());
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
    const isLocalhost = isLocalhostEnvironment();
    const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();

    const [form, setForm] = useState({
        nome: '',
        descricao: '',
        periodicidade: 'Quinzenal',
        escola_id: ''
    });
    const [membersSearch, setMembersSearch] = useState('');
    const [selectedClubistas, setSelectedClubistas] = useState([]);
    const [bannerFile, setBannerFile] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState('');
    const [logoPreview, setLogoPreview] = useState('');
    const [bannerWarning, setBannerWarning] = useState('');
    const [error, setError] = useState('');
    const [liveSchoolUsers, setLiveSchoolUsers] = useState([]);
    const [isRefreshingClubistas, setIsRefreshingClubistas] = useState(false);

    const mergedUsers = useMemo(() => {
        const usersById = new Map();

        [...users, ...liveSchoolUsers].forEach((user) => {
            if (!user) return;
            const userId = String(user.id || user.uid || '').trim();
            if (!userId) return;

            usersById.set(userId, {
                ...user,
                id: userId,
            });
        });

        return [...usersById.values()];
    }, [users, liveSchoolUsers]);

    const selectedSchool = useMemo(() => {
        const selectedSchoolId = String(form.escola_id || '').trim();
        return schools.find((school) => String(school?.id || school?.escola_id || '').trim() === selectedSchoolId) || null;
    }, [schools, form.escola_id]);

    const mentorSchoolIds = useMemo(() => getUserSchoolIds(loggedUser), [loggedUser]);

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

        setSelectedClubistas(normalizeIdList(viewingClub?.clubistas_ids || []));
        setMembersSearch('');
        setBannerFile(null);
        setLogoFile(null);
        setBannerPreview(getClubBannerUrl(viewingClub));
        setLogoPreview(getClubLogoUrl(viewingClub));
        setBannerWarning('');
    }, [isOpen, viewingClub, mentorSchoolIds]);

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

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        const nome = String(form.nome || '').trim();
        const descricao = String(form.descricao || '').trim();
        const periodicidade = String(form.periodicidade || 'Quinzenal').trim() || 'Quinzenal';
        const clubistasIds = normalizeIdList(selectedClubistas);

        if (!nome) {
            setError('Informe o nome do clube.');
            return;
        }

        if (!isLocalhost && clubistasIds.length < 10) {
            setError('O clube precisa de no minimo 10 clubistas.');
            return;
        }

        try {
            await onSubmit?.({
                clube_id: viewingClub.id,
                nome,
                descricao,
                periodicidade,
                clubistas_ids: clubistasIds,
                banner_file: bannerFile,
                logo_file: logoFile
            });

            onClose?.();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Falha ao atualizar clube.';
            setError(message);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Editar Clube</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Atualize nome, identidade visual e equipe de clubistas.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors flex items-center justify-center"
                        aria-label="Fechar formulario de edicao do clube"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[calc(92vh-80px)] overflow-y-auto p-6 space-y-6">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-bold text-slate-700">Nome do clube</span>
                            <input
                                type="text"
                                value={form.nome}
                                onChange={(event) => updateField('nome', event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] outline-none"
                                maxLength={140}
                                required
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-bold text-slate-700">Periodicidade minima dos encontros</span>
                            <input
                                type="text"
                                value={form.periodicidade}
                                onChange={(event) => updateField('periodicidade', event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] outline-none"
                                maxLength={60}
                            />
                        </label>
                    </section>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-slate-700">Unidade escolar</span>
                        <input
                            type="text"
                            value={selectedSchool?.nome || viewingClub?.escola_nome || 'Nao informada'}
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-slate-700">Descricao do clube</span>
                        <textarea
                            value={form.descricao}
                            onChange={(event) => updateField('descricao', event.target.value)}
                            rows={4}
                            placeholder="Descreva a proposta e objetivo do clube."
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] outline-none resize-none"
                        />
                    </label>

                    <section className="rounded-2xl border border-slate-200 p-4 bg-white">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
                            <ImagePlus className="w-4 h-4 text-[#10B981]" />
                            Identidade visual do clube
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Banner do Header</p>
                                <div className="aspect-[16/7] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-3">
                                    {bannerPreview ? (
                                        <img src={bannerPreview} alt="Preview do banner" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-r from-[#10B981]/20 via-slate-200 to-[#FF5722]/20" />
                                    )}
                                </div>

                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <UploadCloud className="w-4 h-4 text-[#10B981]" />
                                    <span>{bannerFile ? 'Trocar banner' : 'Selecionar banner'}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        onChange={(event) => void handleBannerChange(event.target.files?.[0] || null)}
                                    />
                                </label>
                                {bannerFile && (
                                    <p className="text-xs text-emerald-700 mt-2 font-medium">{bannerFile.name}</p>
                                )}
                                {bannerWarning && (
                                    <p className="text-xs text-amber-700 mt-2">{bannerWarning}</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Logo do Clube</p>
                                <div className="h-[170px] rounded-xl border border-slate-200 bg-slate-100 mb-3 flex items-center justify-center">
                                    <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-white flex items-center justify-center">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview da logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-black text-slate-600">{getInitials(viewingClub?.nome)}</span>
                                        )}
                                    </div>
                                </div>

                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <Camera className="w-4 h-4 text-[#10B981]" />
                                    <span>{logoFile ? 'Trocar logo' : 'Selecionar logo'}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        onChange={(event) => void handleLogoChange(event.target.files?.[0] || null)}
                                    />
                                </label>
                                {logoFile && (
                                    <p className="text-xs text-emerald-700 mt-2 font-medium">{logoFile.name}</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#FF5722]" />
                                {isLocalhost ? 'Clubistas (sem minimo no localhost)' : 'Clubistas (minimo 10)'}
                            </h3>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${isLocalhost ? 'bg-sky-100 text-sky-700' : selectedClubistas.length >= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isLocalhost ? `${selectedClubistas.length} selecionados` : `${selectedClubistas.length}/10`}
                            </span>
                        </div>

                        <input
                            type="text"
                            value={membersSearch}
                            onChange={(event) => setMembersSearch(event.target.value)}
                            placeholder="Filtrar clubistas por nome, e-mail ou matricula"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] outline-none mb-3 bg-white"
                        />

                        <div className="max-h-52 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 pr-1">
                            {isRefreshingClubistas && (
                                <p className="text-xs text-slate-500 md:col-span-2">
                                    Atualizando lista de estudantes da unidade...
                                </p>
                            )}

                            {availableClubistas.length === 0 ? (
                                <p className="text-sm text-slate-500 md:col-span-2">
                                    Nenhum estudante elegivel encontrado para a unidade selecionada.
                                </p>
                            ) : (
                                availableClubistas.map((clubista) => (
                                    <label
                                        key={clubista.id}
                                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:border-[#10B981]/40 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedClubistasSet.has(String(clubista.id || '').trim())}
                                            onChange={() => toggleClubista(clubista.id)}
                                            className="accent-[#10B981]"
                                        />
                                        <span className="text-sm text-slate-700">
                                            <strong className="font-semibold text-slate-900">{clubista.nome}</strong>
                                            <span className="block text-xs text-slate-500">{clubista.email || clubista.matricula || 'Sem contato'}</span>
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </section>

                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#10B981]/25 transition-all"
                        >
                            <Building2 className="w-4 h-4" />
                            {isSubmitting ? 'Salvando alteracoes...' : 'Salvar alteracoes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

