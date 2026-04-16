import React, { useState, useEffect } from 'react';
import { 
    User, School, Lock, Edit2, Copy, Check, 
    LogOut, Mail, Shield, Camera, X, Phone, 
    MapPin, Calendar, Award, Star, TrendingUp, Briefcase, 
    Globe, Users, Heart, BookOpen, Link as LinkIcon, LoaderCircle, RefreshCw
} from 'lucide-react';

// --- MOCKS E STUBS DE DEPENDÊNCIAS EXTERNAS ---
// Simulação da função do serviço Lattes para evitar erros de importação no preview.
const fetchLattesPreviewByLink = async (link) => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Delay simulado
    if (!link.includes('lattes.cnpq.br/')) {
        return { success: false, message: 'Link do Lattes inválido. Certifique-se que contém lattes.cnpq.br/' };
    }
    return {
        success: true,
        data: {
            id_lattes: link.match(/(\d{16})/) ? link.match(/(\d{16})/)[1] : '0000000000000000',
            nome: 'Pesquisador Exemplo (Mock)',
            resumo: 'Este é um resumo gerado automaticamente pela simulação de importação do currículo Lattes para fins de teste de interface.',
            areas_atuacao: ['Ciência da Computação', 'Engenharia de Software', 'Educação Tecnológica'],
            formacao_academica: ['Doutorado em Ciências Exatas', 'Mestrado em Informática'],
            ultima_atualizacao: new Date().toLocaleDateString('pt-BR')
        }
    };
};

export default function MeuPerfilPro({ loggedUser, myClub, onLogout, onSaveProfile, onClose }) {
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState(null);
    const [avatarSrc, setAvatarSrc] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [isFetchingLattes, setIsFetchingLattes] = useState(false);
    const [lattesPreview, setLattesPreview] = useState(null);
    const [lattesImportSelection, setLattesImportSelection] = useState({
        nome: false,
        resumo: false,
        areas_atuacao: false,
        formacao_academica: false,
        ultima_atualizacao: false
    });
    const [lattesFetchError, setLattesFetchError] = useState('');
    const [lattesImportInfo, setLattesImportInfo] = useState('');
    const [showManualLattesForm, setShowManualLattesForm] = useState(false);
    const [manualLattesDraft, setManualLattesDraft] = useState({
        nome: '',
        resumo: '',
        areas: '',
        formacao: '',
        ultimaAtualizacao: ''
    });

    const buildDefaultLattesSelection = (data) => ({
        nome: Boolean(data?.nome),
        resumo: Boolean(data?.resumo),
        areas_atuacao: Array.isArray(data?.areas_atuacao) && data.areas_atuacao.length > 0,
        formacao_academica: Array.isArray(data?.formacao_academica) && data.formacao_academica.length > 0,
        ultima_atualizacao: Boolean(data?.ultima_atualizacao)
    });

    const formatListPreview = (items = []) => {
        if (!Array.isArray(items) || items.length === 0) {
            return '';
        }

        const cleaned = items
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        if (cleaned.length === 0) {
            return '';
        }

        if (cleaned.length <= 2) {
            return cleaned.join(' | ');
        }

        return `${cleaned.slice(0, 2).join(' | ')} (+${cleaned.length - 2})`;
    };

    const extractLattesIdFromLink = (value = '') => {
        const matched = String(value || '').match(/(\d{16})/);
        return matched?.[1] || '';
    };

    const resetForm = () => {
        if (loggedUser) {
            const initialLattesData = loggedUser.lattes_data || loggedUser.lattesData || null;
            setFormData({
                nome: loggedUser.nome || '',
                email: loggedUser.email || '',
                telefone: loggedUser.telefone || '',
                lattesLink: loggedUser.lattes || loggedUser.lattesLink || '',
                bio: loggedUser.bio || '',
                localizacao: loggedUser.localizacao || '',
                fotoBase64: loggedUser.fotoBase64 || loggedUser.fotoUrl || '',
                lattesData: initialLattesData
            });
            setAvatarSrc(loggedUser.fotoBase64 || loggedUser.fotoUrl || '');
            setLattesPreview(initialLattesData);
            setLattesImportSelection(buildDefaultLattesSelection(initialLattesData));
            setLattesFetchError('');
            setLattesImportInfo('');
            setShowManualLattesForm(false);
            setManualLattesDraft({
                nome: '',
                resumo: '',
                areas: '',
                formacao: '',
                ultimaAtualizacao: ''
            });
        }
    };

    useEffect(() => {
        resetForm();
    }, [loggedUser]);

    if (!loggedUser) {
        return (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_#0f172a] text-center max-w-md mx-auto mt-20">
                <div className="w-24 h-24 rounded-2xl bg-yellow-300 border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-3">
                    <User className="w-12 h-12 text-slate-900 stroke-[3]" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase">Nenhum utilizador conectado</h3>
                <p className="text-sm font-bold text-slate-600 mt-2">Faça login para visualizar o seu perfil oficial.</p>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_#0f172a] text-center max-w-md mx-auto mt-20">
                <div className="w-24 h-24 rounded-2xl bg-teal-400 border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#0f172a] animate-spin">
                    <RefreshCw className="w-10 h-10 text-slate-900 stroke-[3]" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase">A Carregar Perfil...</h3>
            </div>
        );
    }

    const formatPhone = (value) => {
        if (!value) return '';
        const numbers = value.replace(/\D/g, ''); 
        if (numbers.length <= 2) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    };

    const compressImageFile = (file, maxDimension = 600, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Arquivo inválido, deve ser uma imagem.'));
                return;
            }

            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const ratio = Math.min(maxDimension / width, maxDimension / height, 1);

                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                };
                img.onerror = () => reject(new Error('Falha ao carregar imagem para compressão.'));
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);

        try {
            const compressedBase64 = await compressImageFile(file, 600, 0.7);
            setAvatarSrc(compressedBase64);
            setFormData((prev) => ({ ...prev, fotoBase64: compressedBase64 }));
            if (!isEditing) setIsEditing(true);
        } catch (error) {
            console.error('Erro ao processar a foto:', error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleCopyId = () => {
        const id = loggedUser.id || loggedUser.uid;
        if (id) {
            navigator.clipboard.writeText(id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => prev ? { ...prev, [field]: value } : null);
        if (field === 'lattesLink') {
            setLattesImportInfo('');
            setLattesFetchError('');
        }
    };

    const handleFetchLattesData = async () => {
        const link = String(formData?.lattesLink || '').trim();
        if (!link) {
            setLattesFetchError('Informe o link do Lattes para buscar os dados.');
            setLattesImportInfo('');
            return;
        }

        setIsFetchingLattes(true);
        setLattesFetchError('');
        setLattesImportInfo('');

        try {
            const result = await fetchLattesPreviewByLink(link);
            const payload = result?.data && typeof result.data === 'object' ? result.data : null;

            setLattesPreview(payload);
            setLattesImportSelection(buildDefaultLattesSelection(payload));

            if (!result?.success) {
                if (String(result?.message || '').toLowerCase().includes('captcha')) {
                    setShowManualLattesForm(true);
                }
                setLattesFetchError(
                    result?.message
                    || 'Não foi possível extrair os campos do Lattes para esse link.'
                );
                return;
            }

            setLattesImportInfo('Dados do Lattes carregados. Selecione os campos e aplique no formulário.');
        } catch (error) {
            console.error('Erro ao buscar dados do Lattes:', error);
            setLattesFetchError(error?.message || 'Falha ao buscar dados do Lattes.');
        } finally {
            setIsFetchingLattes(false);
        }
    };

    const toggleLattesImportField = (field) => {
        setLattesImportSelection((prev) => ({ ...prev, [field]: !prev[field] }));
        setLattesImportInfo('');
    };

    const handleBuildManualLattesPreview = () => {
        const toList = (value) => String(value || '')
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);

        const manualData = {
            id_lattes: extractLattesIdFromLink(formData?.lattesLink || ''),
            link: String(formData?.lattesLink || '').trim(),
            nome: String(manualLattesDraft.nome || '').trim(),
            resumo: String(manualLattesDraft.resumo || '').trim(),
            areas_atuacao: toList(manualLattesDraft.areas),
            formacao_academica: toList(manualLattesDraft.formacao),
            ultima_atualizacao: String(manualLattesDraft.ultimaAtualizacao || '').trim(),
            fonte: 'manual-lattes',
            sincronizado_em: new Date().toISOString()
        };

        const hasAnyManualData = Boolean(
            manualData.nome
            || manualData.resumo
            || manualData.ultima_atualizacao
            || manualData.areas_atuacao.length > 0
            || manualData.formacao_academica.length > 0
        );

        if (!hasAnyManualData) {
            setLattesFetchError('Preencha ao menos um campo manual para montar a pré-visualização.');
            setLattesImportInfo('');
            return;
        }

        setLattesPreview(manualData);
        setLattesImportSelection(buildDefaultLattesSelection(manualData));
        setLattesFetchError('');
        setLattesImportInfo('Pré-visualização manual criada. Selecione os campos e aplique no formulário.');
    };

    const handleApplySelectedLattesFields = () => {
        if (!lattesPreview) {
            setLattesFetchError('Busque os dados do Lattes antes de aplicar.');
            setLattesImportInfo('');
            return;
        }

        const selectedFields = Object.entries(lattesImportSelection)
            .filter(([, checked]) => checked)
            .map(([field]) => field);

        if (selectedFields.length === 0) {
            setLattesFetchError('Selecione ao menos um campo para importar.');
            setLattesImportInfo('');
            return;
        }

        setFormData((prev) => {
            if (!prev) return prev;

            const mergedLattesData = {
                ...(prev.lattesData && typeof prev.lattesData === 'object' ? prev.lattesData : {}),
                id_lattes: lattesPreview.id_lattes || '',
                id_hash: lattesPreview.id_hash || '',
                link: String(prev.lattesLink || lattesPreview.link || '').trim(),
                fonte: lattesPreview.fonte || 'lattes-cnpq',
                sincronizado_em: new Date().toISOString()
            };
            const next = { ...prev, lattesData: mergedLattesData };

            if (lattesImportSelection.nome && lattesPreview.nome) {
                next.nome = lattesPreview.nome;
            }

            if (lattesImportSelection.resumo && lattesPreview.resumo) {
                next.bio = lattesPreview.resumo;
                next.lattesData = { ...next.lattesData, resumo: lattesPreview.resumo };
            }

            if (lattesImportSelection.areas_atuacao && Array.isArray(lattesPreview.areas_atuacao)) {
                next.lattesData = {
                    ...next.lattesData,
                    areas_atuacao: lattesPreview.areas_atuacao
                };
            }

            if (lattesImportSelection.formacao_academica && Array.isArray(lattesPreview.formacao_academica)) {
                next.lattesData = {
                    ...next.lattesData,
                    formacao_academica: lattesPreview.formacao_academica
                };
            }

            if (lattesImportSelection.ultima_atualizacao && lattesPreview.ultima_atualizacao) {
                next.lattesData = {
                    ...next.lattesData,
                    ultima_atualizacao: lattesPreview.ultima_atualizacao
                };
            }

            return next;
        });

        setLattesFetchError('');
        setLattesImportInfo('Campos selecionados aplicados. Clique em Salvar Alterações para persistir no perfil.');
    };

    const handleCancelEdit = () => {
        resetForm(); 
        setIsEditing(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData) return;
        
        try {
            if (onSaveProfile) {
                await onSaveProfile(formData);
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Erro ao salvar o perfil:', error);
        }
    };

    const handleSavePhoto = async () => {
        if (!onSaveProfile || !formData) return;
        try {
            await onSaveProfile(formData);
            setIsEditing(false);
        } catch (error) {
            console.error('Erro ao salvar foto:', error);
        }
    };

    const projetosCount = loggedUser?.projetosCount || 0;

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 ">
            <style>{`
                .neo-scrollbar::-webkit-scrollbar { width: 8px; }
                .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
            `}</style>
            
            <div className="w-full max-w-4xl max-h-[95vh] flex flex-col rounded-[2rem] bg-[#FAFAFA] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] overflow-hidden animate-in zoom-in-[0.97] duration-200 my-auto">
                
                {/* HEADER NEO-BRUTALISTA */}
                <div className="relative z-0 h-36 bg-blue-400 border-b-4 border-slate-900 overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=')] opacity-20"></div>
                    
                    <div className="absolute top-4 left-4 flex gap-3 z-10">
                        <button 
                            onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
                            className="p-3 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-y-0.5 hover:translate-x-0.5 rounded-xl text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all"
                            title={isEditing ? "Cancelar edição" : "Editar Perfil"}
                        >
                            {isEditing ? <X className="w-4 h-4 stroke-[3]" /> : <Edit2 className="w-4 h-4 stroke-[3]" />}
                            {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                        
                        {onLogout && (
                            <button 
                                onClick={onLogout}
                                className="p-3 bg-red-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-y-0.5 hover:translate-x-0.5 rounded-xl text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all"
                                title="Sair"
                            >
                                <LogOut className="w-4 h-4 stroke-[3]" /> Sair
                            </button>
                        )}
                    </div>
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 p-3 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-y-0.5 hover:translate-x-0.5 rounded-xl text-slate-900 transition-all z-10"
                        >
                            <X className="w-5 h-5 stroke-[3]" />
                        </button>
                    )}
                </div>

                {/* CORPO DO MODAL */}
                <div className="flex-1  neo-scrollbar px-6 sm:px-10 pb-10 relative z-10">
                    
                    {/* INFO PRINCIPAL DO UTILIZADOR */}
                    <div className="relative z-[60] flex flex-col items-center -mt-16 mb-8 isolate">
                        <div className="relative group z-50">
                            <div className="relative z-20 w-32 h-32 rounded-3xl border-4 border-slate-900 bg-yellow-300 flex items-center justify-center overflow-hidden shadow-[6px_6px_0px_0px_#0f172a] transform rotate-2">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt={loggedUser.nome} className="relative z-10 w-full h-full object-cover transform -rotate-2" />
                                ) : (
                                    <span className="text-5xl font-black text-slate-900 transform -rotate-2">
                                        {getInitials(loggedUser.nome)}
                                    </span>
                                )}

                                <input
                                    id="profileImageInput"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                />

                                {isEditing && (
                                    <label htmlFor="profileImageInput" className="absolute inset-0 z-50 rounded-3xl bg-slate-900/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                        {uploadingAvatar ? (
                                            <LoaderCircle className="w-8 h-8 text-white animate-spin stroke-[3]" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-white stroke-[3]" />
                                        )}
                                    </label>
                                )}
                            </div>
                        </div>

                        {isEditing && formData && formData.fotoBase64 !== (loggedUser.fotoBase64 || loggedUser.fotoUrl || '') && (
                            <button
                                type="button"
                                onClick={handleSavePhoto}
                                className="mt-4 text-xs font-black uppercase tracking-widest text-slate-900 bg-teal-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] rounded-lg px-4 py-2 transition-all hover:translate-y-0.5 hover:shadow-none"
                            >
                                Salvar foto
                            </button>
                        )}

                        <h1 className="mt-6 text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter text-center leading-none">
                            {loggedUser.nome || 'Usuário'}
                        </h1>
                        
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                            <span className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-3 py-1 text-xs font-black text-slate-900 uppercase">
                                <Mail className="w-4 h-4 stroke-[3]" /> {loggedUser.email || 'Sem e-mail'}
                            </span>
                            {formData && formData.telefone && (
                                <span className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-3 py-1 text-xs font-black text-slate-900 uppercase">
                                    <Phone className="w-4 h-4 stroke-[3]" /> {formData.telefone}
                                </span>
                            )}
                        </div>

                        {formData && formData.bio && !isEditing && (
                            <p className="mt-6 text-slate-800 font-bold text-center max-w-lg bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_0px_#0f172a] transform rotate-1 text-sm leading-relaxed">
                                "{formData.bio}"
                            </p>
                        )}
                    </div>

                    {/* MODO VISUALIZAÇÃO */}
                    {!isEditing ? (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            
                            {/* Card do Clube */}
                            <div className="flex justify-center mb-8">
                                <div className="p-6 rounded-2xl bg-teal-400 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] text-center w-full transform -rotate-1 hover:rotate-0 transition-transform">
                                    <div className="w-14 h-14 rounded-xl bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center mx-auto mb-4 transform -rotate-3">
                                        <School className="w-6 h-6 stroke-[3] text-slate-900" />
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight break-words">
                                        {myClub?.nome || 'Não vinculado a um clube'}
                                    </p>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-900 mt-3 bg-white inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">Clube de Ciências</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] rounded-2xl p-5 flex flex-col items-center text-center transition-all">
                                    <TrendingUp className="w-8 h-8 mb-3 stroke-[2.5] text-blue-500" />
                                    <span className="text-4xl font-black text-slate-900">{projetosCount}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Projetos</span>
                                </div>
                                
                                <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] rounded-2xl p-5 flex flex-col items-center text-center transition-all">
                                    <Shield className="w-8 h-8 mb-3 stroke-[2.5] text-purple-500" />
                                    <span className="text-lg font-black text-slate-900 uppercase mt-auto leading-tight">{loggedUser.perfil || 'Membro'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Perfil</span>
                                </div>
                                
                                <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] rounded-2xl p-5 flex flex-col items-center text-center transition-all">
                                    <LinkIcon className="w-8 h-8 mb-3 stroke-[2.5] text-orange-500" />
                                    {formData && formData.lattesLink ? (
                                        <a 
                                            href={formData.lattesLink.startsWith('http') ? formData.lattesLink : `https://${formData.lattesLink}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-sm font-black text-slate-900 bg-yellow-300 px-4 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all uppercase mt-auto truncate w-full"
                                        >
                                            Acessar
                                        </a>
                                    ) : (
                                        <span className="text-sm font-black text-slate-400 uppercase mt-auto border-2 border-dashed border-slate-300 px-3 py-1">Nenhum</span>
                                    )}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Lattes</span>
                                </div>
                            </div>
                        </div>

                    ) : (
                        
                        /* MODO EDIÇÃO (FORMULÁRIO) */
                        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
                            
                            <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                                    <User className="w-6 h-6 stroke-[3] text-teal-500" /> Dados Pessoais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputGroup 
                                        label="Nome Completo" 
                                        value={formData?.nome || ''} 
                                        onChange={(e) => handleInputChange('nome', e.target.value)}
                                        icon={User}
                                        placeholder="Seu nome completo"
                                        required
                                    />
                                    <InputGroup 
                                        label="E-mail" 
                                        type="email"
                                        value={formData?.email || ''} 
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        icon={Mail}
                                        disabled
                                    />
                                    <InputGroup 
                                        label="Telefone" 
                                        type="tel"
                                        value={formData?.telefone || ''} 
                                        onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                                        icon={Phone}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                    <InputGroup 
                                        label="Link do Lattes" 
                                        value={formData?.lattesLink || ''} 
                                        onChange={(e) => handleInputChange('lattesLink', e.target.value)}
                                        icon={LinkIcon}
                                        placeholder="https://lattes.cnpq.br/..."
                                    />
                                </div>
                            </div>

                            {/* INTEGRAÇÃO LATTES */}
                            <div className="bg-pink-300 border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                                            <Award className="w-6 h-6 stroke-[3]" /> Currículo Lattes
                                        </h3>
                                        <p className="text-sm font-bold text-slate-800 mt-1">Busque pelo link informado ou preencha manualmente.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleFetchLattesData}
                                        disabled={isFetchingLattes}
                                        className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-y-0.5 hover:translate-x-0.5 px-4 py-2 font-black uppercase text-xs text-slate-900 transition-all disabled:opacity-60 disabled:pointer-events-none"
                                    >
                                        {isFetchingLattes ? <LoaderCircle className="w-4 h-4 animate-spin stroke-[3]" /> : <RefreshCw className="w-4 h-4 stroke-[3]" />}
                                        Buscar Dados
                                    </button>
                                </div>

                                {lattesFetchError && (
                                    <div className="mb-4 bg-red-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] p-3 text-xs font-black uppercase text-slate-900">
                                        ! {lattesFetchError}
                                    </div>
                                )}

                                {lattesImportInfo && (
                                    <div className="mb-4 bg-teal-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] p-3 text-xs font-black uppercase text-slate-900">
                                        {lattesImportInfo}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowManualLattesForm(!showManualLattesForm)}
                                    className="text-xs font-black uppercase tracking-widest text-slate-900 underline underline-offset-4 hover:text-white transition-colors mb-4"
                                >
                                    {showManualLattesForm ? 'Ocultar preenchimento manual' : 'Preencher dados manualmente'}
                                </button>

                                {showManualLattesForm && (
                                    <div className="bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-xl p-5 mb-6 grid gap-4 animate-in fade-in">
                                        <input
                                            type="text"
                                            value={manualLattesDraft.nome}
                                            onChange={(e) => setManualLattesDraft((prev) => ({ ...prev, nome: e.target.value }))}
                                            placeholder="Nome do pesquisador"
                                            className="w-full border-2 border-slate-900 rounded-lg px-3 py-2 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_#14b8a6] transition-all"
                                        />
                                        <textarea
                                            value={manualLattesDraft.resumo}
                                            onChange={(e) => setManualLattesDraft((prev) => ({ ...prev, resumo: e.target.value }))}
                                            placeholder="Resumo do currículo"
                                            rows={2}
                                            className="w-full border-2 border-slate-900 rounded-lg px-3 py-2 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_#14b8a6] transition-all resize-y"
                                        />
                                        <textarea
                                            value={manualLattesDraft.areas}
                                            onChange={(e) => setManualLattesDraft((prev) => ({ ...prev, areas: e.target.value }))}
                                            placeholder="Áreas de atuação (uma por linha)"
                                            rows={2}
                                            className="w-full border-2 border-slate-900 rounded-lg px-3 py-2 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_#14b8a6] transition-all resize-y"
                                        />
                                        <textarea
                                            value={manualLattesDraft.formacao}
                                            onChange={(e) => setManualLattesDraft((prev) => ({ ...prev, formacao: e.target.value }))}
                                            placeholder="Formação acadêmica (uma por linha)"
                                            rows={2}
                                            className="w-full border-2 border-slate-900 rounded-lg px-3 py-2 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_#14b8a6] transition-all resize-y"
                                        />
                                        <input
                                            type="text"
                                            value={manualLattesDraft.ultimaAtualizacao}
                                            onChange={(e) => setManualLattesDraft((prev) => ({ ...prev, ultimaAtualizacao: e.target.value }))}
                                            placeholder="Última atualização (Ex: 01/10/2023)"
                                            className="w-full border-2 border-slate-900 rounded-lg px-3 py-2 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_#14b8a6] transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleBuildManualLattesPreview}
                                            className="bg-slate-900 text-white font-black uppercase text-xs tracking-widest px-4 py-3 rounded-lg border-2 border-slate-900 shadow-[4px_4px_0px_0px_#cbd5e1] hover:-translate-y-0.5 transition-all"
                                        >
                                            Gerar pré-visualização
                                        </button>
                                    </div>
                                )}

                                {lattesPreview && (
                                    <div className="bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-xl p-5 space-y-4">
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className="relative w-6 h-6 shrink-0 mt-0.5">
                                                <input type="checkbox" className="sr-only" checked={lattesImportSelection.nome} onChange={() => toggleLattesImportField('nome')} />
                                                <div className={`absolute inset-0 border-2 border-slate-900 rounded flex items-center justify-center transition-all ${lattesImportSelection.nome ? 'bg-slate-900' : 'bg-white group-hover:bg-slate-100'}`}>
                                                    {lattesImportSelection.nome && <Check className="w-4 h-4 text-teal-400 stroke-[3]" />}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="block font-black uppercase text-xs tracking-widest text-slate-900">Nome Completo</span>
                                                <span className="block font-bold text-sm text-slate-600">{lattesPreview.nome || 'Sem dado'}</span>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className="relative w-6 h-6 shrink-0 mt-0.5">
                                                <input type="checkbox" className="sr-only" checked={lattesImportSelection.resumo} onChange={() => toggleLattesImportField('resumo')} />
                                                <div className={`absolute inset-0 border-2 border-slate-900 rounded flex items-center justify-center transition-all ${lattesImportSelection.resumo ? 'bg-slate-900' : 'bg-white group-hover:bg-slate-100'}`}>
                                                    {lattesImportSelection.resumo && <Check className="w-4 h-4 text-teal-400 stroke-[3]" />}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="block font-black uppercase text-xs tracking-widest text-slate-900">Resumo (Vai para Biografia)</span>
                                                <span className="block font-bold text-sm text-slate-600 line-clamp-2">{lattesPreview.resumo || 'Sem dado'}</span>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className="relative w-6 h-6 shrink-0 mt-0.5">
                                                <input type="checkbox" className="sr-only" checked={lattesImportSelection.areas_atuacao} onChange={() => toggleLattesImportField('areas_atuacao')} />
                                                <div className={`absolute inset-0 border-2 border-slate-900 rounded flex items-center justify-center transition-all ${lattesImportSelection.areas_atuacao ? 'bg-slate-900' : 'bg-white group-hover:bg-slate-100'}`}>
                                                    {lattesImportSelection.areas_atuacao && <Check className="w-4 h-4 text-teal-400 stroke-[3]" />}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="block font-black uppercase text-xs tracking-widest text-slate-900">Áreas de Atuação</span>
                                                <span className="block font-bold text-sm text-slate-600">
                                                    {Array.isArray(lattesPreview.areas_atuacao) && lattesPreview.areas_atuacao.length > 0 ? formatListPreview(lattesPreview.areas_atuacao) : 'Sem dado'}
                                                </span>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className="relative w-6 h-6 shrink-0 mt-0.5">
                                                <input type="checkbox" className="sr-only" checked={lattesImportSelection.formacao_academica} onChange={() => toggleLattesImportField('formacao_academica')} />
                                                <div className={`absolute inset-0 border-2 border-slate-900 rounded flex items-center justify-center transition-all ${lattesImportSelection.formacao_academica ? 'bg-slate-900' : 'bg-white group-hover:bg-slate-100'}`}>
                                                    {lattesImportSelection.formacao_academica && <Check className="w-4 h-4 text-teal-400 stroke-[3]" />}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="block font-black uppercase text-xs tracking-widest text-slate-900">Formação Acadêmica</span>
                                                <span className="block font-bold text-sm text-slate-600">
                                                    {Array.isArray(lattesPreview.formacao_academica) && lattesPreview.formacao_academica.length > 0 ? formatListPreview(lattesPreview.formacao_academica) : 'Sem dado'}
                                                </span>
                                            </div>
                                        </label>

                                        <div className="pt-4 border-t-2 border-slate-200">
                                            <button
                                                type="button"
                                                onClick={handleApplySelectedLattesFields}
                                                className="w-full bg-slate-900 text-white font-black uppercase text-xs tracking-widest px-4 py-3 rounded-lg border-2 border-slate-900 shadow-[4px_4px_0px_0px_#cbd5e1] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Check className="w-4 h-4 stroke-[3]" /> Aplicar Seleção
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                                <InputGroup 
                                    label="Biografia" 
                                    type="textarea"
                                    value={formData?.bio || ''} 
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                    icon={BookOpen}
                                    placeholder="Conte um pouco sobre você..."
                                    rows={4}
                                />
                            </div>

                            <div className="pt-6 border-t-4 border-slate-900 flex flex-col sm:flex-row justify-end gap-4">
                                <button 
                                    type="button" 
                                    onClick={handleCancelEdit}
                                    className="px-8 py-4 bg-white border-4 border-slate-900 text-slate-900 font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-none transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-8 py-4 bg-teal-400 border-4 border-slate-900 text-slate-900 font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Check className="w-5 h-5 stroke-[3]" /> Salvar Perfil
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function InputGroup({ label, type = "text", value, onChange, icon: Icon, disabled = false, placeholder, required, rows, maxLength }) {
    const isTextarea = type === 'textarea';
    
    return (
        <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-900 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon className="h-5 w-5 stroke-[2.5] text-slate-500" />
                </div>
                {isTextarea ? (
                    <textarea
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        rows={rows || 3}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        className={`block w-full pl-12 pr-4 py-3 border-2 border-slate-900 rounded-xl text-sm font-bold shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all resize-none ${
                            disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                        }`}
                    />
                ) : (
                    <input
                        type={type}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        placeholder={placeholder}
                        required={required}
                        maxLength={maxLength}
                        className={`block w-full pl-12 pr-4 py-3 border-2 border-slate-900 rounded-xl text-sm font-bold shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all ${
                            disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                        }`}
                    />
                )}
            </div>
        </div>
    );
}