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
import { db } from '../../firebase';

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

const FORUM_TOPIC_CATEGORIES = [
    'geral',
    'duvida',
    'aviso',
    'evento',
    'oportunidade',
    'resultado',
    'debate',
];

// --- Moderacao automatica ---

const FORBIDDEN_WORDS = [
    'aidetica','aidetico','aleijada','aleijado','ana','analfabeta','analfabeto','anao',
    'anus','apenada','apenado','arrombado','babaca','baba-ovo','babaovo','bacura','bagos',
    'baianada','baitola','barbaro','barbeiro','barraco','beata','bebado','bebedo','bebum',
    'besta','bicha','bisca','bixa','boazuda','bocal','boceta','boco','boiola','bokete','bolagato',
    'bolcat','boquete','bosseta','bosta','bostana','branquelo','brecha','brexa','brioco',
    'bronha','buca','buceta','bugre','bunda','bunduda','burra','burro','busseta','caceta',
    'cacete','cachorra','cachorro','cadela','caga','cagado','cagao','cagona','caipira',
    'canalha','canceroso','caralho','casseta','cassete','ceguinho','checheca','chereca',
    'chibumba','chibumbo','chifruda','chifrudo','chochota','chota','chupada','chupado',
    'ciganos','clitoris','cocaina','coco','comunista','corna',
    'cornagem','cornao','cornisse','corno','cornuda','cornudo','corrupta','corrupto','coxo',
    'cretina','cretino','criolo','crioulo','cruz-credo','cu','culhao','curalho',
    'cuzao','cuzuda','cuzudo','debil','debiloide','deficiente',
    'defunto','demonio','denegrir','denigrir','detento','difunto','doida','doido',
    'egua','elemento','encostado','esclerosado','escrota','escroto','esporrada',
    'esporrado','esporro','estupida','estupidez','estupido','facista',
    'fanatico','fascista','fedida','fedido','fedor','fedorenta','feia','feio',
    'feiosa','feioso','feioza','feiozo','felacao','fenda','foda','fodao',
    'fode','fodi','fodida','fodido','fornica','fornicao','fudecao','fudendo','fudida',
    'fudido','furada','furado','furao','furnica','furnicar','furo','furona','gai','gaiata',
    'gaiato','gay','gilete','goianada','gonorrea','gonorreia','gosmenta',
    'gosmento','grelinho','grelo','gringo','homo-sexual','homosexual','homosexualismo',
    'homossexual','homossexualismo','idiota','idiotice','imbecil','inculto','iscrota',
    'iscroto','japa','judiar','ladra','ladrao','ladroeira','ladrona','lalau',
    'lazarento','leprosa','leproso','lesbica','louco','macaca','macaco','machona',
    'macumbeiro','malandro','maluco','maneta','marginal','masturba','meleca','meliante',
    'merda','mija','mijada','mijado','mijo','minorias','mocrea','mocreia','mocreia',
    'moleca','moleque','mondronga','mondrongo','mongol','mongoloide',
    'mulata','mulato','naba','nadega','nazista','negro','nhaca','nojeira',
    'nojenta','nojento','nojo','olhota','otaria','otario','paca',
    'palhaco','paspalha','paspalhao','paspalho','pau','peao','peia','peido',
    'pemba','penis','pentelha','pentelho','perereca','perneta','peru','pica',
    'picao','pilantra','pinel','pintao','pinto','pintudo','piranha','piroca',
    'piroco','piru','pivete','porra','prega','prequito','preso','priquito','prostibulo',
    'prostituta','prostituto','punheta','punhetao','pus','pustula','puta',
    'puto','puxa-saco','puxasaco','rabao','rabo','rabuda','rabudao',
    'rabudo','rabudona','racha','rachada','rachadao','rachadinha','rachadinho','rachado',
    'ramela','remela','retardada','retardado','ridicula','roceiro','rola','rolinha',
    'rosca','sacana','safada','safado','sapatao','sifilis','siririca',
    'tarada','tarado','testuda','tesuda','tesudo','tezao','tezuda','tezudo','traveco',
    'trocha','trolha','troucha','trouxa','troxa','tuberculoso','tupiniquim','turco',
    'vaca','vadia','vagabunda','vagabundo','vagal','vagina','veada','veadao','veado',
    'viada','viadagem','viadao','viado','viado','xana','xaninha','xavasca',
    'xerereca','xexeca','xibiu','xibumba','xiita','xochota','xota','xoxota',
    'a coisa ficou preta','a coisa ta preta','cabeca chata','cabelo duro','cabelo pixaim',
    'cabelo ruim','criado mudo','debil mental','de menor','esta russo',
    'farinha do mesmo saco','feito nas coxas','humor negro','inveja branca','lista negra',
    'maria vai com as outras','meia tigela','mercado negro','mulher da vida',
    'mulher de vida facil','nao sou tuas negas','pessoas especiais',
    'portador de necessidades especiais','preto de alma branca',
    'prostituicao infantil','surdo-mudo'
].map((w) => w.toLowerCase());

const HARD_SPAM_PATTERNS = [
    /(.)\1{7,}/i,
    /(https?:\/\/|www\.)\S+/gi,
    /(pix|telegram|whatsapp|cupom|desconto|inscreva-se|link na bio|patrocinado)/i,
];

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsForbiddenWord(text) {
    const normalized = normalizeText(text);
    for (const word of FORBIDDEN_WORDS) {
        const escaped = escapeRegExp(word);
        const regex = new RegExp(`(^|[^\\p{L}\\p{N}_-])${escaped}([^\\p{L}\\p{N}_-]|$)`, 'u');
        if (regex.test(normalized)) {
            return word;
        }
    }
    return null;
}

function detectSpamReasons(text) {
    const content = String(text || '').trim();
    if (!content) return [];

    const reasons = [];
    const normalized = normalizeText(content);

    const links = content.match(/(https?:\/\/|www\.)\S+/gi) || [];
    if (links.length >= 3) {
        reasons.push('muitos links na mesma mensagem');
    }

    if (/(.)\1{7,}/i.test(content)) {
        reasons.push('repeticao excessiva de caracteres');
    }

    const tokens = normalized.split(/\s+/).filter(Boolean);
    const tokenCount = {};
    for (const t of tokens) {
        tokenCount[t] = (tokenCount[t] || 0) + 1;
        if (tokenCount[t] >= 7 && t.length > 2) {
            reasons.push('repeticao excessiva de palavras');
            break;
        }
    }

    const caps = content.replace(/[^A-Z]/g, '').length;
    const letters = content.replace(/[^A-Za-z]/g, '').length;
    if (letters > 24 && caps / letters > 0.8) {
        reasons.push('texto majoritariamente em caixa alta');
    }

    for (const pattern of HARD_SPAM_PATTERNS) {
        if (pattern.test(content)) {
            reasons.push('sinal de spam ou autopromocao');
            break;
        }
    }

    return [...new Set(reasons)];
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

export async function validateCommunityText(...texts) {
    for (const text of texts) {
        const forbidden = containsForbiddenWord(text);
        if (forbidden) {
            throw new Error(`Mensagem bloqueada por conter linguagem inadequada (termo: "${forbidden}").`);
        }

        const spamReasons = detectSpamReasons(text);
        if (spamReasons.length > 0) {
            throw new Error(`Mensagem bloqueada por violar regra de comunidade: ${spamReasons.join(', ')}.`);
        }
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

    ensureClearTitle(titulo);
    await validateCommunityText(titulo, descricao);

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
        callback(docs);
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
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;

    return { docs, lastDoc, hasMore };
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
        const topicRef = doc(db, 'forum_topicos', topicId);
        const topicSnap = await getDoc(topicRef);
        if (!topicSnap.exists()) {
            throw new Error('Topico nao encontrado.');
        }

        const topicData = topicSnap.data();
        if (topicData.locked) {
            throw new Error('Este topico esta bloqueado para novas mensagens.');
        }

        // Validações opcionais de moderação - se falharem, continuamos mesmo assim
        try {
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
        } catch (modError) {
            console.warn('Aviso de moderacao (continuando mesmo assim):', modError.message);
        }

        await validateCommunityText(conteudo);

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

        await updateDoc(topicRef, {
            mensagens_count: increment(1),
            lastActivityAt: serverTimestamp(),
        });

        return ref.id;
    } catch (error) {
        console.error('Erro ao postMessage:', error);
        throw error;
    }
}

export async function editMessage(messageId, newContent, editor = {}) {
    if (!messageId || !String(newContent || '').trim()) return;

    await validateCommunityText(newContent);

    const msgRef = doc(db, 'forum_mensagens', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) {
        throw new Error('Mensagem nao encontrada.');
    }

    const msgData = msgSnap.data();
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
        solicitante_clube_id: solicitante.clube_id || '',
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

    const q = query(collection(db, 'clubes_ciencia'), ...constraints);
    const snap = await getDocs(q);
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
        const q = query(
            collection(db, 'clubes_ciencia'),
            where('nome', '>=', start),
            where('nome', '<=', end),
        );
        const snap = await getCountFromServer(q);
        return snap.data().count;
    }

    const snap = await getCountFromServer(collection(db, 'clubes_ciencia'));
    return snap.data().count;
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
