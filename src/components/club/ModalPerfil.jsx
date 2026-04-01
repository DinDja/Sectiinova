import React from 'react';
import { 
    School, Shield, Phone, 
    Users, TrendingUp, Link as LinkIcon, X, Mail 
} from 'lucide-react';
import { getInitials as getInitialsFromName, getLattesLink } from '../../utils/helpers';
import { isUserInProject } from '../../services/projectService';

export default function ModalPerfilVisitante({ isOpen, onClose, usuario, club = null, clubProjects = [], clubUsers = [] }) {
    if (!isOpen || !usuario) return null;

    const projetoCountByClub = Array.isArray(clubProjects) && clubProjects.length > 0
        ? clubProjects.reduce((acc, project) => {
            try {
                return isUserInProject(project, usuario, clubUsers) ? acc + 1 : acc;
            } catch (err) {
                return acc;
            }
        }, 0)
        : 0;

    const projetosCount = Number(usuario.projetosCount ?? usuario.projetos?.length ?? usuario.projetos_ids?.length ?? usuario.projetosIds?.length ?? projetoCountByClub ?? 0);
    const nome = usuario.nome || usuario.nomeCompleto || usuario.fullName || 'Usuário Sem Nome';
    const email = usuario.email || usuario.emailPrincipal || usuario.email_usuario || 'Sem e-mail';
    const telefone = usuario.telefone || usuario.celular || usuario.telefone_celular || 'Não informado';
    const clube = usuario.clube || usuario.clube_nome || usuario.clubeId || club?.nome || 'Não informado';
    const bio = usuario.bio || usuario.descricao || usuario.sobre || '';
    const avatarSrc = usuario.fotoUrl || usuario.fotoBase64 || usuario.avatar || usuario.foto || '';
    const lattesLink = getLattesLink(usuario);


    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300 scrollbar-hide">
                
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
                    <div className="relative flex flex-col items-center -mt-16 mb-6">
                        <div className="relative w-28 h-28 rounded-full border-4 border-white bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden shadow-xl">
                            {avatarSrc ? (
                                <img src={avatarSrc} alt={nome} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-[#0B3B5F]">
                                    {getInitialsFromName(nome)}
                                </span>
                            )}
                        </div>

                        <h1 className="mt-3 text-2xl font-bold text-slate-800">
                            {nome}
                        </h1>
                        
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1">
                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                                <Mail className="w-3.5 h-3.5" />
                                <span>{email}</span>
                            </div>
                        </div>

                        {bio && (
                            <p className="mt-3 text-slate-600 text-sm text-center max-w-md italic px-4">
                                "{bio}"
                            </p>
                        )}
                    </div>

                    {/* Card do Clube - destaque principal */}
                    <div className="flex justify-center mb-6">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white shadow-sm text-center w-full">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center mx-auto mb-2">
                                <School className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-lg font-bold text-slate-800 break-words">
                                {clube}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-1">Clube de Ciências</p>
                        </div>
                    </div>

                    {/* Grid de informações */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoCard 
                            icon={TrendingUp} 
                            label="Projetos" 
                            value={projetosCount} 
                            color="text-blue-600" 
                        />
                        <InfoCard 
                            icon={Shield} 
                            label="Perfil" 
                            value={usuario.perfil || usuario.perfil_usuario || 'Membro'} 
                            color="text-purple-600" 
                        />
                        <InfoCard 
                            icon={Phone} 
                            label="Telefone" 
                            value={telefone} 
                            color="text-emerald-600" 
                        />
                        <InfoCard 
                            icon={LinkIcon} 
                            label="Lattes" 
                            value={lattesLink ? 'Acessar Lattes' : 'Não informado'} 
                            isLink={!!lattesLink}
                            linkUrl={lattesLink}
                            color="text-blue-600" 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

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