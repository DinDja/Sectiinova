import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { ArrowLeft, Lock, MessageCircle, Pin, Send, Trash2, Loader2, Pencil, X, Image as ImageIcon } from 'lucide-react';
import {
    subscribeToMessages,
    fetchMessagesPage,
    postMessage,
    deleteMessage,
    editMessage,
    togglePinMessage,
} from '../../services/forumService';
import { compressImageToBase64, validateImageFile, getBase64Size } from '../../utils/imageCompression';
import Toast from './Toast';

// --- FUNÇÕES UTILITÁRIAS ---
const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
        ? parts[0][0].toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (authorId) => {
    const colors = ['bg-yellow-300', 'bg-blue-400', 'bg-teal-400', 'bg-pink-400', 'bg-orange-400'];
    let hash = 0;
    for (let i = 0; i < (authorId || '').length; i += 1) {
        hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getUserPhoto = (user) => {
    if (!user) return null;
    return user.fotoBase64 || user.fotoUrl || user.foto || user.photoUrl || user.photo || user.profilePhoto || user.imagemPerfil || user.avatar || null;
};

// --- COMPONENTES DA THREAD ---
const MessageSkeleton = () => (
    <div className="flex gap-4 animate-pulse p-4">
        <div className="w-12 h-12 bg-slate-200 border-4 border-slate-900 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
            <div className="h-4 bg-slate-200 border-2 border-slate-900 rounded w-1/4" />
            <div className="h-20 bg-slate-100 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-2xl w-3/4" />
        </div>
    </div>
);

const MessageItem = memo(
    ({ msg, isOwn, isModerator, showHeader, user, onDelete, onEdit, onTogglePin }) => {
        const [photoError, setPhotoError] = useState(false);
        const date = typeof msg.createdAt?.toDate === 'function' ? msg.createdAt.toDate() : new Date(msg.createdAt || Date.now());
        const timeStr = Number.isNaN(date.getTime())
            ? '--:--'
            : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const authorName = user?.nome || msg.autor_nome || 'Usuário';

        return (
            <div className={`flex gap-4 px-4 sm:px-8 ${isOwn ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-8' : 'mt-3'}`}>
                
                {/* Avatar Brutalista */}
                <div className="w-12 shrink-0 flex justify-center">
                    {showHeader && (
                        <div className={`w-12 h-12 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center text-slate-900 text-lg font-black transform ${isOwn ? 'rotate-3' : '-rotate-3'} ${getAvatarColor(msg.autor_id)}`}>
                            {!photoError && getUserPhoto(user) ? (
                                <img 
                                    src={getUserPhoto(user)} 
                                    className="w-full h-full object-cover rounded-lg" 
                                    alt="" 
                                    onError={() => setPhotoError(true)}
                                />
                            ) : (
                                getUserInitials(authorName)
                            )}
                        </div>
                    )}
                </div>

                <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {showHeader && !isOwn && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-yellow-300 px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] mb-3 transform -rotate-1">
                            {authorName}
                        </span>
                    )}

                    <div className="group relative">
                        {/* Balão de Mensagem */}
                        <div
                            className={`px-5 py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] text-sm md:text-base font-bold text-slate-900 leading-relaxed break-words transition-all ${
                                isOwn
                                    ? 'bg-teal-400 rounded-tr-none'
                                    : 'bg-white rounded-tl-none'
                            }`}
                        >
                            {msg.pinned && (
                                <span className="mb-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black text-slate-900 bg-pink-400 px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transform -rotate-2">
                                    <Pin className="w-3.5 h-3.5 stroke-[3]" /> Fixada
                                </span>
                            )}
                            <p className="whitespace-pre-wrap">{msg.conteudo || 'Mensagem sem conteúdo.'}</p>
                            {msg.edited && (
                                <span className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">Editada</span>
                            )}
                        </div>

                        {/* Ações (Hover) */}
                        {(isModerator || isOwn) && (
                            <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? '-left-[140px] md:-left-[150px]' : '-right-[140px] md:-right-[150px]'}`}>
                                {(isOwn || isModerator) && (
                                    <button
                                        onClick={() => onEdit(msg)}
                                        className="p-2 rounded-xl bg-yellow-300 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] text-slate-900 transition-all"
                                        title="Editar mensagem"
                                    >
                                        <Pencil className="w-4 h-4 stroke-[3]" />
                                    </button>
                                )}
                                {isModerator && (
                                    <button
                                        onClick={() => onTogglePin(msg.id, Boolean(msg.pinned))}
                                        className={`p-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] text-slate-900 transition-all ${msg.pinned ? 'bg-pink-400' : 'bg-white'}`}
                                        title={msg.pinned ? 'Desfixar mensagem' : 'Fixar mensagem'}
                                    >
                                        <Pin className="w-4 h-4 stroke-[3]" />
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(msg.id)}
                                    className="p-2 rounded-xl bg-red-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] text-slate-900 transition-all"
                                    title="Excluir mensagem"
                                >
                                    <Trash2 className="w-4 h-4 stroke-[3]" />
                                </button>
                            </div>
                        )}
                    </div>

                    <span className="text-[10px] font-black text-slate-500 mt-2 px-2 uppercase tracking-widest">
                        {timeStr}
                    </span>
                </div>
            </div>
        );
    }
);
MessageItem.displayName = "MessageItem";


export default function ForumThread({ topic, clubeId, forumTheme = null, loggedUser, users = [], canParticipate = true, isModerator = true, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [imagemBase64, setImagemBase64] = useState(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreOlder, setHasMoreOlder] = useState(true);
    const [oldestMessageDoc, setOldestMessageDoc] = useState(null);
    const [sending, setSending] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'error' });

    const messagesEndRef = useRef(null);

    const canWrite = useMemo(() => canParticipate && !topic?.locked, [canParticipate, topic?.locked]);

    // Criar mapa de usuários para acesso rápido por ID
    const usersMap = useMemo(() => {
        const map = new Map();
        users.forEach((user) => {
            map.set(String(user.id), user);
        });
        return map;
    }, [users]);

    const loadInitial = useCallback(async () => {
        setLoadingInitial(true);
        try {
            const { docs, lastDoc, hasMore } = await fetchMessagesPage(topic?.id, 25);
            const ordered = docs
                .reverse()
                .sort((a, b) => {
                    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                    const ta = a.createdAt?.toMillis?.() || 0;
                    const tb = b.createdAt?.toMillis?.() || 0;
                    return ta - tb;
                });
            setMessages(ordered);
            setOldestMessageDoc(lastDoc);
            setHasMoreOlder(hasMore);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
        } catch {
            setToast({ message: 'Erro ao carregar mensagens.', type: 'error' });
        } finally {
            setLoadingInitial(false);
        }
    }, [topic?.id]);

    useEffect(() => {
        if(!topic) return;
        setMessages([]);
        setEditingMessage(null);
        setEditingText('');
        loadInitial();
    }, [loadInitial, topic]);

    useEffect(() => {
        if(!topic) return;
        const unsubscribe = subscribeToMessages(topic.id, (liveMessages) => {
            setMessages(liveMessages);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
        });

        return () => unsubscribe();
    }, [topic]);

    const handleLoadOlder = useCallback(async () => {
        if (loadingMore || !hasMoreOlder || !oldestMessageDoc) return;
        setLoadingMore(true);
        try {
            const { docs, lastDoc, hasMore } = await fetchMessagesPage(topic?.id, 25, oldestMessageDoc);
            const older = docs.reverse();
            setMessages((prev) => {
                const merged = [...older, ...prev];
                return merged.sort((a, b) => {
                    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                    const ta = a.createdAt?.toMillis?.() || 0;
                    const tb = b.createdAt?.toMillis?.() || 0;
                    return ta - tb;
                });
            });
            setOldestMessageDoc(lastDoc);
            setHasMoreOlder(hasMore);
        } catch {
            setToast({ message: 'Erro ao carregar mensagens antigas.', type: 'error' });
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMoreOlder, oldestMessageDoc, topic?.id]);

    const handleSend = useCallback(async (e) => {
        e?.preventDefault();
        const text = newMessage.trim();
        if ((!text && !imagemBase64) || sending || !canWrite) return;

        setSending(true);
        try {
            await postMessage({ 
                topicId: topic?.id, 
                clubeId, 
                autor: loggedUser, 
                conteudo: text,
                imagemBase64: imagemBase64,
            });
            setNewMessage('');
            setImagemBase64(null);
        } catch (error) {
            setToast({ message: error?.message || 'Erro ao enviar mensagem.', type: 'error' });
        } finally {
            setSending(false);
        }
    }, [newMessage, sending, canWrite, topic?.id, clubeId, loggedUser, imagemBase64]);

    const handleDelete = useCallback(async (messageId) => {
        try {
            await deleteMessage(messageId, topic?.id, {
                moderatorId: loggedUser?.id || '',
                reason: 'Remocao manual pelo moderador',
            });
        } catch (error) {
            setToast({ message: error?.message || 'Erro ao excluir mensagem.', type: 'error' });
        }
    }, [topic?.id, loggedUser?.id]);

    const handleTogglePin = useCallback(async (messageId, currentPinned) => {
        try {
            await togglePinMessage(messageId, currentPinned, loggedUser?.id || '');
        } catch (error) {
            setToast({ message: error?.message || 'Erro ao fixar mensagem.', type: 'error' });
        }
    }, [loggedUser?.id]);

    const handleStartEdit = useCallback((msg) => {
        setEditingMessage(msg);
        setEditingText(String(msg?.conteudo || ''));
    }, []);

    const handleConfirmEdit = useCallback(async () => {
        const text = editingText.trim();
        if (!editingMessage?.id || !text) return;

        try {
            await editMessage(editingMessage.id, text, { id: loggedUser?.id || '' });
            setEditingMessage(null);
            setEditingText('');
        } catch (error) {
            setToast({ message: error?.message || 'Erro ao editar mensagem.', type: 'error' });
        }
    }, [editingText, editingMessage, loggedUser?.id]);

    if (!topic) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-8 bg-slate-900/90 backdrop-blur-sm overflow-hidden">
            
            {/* INJEÇÃO DE CSS DA SCROLLBAR */}
            <style>{`
                .neo-scrollbar::-webkit-scrollbar { width: 10px; }
                .neo-scrollbar::-webkit-scrollbar-track { background: transparent; border-left: 4px solid #0f172a; }
                .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border: 2px solid #FAFAFA; border-radius: 0px; }
            `}</style>

            <div className="w-full max-w-5xl h-[95vh] flex flex-col bg-[#FAFAFA] rounded-[2rem] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] animate-in zoom-in-[0.95] duration-200 overflow-hidden relative">
                
                {/* HEADER DA THREAD NEO-BRUTALISTA */}
                <header className="bg-blue-400 border-b-4 border-slate-900 p-6 flex items-center gap-6 z-20 shrink-0">
                    <button
                        onClick={onBack}
                        className="w-12 h-12 bg-white border-4 border-slate-900 rounded-xl flex items-center justify-center text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0 active:translate-x-0 transition-all shrink-0"
                        aria-label="Voltar para fórum"
                    >
                        <ArrowLeft className="w-6 h-6 stroke-[3]" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h1 className="font-black text-2xl md:text-3xl uppercase tracking-tighter text-slate-900 truncate bg-white px-3 py-1 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-1">
                                {topic.titulo}
                            </h1>
                            {topic.locked && (
                                <div className="bg-red-400 border-2 border-slate-900 p-1.5 rounded-lg shadow-[2px_2px_0px_0px_#0f172a]">
                                    <Lock className="w-4 h-4 stroke-[3] text-slate-900" />
                                </div>
                            )}
                        </div>
                        {topic.descricao && (
                            <p className="text-sm font-bold text-slate-800 truncate mt-3 bg-yellow-300 inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transform rotate-1">
                                {topic.descricao}
                            </p>
                        )}
                    </div>
                </header>

                {/* ÁREA DE MENSAGENS */}
                <div className="flex-1 overflow-y-auto neo-scrollbar relative bg-[#FAFAFA]">
                    {/* Padrão Blueprint Neo-Brutalista */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#0f172a15_2px,transparent_2px),linear-gradient(to_bottom,#0f172a15_2px,transparent_2px)] bg-[size:40px_40px]"></div>
                    
                    <div className="relative z-10 py-6">
                        {loadingInitial ? (
                            Array(5).fill(0).map((_, i) => <MessageSkeleton key={i} />)
                        ) : messages.length === 0 ? (
                            <div className="h-[50vh] flex flex-col items-center justify-center text-slate-900 space-y-6">
                                <div className="w-24 h-24 bg-yellow-300 border-4 border-slate-900 rounded-3xl shadow-[8px_8px_0px_0px_#0f172a] flex items-center justify-center transform rotate-3">
                                    <MessageCircle className="w-12 h-12 stroke-[2.5]" />
                                </div>
                                <p className="font-black uppercase tracking-widest text-lg">Inicie essa discussão!</p>
                            </div>
                        ) : (
                            <>
                                {hasMoreOlder && (
                                    <div className="flex justify-center mb-8">
                                        <button
                                            onClick={handleLoadOlder}
                                            disabled={loadingMore}
                                            className="px-6 py-3 bg-white border-4 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-xs rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all disabled:opacity-50"
                                        >
                                            {loadingMore ? 'Carregando...' : 'Ver mensagens anteriores'}
                                        </button>
                                    </div>
                                )}

                                {messages.map((msg, index) => {
                                    const prevMsg = messages[index - 1];
                                    const showHeader = !prevMsg || prevMsg.autor_id !== msg.autor_id;
                                    return (
                                        <MessageItem
                                            key={msg.id}
                                            msg={msg}
                                            isOwn={msg.autor_id === loggedUser?.id}
                                            isModerator={isModerator}
                                            showHeader={showHeader}
                                            user={usersMap.get(String(msg.autor_id))}
                                            onDelete={handleDelete}
                                            onEdit={handleStartEdit}
                                            onTogglePin={handleTogglePin}
                                        />
                                    );
                                })}
                                <div ref={messagesEndRef} className="h-4" />
                            </>
                        )}
                    </div>
                </div>

                {/* ÁREA DE EDIÇÃO */}
                {editingMessage && (
                    <div className="p-6 bg-yellow-300 border-y-4 border-slate-900 z-20 shrink-0">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-900 mb-3 flex items-center gap-2">
                            <Pencil className="w-4 h-4 stroke-[3]" /> Editando mensagem
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                rows={2}
                                className="flex-1 rounded-xl border-4 border-slate-900 p-4 text-sm font-bold text-slate-900 resize-none outline-none shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all"
                            />
                            <div className="flex md:flex-col gap-3 shrink-0">
                                <button
                                    onClick={handleConfirmEdit}
                                    className="flex-1 px-6 py-3 text-xs font-black uppercase tracking-widest bg-teal-400 border-4 border-slate-900 text-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0 transition-all"
                                >
                                    Salvar
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingMessage(null);
                                        setEditingText('');
                                    }}
                                    className="flex-1 px-6 py-3 text-xs font-black uppercase tracking-widest bg-white border-4 border-slate-900 text-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FOOTER DE ENVIO */}
                <footer className="p-6 md:p-8 bg-white border-t-4 border-slate-900 z-20 shrink-0">
                    {!canParticipate ? (
                        <div className="bg-slate-100 p-6 rounded-2xl border-4 border-dashed border-slate-300 text-center text-sm font-black uppercase tracking-widest text-slate-500">
                            Somente membros do clube podem enviar mensagens.
                        </div>
                    ) : topic.locked ? (
                        <div className="bg-red-400 p-6 rounded-2xl border-4 border-slate-900 text-center text-sm font-black uppercase tracking-widest text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform rotate-1">
                            <Lock className="w-5 h-5 stroke-[3] inline-block mr-2 -mt-1" />
                            Tópico bloqueado pela moderação.
                        </div>
                    ) : (
                        <form
                            onSubmit={handleSend}
                            className="flex flex-col md:flex-row items-end gap-4"
                        >
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                                placeholder="Digite sua mensagem aqui..."
                                rows={2}
                                className="flex-1 w-full bg-slate-50 border-4 border-slate-900 rounded-2xl focus:bg-white p-5 text-sm font-bold text-slate-900 resize-none max-h-32 shadow-[6px_6px_0px_0px_#0f172a] focus:shadow-[6px_6px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all outline-none"
                            />
                            <button
                                disabled={!newMessage.trim() || sending}
                                className="w-full md:w-auto p-5 text-slate-900 bg-teal-400 border-4 border-slate-900 rounded-2xl hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] shadow-[6px_6px_0px_0px_#0f172a] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center"
                                aria-label="Enviar mensagem"
                            >
                                {sending ? <Loader2 className="w-6 h-6 animate-spin stroke-[3]" /> : <Send className="w-6 h-6 stroke-[3]" />}
                            </button>
                        </form>
                    )}
                </footer>

                {toast.message && (
                    <Toast
                        {...toast}
                        onClose={() => setToast({ message: '', type: 'error' })}
                    />
                )}
            </div>
        </div>
    );
}