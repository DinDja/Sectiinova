import React, { useEffect, useMemo, useState } from 'react';
import { Building2, FileText, UploadCloud, Users, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '../../../firebase';
import { CLUB_REQUIRED_DOCUMENTS } from '../../constants/appConstants';
import { getUserSchoolIds, normalizeIdList, normalizePerfil } from '../../services/projectService';

const STUDENT_PROFILES = new Set(['estudante', 'investigador', 'aluno']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const resolveSchoolId = (school) => String(school?.escola_id || school?.id || '').trim();

const isLocalhostEnvironment = () => {
    if (typeof window === 'undefined') return false;
    return LOCAL_HOSTNAMES.has(String(window.location?.hostname || '').toLowerCase());
};

const normalizeSchoolName = (value) => String(value || '').trim().toLowerCase();

export default function CreateClubForm({
    isOpen,
    onClose,
    loggedUser,
    schools = [],
    users = [],
    isSubmitting = false,
    onSubmit
}) {
    const mentorSchoolIds = useMemo(() => getUserSchoolIds(loggedUser), [loggedUser]);
    const mentorSchoolName = useMemo(() => normalizeSchoolName(loggedUser?.escola_nome), [loggedUser?.escola_nome]);
    const mentorSchoolOptions = useMemo(() => {
        if (mentorSchoolIds.length === 0) {
            return schools;
        }

        const allowed = new Set(mentorSchoolIds.map((id) => String(id || '').trim()));
        const scopedSchools = schools.filter((school) => {
            const schoolId = resolveSchoolId(school);
            const schoolName = normalizeSchoolName(school?.nome);
            return allowed.has(schoolId) || (mentorSchoolName && schoolName === mentorSchoolName);
        });
        return scopedSchools.length > 0 ? scopedSchools : schools;
    }, [mentorSchoolIds, mentorSchoolName, schools]);

    const [form, setForm] = useState({
        nome: '',
        descricao: '',
        escola_id: '',
        periodicidade: 'Quinzenal'
    });
    const [membersSearch, setMembersSearch] = useState('');
    const [selectedClubistas, setSelectedClubistas] = useState([]);
    const [documents, setDocuments] = useState({});
    const [error, setError] = useState('');
    const [liveSchoolUsers, setLiveSchoolUsers] = useState([]);
    const [isRefreshingClubistas, setIsRefreshingClubistas] = useState(false);

    const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();
    const isLocalhost = isLocalhostEnvironment();

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

    useEffect(() => {
        if (!isOpen) return;

        const firstSchoolId = String(
            form.escola_id ||
            resolveSchoolId(mentorSchoolOptions[0]) ||
            '',
        ).trim();

        if (!firstSchoolId) return;

        setForm((prev) => ({
            ...prev,
            escola_id: prev.escola_id || firstSchoolId,
        }));
    }, [isOpen, mentorSchoolOptions, form.escola_id]);

    useEffect(() => {
        if (!isOpen || !form.escola_id) {
            setLiveSchoolUsers([]);
            return;
        }

        let active = true;

        const refreshSchoolUsers = async () => {
            const selectedSchoolId = String(form.escola_id || '').trim();
            if (!selectedSchoolId) {
                if (active) setLiveSchoolUsers([]);
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
                console.error('Erro ao atualizar lista de clubistas por escola:', refreshError);
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

    const availableClubistas = useMemo(() => {
        if (!form.escola_id) return [];

        const selectedSchoolId = String(form.escola_id);
        const selectedSchoolName = normalizeSchoolName(
            schools.find((school) => resolveSchoolId(school) === selectedSchoolId)?.nome
        );
        const queryText = String(membersSearch || '').trim().toLowerCase();

        return mergedUsers
            .filter((user) => {
                const userId = String(user?.id || user?.uid || '').trim();
                if (!user || !userId || userId === loggedUserId) return false;
                if (!STUDENT_PROFILES.has(normalizePerfil(user.perfil))) return false;

                const escolasIds = Array.isArray(user.escolas_ids) ? user.escolas_ids : [];
                const userSchoolIds = normalizeIdList([...escolasIds, user.escola_id]);
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
            }, [mergedUsers, form.escola_id, membersSearch, loggedUserId, schools]);

    const selectedClubistasSet = useMemo(
        () => new Set(selectedClubistas.map((id) => String(id))),
        [selectedClubistas],
    );

    const selectedSchool = useMemo(
        () => schools.find((school) => resolveSchoolId(school) === String(form.escola_id || '')) || null,
        [schools, form.escola_id],
    );

    if (!isOpen) return null;

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

    const onFileChange = (documentKey, file) => {
        setDocuments((prev) => ({
            ...prev,
            [documentKey]: file || null,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        const nome = String(form.nome || '').trim();
        const descricao = String(form.descricao || '').trim();
        const escolaId = String(form.escola_id || '').trim();
        const clubistasIds = normalizeIdList(selectedClubistas);

        if (!nome) {
            setError('Informe o nome do clube.');
            return;
        }

        if (!escolaId) {
            setError('Selecione uma unidade escolar.');
            return;
        }

        if (!isLocalhost && clubistasIds.length < 10) {
            setError('O clube precisa de no minimo 10 clubistas.');
            return;
        }

        if (!isLocalhost) {
            const missingDocs = CLUB_REQUIRED_DOCUMENTS.filter((doc) => !(documents[doc.key] instanceof File));
            if (missingDocs.length > 0) {
                setError(`Anexe todos os documentos obrigatorios. Faltando: ${missingDocs.map((doc) => doc.label).join(', ')}.`);
                return;
            }
        }

        try {
            await onSubmit?.({
                nome,
                descricao,
                escola_id: escolaId,
                escola_nome: selectedSchool?.nome || '',
                periodicidade: String(form.periodicidade || 'Quinzenal').trim() || 'Quinzenal',
                clubistas_ids: clubistasIds,
                documentos: documents,
            });

            setForm({
                nome: '',
                descricao: '',
                escola_id: resolveSchoolId(mentorSchoolOptions[0]) || '',
                periodicidade: 'Quinzenal',
            });
            setMembersSearch('');
            setSelectedClubistas([]);
            setDocuments({});
            onClose?.();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Falha ao criar clube.';
            setError(message);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Criar Clube de Ciencias</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            {isLocalhost
                                ? 'Modo localhost: sem minimo de clubistas e sem obrigatoriedade de documentos.'
                                : 'Regras aplicadas: 1 mentor responsavel e minimo de 10 clubistas.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors flex items-center justify-center"
                        aria-label="Fechar formulario de criacao de clube"
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
                                placeholder="Ex.: Clube de Ciencias da UEE X"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] outline-none"
                                maxLength={140}
                                required
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-bold text-slate-700">Unidade escolar</span>
                            <select
                                value={form.escola_id}
                                onChange={(event) => updateField('escola_id', event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] outline-none"
                                required
                            >
                                <option value="">Selecione</option>
                                {mentorSchoolOptions.map((school) => (
                                    <option key={resolveSchoolId(school)} value={resolveSchoolId(school)}>
                                        {school.nome}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-bold text-slate-700">Periodicidade minima dos encontros</span>
                            <input
                                type="text"
                                value={form.periodicidade}
                                onChange={(event) => updateField('periodicidade', event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] outline-none"
                                placeholder="Quinzenal"
                                maxLength={60}
                            />
                        </label>

                        <div className="rounded-2xl border border-[#10B981]/30 bg-[#ECFDF5] p-4">
                            <p className="text-xs font-extrabold tracking-widest uppercase text-[#047857] mb-2">Mentor responsavel</p>
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-[#10B981] text-white flex items-center justify-center text-sm font-black">
                                    {String(loggedUser?.nome || '?').trim().slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{loggedUser?.nome || 'Mentor'}</p>
                                    <p className="text-xs text-slate-600">{loggedUser?.email || ''}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-slate-700">Descricao do clube</span>
                        <textarea
                            value={form.descricao}
                            onChange={(event) => updateField('descricao', event.target.value)}
                            rows={4}
                            placeholder="Explique objetivo, linha de pesquisa e contexto do clube."
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] outline-none resize-none"
                        />
                    </label>

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
                                            checked={selectedClubistasSet.has(String(clubista.id))}
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

                    <section className="rounded-2xl border border-slate-200 p-4 bg-white">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-[#10B981]" />
                            {isLocalhost ? 'Documentos (opcionais no localhost)' : 'Documentos obrigatorios (PDF ou imagem)'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {CLUB_REQUIRED_DOCUMENTS.map((doc) => (
                                <label
                                    key={doc.key}
                                    className="rounded-xl border border-slate-200 p-3 bg-slate-50 hover:border-[#10B981]/40 transition-colors"
                                >
                                    <span className="block text-sm font-semibold text-slate-800 mb-2">{doc.label}</span>
                                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                                        <UploadCloud className="w-4 h-4 text-[#10B981]" />
                                        <span>{documents[doc.key] ? 'Substituir anexo' : 'Selecionar arquivo'}</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                                            onChange={(event) => onFileChange(doc.key, event.target.files?.[0] || null)}
                                            required={!isLocalhost}
                                        />
                                    </label>
                                    {documents[doc.key] && (
                                        <p className="text-xs text-emerald-700 mt-2 font-medium">
                                            {documents[doc.key].name}
                                        </p>
                                    )}
                                </label>
                            ))}
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
                            {isSubmitting ? 'Criando clube...' : 'Criar clube'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

