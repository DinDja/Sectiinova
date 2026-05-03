import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    startAfter,
    updateDoc,
    where,
    increment,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { getPrimaryUserClubId } from './projectService';

// --- Regras da Comunidade (baseado no anexo) ---

export const FORUM_DEFAULT_RULES = [
    {
        id: 1,
        title: 'Sem spam ou autopromocao',
        description: 'Evite flood, propaganda repetitiva, captacao comercial e correntes.',
    },
    {
        id: 2,
        title: 'Fique no topico',
        description: 'Contribua com mensagens relacionadas ao tema da discussao.',
    },
    {
        id: 3,
        title: 'Seja respeitoso e educado',
        description: 'Nao toleramos ataques pessoais, assedio ou linguagem ofensiva.',
    },
    {
        id: 4,
        title: 'Titulo claro das postagens e marcacao adequada',
        description: 'Titulos objetivos e categorias corretas facilitam buscas e colaboracao.',
    },
];

function getDefaultForumName(clubName = '') {
    const clean = String(clubName || '').trim();
    return clean ? `Forum ${clean}` : 'Forum da Comunidade';
}

export function getDefaultForumConfig(clubName = '') {
    return {
        nome: getDefaultForumName(clubName),
        descricao: 'Espaco para duvidas, comunicados e colaboracao entre os membros.',
        isPublic: true,
        rules: FORUM_DEFAULT_RULES,
    };
}

function normalizeForumRules(rules) {
    const base = Array.isArray(rules) ? rules : [];
    const normalized = base
        .map((rule, index) => {
            const title = String(rule?.title || '').trim();
            const description = String(rule?.description || '').trim();
            if (!title) return null;
            return {
                id: index + 1,
                title: title.slice(0, 120),
                description: description.slice(0, 600),
            };
        })
        .filter(Boolean)
        .slice(0, 12);

    return normalized.length > 0 ? normalized : FORUM_DEFAULT_RULES;
}

function normalizeForumConfig(config, clubName = '') {
    const defaults = getDefaultForumConfig(clubName);
    return {
        nome: String(config?.nome || defaults.nome).trim(),
        descricao: String(config?.descricao || defaults.descricao).trim(),
        isPublic: Boolean(config?.isPublic ?? defaults.isPublic),
        rules: normalizeForumRules(config?.rules),
    };
}

function getForumConfigRef(clubeId) {
    return doc(db, 'forum_configuracoes', String(clubeId));
}

function externalMemberDocId(clubeId, userId) {
    return `${clubeId}__${userId}`;
}

async function fetchClubsSnapshotWithFallback(constraints = []) {
    try {
        const primaryQuery = query(collection(db, 'clubes'), ...constraints);
        const primarySnap = await getDocs(primaryQuery);
        if (!primarySnap.empty) {
            return primarySnap;
        }
    } catch (error) {
        console.warn('Falha ao consultar coleção clubes. Tentando coleção legada clubes_ciencia.', error);
    }

    const legacyQuery = query(collection(db, 'clubes_ciencia'), ...constraints);
    return await getDocs(legacyQuery);
}

const FORUM_TOPIC_CATEGORIES = [
    'geral',
    'duvida',
    'aviso',
    'evento',
    'oportunidade',
    'resultado',
    'debate',
];

const FORUM_MODERATION_ENDPOINT = '/api/forum/moderate';
const FORUM_MODERATION_ALERTS_ENDPOINT = '/api/forum/alerts';
const FORUM_BLOCK_REVIEW_CONTENT = true;
const FORUM_AUTO_DELETE_BLOCKED_MESSAGES = true;
const FORUM_MODERATION_CLIENT_LOG_TAG = '[forum-moderation-client]';
export const FORUM_MESSAGE_AUTO_REMOVED_EVENT = 'forum:message-auto-removed';

function dispatchAutoRemovedMessageEvent({
    topicId = '',
    messageId = '',
    moderationStatus = 'block',
    moderationReason = '',
    source = 'message_postsend',
}) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
        return;
    }

    const statusLabel = String(moderationStatus || '').trim().toLowerCase() === 'review'
        ? 'retida para revisao'
        : 'removida pela moderacao';

    const reasonSuffix = String(moderationReason || '').trim()
        ? ` Motivo: ${String(moderationReason || '').trim().slice(0, 180)}.`
        : '';

    const detail = {
        topicId: String(topicId || ''),
        messageId: String(messageId || ''),
        moderationStatus: String(moderationStatus || '').trim().toLowerCase(),
        moderationReason: String(moderationReason || '').trim(),
        source: String(source || '').trim(),
        message: `Sua mensagem foi ${statusLabel}.${reasonSuffix}`,
    };

    window.dispatchEvent(new CustomEvent(FORUM_MESSAGE_AUTO_REMOVED_EVENT, { detail }));
    console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'auto_remove:event_dispatched', {
        topicId: detail.topicId,
        messageId: detail.messageId,
        moderationStatus: detail.moderationStatus,
        source: detail.source,
    });
}

function summarizeModerationText(value) {
    const text = String(value || '');
    return {
        length: text.length,
        preview: text.slice(0, 140),
    };
}

// --- Moderacao automatica ---

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function ensureClearTitle(title) {
    const raw = String(title || '').trim();
    const normalized = normalizeText(raw);

    if (raw.length < 8) {
        throw new Error('Titulo muito curto. Use um titulo claro com pelo menos 8 caracteres.');
    }

    if (/^(ajuda|duvida|socorro|oi|ola|teste)[!.?\s]*$/i.test(normalized)) {
        throw new Error('Titulo generico. Descreva melhor o assunto da postagem.');
    }

    if (!/[a-zA-Z]{3,}/.test(raw)) {
        throw new Error('Titulo invalido. Informe um titulo com texto descritivo.');
    }
}

function moderationDocId(clubeId, userId) {
    return `${clubeId}__${userId}`;
}

function topicMuteDocId(topicId, userId) {
    return `${topicId}__${userId}`;
}

function toDateSafe(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

async function registerAuditLog({ clubeId, topicId = '', messageId = '', actorId = '', action = '', targetUserId = '', details = {} }) {
    try {
        await addDoc(collection(db, 'forum_audit_logs'), {
            clube_id: clubeId || '',
            topic_id: topicId || '',
            message_id: messageId || '',
            actor_id: actorId || '',
            action,
            target_user_id: targetUserId || '',
            details,
            createdAt: serverTimestamp(),
        });
    } catch {
        // Nao interrompe fluxo principal por falha de log.
    }
}

function buildSmartModerationMessage(payload = {}) {
    const decision = String(payload?.decision || '').trim().toLowerCase();
    const reason = String(payload?.reason || '').trim();

    if (decision === 'review') {
        return reason
            ? `Conteudo retido para revisao de seguranca: ${reason}`
            : 'Conteudo retido para revisao de seguranca pela moderacao inteligente.';
    }

    return reason
        ? `Conteudo bloqueado pela moderacao inteligente: ${reason}`
        : 'Conteudo bloqueado pela moderacao inteligente.';
}

function shouldModerationHoldContent(decision = '') {
    const normalizedDecision = String(decision || '').trim().toLowerCase();
    return normalizedDecision === 'block'
        || (normalizedDecision === 'review' && FORUM_BLOCK_REVIEW_CONTENT);
}

function buildModerationMetadata(result = {}) {
    const decision = String(result?.decision || '').trim().toLowerCase();
    if (!['allow', 'review', 'block'].includes(decision)) {
        return null;
    }

    return {
        moderation_status: decision,
        moderation_requires_action: shouldModerationHoldContent(decision),
        moderation_reason: String(result?.reason || '').slice(0, 500),
        moderation_provider: String(result?.provider || '').slice(0, 120),
        moderation_model: String(result?.model || '').slice(0, 180),
        moderation_reviewedAt: serverTimestamp(),
    };
}

export async function runSmartModeration({
    text,
    clubeId,
    actor,
    source = 'message',
    topicId = '',
    topicTitle = '',
    enforceAction = true,
}) {
    const sanitizedText = String(text || '').trim();
    if (!sanitizedText) return null;
    if (!clubeId || !actor?.id) {
        throw new Error('Dados incompletos para moderacao inteligente.');
    }

    const payload = {
        text: sanitizedText,
        clubeId: String(clubeId),
        actor: {
            id: String(actor.id || ''),
            nome: String(actor.nome || ''),
            perfil: String(actor.perfil || ''),
            email: String(actor.email || ''),
        },
        source: String(source || 'message').slice(0, 40),
        topicId: String(topicId || '').slice(0, 120),
        topicTitle: String(topicTitle || '').slice(0, 200),
    };

    console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:start', {
        enforceAction,
        endpoint: FORUM_MODERATION_ENDPOINT,
        actorId: payload.actor.id,
        clubeId: payload.clubeId,
        source: payload.source,
        topicId: payload.topicId,
        text: summarizeModerationText(payload.text),
    });

    try {
        const response = await fetch(FORUM_MODERATION_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:response', {
            status: response.status,
            ok: response.ok,
            endpoint: FORUM_MODERATION_ENDPOINT,
            source: payload.source,
            topicId: payload.topicId,
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const apiError = String(payload?.error || '').trim();

            console.error(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:http_error', {
                status: response.status,
                payload,
            });

            throw new Error(apiError || 'Moderacao inteligente indisponivel no momento. Tente novamente em instantes.');
        }

        const result = await response.json().catch(() => null);
        if (!result || typeof result !== 'object') {
            console.error(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:invalid_json', {
                result,
            });
            throw new Error('Resposta invalida da moderacao inteligente.');
        }

        const decision = String(result?.decision || '').trim().toLowerCase();
        if (!['allow', 'review', 'block'].includes(decision)) {
            console.error(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:invalid_decision', {
                decision,
                result,
            });
            throw new Error('Resposta invalida da moderacao inteligente.');
        }
        const shouldBlock = shouldModerationHoldContent(decision);

        console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:success', {
            decision,
            shouldBlock,
            enforceAction,
            provider: String(result?.provider || ''),
            model: String(result?.model || ''),
            fallbackUsed: Boolean(result?.fallbackUsed),
            primaryProvider: String(result?.primaryProvider || ''),
            riskScore: Number(result?.riskScore),
        });

        if (shouldBlock && enforceAction) {
            console.warn(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:blocking_content', {
                decision,
                reason: String(result?.reason || ''),
            });
            throw new Error(buildSmartModerationMessage(result));
        }

        return result;
    } catch (error) {
        if (error instanceof Error && /moderacao inteligente|revisao de seguranca|conteudo bloqueado/i.test(error.message)) {
            console.warn(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:handled_error', {
                message: error.message,
                source,
                topicId,
            });
            throw error;
        }

        console.error(FORUM_MODERATION_CLIENT_LOG_TAG, 'runSmartModeration:unexpected_error', {
            source,
            topicId,
            error,
        });
        throw new Error('Nao foi possivel validar o conteudo com a moderacao inteligente. Tente novamente em instantes.');
    }
}

async function runPostSendModeration({
    text,
    clubeId,
    actor,
    source,
    topicId = '',
    topicTitle = '',
    onModerationResult,
}) {
    try {
        console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'runPostSendModeration:start', {
            source,
            clubeId: String(clubeId || ''),
            actorId: String(actor?.id || ''),
            topicId: String(topicId || ''),
            text: summarizeModerationText(text),
        });

        const moderation = await runSmartModeration({
            text,
            clubeId,
            actor,
            source,
            topicId,
            topicTitle,
            enforceAction: false,
        });

        console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'runPostSendModeration:result', {
            source,
            topicId: String(topicId || ''),
            decision: String(moderation?.decision || ''),
            provider: String(moderation?.provider || ''),
            model: String(moderation?.model || ''),
        });

        if (typeof onModerationResult === 'function') {
            await onModerationResult(moderation);
            console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'runPostSendModeration:onModerationResult:done', {
                source,
                topicId: String(topicId || ''),
            });
        }
    } catch (error) {
        console.error(FORUM_MODERATION_CLIENT_LOG_TAG, 'runPostSendModeration:error', {
            source,
            topicId: String(topicId || ''),
            error,
        });
    }
}

export function getForumRules() {
    return FORUM_DEFAULT_RULES;
}

export function subscribeToForumConfig(clubeId, clubName = '', callback) {
    if (!clubeId) {
        callback(getDefaultForumConfig(clubName));
        return () => {};
    }

    return onSnapshot(getForumConfigRef(clubeId), (snap) => {
        if (!snap.exists()) {
            callback(getDefaultForumConfig(clubName));
            return;
        }
        callback(normalizeForumConfig(snap.data(), clubName));
    });
}

export async function getForumConfigData(clubeId, clubName = '') {
    if (!clubeId) {
        return getDefaultForumConfig(clubName);
    }

    try {
        const snap = await getDoc(getForumConfigRef(clubeId));
        if (!snap.exists()) {
            return getDefaultForumConfig(clubName);
        }
        return normalizeForumConfig(snap.data(), clubName);
    } catch (err) {
        console.error('Erro ao buscar configurações do fórum:', err);
        return getDefaultForumConfig(clubName);
    }
}

export async function saveForumConfig({ clubeId, actorId = '', nome = '', descricao = '', isPublic = true, rules = [] }) {
    if (!clubeId) {
        throw new Error('clubeId obrigatorio para salvar configuracao do forum.');
    }

    const payload = normalizeForumConfig({
        nome,
        descricao,
        isPublic,
        rules,
    });

    if (payload.nome.length < 3) {
        throw new Error('Nome do forum muito curto. Use ao menos 3 caracteres.');
    }

    await setDoc(
        getForumConfigRef(clubeId),
        {
            ...payload,
            updatedBy: actorId,
            updatedAt: serverTimestamp(),
        },
        { merge: true },
    );

    await registerAuditLog({
        clubeId,
        actorId,
        action: 'forum.settings.update',
        details: {
            forumName: payload.nome,
            rulesCount: payload.rules.length,
            isPublic: payload.isPublic,
        },
    });

    return payload;
}

// --- Topicos ---

export function subscribeToTopics(clubeId, callback) {
    if (!clubeId) {
        callback([]);
        return () => {};
    }

    const q = query(
        collection(db, 'forum_topicos'),
        where('clube_id', '==', clubeId),
    );

    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const aTime = a.lastActivityAt?.toMillis?.() || 0;
            const bTime = b.lastActivityAt?.toMillis?.() || 0;
            return bTime - aTime;
        });
        callback(docs);
    });
}

export async function createTopic({ clubeId, titulo, descricao, autor, categoria = 'geral', tags = [] }) {
    if (!clubeId || !titulo?.trim() || !autor?.id) return null;

    console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'createTopic:start', {
        clubeId: String(clubeId || ''),
        actorId: String(autor?.id || ''),
        title: String(titulo || '').slice(0, 140),
    });

    ensureClearTitle(titulo);

    const normalizedCategory = String(categoria || 'geral').trim().toLowerCase();
    const safeCategory = FORUM_TOPIC_CATEGORIES.includes(normalizedCategory)
        ? normalizedCategory
        : 'geral';

    const safeTags = Array.isArray(tags)
        ? tags
            .map((t) => String(t || '').trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 6)
        : [];

    const ref = await addDoc(collection(db, 'forum_topicos'), {
        clube_id: clubeId,
        titulo: titulo.trim(),
        descricao: (descricao || '').trim(),
        categoria: safeCategory,
        tags: safeTags,
        autor_id: autor.id,
        autor_nome: autor.nome || 'Anonimo',
        createdAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        mensagens_count: 0,
        pinned: false,
        locked: false,
        solved: false,
    });

    await registerAuditLog({
        clubeId,
        topicId: ref.id,
        actorId: autor.id,
        action: 'topic.create',
        details: { categoria: safeCategory, tagsCount: safeTags.length },
    });

    const topicModerationText = [titulo, descricao].filter(Boolean).join('\n\n');
    console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'createTopic:published', {
        topicId: ref.id,
        clubeId: String(clubeId || ''),
    });

    void runPostSendModeration({
        text: topicModerationText,
        clubeId,
        actor: autor,
        source: 'topic_postsend',
        topicId: ref.id,
        topicTitle: titulo,
        onModerationResult: async (moderation) => {
            const metadata = buildModerationMetadata(moderation);
            if (!metadata) return;

            await updateDoc(doc(db, 'forum_topicos', ref.id), metadata);
            console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'createTopic:moderation_metadata_saved', {
                topicId: ref.id,
                moderationStatus: String(metadata.moderation_status || ''),
                moderationRequiresAction: Boolean(metadata.moderation_requires_action),
            });
        },
    });

    return ref.id;
}

export async function togglePinTopic(topicId, currentPinned, moderatorId = '') {
    const topicRef = doc(db, 'forum_topicos', topicId);
    const topicSnap = await getDoc(topicRef);
    const topicData = topicSnap.exists() ? topicSnap.data() : null;

    await updateDoc(topicRef, { pinned: !currentPinned });

    await registerAuditLog({
        clubeId: topicData?.clube_id || '',
        topicId,
        actorId: moderatorId,
        action: !currentPinned ? 'topic.pin' : 'topic.unpin',
    });
}

export async function toggleLockTopic(topicId, currentLocked, moderatorId = '') {
    const topicRef = doc(db, 'forum_topicos', topicId);
    const topicSnap = await getDoc(topicRef);
    const topicData = topicSnap.exists() ? topicSnap.data() : null;

    await updateDoc(topicRef, { locked: !currentLocked });

    await registerAuditLog({
        clubeId: topicData?.clube_id || '',
        topicId,
        actorId: moderatorId,
        action: !currentLocked ? 'topic.lock' : 'topic.unlock',
    });
}

export async function setTopicCategory(topicId, category, moderatorId = '') {
    const normalizedCategory = String(category || '').trim().toLowerCase();
    if (!FORUM_TOPIC_CATEGORIES.includes(normalizedCategory)) {
        throw new Error(`Categoria invalida. Use uma destas: ${FORUM_TOPIC_CATEGORIES.join(', ')}.`);
    }

    const topicRef = doc(db, 'forum_topicos', topicId);
    const topicSnap = await getDoc(topicRef);
    if (!topicSnap.exists()) return;

    const topicData = topicSnap.data();
    await updateDoc(topicRef, { categoria: normalizedCategory });

    await registerAuditLog({
        clubeId: topicData.clube_id,
        topicId,
        actorId: moderatorId,
        action: 'topic.setCategory',
        details: { category: normalizedCategory },
    });
}

export async function markTopicAsSolved(topicId, solved, moderatorId = '') {
    const topicRef = doc(db, 'forum_topicos', topicId);
    const topicSnap = await getDoc(topicRef);
    if (!topicSnap.exists()) return;

    const topicData = topicSnap.data();
    await updateDoc(topicRef, { solved: !!solved });

    await registerAuditLog({
        clubeId: topicData.clube_id,
        topicId,
        actorId: moderatorId,
        action: solved ? 'topic.solved' : 'topic.unsolved',
    });
}

export async function deleteTopic(topicId, moderatorId = '') {
    const topicRef = doc(db, 'forum_topicos', topicId);
    const topicSnap = await getDoc(topicRef);
    const topicData = topicSnap.exists() ? topicSnap.data() : null;

    const msgsSnap = await getDocs(
        query(collection(db, 'forum_mensagens'), where('topico_id', '==', topicId)),
    );

    const deletePromises = msgsSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    await deleteDoc(topicRef);

    await registerAuditLog({
        clubeId: topicData?.clube_id || '',
        topicId,
        actorId: moderatorId,
        action: 'topic.delete',
        details: { deletedMessages: msgsSnap.size },
    });
}

// --- Mensagens ---

function shouldHideMessageByModeration(message = {}) {
    const status = String(message?.moderation_status || '').trim().toLowerCase();
    const requiresAction = Boolean(message?.moderation_requires_action);

    if (!requiresAction) {
        return false;
    }

    if (!status) {
        return true;
    }

    if (status === 'block') {
        return true;
    }

    if (status === 'review' && FORUM_BLOCK_REVIEW_CONTENT) {
        return true;
    }

    return false;
}

export function subscribeToMessages(topicId, callback) {
    if (!topicId) {
        callback([]);
        return () => {};
    }

    const q = query(
        collection(db, 'forum_mensagens'),
        where('topico_id', '==', topicId),
    );

    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return ta - tb;
        });

        const visibleDocs = docs.filter((message) => !shouldHideMessageByModeration(message));
        const hiddenCount = docs.length - visibleDocs.length;
        if (hiddenCount > 0) {
            console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'subscribeToMessages:hidden_by_moderation', {
                topicId: String(topicId || ''),
                hiddenCount,
                visibleCount: visibleDocs.length,
            });
        }

        callback(visibleDocs);
    });
}

export async function fetchMessagesPage(topicId, pageSize = 30, startAfterDoc = null) {
    if (!topicId) {
        return { docs: [], lastDoc: null, hasMore: false };
    }

    let baseQuery = query(
        collection(db, 'forum_mensagens'),
        where('topico_id', '==', topicId),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
    );

    if (startAfterDoc) {
        baseQuery = query(baseQuery, startAfter(startAfterDoc));
    }

    const snap = await getDocs(baseQuery);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const visibleDocs = docs.filter((message) => !shouldHideMessageByModeration(message));
    const hiddenCount = docs.length - visibleDocs.length;
    if (hiddenCount > 0) {
        console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'fetchMessagesPage:hidden_by_moderation', {
            topicId: String(topicId || ''),
            hiddenCount,
            visibleCount: visibleDocs.length,
        });
    }

    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;

    return { docs: visibleDocs, lastDoc, hasMore };
}

export async function getUserModerationState(clubeId, userId) {
    if (!clubeId || !userId) return null;

    const stateRef = doc(db, 'forum_user_moderation_state', moderationDocId(clubeId, userId));
    const snap = await getDoc(stateRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    const suspendedUntil = toDateSafe(data.suspended_until);
    const now = new Date();

    if (suspendedUntil && suspendedUntil <= now && data.status === 'suspended') {
        await updateDoc(stateRef, {
            status: 'active',
            suspended_until: null,
            updatedAt: serverTimestamp(),
        });
        return {
            ...data,
            status: 'active',
            suspended_until: null,
        };
    }

    return data;
}

export async function getMuteStateForTopicUser(topicId, userId) {
    if (!topicId || !userId) return null;

    const muteRef = doc(db, 'forum_topic_mutes', topicMuteDocId(topicId, userId));
    const snap = await getDoc(muteRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    const mutedUntil = toDateSafe(data.muted_until);

    if (mutedUntil && mutedUntil <= new Date()) {
        await deleteDoc(muteRef);
        return null;
    }

    return data;
}

export async function postMessage({ topicId, clubeId, autor, conteudo, imagemBase64 = null }) {
    if (!topicId || !conteudo?.trim() || !autor?.id) return null;

    try {
        console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'postMessage:start', {
            topicId: String(topicId || ''),
            clubeId: String(clubeId || ''),
            actorId: String(autor?.id || ''),
            hasImage: Boolean(imagemBase64),
            text: summarizeModerationText(conteudo),
        });

        const topicRef = doc(db, 'forum_topicos', topicId);
        const topicSnap = await getDoc(topicRef);
        if (!topicSnap.exists()) {
            throw new Error('Topico nao encontrado.');
        }

        const topicData = topicSnap.data();
        if (topicData.locked) {
            throw new Error('Este topico esta bloqueado para novas mensagens.');
        }

        const moderationState = await getUserModerationState(clubeId, autor.id);
        if (moderationState?.status === 'banned') {
            throw new Error('Sua conta foi banida deste forum.');
        }

        if (moderationState?.status === 'suspended') {
            const suspendedUntil = toDateSafe(moderationState.suspended_until);
            const when = suspendedUntil ? suspendedUntil.toLocaleString('pt-BR') : 'periodo indefinido';
            throw new Error(`Sua conta esta suspensa para este forum ate ${when}.`);
        }

        const muteState = await getMuteStateForTopicUser(topicId, autor.id);
        if (muteState?.muted_until) {
            const muteUntil = toDateSafe(muteState.muted_until);
            const when = muteUntil ? muteUntil.toLocaleString('pt-BR') : 'periodo indefinido';
            throw new Error(`Voce esta silenciado neste topico ate ${when}.`);
        }

        const messageData = {
            topico_id: topicId,
            clube_id: clubeId,
            autor_id: autor.id,
            autor_nome: autor.nome || 'Anonimo',
            conteudo: conteudo.trim(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            edited: false,
            pinned: false,
        };

        // Adicionar imagem se fornecida
        if (imagemBase64) {
            messageData.imagemBase64 = imagemBase64;
        }

        const ref = await addDoc(collection(db, 'forum_mensagens'), messageData);

        console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'postMessage:published', {
            messageId: ref.id,
            topicId: String(topicId || ''),
        });

        await updateDoc(topicRef, {
            mensagens_count: increment(1),
            lastActivityAt: serverTimestamp(),
        });

        void runPostSendModeration({
            text: conteudo,
            clubeId,
            actor: autor,
            source: 'message_postsend',
            topicId,
            topicTitle: topicData.titulo || '',
            onModerationResult: async (moderation) => {
                const metadata = buildModerationMetadata(moderation);
                if (!metadata) return;

                if (metadata.moderation_requires_action && FORUM_AUTO_DELETE_BLOCKED_MESSAGES) {
                    console.warn(FORUM_MODERATION_CLIENT_LOG_TAG, 'postMessage:auto_remove_triggered', {
                        messageId: ref.id,
                        moderationStatus: String(metadata.moderation_status || ''),
                    });

                    await deleteMessage(ref.id, topicId, {
                        actorId: 'system:auto-moderation',
                        reason: `Remocao automatica por moderacao (${String(metadata.moderation_status || 'unknown')}).`,
                    });

                    console.warn(FORUM_MODERATION_CLIENT_LOG_TAG, 'postMessage:auto_remove_done', {
                        messageId: ref.id,
                    });

                    dispatchAutoRemovedMessageEvent({
                        topicId,
                        messageId: ref.id,
                        moderationStatus: String(metadata.moderation_status || ''),
                        moderationReason: String(metadata.moderation_reason || ''),
                        source: 'message_postsend',
                    });
                    return;
                }

                await updateDoc(doc(db, 'forum_mensagens', ref.id), metadata);
                console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'postMessage:moderation_metadata_saved', {
                    messageId: ref.id,
                    moderationStatus: String(metadata.moderation_status || ''),
                    moderationRequiresAction: Boolean(metadata.moderation_requires_action),
                });
            },
        });

        return ref.id;
    } catch (error) {
        console.error('Erro ao postMessage:', error);
        throw error;
    }
}

export async function editMessage(messageId, newContent, editor = {}) {
    if (!messageId || !String(newContent || '').trim()) return;

    console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'editMessage:start', {
        messageId: String(messageId || ''),
        editorId: String(editor?.id || ''),
        text: summarizeModerationText(newContent),
    });

    const msgRef = doc(db, 'forum_mensagens', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) {
        throw new Error('Mensagem nao encontrada.');
    }

    const msgData = msgSnap.data();

    const moderationActor = {
        id: editor.id || msgData.autor_id,
        nome: editor.nome || msgData.autor_nome || '',
        perfil: editor.perfil || '',
        email: editor.email || '',
    };

    await updateDoc(msgRef, {
        conteudo: String(newContent).trim(),
        edited: true,
        updatedAt: serverTimestamp(),
        edited_by: editor.id || '',
    });

    await registerAuditLog({
        clubeId: msgData.clube_id,
        topicId: msgData.topico_id,
        messageId,
        actorId: editor.id || '',
        action: 'message.edit',
    });

    console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'editMessage:content_saved', {
        messageId: String(messageId || ''),
        topicId: String(msgData?.topico_id || ''),
    });

    void runPostSendModeration({
        text: newContent,
        clubeId: msgData.clube_id,
        actor: moderationActor,
        source: 'message_edit_postsend',
        topicId: msgData.topico_id,
        onModerationResult: async (moderation) => {
            const metadata = buildModerationMetadata(moderation);
            if (!metadata) return;

            if (metadata.moderation_requires_action && FORUM_AUTO_DELETE_BLOCKED_MESSAGES) {
                console.warn(FORUM_MODERATION_CLIENT_LOG_TAG, 'editMessage:auto_remove_triggered', {
                    messageId: String(messageId || ''),
                    moderationStatus: String(metadata.moderation_status || ''),
                });

                await deleteMessage(messageId, msgData.topico_id, {
                    actorId: 'system:auto-moderation',
                    reason: `Remocao automatica por moderacao apos edicao (${String(metadata.moderation_status || 'unknown')}).`,
                });

                console.warn(FORUM_MODERATION_CLIENT_LOG_TAG, 'editMessage:auto_remove_done', {
                    messageId: String(messageId || ''),
                });

                dispatchAutoRemovedMessageEvent({
                    topicId: msgData.topico_id,
                    messageId: String(messageId || ''),
                    moderationStatus: String(metadata.moderation_status || ''),
                    moderationReason: String(metadata.moderation_reason || ''),
                    source: 'message_edit_postsend',
                });
                return;
            }

            await updateDoc(msgRef, metadata);
            console.log(FORUM_MODERATION_CLIENT_LOG_TAG, 'editMessage:moderation_metadata_saved', {
                messageId: String(messageId || ''),
                moderationStatus: String(metadata.moderation_status || ''),
                moderationRequiresAction: Boolean(metadata.moderation_requires_action),
            });
        },
    });
}

export async function togglePinMessage(messageId, currentPinned, moderatorId = '') {
    const msgRef = doc(db, 'forum_mensagens', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const msgData = msgSnap.data();
    await updateDoc(msgRef, {
        pinned: !currentPinned,
        pinned_by: !currentPinned ? moderatorId : '',
        pinnedAt: !currentPinned ? serverTimestamp() : null,
    });

    await registerAuditLog({
        clubeId: msgData.clube_id,
        topicId: msgData.topico_id,
        messageId,
        actorId: moderatorId,
        action: !currentPinned ? 'message.pin' : 'message.unpin',
    });
}

export async function deleteMessage(messageId, topicId, options = {}) {
    const msgRef = doc(db, 'forum_mensagens', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const msgData = msgSnap.data();

    await addDoc(collection(db, 'forum_mensagens_excluidas'), {
        original_message_id: messageId,
        topic_id: topicId || msgData.topico_id,
        clube_id: msgData.clube_id || '',
        deleted_by: options.moderatorId || options.actorId || '',
        delete_reason: options.reason || 'Remocao manual',
        payload: msgData,
        deletedAt: serverTimestamp(),
    });

    await deleteDoc(msgRef);

    if (topicId || msgData.topico_id) {
        await updateDoc(doc(db, 'forum_topicos', topicId || msgData.topico_id), {
            mensagens_count: increment(-1),
            lastActivityAt: serverTimestamp(),
        });
    }

    await registerAuditLog({
        clubeId: msgData.clube_id || '',
        topicId: topicId || msgData.topico_id,
        messageId,
        actorId: options.moderatorId || options.actorId || '',
        action: 'message.delete',
        details: { reason: options.reason || 'Remocao manual' },
    });
}

export async function restoreDeletedMessage(deletedMessageDocId, moderatorId = '') {
    const deletedRef = doc(db, 'forum_mensagens_excluidas', deletedMessageDocId);
    const deletedSnap = await getDoc(deletedRef);
    if (!deletedSnap.exists()) {
        throw new Error('Mensagem excluida nao encontrada.');
    }

    const deleted = deletedSnap.data();
    const originalMessageId = deleted.original_message_id;

    if (!originalMessageId) {
        throw new Error('Nao foi possivel restaurar esta mensagem.');
    }

    await setDoc(doc(db, 'forum_mensagens', originalMessageId), {
        ...deleted.payload,
        restoredAt: serverTimestamp(),
        restoredBy: moderatorId,
    });

    await updateDoc(doc(db, 'forum_topicos', deleted.topic_id), {
        mensagens_count: increment(1),
        lastActivityAt: serverTimestamp(),
    });

    await deleteDoc(deletedRef);

    await registerAuditLog({
        clubeId: deleted.clube_id || '',
        topicId: deleted.topic_id || '',
        messageId: originalMessageId,
        actorId: moderatorId,
        action: 'message.restore',
    });
}

// --- Moderacao de usuarios ---

export async function warnUser({ clubeId, userId, reason, moderatorId }) {
    if (!clubeId || !userId || !String(reason || '').trim()) {
        throw new Error('Dados incompletos para advertencia.');
    }

    const ref = await addDoc(collection(db, 'forum_user_warnings'), {
        clube_id: clubeId,
        user_id: userId,
        reason: String(reason).trim(),
        moderator_id: moderatorId || '',
        createdAt: serverTimestamp(),
    });

    await registerAuditLog({
        clubeId,
        actorId: moderatorId || '',
        targetUserId: userId,
        action: 'user.warn',
        details: { reason: String(reason).trim() },
    });

    return ref.id;
}

export async function setUserModerationStatus({ clubeId, userId, status, reason = '', moderatorId = '', suspendDurationHours = 0 }) {
    if (!clubeId || !userId) {
        throw new Error('clubeId e userId sao obrigatorios.');
    }

    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (!['active', 'suspended', 'banned'].includes(normalizedStatus)) {
        throw new Error('Status invalido. Use active, suspended ou banned.');
    }

    let suspendedUntil = null;
    if (normalizedStatus === 'suspended') {
        const duration = Math.max(1, Number(suspendDurationHours) || 24);
        suspendedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
    }

    const payload = {
        clube_id: clubeId,
        user_id: userId,
        status: normalizedStatus,
        reason: String(reason || '').trim(),
        suspended_until: suspendedUntil,
        updated_by: moderatorId,
        updatedAt: serverTimestamp(),
    };

    await setDoc(
        doc(db, 'forum_user_moderation_state', moderationDocId(clubeId, userId)),
        payload,
        { merge: true },
    );

    await registerAuditLog({
        clubeId,
        actorId: moderatorId,
        targetUserId: userId,
        action: `user.status.${normalizedStatus}`,
        details: {
            reason: payload.reason,
            suspendedUntil,
        },
    });
}

export async function clearUserModerationStatus(clubeId, userId, moderatorId = '') {
    await setUserModerationStatus({
        clubeId,
        userId,
        status: 'active',
        reason: '',
        moderatorId,
    });
}

export async function muteUserInTopic({ topicId, clubeId, userId, durationMinutes = 60, reason = '', moderatorId = '' }) {
    if (!topicId || !clubeId || !userId) {
        throw new Error('topicId, clubeId e userId sao obrigatorios para silenciar.');
    }

    const duration = Math.max(1, Number(durationMinutes) || 60);
    const mutedUntil = new Date(Date.now() + duration * 60 * 1000);

    await setDoc(
        doc(db, 'forum_topic_mutes', topicMuteDocId(topicId, userId)),
        {
            topic_id: topicId,
            clube_id: clubeId,
            user_id: userId,
            reason: String(reason || '').trim(),
            muted_until: mutedUntil,
            moderator_id: moderatorId,
            createdAt: serverTimestamp(),
        },
        { merge: true },
    );

    await registerAuditLog({
        clubeId,
        topicId,
        actorId: moderatorId,
        targetUserId: userId,
        action: 'user.muteTopic',
        details: { durationMinutes: duration, reason: String(reason || '').trim() },
    });
}

export async function unmuteUserInTopic(topicId, userId, moderatorId = '') {
    const muteRef = doc(db, 'forum_topic_mutes', topicMuteDocId(topicId, userId));
    const muteSnap = await getDoc(muteRef);
    if (!muteSnap.exists()) return;

    const muteData = muteSnap.data();
    await deleteDoc(muteRef);

    await registerAuditLog({
        clubeId: muteData.clube_id,
        topicId,
        actorId: moderatorId,
        targetUserId: userId,
        action: 'user.unmuteTopic',
    });
}

// --- Solicitaoes de entrada ---

export function subscribeToJoinRequests(clubeId, callback) {
    if (!clubeId) {
        callback([]);
        return () => {};
    }

    const q = query(
        collection(db, 'forum_solicitacoes'),
        where('clube_id', '==', clubeId),
        where('status', '==', 'pendente'),
    );

    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });
        callback(docs);
    });
}

export async function requestJoinForum({ clubeId, solicitante }) {
    if (!clubeId || !solicitante?.id) {
        throw new Error('Dados obrigatorios para solicitar entrada no forum.');
    }

    const existing = await getDocs(
        query(
            collection(db, 'forum_solicitacoes'),
            where('clube_id', '==', clubeId),
            where('solicitante_id', '==', solicitante.id),
            where('status', '==', 'pendente'),
        ),
    );
    if (!existing.empty) {
        throw new Error('Você já possui uma solicitação pendente para este forum.');
    }

    const memberId = externalMemberDocId(clubeId, solicitante.id);
    const memberRef = doc(db, 'forum_membros_externos', memberId);
    const memberSnap = await getDoc(memberRef);
    if (memberSnap.exists()) {
        throw new Error('Você já é membro externo deste forum.');
    }

    const ref = await addDoc(collection(db, 'forum_solicitacoes'), {
        clube_id: clubeId,
        solicitante_id: solicitante.id,
        solicitante_nome: solicitante.nome || 'Anonimo',
        solicitante_clube_id: getPrimaryUserClubId(solicitante),
        status: 'pendente',
        createdAt: serverTimestamp(),
    });

    return ref.id;
}

export async function respondJoinRequest(requestId, accepted, moderatorId) {
    const reqRef = doc(db, 'forum_solicitacoes', requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;

    const data = reqSnap.data();
    await updateDoc(reqRef, {
        status: accepted ? 'aceito' : 'recusado',
        respondido_por: moderatorId,
        respondidoAt: serverTimestamp(),
    });

    if (accepted) {
        const docId = externalMemberDocId(data.clube_id, data.solicitante_id);
        await setDoc(doc(db, 'forum_membros_externos', docId), {
            clube_id: data.clube_id,
            membro_id: data.solicitante_id,
            membro_nome: data.solicitante_nome,
            aceito_por: moderatorId,
            createdAt: serverTimestamp(),
        });
    }

    await registerAuditLog({
        clubeId: data.clube_id,
        actorId: moderatorId,
        targetUserId: data.solicitante_id,
        action: accepted ? 'join.accept' : 'join.reject',
    });
}

// --- Membros externos ---

export function subscribeToExternalMembers(clubeId, callback) {
    if (!clubeId) {
        callback([]);
        return () => {};
    }

    const q = query(
        collection(db, 'forum_membros_externos'),
        where('clube_id', '==', clubeId),
    );

    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

export function getForumsWhereAccepted(userId, callback) {
    if (!userId) {
        callback([]);
        return () => {};
    }

    const q = query(
        collection(db, 'forum_membros_externos'),
        where('membro_id', '==', userId),
    );

    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

export async function removeExternalMember(memberId, clubeId, moderatorId = '') {
    const memberDocId = externalMemberDocId(clubeId, memberId);
    const memberRef = doc(db, 'forum_membros_externos', memberDocId);
    const memberSnap = await getDoc(memberRef);

    if (memberSnap.exists()) {
        await deleteDoc(memberRef);
    } else {
        const snap = await getDocs(
            query(
                collection(db, 'forum_membros_externos'),
                where('clube_id', '==', clubeId),
                where('membro_id', '==', memberId),
            ),
        );
        const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);
    }

    await registerAuditLog({
        clubeId,
        actorId: moderatorId,
        targetUserId: memberId,
        action: 'externalMember.remove',
    });
}

// --- Alertas de moderacao para mentores ---

async function fetchModerationAlertsViaApi({ clubeId, unreadOnly = true }) {
    const params = new URLSearchParams();
    params.set('clubeId', String(clubeId || '').trim());
    params.set('unreadOnly', unreadOnly ? 'true' : 'false');
    params.set('limit', '50');

    let token = '';
    try {
        token = await auth?.currentUser?.getIdToken?.();
    } catch {
        token = '';
    }

    const response = await fetch(`${FORUM_MODERATION_ALERTS_ENDPOINT}?${params.toString()}`, {
        method: 'GET',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = String(payload?.error || '').trim();
        throw new Error(message || 'Falha ao carregar alertas de moderacao.');
    }

    const payload = await response.json().catch(() => ({}));
    const docs = Array.isArray(payload?.alerts) ? payload.alerts : [];

    docs.sort((a, b) => {
        const ta = Number(a?.createdAtMs || 0);
        const tb = Number(b?.createdAtMs || 0);
        return tb - ta;
    });

    return docs;
}

export function subscribeToModerationAlerts({ clubeId, callback, unreadOnly = true }) {
    if (!clubeId) {
        callback([]);
        return () => {};
    }

    let isActive = true;
    let timerId = null;

    const runPull = async () => {
        try {
            const alerts = await fetchModerationAlertsViaApi({
                clubeId,
                unreadOnly,
            });

            if (isActive) {
                callback(alerts);
            }
        } catch (error) {
            console.error('Erro ao buscar alertas de moderação via API:', error);
            if (isActive) {
                callback([]);
            }
        }
    };

    runPull();
    timerId = setInterval(runPull, 10000);

    return () => {
        isActive = false;
        if (timerId) {
            clearInterval(timerId);
        }
    };
}

export async function markModerationAlertAsRead(alertId, readerId = '') {
    if (!alertId) return;

    const alertRef = doc(db, 'forum_moderation_alerts', String(alertId));
    const alertSnap = await getDoc(alertRef);
    if (!alertSnap.exists()) return;

    const data = alertSnap.data();
    if (readerId && data?.recipient_id && String(data.recipient_id) !== String(readerId)) {
        throw new Error('Voce nao pode alterar este alerta.');
    }

    await updateDoc(alertRef, {
        status: 'read',
        read_by: String(readerId || ''),
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteModerationAlert(alertId) {
    if (!alertId) {
        throw new Error('Alerta invalido.');
    }

    let token = '';
    try {
        token = await auth?.currentUser?.getIdToken?.();
    } catch {
        token = '';
    }

    const response = await fetch(FORUM_MODERATION_ALERTS_ENDPOINT, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ alertId: String(alertId) }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = String(payload?.error || '').trim();
        throw new Error(message || 'Falha ao excluir alerta de moderacao.');
    }

    return await response.json();
}

// --- Listagem de foruns paginados ---

export async function fetchClubsPage(pageSize, cursor = null, searchTerm = '') {
    const term = String(searchTerm || '').trim();

    const constraints = [];
    if (term) {
        const start = term;
        const end = `${term}\uf8ff`;
        constraints.push(where('nome', '>=', start));
        constraints.push(where('nome', '<=', end));
        constraints.push(orderBy('nome'));
    } else {
        constraints.push(orderBy('nome'));
    }

    if (cursor) {
        constraints.push(startAfter(cursor));
    }

    constraints.push(limit(pageSize));

    const snap = await fetchClubsSnapshotWithFallback(constraints);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;

    return { docs, lastDoc, hasMore };
}

export async function getClubsTotalCount(searchTerm = '') {
    const term = String(searchTerm || '').trim();

    if (term) {
        const start = term;
        const end = `${term}\uf8ff`;
        const primaryQuery = query(
            collection(db, 'clubes'),
            where('nome', '>=', start),
            where('nome', '<=', end),
        );
        const primarySnap = await getCountFromServer(primaryQuery);
        if (primarySnap.data().count > 0) {
            return primarySnap.data().count;
        }

        const legacyQuery = query(
            collection(db, 'clubes_ciencia'),
            where('nome', '>=', start),
            where('nome', '<=', end),
        );
        const legacySnap = await getCountFromServer(legacyQuery);
        return legacySnap.data().count;
    }

    const primarySnap = await getCountFromServer(collection(db, 'clubes'));
    if (primarySnap.data().count > 0) {
        return primarySnap.data().count;
    }

    const legacySnap = await getCountFromServer(collection(db, 'clubes_ciencia'));
    return legacySnap.data().count;
}

// --- Estatisticas e auditoria ---

export async function getForumCommunityStats(clubeId, lookbackDays = 7) {
    if (!clubeId) {
        const defaults = getDefaultForumConfig();
        return {
            createdAt: null,
            isPublic: defaults.isPublic,
            weeklyVisitors: 0,
            weeklyContributions: 0,
            totalTopics: 0,
            rules: defaults.rules,
            forumName: defaults.nome,
            forumDescription: defaults.descricao,
        };
    }

    const start = new Date(Date.now() - Math.max(1, Number(lookbackDays) || 7) * 24 * 60 * 60 * 1000);

    const [topicCountSnap, weeklyMessagesSnap, topicsSnap, forumConfigSnap] = await Promise.all([
        getCountFromServer(query(collection(db, 'forum_topicos'), where('clube_id', '==', clubeId))),
        getDocs(
            query(
                collection(db, 'forum_mensagens'),
                where('clube_id', '==', clubeId),
                where('createdAt', '>=', start),
            ),
        ),
        getDocs(query(collection(db, 'forum_topicos'), where('clube_id', '==', clubeId))),
        getDoc(getForumConfigRef(clubeId)),
    ]);

    const forumConfig = forumConfigSnap.exists()
        ? normalizeForumConfig(forumConfigSnap.data())
        : getDefaultForumConfig();

    const weeklyContributions = weeklyMessagesSnap.size;
    const visitorsSet = new Set();
    weeklyMessagesSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.autor_id) visitorsSet.add(String(data.autor_id));
    });

    let createdAt = null;
    for (const d of topicsSnap.docs) {
        const c = toDateSafe(d.data().createdAt);
        if (!c) continue;
        if (!createdAt || c < createdAt) createdAt = c;
    }

    return {
        createdAt,
        isPublic: forumConfig.isPublic,
        weeklyVisitors: visitorsSet.size,
        weeklyContributions,
        totalTopics: topicCountSnap.data().count,
        rules: forumConfig.rules,
        forumName: forumConfig.nome,
        forumDescription: forumConfig.descricao,
    };
}

export async function fetchModerationAuditPage(clubeId, pageSize = 30, startAfterDoc = null) {
    if (!clubeId) {
        return { docs: [], lastDoc: null, hasMore: false };
    }

    let q = query(
        collection(db, 'forum_audit_logs'),
        where('clube_id', '==', clubeId),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
    );

    if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
    }

    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;

    return { docs, lastDoc, hasMore };
}
