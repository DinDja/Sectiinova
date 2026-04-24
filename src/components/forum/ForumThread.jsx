import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { ArrowLeft, Lock, MessageCircle, Pin, Send, Trash2, Loader2, Pencil, X, Image as ImageIcon } from 'lucide-react';
import {
    subscribeToMessages,
    fetchMessagesPage,
    postMessage,
    deleteMessage,
    editMessage,
    togglePinMessage,
    FORUM_MESSAGE_AUTO_REMOVED_EVENT,
} from '../../services/forumService';
import Toast from './Toast';

// --- COMPONENTES AUXILIARES HQ ---
const ScreamTail = ({ className = "", fill = "#ffffff", flip = false }) => (
    <svg 
        className={`absolute z-20 pointer-events-none ${className} ${flip ? '-scale-x-100' : ''}`} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M2 2 L16 38 L22 18 L36 2" fill={fill} stroke="#0f172a" strokeWidth="3" strokeLinejoin="miter" />
        <path d="M1.5 2 L36.5 2" stroke={fill} strokeWidth="6" strokeLinecap="square" />
    </svg>
);

// --- FUNÇÕES UTILITÁRIAS ---
const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
        ? parts[0][0].toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (authorId) => {
    const colors = ['bg-yellow-400', 'bg-cyan-300', 'bg-teal-400', 'bg-pink-400', 'bg-orange-400'];
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
        <div className="w-12 h-12 bg-slate-200 border-[3px] border-slate-300 rounded-full shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
            <div className="h-4 bg-slate-200 rounded-full w-1/4" />
            <div className="h-20 bg-slate-100 border-[3px] border-slate-200 rounded-[2rem] w-3/4" />
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
                
                {/* Avatar HQ */}
                <div className="w-12 shrink-0 flex justify-center">
                    {showHeader && (
                        <div className={`w-12 h-12 rounded-full border-[3px] border-slate-900 shadow-sm flex items-center justify-center text-slate-900 text-lg font-black transition-transform hover:scale-110 z-10 ${getAvatarColor(msg.autor_id)}`}>
                            {!photoError && getUserPhoto(user) ? (
                                <img 
                                    src={getUserPhoto(user)} 
                                    className="w-full h-full object-cover rounded-full" 
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
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-yellow-400 px-4 py-1.5 rounded-full border-[2px] border-slate-900 shadow-sm mb-2">
                            {authorName}
                        </span>
                    )}

                    <div className="group relative">
                        {/* Balão de Mensagem Estilo HQ */}
                        <div
                            className={`px-6 py-4 border-[3px] border-slate-900 shadow-sm text-sm md:text-base font-bold text-slate-900 leading-relaxed break-words transition-all ${
                                isOwn
                                    ? 'bg-cyan-300 rounded-[2rem] rounded-tr-sm'
                                    : 'bg-white rounded-[2rem] rounded-tl-sm'
                            }`}
                        >
                            {msg.pinned && (
                                <span className="mb-3 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-black text-white bg-pink-500 px-3 py-1.5 rounded-full border-[2px] border-slate-900 shadow-sm">
                                    <Pin className="w-3.5 h-3.5 stroke-[3]" /> Fixada
                                </span>
                            )}
                            <p className="whitespace-pre-wrap">{msg.conteudo || 'Mensagem sem conteúdo.'}</p>
                            {msg.edited && (
                                <span className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-80">Editada</span>
                            )}
                        </div>

                        {/* Ações (Hover) */}
                        {(isModerator || isOwn) && (
                            <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 border-[3px] border-slate-900 p-2 rounded-full shadow-sm ${isOwn ? '-left-[120px] md:-left-[140px]' : '-right-[120px] md:-right-[140px]'}`}>
                                {(isOwn || isModerator) && (
                                    <button
                                        onClick={() => onEdit(msg)}
                                        className="p-2.5 rounded-full bg-white hover:bg-yellow-400 text-slate-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        title="Editar mensagem"
                                    >
                                        <Pencil className="w-4 h-4 stroke-[3]" />
                                    </button>
                                )}
                                {isModerator && (
                                    <button
                                        onClick={() => onTogglePin(msg.id, Boolean(msg.pinned))}
                                        className={`p-2.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 ${msg.pinned ? 'bg-pink-400 text-white' : 'bg-white text-slate-500 hover:bg-pink-400 hover:text-white'}`}
                                        title={msg.pinned ? 'Desfixar mensagem' : 'Fixar mensagem'}
                                    >
                                        <Pin className="w-4 h-4 stroke-[3]" />
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(msg.id)}
                                    className="p-2.5 rounded-full bg-white hover:bg-slate-900 hover:text-white text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    title="Excluir mensagem"
                                >
                                    <Trash2 className="w-4 h-4 stroke-[3]" />
                                </button>
                            </div>
                        )}
                    </div>

                    <span className="text-[10px] font-black text-slate-400 mt-2 px-3 uppercase tracking-widest">
                        {timeStr}
                    </span>
                </div>
            </div>
        );
    }
);
MessageItem.displayName = "MessageItem";


export default function ForumThread({ topic, clubeId, forumTheme = null, loggedUser, users = [], canParticipate = true, isModerator = true, onBack }) {
    const topicId = String(topic?.id || '');
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
            const { docs, lastDoc, hasMore } = await fetchMessagesPage(topicId, 25);
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
    }, [topicId]);

    useEffect(() => {
        if (!topicId) return;
        setMessages([]);
        setEditingMessage(null);
        setEditingText('');
        loadInitial();
    }, [loadInitial, topicId]);

    useEffect(() => {
        if (!topicId) return;
        const unsubscribe = subscribeToMessages(topicId, (liveMessages) => {
            setMessages(liveMessages);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
        });

        return () => unsubscribe();
    }, [topicId]);

    useEffect(() => {
        if (!topicId || typeof window === 'undefined') return;

        const handleAutoRemovedMessage = (event) => {
            const detail = event?.detail || {};
            const eventTopicId = String(detail?.topicId || '');
            if (!eventTopicId || eventTopicId !== topicId) {
                return;
            }

            const toastMessage = String(detail?.message || '').trim()
                || 'Sua mensagem foi removida automaticamente pela moderação.';

            setToast({
                message: toastMessage,
                type: 'warning',
            });
        };

        window.addEventListener(FORUM_MESSAGE_AUTO_REMOVED_EVENT, handleAutoRemovedMessage);
        return () => {
            window.removeEventListener(FORUM_MESSAGE_AUTO_REMOVED_EVENT, handleAutoRemovedMessage);
        };
    }, [topicId]);

    const handleLoadOlder = useCallback(async () => {
        if (loadingMore || !hasMoreOlder || !oldestMessageDoc) return;
        setLoadingMore(true);
        try {
            const { docs, lastDoc, hasMore } = await fetchMessagesPage(topicId, 25, oldestMessageDoc);
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
    }, [loadingMore, hasMoreOlder, oldestMessageDoc, topicId]);

    const handleSend = useCallback(async (e) => {
        e?.preventDefault();
        const text = newMessage.trim();
        if ((!text && !imagemBase64) || sending || !canWrite) return;

        setSending(true);
        try {
            await postMessage({ 
                topicId, 
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
    }, [newMessage, sending, canWrite, topicId, clubeId, loggedUser, imagemBase64]);

    const handleDelete = useCallback(async (messageId) => {
        try {
            await deleteMessage(messageId, topicId, {
                moderatorId: loggedUser?.id || '',
                reason: 'Remoção manual pelo moderador',
            });
        } catch (error) {
            setToast({ message: error?.message || 'Erro ao excluir mensagem.', type: 'error' });
        }
    }, [topicId, loggedUser?.id]);

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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-8 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            
            {/* INJEÇÃO DE CSS DA SCROLLBAR HQ */}
            <style>{`
                .hq-scrollbar::-webkit-scrollbar { width: 10px; }
                .hq-scrollbar::-webkit-scrollbar-track { background: transparent; border-left: 3px solid #0f172a; }
                .hq-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border: 3px solid #FAFAFA; border-radius: 10px; }
                .hq-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>

            <div className="w-full max-w-5xl h-[95vh] flex flex-col bg-white rounded-[3rem] border-[3px] border-slate-900 shadow-2xl animate-in zoom-in-[0.95] duration-300 overflow-hidden relative isolate">
                
                {/* HEADER DA THREAD HQ */}
                <header className="bg-cyan-300 border-b-[3px] border-slate-900 p-6 flex items-center gap-6 z-20 shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2.5px, transparent 2.5px)', backgroundSize: '16px 16px' }}></div>
                    <button
                        onClick={onBack}
                        className="w-12 h-12 bg-white border-[3px] border-slate-900 rounded-full flex items-center justify-center text-slate-900 shadow-sm hover:scale-110 active:scale-95 transition-transform shrink-0 z-10"
                        aria-label="Voltar para fórum"
                    >
                        <ArrowLeft className="w-6 h-6 stroke-[3]" />
                    </button>
                    <div className="flex-1 min-w-0 z-10">
                        <div className="flex items-center gap-3">
                            <h1 className="font-black text-2xl md:text-3xl uppercase tracking-tight text-slate-900 truncate bg-white px-5 py-2 rounded-full border-[3px] border-slate-900 shadow-sm">
                                {topic.titulo}
                            </h1>
                            {topic.locked && (
                                <div className="bg-pink-500 border-[3px] border-slate-900 p-2.5 rounded-full shadow-sm">
                                    <Lock className="w-4 h-4 stroke-[3] text-white" />
                                </div>
                            )}
                        </div>
                        {topic.descricao && (
                            <p className="text-sm font-bold text-slate-900 truncate mt-3 bg-yellow-400 inline-block px-4 py-1.5 rounded-full border-[3px] border-slate-900 shadow-sm">
                                {topic.descricao}
                            </p>
                        )}
                    </div>
                </header>

                {/* ÁREA DE MENSAGENS */}
                <div className="flex-1 overflow-y-auto hq-scrollbar relative bg-slate-50">
                    {/* Retícula HQ */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
                    
                    <div className="relative z-10 py-8">
                        {loadingInitial ? (
                            Array(5).fill(0).map((_, i) => <MessageSkeleton key={i} />)
                        ) : messages.length === 0 ? (
                            <div className="h-[50vh] flex flex-col items-center justify-center text-slate-900 space-y-6">
                                <div className="w-24 h-24 bg-yellow-400 border-[3px] border-slate-900 rounded-full shadow-sm flex items-center justify-center transform -rotate-6">
                                    <MessageCircle className="w-10 h-10 stroke-[2.5]" />
                                </div>
                                <p className="font-black uppercase tracking-widest text-lg text-slate-500">Inicie essa discussão!</p>
                            </div>
                        ) : (
                            <>
                                {hasMoreOlder && (
                                    <div className="flex justify-center mb-10">
                                        <button
                                            onClick={handleLoadOlder}
                                            disabled={loadingMore}
                                            className="px-6 py-3.5 bg-white border-[3px] border-slate-900 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-black uppercase tracking-widest text-xs rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
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
                    <div className="p-6 md:p-8 bg-yellow-400 border-y-[3px] border-slate-900 z-20 shrink-0">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                            <Pencil className="w-4 h-4 stroke-[3]" /> Editando mensagem
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                rows={2}
                                className="flex-1 rounded-[1.5rem] border-[3px] border-slate-900 p-5 text-sm font-bold text-slate-900 resize-none outline-none shadow-sm focus:ring-4 focus:ring-cyan-300/40 transition-all"
                            />
                            <div className="flex md:flex-col gap-3 shrink-0">
                                <button
                                    onClick={handleConfirmEdit}
                                    className="flex-1 px-6 py-3.5 text-xs font-black uppercase tracking-widest bg-cyan-300 border-[3px] border-slate-900 text-slate-900 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform"
                                >
                                    Salvar
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingMessage(null);
                                        setEditingText('');
                                    }}
                                    className="flex-1 px-6 py-3.5 text-xs font-black uppercase tracking-widest bg-white border-[3px] border-slate-900 text-slate-600 hover:text-slate-900 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FOOTER DE ENVIO */}
                <footer className="p-6 md:p-8 bg-white border-t-[3px] border-slate-900 z-20 shrink-0 relative">
                    {!canParticipate ? (
                        <div className="bg-slate-50 p-6 rounded-[2rem] border-[3px] border-dashed border-slate-300 text-center text-sm font-black uppercase tracking-widest text-slate-500">
                            Somente membros do clube podem enviar mensagens.
                        </div>
                    ) : topic.locked ? (
                        <div className="bg-pink-500 p-6 rounded-[2rem] border-[3px] border-slate-900 text-center text-sm font-black uppercase tracking-widest text-white shadow-sm transform -rotate-1">
                            <Lock className="w-5 h-5 stroke-[3] inline-block mr-2 -mt-1" />
                            Tópico bloqueado pela moderação.
                        </div>
                    ) : (
                        <form
                            onSubmit={handleSend}
                            className="flex flex-col md:flex-row items-end gap-4 relative z-10"
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
                                className="flex-1 w-full bg-slate-50 border-[3px] border-slate-900 rounded-[2rem] focus:bg-white p-6 text-sm font-bold text-slate-900 resize-none max-h-32 shadow-sm focus:ring-4 focus:ring-cyan-300/40 transition-all outline-none"
                            />
                            <button
                                disabled={!newMessage.trim() || sending}
                                className="w-full md:w-auto p-6 text-slate-900 bg-yellow-400 border-[3px] border-slate-900 rounded-full hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-transform flex items-center justify-center"
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