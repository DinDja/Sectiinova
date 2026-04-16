import React from 'react';
import { Map, BookOpen, Wrench, X, ChevronDown, LoaderCircle, PenTool } from 'lucide-react';

export default function DiaryModal({
    isModalOpen,
    onClose,
    newEntry,
    setNewEntry,
    handleAddEntry,
    STAGES,
    savingEntry
}) {
    if (!isModalOpen) return null;

    const inputClasses = "w-full rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all placeholder:text-slate-400";
    const labelClasses = "text-xs font-black uppercase tracking-widest text-slate-900 mb-2 block";
    const sectionTitleClasses = "text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3";

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
            
            {/* INJEÇÃO DE CSS DA SCROLLBAR */}
            <style>{`
                .neo-scrollbar::-webkit-scrollbar { width: 8px; }
                .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
            `}</style>

            <div className="relative h-[800px] w-full max-w-4xl bg-[#FAFAFA] rounded-3xl border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] flex flex-col my-8 overflow-hidden animate-in zoom-in-[0.97] duration-200">
                
                {/* HEADER DO MODAL */}
                <div className="px-8 py-6 border-b-4 border-slate-900 bg-teal-400 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <PenTool className="w-8 h-8 stroke-[3]" /> Novo Registro
                        </h2>
                        <p className="text-sm font-bold text-slate-900 mt-2 bg-white inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transform ">
                            Sistematize os seus experimentos e garanta a autoria do projeto.
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:bg-slate-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center shrink-0"
                    >
                        <X className="w-6 h-6 stroke-[3]" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto neo-scrollbar">
                    <form onSubmit={handleAddEntry} className="p-6 md:p-8 space-y-10">
                        
                        {/* SECÇÃO 1: Contexto */}
                        <div className="bg-yellow-300 border-4 border-slate-900 rounded-[2rem] p-6 md:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className={sectionTitleClasses}>
                                <Map className="w-7 h-7 stroke-[3]" /> 1. Contexto da Sessão
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClasses}>Título Resumido *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className={inputClasses} 
                                        value={newEntry.title} 
                                        onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} 
                                        placeholder="Ex: Montagem inicial do sensor biométrico" 
                                    />
                                </div>
                                
                                <div>
                                    <label className={labelClasses}>Duração da Sessão</label>
                                    <input 
                                        type="text" 
                                        className={inputClasses} 
                                        value={newEntry.duration} 
                                        onChange={(e) => setNewEntry({ ...newEntry, duration: e.target.value })} 
                                        placeholder="Ex: 2 horas" 
                                    />
                                </div>
                                
                                <div className="relative">
                                    <label className={labelClasses}>Etapa da Investigação</label>
                                    <select 
                                        className={`${inputClasses} appearance-none cursor-pointer`} 
                                        value={newEntry.stage} 
                                        onChange={(e) => setNewEntry({ ...newEntry, stage: e.target.value })}
                                    >
                                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-10 w-5 h-5 text-slate-900 stroke-[3] pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* SECÇÃO 2: Registo */}
                        <div className="bg-pink-400 border-4 border-slate-900 rounded-[2rem] p-6 md:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className={sectionTitleClasses}>
                                <BookOpen className="w-7 h-7 stroke-[3]" /> 2. Registo do Dia
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClasses}>O que foi feito hoje? *</label>
                                    <p className="text-xs font-bold text-slate-800 mb-3 bg-white/50 inline-block px-2 py-1 rounded-md border-2 border-slate-900 border-dashed">
                                        Descreva procedimentos, discussões ou experimentos realizados.
                                    </p>
                                    <textarea 
                                        required 
                                        rows="4" 
                                        className={`${inputClasses} resize-none`} 
                                        value={newEntry.whatWasDone} 
                                        onChange={(e) => setNewEntry({ ...newEntry, whatWasDone: e.target.value })}
                                        placeholder="Descreva o processo detalhadamente..."
                                    ></textarea>
                                </div>
                                
                                <div>
                                    <label className={labelClasses}>Principais Descobertas ou Insights</label>
                                    <p className="text-xs font-bold text-slate-800 mb-3 bg-white/50 inline-block px-2 py-1 rounded-md border-2 border-slate-900 border-dashed">
                                        O que aprenderam? Alguma hipótese foi confirmada?
                                    </p>
                                    <textarea 
                                        rows="3" 
                                        className={`${inputClasses} resize-none`} 
                                        value={newEntry.discoveries} 
                                        onChange={(e) => setNewEntry({ ...newEntry, discoveries: e.target.value })}
                                        placeholder="Registe as conclusões desta etapa..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* SECÇÃO 3: Gestão */}
                        <div className="bg-blue-300 border-4 border-slate-900 rounded-[2rem] p-6 md:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className={sectionTitleClasses}>
                                <Wrench className="w-7 h-7 stroke-[3]" /> 3. Gestão e Planeamento
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClasses}>Gestão de Obstáculos</label>
                                    <p className="text-xs font-bold text-slate-800 mb-3 bg-white/50 inline-block px-2 py-1 rounded-md border-2 border-slate-900 border-dashed">
                                        Houve algum problema técnico? Como o grupo resolveu?
                                    </p>
                                    <textarea 
                                        rows="2" 
                                        className={`${inputClasses} resize-none`} 
                                        value={newEntry.obstacles} 
                                        onChange={(e) => setNewEntry({ ...newEntry, obstacles: e.target.value })}
                                        placeholder="Obstáculos encontrados e soluções aplicadas..."
                                    ></textarea>
                                </div>
                                
                                <div>
                                    <label className={labelClasses}>Próximos Passos</label>
                                    <p className="text-xs font-bold text-slate-800 mb-3 bg-white/50 inline-block px-2 py-1 rounded-md border-2 border-slate-900 border-dashed">
                                        Tarefa para o próximo encontro e responsável.
                                    </p>
                                    <textarea 
                                        rows="2" 
                                        className={`${inputClasses} resize-none`} 
                                        value={newEntry.nextSteps} 
                                        onChange={(e) => setNewEntry({ ...newEntry, nextSteps: e.target.value })}
                                        placeholder="Ações futuras..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* TAGS */}
                        <div className="bg-slate-200 border-4 border-slate-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_#0f172a]">
                            <label className={labelClasses}>Tags (Separadas por vírgula)</label>
                            <input 
                                type="text" 
                                className={inputClasses} 
                                value={newEntry.tags} 
                                onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })} 
                                placeholder="Ex: Química, Robótica, Teste de Campo" 
                            />
                        </div>

                    </form>
                </div>

                {/* FOOTER / AÇÕES */}
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
                        onClick={handleAddEntry}
                        disabled={savingEntry} 
                        className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-slate-900 bg-teal-400 text-slate-900 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {savingEntry ? (
                            <><LoaderCircle className="w-5 h-5 animate-spin stroke-[3]" /> A SALVAR...</>
                        ) : (
                            <><BookOpen className="w-5 h-5 stroke-[3]" /> SALVAR NO DIÁRIO</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}