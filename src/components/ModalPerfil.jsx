import React from 'react';
import { 
    User, School, Shield, Phone, 
    Award, Users, TrendingUp, Link as LinkIcon, X, Mail 
} from 'lucide-react';

export default function ModalPerfilVisitante({ isOpen, onClose, usuario }) {
    if (!isOpen || !usuario) return null;

    const stats = {
        projetos: usuario.projetosCount || 0,
        seguidores: usuario.seguidoresCount || 0,
        conquistas: usuario.conquistasCount || 0
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    };

    // Fecha o modal ao clicar fora dele
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300 scrollbar-hide">
                
                {/* Header com Gradiente e Botão de Fechar */}
                <div className="relative h-32 bg-gradient-to-r from-[#0B3B5F] via-[#1B4F72] to-[#2E86C1] overflow-hidden">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-red-500/80 backdrop-blur-md rounded-xl text-white transition-all duration-300 z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <svg className="absolute bottom-0 left-0 w-full h-12" preserveAspectRatio="none" viewBox="0 0 1440 120">
                        <path fill="white" fillOpacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
                    </svg>
                </div>

                <div className="px-6 pb-8 relative">
                    {/* Foto e Nome */}
                    <div className="relative flex flex-col items-center -mt-16 mb-6">
                        <div className="relative w-28 h-28 rounded-full border-4 border-white bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden shadow-xl">
                            {usuario.fotoUrl || usuario.fotoBase64 ? (
                                <img src={usuario.fotoUrl || usuario.fotoBase64} alt={usuario.nome} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-[#0B3B5F]">
                                    {getInitials(usuario.nome)}
                                </span>
                            )}
                        </div>

                        <h1 className="mt-3 text-2xl font-bold text-slate-800">
                            {usuario.nome || 'Usuário Sem Nome'}
                        </h1>
                        
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1">
                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                                <Mail className="w-3.5 h-3.5" />
                                <span>{usuario.email || 'Sem e-mail'}</span>
                            </div>
                        </div>

                        {usuario.bio && (
                            <p className="mt-3 text-slate-600 text-sm text-center max-w-md italic px-4">
                                "{usuario.bio}"
                            </p>
                        )}
                    </div>

                    {/* Cards de Estatísticas */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <StatCard icon={TrendingUp} label="Projetos" value={stats.projetos} color="from-blue-500 to-cyan-500" />
                        <StatCard icon={Users} label="Seguidores" value={stats.seguidores} color="from-indigo-500 to-blue-500" />
                        <StatCard icon={Award} label="Conquistas" value={stats.conquistas} color="from-purple-500 to-pink-500" />
                    </div>

                    {/* Informações */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoCard icon={School} label="Clube / Escola" value={usuario.clube || 'Não informado'} color="text-blue-600" />
                        <InfoCard icon={Shield} label="Perfil" value={usuario.perfil || 'Membro'} color="text-purple-600" />
                        <InfoCard icon={Phone} label="Telefone" value={usuario.telefone || 'Não informado'} color="text-emerald-600" />
                        <InfoCard 
                            icon={LinkIcon} 
                            label="Lattes" 
                            value={usuario.lattesLink ? 'Acessar Lattes' : 'Não informado'} 
                            isLink={!!usuario.lattesLink}
                            linkUrl={usuario.lattesLink}
                            color="text-blue-600" 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Mini-componentes auxiliares
function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="p-3 rounded-xl bg-slate-50 border border-gray-100 shadow-sm text-center">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center mx-auto mb-1`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
        </div>
    );
}

function InfoCard({ icon: Icon, label, value, color, isLink, linkUrl }) {
    return (
        <div className="p-3 rounded-xl bg-slate-50 border border-gray-100 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white shadow-sm ${color}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">{label}</p>
                {isLink && linkUrl ? (
                    <a href={linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block">
                        {value}
                    </a>
                ) : (
                    <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
                )}
            </div>
        </div>
    );
}