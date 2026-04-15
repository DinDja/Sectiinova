import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { ArrowLeft, Lock, MessageCircle, Pin, Send, Trash2, Loader2, Pencil, X, Image } from 'lucide-react';
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

const normalizeColorValue = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
        if (hexMatch[1].length === 3) {
            const [r, g, b] = hexMatch[1].split('');
            return `#${r}${r}${g}${g}${b}${b}`;
        }
        return raw;
    }

    const rgbMatch = raw.match(
        /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i,
    );
    if (!rgbMatch) return '';

    const rgbValues = rgbMatch.slice(1).map((channel) => Number(channel));
    if (rgbValues.some((channel) => Number.isNaN(channel) || channel > 255)) {
        return '';
    }

    return `rgb(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]})`;
};

const parseColorToRgbTuple = (color) => {
    const normalized = normalizeColorValue(color);
    if (!normalized) return null;

    if (normalized.startsWith('#')) {
        return [
            Number.parseInt(normalized.slice(1, 3), 16),
            Number.parseInt(normalized.slice(3, 5), 16),
            Number.parseInt(normalized.slice(5, 7), 16),
        ];
    }

    const rgbMatch = normalized.match(
        /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i,
    );
    if (!rgbMatch) return null;

    return rgbMatch.slice(1).map((channel) => Number(channel));
};

const withAlpha = (color, alpha = 1) => {
    const tuple = parseColorToRgbTuple(color) || [90, 200, 200];
    const normalizedAlpha = Math.max(0, Math.min(1, Number(alpha)));
    return `rgba(${tuple[0]}, ${tuple[1]}, ${tuple[2]}, ${normalizedAlpha})`;
};

const getUserInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
        ? parts[0][0].toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (authorId) => {
    const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-sky-500'];
    let hash = 0;
    for (let i = 0; i < (authorId || '').length; i += 1) {
        hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Procurar por foto em vários possíveis nomes de campo
const getUserPhoto = (user) => {
    if (!user) return null;
    // Priorizar fotoBase64 (em base64), depois fotoUrl e outros fallbacks
    return user.fotoBase64 || user.fotoUrl || user.foto || user.photoUrl || user.photo || user.profilePhoto || user.imagemPerfil || user.avatar || null;
};

const MessageSkeleton = () => (
    <div className="flex gap-3 animate-pulse p-2">
        <div className="w-9 h-9 bg-slate-200 rounded-full" />
        <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-10 bg-slate-100 rounded-2xl w-3/4" />
        </div>
    </div>
);

const MessageItem = memo(
    ({ msg, isOwn, isModerator, showHeader, user, onDelete, onEdit, onTogglePin, primaryColor, secondaryColor }) => {
        const [photoError, setPhotoError] = useState(false);
        const date = typeof msg.createdAt?.toDate === 'function' ? msg.createdAt.toDate() : new Date(msg.createdAt);
        const timeStr = Number.isNaN(date.getTime())
            ? '--:--'
            : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const authorName = user?.nome || msg.autor_nome || 'Usuario';
        const ownBubbleStyle = {
            backgroundColor: primaryColor,
            color: '#ffffff',
        };
        const otherBubbleStyle = {
            borderColor: withAlpha(primaryColor, 0.22),
        };

        return (
            <div className={`flex gap-3 px-2 ${isOwn ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-4' : 'mt-1'}`}>
                <div className="w-9 shrink-0">
                    {showHeader && (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${getAvatarColor(msg.autor_id)}`}>
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

                <div className={`max-w-[100%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {showHeader && !isOwn && (
                        <span className="text-[11px] font-bold text-slate-500 ml-1 mb-1">{authorName}</span>
                    )}

                    <div
                        className={`group relative px-4 py-2.5 rounded-2xl text-sm transition-all shadow-sm ${
                            isOwn
                                ? 'rounded-tr-none'
                                : 'bg-white border text-slate-700 rounded-tl-none hover:border-slate-300'
                        }`}
                        style={isOwn ? ownBubbleStyle : otherBubbleStyle}
                    >
                        {msg.pinned && (
                            <span
                                className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-white px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: withAlpha(secondaryColor, 0.72) }}
                            >
                                <Pin className="w-3 h-3" /> Fixada
                            </span>
                        )}
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.conteudo}</p>
                        {msg.edited && (
                            <span className="mt-1 block text-[10px] opacity-80">editada</span>
                        )}

                        {(isModerator || isOwn) && (
                            <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? '-left-[132px]' : '-right-[132px]'}`}>
                                {(isOwn || isModerator) && (
                                    <button
                                        onClick={() => onEdit(msg)}
                                        className="p-1.5 rounded-full bg-white border shadow-sm text-slate-500 hover:text-slate-700"
                                        title="Editar mensagem"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {isModerator && (
                                    <button
                                        onClick={() => onTogglePin(msg.id, Boolean(msg.pinned))}
                                        className="p-1.5 rounded-full bg-white border shadow-sm text-slate-500 hover:brightness-95"
                                        style={{ color: msg.pinned ? secondaryColor : undefined }}
                                        title={msg.pinned ? 'Desfixar mensagem' : 'Fixar mensagem'}
                                    >
                                        <Pin className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(msg.id)}
                                    className="p-1.5 rounded-full bg-white border shadow-sm text-slate-500 hover:text-red-500"
                                    title="Excluir mensagem"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <span className="text-[9px] text-slate-400 mt-0.5 px-1 uppercase tracking-wider font-semibold">
                        {timeStr}
                    </span>
                </div>
            </div>
        );
    },
);

export default function ForumThread({ topic, clubeId, forumTheme = null, loggedUser, users = [], canParticipate, isModerator, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [imagemBase64, setImagemBase64] = useState(null);
    const [imagemPreview, setImagemPreview] = useState(null);
    const [compressingImage, setCompressingImage] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreOlder, setHasMoreOlder] = useState(true);
    const [oldestMessageDoc, setOldestMessageDoc] = useState(null);
    const [sending, setSending] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [toast, setToast] = useState({ message: '', type: 'error' });

    const messagesEndRef = useRef(null);
    const imageInputRef = useRef(null);

    const canWrite = useMemo(() => canParticipate && !topic?.locked, [canParticipate, topic?.locked]);

    const primaryColor = useMemo(
        () => normalizeColorValue(forumTheme?.primary) || 'rgb(90, 200, 200)',
        [forumTheme?.primary],
    );

    const secondaryColor = useMemo(
        () => normalizeColorValue(forumTheme?.secondary) || 'rgb(61, 176, 176)',
        [forumTheme?.secondary],
    );

    const bannerUrl = useMemo(
        () => String(forumTheme?.bannerUrl || '').trim(),
        [forumTheme?.bannerUrl],
    );

    const threadHeaderStyle = useMemo(() => {
        if (bannerUrl) {
            return {
                backgroundImage: `linear-gradient(118deg, ${withAlpha(primaryColor, 0.8)} 0%, ${withAlpha(secondaryColor, 0.68)} 52%, rgba(15, 23, 42, 0.58) 100%), url("${bannerUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            };
        }

        return {
            backgroundImage: `linear-gradient(118deg, ${withAlpha(primaryColor, 0.18)} 0%, ${withAlpha(secondaryColor, 0.14)} 100%)`,
        };
    }, [bannerUrl, primaryColor, secondaryColor]);

    const threadBodyStyle = useMemo(() => {
        const baseOverlay = `linear-gradient(180deg, ${withAlpha(primaryColor, 0.08)} 0%, ${withAlpha(secondaryColor, 0.07)} 100%)`;

        if (bannerUrl) {
            return {
                backgroundImage: `${baseOverlay}, linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(241, 245, 249, 0.9)), url("${bannerUrl}"), url("https://www.transparenttextures.com/patterns/cubes.png")`,
                backgroundSize: 'auto, auto, cover, auto',
                backgroundPosition: 'center, center, center, center',
                backgroundBlendMode: 'normal, normal, multiply, normal',
                backgroundAttachment: 'scroll, scroll, fixed, fixed',
            };
        }

        return {
            backgroundImage: `${baseOverlay}, url("https://www.transparenttextures.com/patterns/cubes.png")`,
            backgroundAttachment: 'scroll, fixed',
        };
    }, [bannerUrl, primaryColor, secondaryColor]);

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
            const { docs, lastDoc, hasMore } = await fetchMessagesPage(topic.id, 25);
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
    }, [topic.id]);

    useEffect(() => {
        setMessages([]);
        setEditingMessage(null);
        setEditingText('');
        loadInitial();
    }, [loadInitial]);

    // Subscrever a atualizações em tempo real das mensagens
    useEffect(() => {
        const unsubscribe = subscribeToMessages(topic.id, (liveMessages) => {
            setMessages(liveMessages);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
        });

        return () => unsubscribe();
    }, [topic.id]);

    const handleLoadOlder = useCallback(async () => {
        if (loadingMore || !hasMoreOlder || !oldestMessageDoc) return;
        setLoadingMore(true);
        try {
            const { docs, lastDoc, hasMore } = await fetchMessagesPage(topic.id, 25, oldestMessageDoc);
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
    }, [loadingMore, hasMoreOlder, oldestMessageDoc, topic.id]);

    const handleSend = useCallback(async (e) => {
        e?.preventDefault();
        const text = newMessage.trim();
        if ((!text && !imagemBase64) || sending || !canWrite) return;

        setSending(true);
        try {
            await postMessage({ 
                topicId: topic.id, 
                clubeId, 
                autor: loggedUser, 
                conteudo: text,
                imagemBase64: imagemBase64,
            });
            setNewMessage('');
            setImagemBase64(null);
            setImagemPreview(null);
            // A subscrição em tempo real (subscribeToMessages) já atualizará as mensagens automaticamente
        } catch (error) {
            console.error('Erro detalhado ao enviar mensagem:', error);
            const errorMsg = error?.message || error?.toString() || 'Erro desconhecido ao enviar mensagem.';
            setToast({ message: errorMsg, type: 'error' });
        } finally {
            setSending(false);
        }
    }, [newMessage, sending, canWrite, topic.id, clubeId, loggedUser, imagemBase64]);

    const handleDelete = useCallback(async (messageId) => {
        try {
            await deleteMessage(messageId, topic.id, {
                moderatorId: loggedUser?.id || '',
                reason: 'Remocao manual pelo moderador',
            });
            // A subscrição em tempo real já atualizará automaticamente quando a mensagem for deletada
        } catch (error) {
            setToast({ message: error?.message || 'Erro ao excluir mensagem.', type: 'error' });
        }
    }, [topic.id, loggedUser?.id]);

    const handleTogglePin = useCallback(async (messageId, currentPinned) => {
        try {
            await togglePinMessage(messageId, currentPinned, loggedUser?.id || '');
            // A subscrição em tempo real já atualizará automaticamente quando a mensagem for fixada/desxada
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
            // A subscrição em tempo real já atualizará automaticamente quando a mensagem for editada
        } catch (error) {
            setToast({ message: error?.message || 'Erro ao editar mensagem.', type: 'error' });
        }
    }, [editingText, editingMessage, loggedUser?.id, loadInitial]);

    return (
        <div
            className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-6rem)] rounded-3xl overflow-hidden border shadow-xl"
            style={{
                '--thread-primary-ring': withAlpha(primaryColor, 0.36),
                backgroundColor: '#f8fafc',
                borderColor: withAlpha(primaryColor, 0.28),
            }}
        >
            <header
                className="backdrop-blur-sm border-b p-4 flex items-center gap-4 z-20"
                style={{
                    ...threadHeaderStyle,
                    borderColor: withAlpha(primaryColor, 0.22),
                }}
            >
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Voltar para tópicos"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold text-white truncate">{topic.titulo}</h1>
                        {topic.locked && <Lock className="w-3.5 h-3.5 text-red-200" />}
                    </div>
                    <p className="text-xs text-white/85 truncate">{topic.descricao || 'Sem descrição'}</p>
                </div>
            </header>

            <div
                className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar"
                style={threadBodyStyle}
            >
                {loadingInitial ? (
                    Array(5).fill(0).map((_, i) => <MessageSkeleton key={i} />)
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                        <div className="p-6 bg-white rounded-full shadow-inner"><MessageCircle className="w-12 h-12" /></div>
                        <p className="font-medium">Inicie essa conversa!</p>
                    </div>
                ) : (
                    <>
                        {hasMoreOlder && (
                            <button
                                onClick={handleLoadOlder}
                                disabled={loadingMore}
                                className="w-full text-xs font-bold py-3 hover:underline disabled:opacity-50"
                                style={{ color: primaryColor }}
                            >
                                {loadingMore ? 'Carregando...' : 'Ver mensagens anteriores'}
                            </button>
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
                                    primaryColor={primaryColor}
                                    secondaryColor={secondaryColor}
                                />
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {editingMessage && (
                <div
                    className="p-3 border-t"
                    style={{
                        backgroundColor: withAlpha(primaryColor, 0.12),
                        borderColor: withAlpha(primaryColor, 0.2),
                    }}
                >
                    <div className="text-xs font-semibold mb-2" style={{ color: primaryColor }}>Editando mensagem</div>
                    <div className="flex gap-2">
                        <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={2}
                            className="flex-1 rounded-xl border p-2 text-sm resize-none outline-none"
                            style={{
                                borderColor: withAlpha(primaryColor, 0.28),
                                boxShadow: `0 0 0 0 ${withAlpha(primaryColor, 0.35)}`,
                            }}
                        />
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleConfirmEdit}
                                className="px-3 py-2 text-xs font-bold text-white rounded-lg hover:brightness-95"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Salvar
                            </button>
                            <button
                                onClick={() => {
                                    setEditingMessage(null);
                                    setEditingText('');
                                }}
                                className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="p-4 bg-white border-t border-slate-100">
                {!canParticipate ? (
                    <div className="bg-slate-50 p-3 rounded-2xl text-center text-sm text-slate-500 italic">
                        Somente membros podem enviar mensagens.
                    </div>
                ) : topic.locked ? (
                    <div className="bg-rose-50 p-3 rounded-2xl text-center text-sm text-rose-600 font-semibold">
                        Tópico bloqueado pela moderação.
                    </div>
                ) : (
                    <form
                        onSubmit={handleSend}
                        className="flex items-end gap-2 bg-slate-100 p-2 rounded-2xl focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--thread-primary-ring)] transition-all"
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
                            placeholder="Sua mensagem..."
                            rows={1}
                            className="flex-1 bg-transparent border-none focus:ring-0 p-2 text-sm resize-none max-h-32"
                        />
                        <button
                            disabled={!newMessage.trim() || sending}
                            className="p-3 text-white rounded-xl hover:brightness-95 disabled:opacity-40 transition-all shadow-md active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                            aria-label="Enviar mensagem"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
    );
}
