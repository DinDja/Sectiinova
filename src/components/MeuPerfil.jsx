import React, { useState, useEffect } from 'react';
import { 
    User, School, Lock, Edit2, Copy, Check, 
    LogOut, Mail, Shield, Camera, X, Phone, 
    MapPin, Calendar, Award, Star, TrendingUp, Briefcase, 
    Globe, Users, Heart, BookOpen, Link as LinkIcon
} from 'lucide-react';

export default function MeuPerfilPro({ loggedUser, myClub, onLogout, onSaveProfile, onClose }) {
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState(null);
    const [avatarSrc, setAvatarSrc] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const resetForm = () => {
        if (loggedUser) {
            setFormData({
                nome: loggedUser.nome || '',
                email: loggedUser.email || '',
                telefone: loggedUser.telefone || '',
                lattesLink: loggedUser.lattes || loggedUser.lattesLink || '',
                bio: loggedUser.bio || '',
                localizacao: loggedUser.localizacao || '',
                fotoBase64: loggedUser.fotoBase64 || loggedUser.fotoUrl || ''
            });
            setAvatarSrc(loggedUser.fotoBase64 || loggedUser.fotoUrl || '');
        }
    };

    useEffect(() => {
        resetForm();
    }, [loggedUser]);

    if (!loggedUser) {
        return (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-gradient-to-br from-slate-50 to-white shadow-xl text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mb-4 shadow-inner">
                    <User className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-700">Nenhum usuário conectado</h3>
                <p className="text-sm text-slate-500 mt-2">Faça login para visualizar seu perfil</p>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-gradient-to-br from-slate-50 to-white shadow-xl text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mb-4 shadow-inner">
                    <User className="w-12 h-12 text-slate-400 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-slate-700">Carregando perfil...</h3>
                <p className="text-sm text-slate-500 mt-2">Aguarde um momento</p>
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

    const stats = {
        projetos: loggedUser?.projetosCount || 8,
        seguidores: loggedUser?.seguidoresCount || 156,
        conquistas: loggedUser?.conquistasCount || 12
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                
                <div className="relative h-36 bg-gradient-to-r from-[#0B3B5F] via-[#1B4F72] to-[#2E86C1] overflow-hidden">
                    <svg className="absolute bottom-0 left-0 w-full h-16" preserveAspectRatio="none" viewBox="0 0 1440 120">
                        <path fill="white" fillOpacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
                    </svg>
                    
                    <div className="absolute top-4 left-4 flex gap-2">
                        <button 
                            onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
                            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white transition-all duration-300 hover:scale-105"
                            title={isEditing ? "Cancelar edição" : "Editar Perfil"}
                        >
                            {isEditing ? ""  : <Edit2 className="w-4 h-4" />}
                        </button>
                        
                        {onLogout && (
                            <button 
                                onClick={onLogout}
                                className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-xl text-white transition-all duration-300 hover:scale-105"
                                title="Sair"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 sm:px-8 pb-8 relative">
                    <div className="relative flex flex-col items-center -mt-16 mb-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0B3B5F] to-[#2E86C1] rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden shadow-xl">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt={loggedUser.nome} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-[#0B3B5F]">
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
                                        <div className="w-5 h-5 rounded-full animate-spin"></div>
                                    ) : (
                                        <Camera className="w-6 h-6 text-white" />
                                    )}
                                </label>
                            </div>
                        </div>

                        {isEditing && formData && formData.fotoBase64 !== (loggedUser.fotoBase64 || loggedUser.fotoUrl || '') && (
                            <button
                                type="button"
                                onClick={handleSavePhoto}
                                className="mt-2 text-xs font-medium text-white bg-[#0B3B5F] hover:bg-[#1B4F72] rounded-full px-3 py-1 transition-all"
                            >
                                Salvar foto
                            </button>
                        )}

                        <h1 className="mt-3 text-2xl font-bold text-slate-800">
                            {loggedUser.nome || 'Usuário'}
                        </h1>
                        
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1">
                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                                <Mail className="w-3.5 h-3.5" />
                                <span>{loggedUser.email || 'Sem e-mail'}</span>
                            </div>
                            {formData && formData.telefone && (
                                <div className="flex items-center gap-1 text-slate-500 text-sm">
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>{formData.telefone}</span>
                                </div>
                            )}
                        </div>

                        {formData && formData.bio && !isEditing && (
                            <p className="mt-3 text-slate-600 text-sm text-center max-w-md italic px-4">
                                "{formData.bio}"
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <StatCard icon={TrendingUp} label="Projetos" value={stats.projetos} color="from-blue-500 to-cyan-500" />
                        <StatCard icon={Users} label="Seguidores" value={stats.seguidores} color="from-indigo-500 to-blue-500" />
                        <StatCard icon={Award} label="Conquistas" value={stats.conquistas} color="from-purple-500 to-pink-500" />
                    </div>

                    {!isEditing ? (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="grid grid-cols-2 gap-3">
                                <InfoCard 
                                    icon={School} 
                                    label="Clube / Escola" 
                                    value={myClub?.nome || 'Não informado'} 
                                    color="text-blue-600"
                                />
                                <InfoCard 
                                    icon={Shield} 
                                    label="Perfil" 
                                    value={loggedUser.perfil || 'Membro'} 
                                    color="text-purple-600"
                                />
                                <InfoCard 
                                    icon={LinkIcon} 
                                    label="Lattes" 
                                    value={formData && formData.lattesLink ? (
                                        <a 
                                            href={formData.lattesLink.startsWith('http') ? formData.lattesLink : `https://${formData.lattesLink}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline truncate block"
                                        >
                                            {formData.lattesLink.length > 30 ? formData.lattesLink.substring(0, 30) + '...' : formData.lattesLink}
                                        </a>
                                    ) : 'Não informado'} 
                                    color="text-emerald-600"
                                    isLink={formData && !!formData.lattesLink}
                                />
                                <InfoCard 
                                    icon={Phone} 
                                    label="Telefone" 
                                    value={formData ? (formData.telefone || 'Não informado') : 'Não informado'} 
                                    color="text-blue-600"
                                />
                            </div>                          
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <div className="md:col-span-2">
                                    <InputGroup 
                                        label="Biografia" 
                                        type="textarea"
                                        value={formData?.bio || ''} 
                                        onChange={(e) => handleInputChange('bio', e.target.value)}
                                        icon={User}
                                        placeholder="Conte um pouco sobre você..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="pt-3 flex justify-end gap-3 ">
                                <button 
                                    type="button" 
                                    onClick={handleCancelEdit}
                                    className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#0B3B5F] to-[#2E86C1] hover:from-[#0A2F57] hover:to-[#1A6AA1] rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
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

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white  shadow-sm text-center">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center mx-auto mb-1`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
        </div>
    );
}

function InfoCard({ icon: Icon, label, value, color, isLink = false }) {
    return (
        <div className="p-3 rounded-xl bg-slate-50 ">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-white ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">{label}</p>
                    {isLink ? (
                        <div className="text-sm font-medium truncate">{value}</div>
                    ) : (
                        <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="h-4 w-4 text-slate-400" />
                </div>
                {isTextarea ? (
                    <textarea
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        rows={rows || 3}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        className={`block w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3B5F] focus:border-[#0B3B5F] outline-none transition-all resize-none ${
                            disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
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
                        className={`block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3B5F] focus:border-[#0B3B5F] outline-none transition-all ${
                            disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                        }`}
                    />
                )}
            </div>
        </div>
    );
}