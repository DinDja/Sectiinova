import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, FileText, UploadCloud, Users, X, Check } from 'lucide-react';
import { CLUB_REQUIRED_DOCUMENTS } from '../../constants/appConstants';

// --- MOCKS E STUBS DE DEPENDÊNCIAS EXTERNAS ---
const getUserSchoolIds = (user) => {
    if (!user) return [];
    const ids = new Set();
    if (user.escola_id) ids.add(String(user.escola_id));
    if (Array.isArray(user.escolas_ids)) {
        user.escolas_ids.forEach(id => ids.add(String(id)));
    }
    return Array.from(ids);
};

const normalizeIdList = (list) => {
    if (!Array.isArray(list)) return [];
    return [...new Set(list.map(item => String(item).trim()).filter(Boolean))];
};

const normalizePerfil = (perfil) => String(perfil || '').trim().toLowerCase();

const STUDENT_PROFILES = new Set(['estudante', 'investigador', 'aluno']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const resolveSchoolId = (school) => String(school?.escola_id || school?.id || '').trim();

const isLocalhostEnvironment = () => {
    if (typeof window === 'undefined') return false;
    return LOCAL_HOSTNAMES.has(String(window.location?.hostname || '').toLowerCase());
};

const normalizeSchoolName = (value) => String(value || '').trim().toLowerCase();
const isFileLike = (value) => typeof File !== 'undefined' && value instanceof File;
const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    if (!isFileLike(file)) {
        resolve('');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nao foi possivel processar o documento selecionado.'));
    reader.readAsDataURL(file);
});

// --- COMPONENTE PRINCIPAL ---
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
                if (!active) return;

                setLiveSchoolUsers([]);
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
            setError('O clube precisa de no mínimo 10 clubistas.');
            return;
        }

        if (!isLocalhost) {
            const missingDocs = CLUB_REQUIRED_DOCUMENTS.filter((doc) => !isFileLike(documents[doc.key]));
            if (missingDocs.length > 0) {
                setError(`Anexe todos os documentos obrigatórios. Faltando: ${missingDocs.map((doc) => doc.label).join(', ')}.`);
                return;
            }
        }

        try {
            const encodedDocuments = {};

            for (const requiredDocument of CLUB_REQUIRED_DOCUMENTS) {
                const file = documents?.[requiredDocument.key];
                if (!isFileLike(file)) {
                    continue;
                }

                const dataUrl = await readFileAsDataUrl(file);
                if (!dataUrl) {
                    throw new Error(`Nao foi possivel processar o documento: ${requiredDocument.label}.`);
                }

                encodedDocuments[requiredDocument.key] = {
                    key: requiredDocument.key,
                    label: requiredDocument.label,
                    nome_arquivo: String(file.name || '').trim(),
                    content_type: String(file.type || 'application/octet-stream'),
                    tamanho_bytes: Number(file.size || 0),
                    data_url: dataUrl,
                    uploaded_at: new Date().toISOString(),
                };
            }

            await onSubmit?.({
                nome,
                descricao,
                escola_id: escolaId,
                escola_nome: selectedSchool?.nome || '',
                periodicidade: String(form.periodicidade || 'Quinzenal').trim() || 'Quinzenal',
                clubistas_ids: clubistasIds,
                documentos: encodedDocuments,
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

    const inputClasses = "w-full rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all placeholder:text-slate-400";
    const labelClasses = "text-xs font-black uppercase tracking-widest text-slate-900 mb-2 block";

    const modalContent = (
        <div className="fixed inset-0 z-30 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            
            {/* INJEÇÃO DE CSS DA SCROLLBAR */}
            <style>{`
                .neo-scrollbar::-webkit-scrollbar { width: 8px; }
                .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
            `}</style>

            <div className="w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl bg-[#FAFAFA] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] overflow-hidden animate-in zoom-in-[0.97] duration-200">
                
                {/* HEADER NEO-BRUTALISTA */}
                <div className="flex items-center justify-between px-8 py-6 border-b-4 border-slate-900 bg-yellow-300">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <Building2 className="w-8 h-8 stroke-[3]" /> Criar Clube de Ciências
                        </h2>
                        <p className="text-sm font-bold text-slate-800 mt-2 bg-white inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                            {isLocalhost
                                ? 'MODO LOCALHOST: SEM REGRAS RÍGIDAS'
                                : 'REGRAS: 1 MENTOR RESPONSÁVEL E MÍNIMO 10 CLUBISTAS.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:bg-slate-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center shrink-0"
                        aria-label="Fechar formulário de criação de clube"
                    >
                        <X className="w-6 h-6 stroke-[3]" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto neo-scrollbar p-8">
                    <form id="create-club-form" onSubmit={handleSubmit} className="space-y-10">
                        
                        {/* INFORMAÇÕES BÁSICAS */}
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>Nome do clube *</label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={(event) => updateField('nome', event.target.value)}
                                    placeholder="Ex.: Clube de Ciências da UEE X"
                                    className={inputClasses}
                                    maxLength={140}
                                    required
                                />
                            </div>

                            <div>
                                <label className={labelClasses}>Unidade escolar *</label>
                                <select
                                    value={form.escola_id}
                                    onChange={(event) => updateField('escola_id', event.target.value)}
                                    className={`${inputClasses} appearance-none cursor-pointer`}
                                    required
                                >
                                    <option value="" disabled>Selecione a Unidade Escolar</option>
                                    {mentorSchoolOptions.map((school) => (
                                        <option key={resolveSchoolId(school)} value={resolveSchoolId(school)}>
                                            {school.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>Periodicidade de encontros</label>
                                <input
                                    type="text"
                                    value={form.periodicidade}
                                    onChange={(event) => updateField('periodicidade', event.target.value)}
                                    className={inputClasses}
                                    placeholder="Ex: Quinzenal"
                                    maxLength={60}
                                />
                            </div>

                            <div className="rounded-2xl border-4 border-slate-900 bg-cyan-300 p-5 shadow-[6px_6px_0px_0px_#0f172a]">
                                <p className="text-[10px] font-black tracking-widest uppercase text-slate-900 mb-3 bg-white inline-block px-2 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transform -rotate-1">
                                    Mentor Responsável
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center text-xl font-black shrink-0">
                                        {String(loggedUser?.nome || '?').trim().slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{loggedUser?.nome || 'Mentor'}</p>
                                        <p className="text-xs font-bold text-slate-800 mt-1">{loggedUser?.email || ''}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div>
                            <label className={labelClasses}>Descrição do Clube *</label>
                            <textarea
                                value={form.descricao}
                                onChange={(event) => updateField('descricao', event.target.value)}
                                rows={4}
                                placeholder="Descreva os principais objetivos, linhas de pesquisa e o contexto do clube."
                                className={`${inputClasses} resize-none`}
                                required
                            />
                        </div>

                        {/* LISTA DE CLUBISTAS (ESTILO NEO-BRUTALISTA) */}
                        <section className="rounded-3xl border-4 border-slate-900 p-6 bg-blue-300 shadow-[8px_8px_0px_0px_#0f172a]">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                                    <Users className="w-7 h-7 stroke-[3]" />
                                    {isLocalhost ? 'Vincular Clubistas' : 'Clubistas (Mínimo 10)'}
                                </h3>
                                <span className={`text-sm font-black px-4 py-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] ${isLocalhost ? 'bg-white text-slate-900' : selectedClubistas.length >= 10 ? 'bg-teal-400 text-slate-900' : 'bg-red-400 text-white'}`}>
                                    {isLocalhost ? `${selectedClubistas.length} selecionados` : `${selectedClubistas.length} de 10 obrigatórios`}
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
                                        Nenhum estudante elegível encontrado para a unidade selecionada.
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

                        {/* DOCUMENTOS OBRIGATÓRIOS */}
                        <section className="rounded-3xl border-4 border-slate-900 p-6 bg-pink-300 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter mb-6">
                                <FileText className="w-7 h-7 stroke-[3]" />
                                {isLocalhost ? 'Documentos (Opcional)' : 'Documentos Obrigatórios'}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CLUB_REQUIRED_DOCUMENTS.map((doc) => (
                                    <div
                                        key={doc.key}
                                        className="rounded-2xl border-2 border-slate-900 p-5 bg-white shadow-[4px_4px_0px_0px_#0f172a] flex flex-col justify-between"
                                    >
                                        <span className="block text-sm font-black text-slate-900 mb-4 uppercase">{doc.label}</span>
                                        <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 border-2 border-slate-900 text-xs font-black text-slate-900 uppercase tracking-widest cursor-pointer hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all">
                                            <UploadCloud className="w-5 h-5 stroke-[3]" />
                                            <span>{documents[doc.key] ? 'SUBSTITUIR' : 'ANEXAR ARQUIVO'}</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.odt,.rtf,.png,.jpg,.jpeg,.webp"
                                                onChange={(event) => onFileChange(doc.key, event.target.files?.[0] || null)}
                                                required={!isLocalhost}
                                            />
                                        </label>
                                        {documents[doc.key] && (
                                            <p className="text-[10px] font-bold text-slate-600 mt-3 truncate bg-slate-100 p-2 border border-slate-900 rounded-lg">
                                                {documents[doc.key].name}
                                            </p>
                                        )}
                                    </div>
                                ))}
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
                        form="create-club-form"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-slate-900 bg-teal-400 text-slate-900 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <Building2 className="w-5 h-5 stroke-[3]" />
                        {isSubmitting ? 'CRIANDO...' : 'CRIAR CLUBE OFICIAL'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}
