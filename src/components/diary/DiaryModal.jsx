import React from 'react';
import { Map, BookOpen, Wrench } from 'lucide-react';

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col my-8">
                <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100 bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-[#10B981]">Novo Registro no Diário de Bordo</h2>
                        <p className="text-gray-500 text-xs mt-1">Sistematize seus experimentos e garanta a autoria do projeto.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
                </div>

                <form onSubmit={handleAddEntry} className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center"><Map className="w-5 h-5 mr-2 text-[#FF5722]" /> 1. Contexto da Sessão</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Título Resumido</label>
                                <input type="text" required className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none" value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} placeholder="Ex: Montagem do Sensor" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Duração da Sessão</label>
                                <input type="text" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none" value={newEntry.duration} onChange={(e) => setNewEntry({ ...newEntry, duration: e.target.value })} placeholder="Ex: 2 horas" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Etapa da Investigação</label>
                            <select className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none bg-white" value={newEntry.stage} onChange={(e) => setNewEntry({ ...newEntry, stage: e.target.value })}>
                                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center"><BookOpen className="w-5 h-5 mr-2 text-[#FF5722]" /> 2. Registro do Dia</h3>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">O que foi feito hoje?</label>
                            <p className="text-[10px] text-gray-400 mb-2">Descreva procedimentos, discussões ou experimentos realizados.</p>
                            <textarea required rows="3" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none resize-none" value={newEntry.whatWasDone} onChange={(e) => setNewEntry({ ...newEntry, whatWasDone: e.target.value })}></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Principais Descobertas ou Insights</label>
                            <p className="text-[10px] text-gray-400 mb-2">O que aprenderam? Alguma hipótese foi confirmada?</p>
                            <textarea rows="2" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none resize-none" value={newEntry.discoveries} onChange={(e) => setNewEntry({ ...newEntry, discoveries: e.target.value })}></textarea>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center"><Wrench className="w-5 h-5 mr-2 text-[#FF5722]" /> 3. Gestão e Planejamento</h3>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Gestão de Obstáculos</label>
                            <p className="text-[10px] text-gray-400 mb-2">Houve algum problema técnico? Como o grupo resolveu?</p>
                            <textarea rows="2" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none resize-none" value={newEntry.obstacles} onChange={(e) => setNewEntry({ ...newEntry, obstacles: e.target.value })}></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Próximos Passos</label>
                            <p className="text-[10px] text-gray-400 mb-2">Tarefa para o próximo encontro e responsável.</p>
                            <textarea rows="2" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none resize-none" value={newEntry.nextSteps} onChange={(e) => setNewEntry({ ...newEntry, nextSteps: e.target.value })}></textarea>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tags (Separadas por vírgula)</label>
                        <input type="text" className="w-full border border-gray-300 rounded p-2.5 text-sm focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none" value={newEntry.tags} onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })} placeholder="Ex: Química, Robótica, MeioAmbiente" />
                    </div>

                    <div className="pt-4 flex gap-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded hover:bg-gray-50 transition-colors text-sm">Cancelar</button>
                        <button type="submit" disabled={savingEntry} className="flex-1 bg-[#10B981] text-white font-bold py-3 rounded hover:bg-[#059669] transition-colors text-sm shadow-md">
                            {savingEntry ? 'Salvando...' : 'Salvar no Diário'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

