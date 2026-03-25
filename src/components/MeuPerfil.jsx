import React, { useState, useEffect  } from 'react';
import { 
    User, School, Lock, Edit2, Copy, Check, 
    LogOut, Mail, Shield, Camera, X, Phone, 
    MapPin, Calendar, Award, Star, TrendingUp, Briefcase
} from 'lucide-react';

export default function MeuPerfilPro({ loggedUser, myClub, onLogout, onSaveProfile, onClose }) {
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    
    const [formData, setFormData] = useState({
        nome: loggedUser?.nome || '',
        email: loggedUser?.email || '',
        telefone: loggedUser?.telefone || '',
        cargo: loggedUser?.cargo || '',
        bio: loggedUser?.bio || '',
        localizacao: loggedUser?.localizacao || '',
        fotoBase64: loggedUser?.fotoBase64 || loggedUser?.fotoUrl || ''
    });
    const [avatarSrc, setAvatarSrc] = useState(loggedUser?.fotoBase64 || loggedUser?.fotoUrl || '');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        setAvatarSrc(loggedUser?.fotoBase64 || loggedUser?.fotoUrl || '');
        setFormData((prev) => ({
            ...prev,
            fotoBase64: loggedUser?.fotoBase64 || loggedUser?.fotoUrl || ''
        }));
    }, [loggedUser]);

    if (!loggedUser) {
        return (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-xl text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mb-4 shadow-inner">
                    <User className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-700">Nenhum usuário conectado</h3>
                <p className="text-sm text-slate-500 mt-2">Faça login para visualizar seu perfil</p>
            </div>
        );
    }

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
        } catch (error) {
            console.error('Erro ao processar a foto:', error);
            // você pode adicionar alerta visual aqui
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSaveProfile) {
            onSaveProfile(formData);
        }
        setIsEditing(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
    };

    const handleSavePhoto = async () => {
        if (!onSaveProfile) return;

        try {
            await onSaveProfile(formData);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
        } catch (error) {
            console.error('Erro ao salvar foto:', error);
            setErrorMessage('Falha ao salvar foto. Tente novamente.');
        }
    };

    // Estatísticas simuladas
    const stats = {
        projetos: loggedUser?.projetosCount || 8,
        seguidores: loggedUser?.seguidoresCount || 156,
        curtidas: loggedUser?.curtidasCount || 342,
        conquistas: loggedUser?.conquistasCount || 12
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Card Principal */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-3xl">
                
                {/* Header com Gradiente Azul Moderno */}
                <div className="relative h-40 bg-gradient-to-r from-[#0B3B5F] via-[#1B4F72] to-[#2E86C1] overflow-hidden">
                    {/* Padrão de Ondas Decorativas */}
                    <svg className="absolute bottom-0 left-0 w-full h-20" preserveAspectRatio="none" viewBox="0 0 1440 120">
                        <path fill="white" fillOpacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
                    </svg>
                    
                    {/* Botões de Ação - Agora com espaçamento adequado */}
                    <div className="absolute top-4 right-4 flex gap-3 z-10">
                   
                     
                        {onLogout && (
                            <button 
                                onClick={onLogout}
                                className="p-2.5 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-xl text-white transition-all duration-300 hover:scale-105"
                                title="Sair"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="px-6 sm:px-10 pb-10 relative">
                    {/* Avatar e Informações */}
                    <div className="relative flex flex-col lg:flex-row items-center lg:items-end gap-6 -mt-20 mb-8">
                        {/* Avatar com Efeito de Brilho */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0B3B5F] to-[#2E86C1] rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                            <div className="relative w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-4xl text-[#0B3B5F] shadow-xl overflow-hidden">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt={loggedUser.nome} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold bg-gradient-to-r from-[#0B3B5F] to-[#2E86C1] bg-clip-text text-transparent">
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

                                <label htmlFor="profileImageInput" className="absolute inset-0 bg-gradient-to-br from-[#0B3B5F]/70 to-[#2E86C1]/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer">
                                    {uploadingAvatar ? (
                                        <span className="text-white text-sm">Carregando...</span>
                                    ) : (
                                        <Camera className="w-8 h-8 text-white" />
                                    )}
                                </label>
                            </div>

                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleSavePhoto}
                                    className="mt-2 w-full text-xs font-semibold text-white bg-gradient-to-r from-[#0B3B5F] to-[#2E86C1] hover:from-[#0A2F57] hover:to-[#1A6AA1] rounded-lg py-1 transition-all duration-300"
                                >
                                    Salvar foto
                                </button>
                            )}
                            <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                        </div>

                        {formData.fotoBase64 && formData.fotoBase64 !== (loggedUser.fotoBase64 || loggedUser.fotoUrl || '') && (
                            <div className="mt-3 w-full flex justify-center lg:justify-start">
                                <button
                                    type="button"
                                    onClick={handleSavePhoto}
                                    className="text-xs px-3 py-1.5 rounded-full font-semibold text-white bg-gradient-to-r from-[#0B3B5F] to-[#2E86C1] hover:from-[#0A2F57] hover:to-[#1A6AA1]"
                                >
                                    Salvar foto
                                </button>
                            </div>
                        )}

                        <div className="flex-1 text-center lg:text-left">
                            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#0B3B5F] to-[#2E86C1] bg-clip-text text-transparent">
                                {loggedUser.nome || 'Usuário'}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-2">
                                <p className="text-slate-500 flex items-center gap-1.5 text-sm">
                                    <Mail className="w-4 h-4" />
                                    {loggedUser.email || 'Sem e-mail cadastrado'}
                                </p>
                                {formData.telefone && (
                                    <p className="text-slate-500 flex items-center gap-1.5 text-sm">
                                        <Phone className="w-4 h-4" />
                                        {formData.telefone}
                                    </p>
                                )}
                            </div>
                            {formData.bio && !isEditing && (
                                <p className="mt-3 text-slate-600 text-sm max-w-2xl italic">
                                    "{formData.bio}"
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Cards de Estatísticas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        <StatCard icon={TrendingUp} label="Projetos" value={stats.projetos} color="from-blue-500 to-cyan-500" />
                     
                    </div>

                    {/* Mensagem de Sucesso */}
                    {showSuccessMessage && (
                        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
                            <p className="text-sm text-green-700 text-center flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" />
                                Perfil atualizado com sucesso!
                            </p>
                        </div>
                    )}

                    {/* Conteúdo Dinâmico */}
                    {!isEditing ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Grid de Informações */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoCard 
                                    icon={School} 
                                    label="Clube / Escola" 
                                    value={myClub?.nome || 'Clube não definido'} 
                                    color="text-blue-600" 
                                    bg="bg-blue-50"
                                    gradient="from-blue-50 to-blue-100/50"
                                />
                                <InfoCard 
                                    icon={Shield} 
                                    label="perfil" 
                                    value={loggedUser.perfil || 'Membro'} 
                                    color="text-purple-600" 
                                    bg="bg-purple-50"
                                    gradient="from-purple-50 to-purple-100/50"
                                />
                                {formData.cargo && (
                                    <InfoCard 
                                        icon={Briefcase} 
                                        label="Cargo / Função" 
                                        value={formData.cargo} 
                                        color="text-emerald-600" 
                                        bg="bg-emerald-50"
                                        gradient="from-emerald-50 to-emerald-100/50"
                                    />
                                )}
                                {formData.localizacao && (
                                    <InfoCard 
                                        icon={MapPin} 
                                        label="Localização" 
                                        value={formData.localizacao} 
                                        color="text-orange-600" 
                                        bg="bg-orange-50"
                                        gradient="from-orange-50 to-orange-100/50"
                                    />
                                )}
                            </div>
                            
                      

                         
                        </div>
                    ) : (
                        /* Formulário de Edição */
                        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputGroup 
                                    label="Nome Completo" 
                                    value={formData.nome} 
                                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                    icon={User}
                                    placeholder="Seu nome completo"
                                    required
                                />
                                <InputGroup 
                                    label="E-mail" 
                                    type="email"
                                    value={formData.email} 
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    icon={Mail}
                                    disabled
                                    hint="O e-mail não pode ser alterado"
                                />
                                <InputGroup 
                                    label="Telefone" 
                                    type="tel"
                                    value={formData.telefone} 
                                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                                    icon={Phone}
                                    placeholder="(00) 00000-0000"
                                />
                                <InputGroup 
                                    label="Cargo / Função" 
                                    value={formData.cargo} 
                                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                                    icon={Briefcase}
                                    placeholder="Ex: Professor, Coordenador, Aluno"
                                />
                                <InputGroup 
                                    label="Localização" 
                                    value={formData.localizacao} 
                                    onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                                    icon={MapPin}
                                    placeholder="Cidade, Estado"
                                />
                                <div className="md:col-span-2">
                                    <InputGroup 
                                        label="Biografia" 
                                        type="textarea"
                                        value={formData.bio} 
                                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                        icon={User}
                                        placeholder="Conte um pouco sobre você e seus interesses..."
                                        rows={4}
                                    />
                                </div>
                                   <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white transition-all duration-300 hover:scale-105 hover:rotate-12"
                            title={isEditing ? "Cancelar edição" : "Editar Perfil"}
                        >
                            {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                        </button>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsEditing(false)}
                                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-300"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0B3B5F] to-[#2E86C1] hover:from-[#0B2B4F] hover:to-[#1E76B1] rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 transform hover:scale-105"
                                >
                                    <Check className="w-4 h-4" /> Salvar Alterações
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente de Card de Estatística
function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${color} bg-opacity-10 flex items-center justify-center mb-2 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
        </div>
    );
}

// Componente de Card de Informação
function InfoCard({ icon: Icon, label, value, color, bg, gradient }) {
    return (
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient || 'from-white to-gray-50'} border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}>
            <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${bg} ${color} shadow-sm`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-medium text-slate-800 mt-1 break-words">{value}</p>
                </div>
            </div>
        </div>
    );
}

// Componente de Badge
function Badge({ icon: Icon, label, color }) {
    const colors = {
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
        green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
    };
    
    return (
        <div className={`px-3 py-1.5 rounded-full border ${colors[color]} flex items-center gap-1.5 text-xs font-medium transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm`}>
            <Icon className="w-3 h-3" />
            <span>{label}</span>
        </div>
    );
}

// Componente de Input do Formulário
function InputGroup({ label, type = "text", value, onChange, icon: Icon, disabled = false, placeholder, hint, required, rows }) {
    const isTextarea = type === 'textarea';
    
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="h-5 w-5 text-slate-400" />
                </div>
                {isTextarea ? (
                    <textarea
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        rows={rows || 3}
                        placeholder={placeholder}
                        className={`block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B3B5F] focus:border-[#0B3B5F] outline-none transition-all resize-none ${
                            disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:border-gray-300'
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
                        className={`block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B3B5F] focus:border-[#0B3B5F] outline-none transition-all ${
                            disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:border-gray-300'
                        }`}
                    />
                )}
            </div>
            {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

// Componente Heart para Estatísticas
function Heart({ className }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    );
}