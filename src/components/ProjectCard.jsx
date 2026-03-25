import React from 'react';
import { Users, Heart, MessageCircle, ArrowRight } from 'lucide-react';

export default function ProjectCard({
    project,
    club,
    school,
    isCompleted,
    team,
    investigatorNames,
    onClubClick,
    onDiaryClick
}) {
    // Função para definir a cor da tag de status baseado no texto (como na imagem)
    const getStatusStyle = (status) => {
        const text = (status || '').toUpperCase();
        if (text === 'NOVO PROJETO') return 'bg-[#00B5B5] text-white';
        if (text === 'PROJETO EM EXECUÇÃO') return 'bg-[#8F2756] text-white';
        return 'bg-[#8F2756] text-white'; // Fallback
    };

    return (
        <article className="premium-card overflow-hidden p-6 flex flex-col gap-5">
            
            {/* Cabeçalho: Imagem + Título e Status */}
            <div className="flex gap-4">
                {/* Imagem do Projeto (Adicionado placeholder caso não tenha a URL da imagem no objeto) */}
                <div className="w-[100px] h-[100px] flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    {project.imagem ? (
                        <img src={project.imagem} alt={project.titulo} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-2">
                            Sem Imagem
                        </div>
                    )}
                </div>

                <div className="flex flex-col justify-start pt-1">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2">
                        "{project.titulo || 'Projeto sem título cadastrado'}"
                    </h3>
                    <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full ${getStatusStyle(project.status)}`}>
                            {project.status || 'EM DESENVOLVIMENTO'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabela de Equipe */}
            <div className="border border-slate-200 rounded-lg overflow-hidden text-[13px] bg-white/90">
                <div className="flex border-b border-slate-200 bg-white">
                    <div className="w-1/3 p-2.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50/80">
                        Orientador:
                    </div>
                    <div className="w-2/3 p-2.5 text-slate-700">
                        {team?.orientadores?.map((p) => p.nome).join(', ') || 'Não informado'}
                    </div>
                </div>
                
                <div className="flex border-b border-slate-200 bg-white">
                    <div className="w-1/3 p-2.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50/80">
                        Coorientadores:
                    </div>
                    <div className="w-2/3 p-2.5 text-slate-700">
                        {team?.coorientadores?.map((p) => p.nome).join(', ') || 'Não informado'}
                    </div>
                </div>

                <div className="flex bg-white">
                    <div className="w-1/3 p-2.5 font-bold text-slate-800 border-r border-slate-200 bg-slate-50/80">
                        Investigadores:
                    </div>
                    <div className="w-2/3 p-2.5 text-slate-700">
                        {investigatorNames.join(', ') || 'Não informado'}
                    </div>
                </div>
            </div>

            {/* Descrição */}
            <div className="text-slate-700 text-sm leading-relaxed mt-1">
                {project.descricao || project.introducao || 'Nenhuma descrição detalhada foi fornecida para este projeto no momento. Acesse o diário de bordo para acompanhar a evolução da pesquisa.'}
            </div>

            {/* Rodapé: Ícones e Botão */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4 text-[#00B5B5]">
                    <button className="hover:opacity-70 transition-opacity" title="Apoiar projeto">
                        <Heart className="w-5 h-5 fill-current" />
                    </button>
                    <button className="hover:opacity-70 transition-opacity" title="Deixar comentário">
                        <MessageCircle className="w-5 h-5" />
                    </button>
                    <button className="hover:opacity-70 transition-opacity" title="Equipe">
                        <Users className="w-5 h-5" />
                    </button>
                </div>
                
                <button 
                    onClick={onDiaryClick} 
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#007A99] to-[#00B5B5] hover:from-[#006B86] hover:to-[#00A7A7] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-md shadow-cyan-700/20"
                >
                    Acessar Diário de Bordo 
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
            
        </article>
    );
}