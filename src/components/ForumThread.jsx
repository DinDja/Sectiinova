import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { ArrowLeft, Lock, MessageCircle, Pin, Send, Trash2, Loader2 } from 'lucide-react';
import { subscribeToMessages, fetchMessagesPage, postMessage, deleteMessage } from '../services/forumService';
import Toast from './Toast';

// --- Funções Auxiliares (Fora do componente para evitar recriação a cada render) ---
const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (autorId) => {
    const colors = [
        'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
        'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-orange-500',
        'bg-cyan-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < (autorId || '').length; i++) {
        hash = autorId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const formatMessageDate = (createdAt) => {
    if (!createdAt) return { dateStr: '', timeStr: '' };
    
    // Suporte para Timestamp do Firebase ou Date/String padrão
    const date = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
    
    if (isNaN(date.getTime())) return { dateStr: '', timeStr: '' };

    return {
        timeStr: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        dateStr: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    };
};

// --- Componente de Mensagem Isolado e Memorizado ---
const MessageItem = memo(({ msg, isOwn, isModerator, onDelete, user }) => {
    const { dateStr, timeStr } = formatMessageDate(msg.createdAt);
    const authorName = user?.nome || msg.autor_nome || 'Usuário';
    const avatarSrc = user?.fotoBase64 || user?.fotoUrl || user?.avatar;

    return (
        <div className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div 
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden ${getAvatarColor(msg.autor_id)}`}
                title={authorName}
            >
                {avatarSrc ? (
                    <img
                        src={avatarSrc}
                        alt={`Avatar de ${authorName}`}
                        className="w-full h-full object-cover rounded-full"
                        loading="lazy"
                    />
                ) : (
                    getUserInitials(authorName)
                )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[75%] group flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 shadow-sm relative ${
                    isOwn
                        ? 'bg-amber-500 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                }`}>
                    {!isOwn && (
                        <p className="text-xs font-bold text-amber-600 mb-0.5">{authorName}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {msg.conteudo}
                    </p>
                </div>
                
                {/* Meta data & Actions */}
                <div className={`flex items-center gap-2 mt-1 px-1 ${isOwn ? 'justify-end' : ''}`}>
                    <span className="text-[10px] font-medium text-slate-400">
                        {dateStr} {timeStr}
                    </span>
                    {(isModerator || isOwn) && (
                        <button
                            onClick={() => onDelete(msg.id)}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all p-1 rounded-md hover:bg-red-50 focus:ring-2 focus:ring-red-200"
                            aria-label="Excluir mensagem"
                            title="Excluir mensagem"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-500 transition-colors" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});
MessageItem.displayName = 'MessageItem';

// --- Componente Principal ---
export default function ForumThread({ topic, clubeId, loggedUser, users = [], canParticipate, isModerator, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'error' });
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', description: '', onConfirm: null });
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreOlder, setHasMoreOlder] = useState(true);
    const [oldestMessageDoc, setOldestMessageDoc] = useState(null);

    const topLoadRef = useRef(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Carrega a página inicial de mensagens (mais recentes)
    useEffect(() => {
        if (!topic?.id) return;

        let canceled = false;

        const loadInitial = async () => {
            setLoadingMore(true);
            try {
                const { docs, lastDoc, hasMore } = await fetchMessagesPage(topic.id, 30);
                if (canceled) return;
                // docs estão em ordem desc (mais recentes primeiro) -> inverter para exibição asc
                const ordered = docs.reverse();
                setMessages(ordered);
                setOldestMessageDoc(lastDoc);
                setHasMoreOlder(hasMore);
            } catch (error) {
                console.error('Erro ao carregar mensagens:', error);
                setToast({ message: 'Não foi possível carregar as mensagens.', type: 'error' });
            } finally {
                if (!canceled) setLoadingMore(false);
            }
        };

        loadInitial();

        return () => {
            canceled = true;
        };
    }, [topic?.id]);

    // Paginação (scroll para cima) para buscar mensagens mais antigas
    useEffect(() => {
        if (!topLoadRef.current || !hasMoreOlder || loadingMore || !topic?.id) return;

        const observer = new IntersectionObserver(
            async ([entry]) => {
                if (!entry.isIntersecting) return;

                if (!oldestMessageDoc) return;

                setLoadingMore(true);
                try {
                    const { docs, lastDoc, hasMore } = await fetchMessagesPage(topic.id, 30, oldestMessageDoc);
                    if (docs.length > 0) {
                        setMessages((prev) => [...docs.reverse(), ...prev]);
                    }
                    setOldestMessageDoc(lastDoc);
                    setHasMoreOlder(hasMore);
                } catch (error) {
                    console.error('Erro ao carregar mensagens antigas:', error);
                    setToast({ message: 'Não foi possível carregar mensagens antigas.', type: 'error' });
                } finally {
                    setLoadingMore(false);
                }
            },
            {
                root: null,
                rootMargin: '150px',
                threshold: 0,
            },
        );

        observer.observe(topLoadRef.current);
        return () => observer.disconnect();
    }, [topLoadRef.current, hasMoreOlder, loadingMore, oldestMessageDoc, topic?.id]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize do Textarea
    const handleTextareaInput = useCallback((e) => {
        setNewMessage(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reseta
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; // Cresce até ~120px
        }
    }, []);

    const handleSend = useCallback(async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || sending || topic.locked) return;
        
        setSending(true);
        try {
            await postMessage({
                topicId: topic.id,
                clubeId,
                autor: loggedUser,
                conteudo: newMessage.trim()
            });
            setNewMessage('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto'; // Reseta altura
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            setToast({
                message:
                    error?.message ||
                    "Ocorreu um erro ao enviar sua mensagem. Tente novamente.",
                type: 'error',
            });
        } finally {
            setSending(false);
        }
    }, [newMessage, sending, topic, clubeId, loggedUser]);

    const handleDelete = useCallback(async (msgId) => {
        setConfirmModal({
            open: true,
            title: 'Excluir mensagem',
            description: 'Tem certeza que deseja excluir esta mensagem?',
            onConfirm: async () => {
                try {
                    await deleteMessage(msgId, topic.id);
                } catch (error) {
                    console.error('Erro ao excluir:', error);
                    setToast({ message: 'Não foi possível excluir a mensagem.', type: 'error' });
                } finally {
                    setConfirmModal((prev) => ({ ...prev, open: false }));
                }
            },
        });
    }, [topic?.id]);

    const ConfirmModal = () => {
        if (!confirmModal.open) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-lg">
                    <h2 className="text-lg font-bold mb-2">{confirmModal.title}</h2>
                    <p className="text-sm text-slate-600 mb-4">{confirmModal.description}</p>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                            className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => confirmModal.onConfirm?.()}
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <ConfirmModal />
            <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] bg-slate-50/50 rounded-2xl">
            {/* Header */}
            <header className="premium-card bg-white shadow-sm border border-slate-100 rounded-2xl p-4 mb-4 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-amber-400 outline-none"
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {topic.pinned && <Pin className="w-4 h-4 text-amber-500 shrink-0 fill-amber-500" title="Tópico Fixado" />}
                            {topic.locked && <Lock className="w-4 h-4 text-red-400 shrink-0" title="Tópico Bloqueado" />}
                            <h1 className="text-lg font-bold text-slate-800 truncate">{topic.titulo}</h1>
                        </div>
                        {topic.descricao && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">{topic.descricao}</p>
                        )}
                        <p className="text-xs font-medium text-slate-400 mt-1.5 flex items-center gap-1.5">
                            <span className="truncate max-w-[150px]">Criado por {topic.autor_nome || 'Usuário'}</span>
                            <span>•</span>
                            <span>{messages?.length || 0} mensagen{messages?.length !== 1 ? 's' : ''}</span>
                        </p>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 px-2 min-h-0 scroll-smooth custom-scrollbar">
                {/* Estado de Carregamento */}
                {messages === null && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                        <p className="text-slate-400 text-sm font-medium">Carregando mensagens...</p>
                    </div>
                )}

                {/* Estado Vazio */}
                {messages?.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                            <MessageCircle className="w-8 h-8 text-amber-400" />
                        </div>
                        <h3 className="text-slate-700 font-semibold mb-1">Nenhuma mensagem ainda</h3>
                        <p className="text-slate-500 text-sm max-w-sm">
                            Seja o primeiro a iniciar a conversa neste tópico!
                        </p>
                    </div>
                )}

                {/* Sentinel para carregar mensagens antigas */}
                <div ref={topLoadRef} className="h-1" />
                {loadingMore && (
                    <div className="text-center text-xs text-[#5AC8C8] py-2">Carregando mensagens antigas...</div>
                )}
                {/* Lista de Mensagens */}
                {messages?.map((msg) => (
                    <MessageItem
                        key={msg.id}
                        msg={msg}
                        isOwn={msg.autor_id === loggedUser?.id}
                        isModerator={isModerator}
                        onDelete={handleDelete}
                        user={users.find((u) => String(u.id) === String(msg.autor_id))}
                    />
                ))}
                
                {/* Âncora para o scroll automático */}
                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="shrink-0 mt-4">
                {topic.locked ? (
                    <div className="premium-card bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
                        <Lock className="w-4 h-4 text-red-400" />
                        Este tópico está bloqueado pelo moderador.
                    </div>
                ) : canParticipate ? (
                    <form onSubmit={handleSend} className="premium-card bg-white border border-slate-200 p-3 rounded-2xl flex gap-3 items-end shadow-sm">
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={handleTextareaInput}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder="Escreva sua mensagem..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-none text-sm resize-none transition-all placeholder:text-slate-400"
                            rows={1}
                            maxLength={3000}
                        />
                        <button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            aria-label="Enviar mensagem"
                            className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 focus:ring-4 focus:ring-amber-400/30 transition-all disabled:opacity-50 disabled:hover:bg-amber-500 shrink-0 flex items-center justify-center h-[42px] w-[42px]"
                        >
                            {sending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5 ml-0.5" /> /* ml-0.5 compensa visualmente o ícone de seta do Lucide */
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="premium-card bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-center text-sm font-medium text-slate-500">
                        Você precisa ser membro deste fórum para participar.
                    </div>
                )}
            </div>
            {toast.message && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ message: '', type: 'error' })}
                />
            )}
        </div>
    </>
    );
}