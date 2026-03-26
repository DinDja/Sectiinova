import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getCountFromServer,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    startAfter,
    updateDoc,
    where,
    increment
} from 'firebase/firestore';
import { db } from '../../firebase';

// ─── Moderação Automática ─────────────────────────────────

const FORBIDDEN_WORDS = [
    'aidética','aidético','aleijada','aleijado','anã','analfabeta','analfabeto','anão',
    'anus','apenada','apenado','arrombado','babaca','baba-ovo','babaovo','bacura','bagos',
    'baianada','baitola','bárbaro','barbeiro','barraco','beata','bêbado','bêbedo','bebum',
    'besta','bicha','bisca','bixa','boazuda','boçal','boceta','boco','boiola','bokete','bolagato',
    'bolcat','boquete','bosseta','bosta','bostana','branquelo','brecha','brexa','brioco',
    'bronha','buca','buceta','bugre','bunda','bunduda','burra','burro','busseta','caceta',
    'cacete','cachorra','cachorro','cadela','caga','cagado','cagao','cagão','cagona','caipira',
    'canalha','canceroso','caralho','casseta','cassete','ceguinho','checheca','chereca',
    'chibumba','chibumbo','chifruda','chifrudo','chochota','chota','chupada','chupado',
    'ciganos','clitoris','clitóris','cocaina','cocaína','coco','cocô','comunista','corna',
    'cornagem','cornão','cornisse','corno','cornuda','cornudo','corrupta','corrupto','coxo',
    'cretina','cretino','criolo','crioulo','cruz-credo','cu','cú','culhao','culhão','curalho',
    'cuzao','cuzão','cuzuda','cuzudo','debil','débil','debiloide','debilóide','deficiente',
    'defunto','demonio','demônio','denegrir','denigrir','detento','difunto','doida','doido',
    'egua','égua','elemento','encostado','esclerosado','escrota','escroto','esporrada',
    'esporrado','esporro','estupida','estúpida','estupidez','estupido','estúpido','facista',
    'fanatico','fanático','fascista','fedida','fedido','fedor','fedorenta','feia','feio',
    'feiosa','feioso','feioza','feiozo','felacao','felação','fenda','foda','fodao','fodão',
    'fode','fodi','fodida','fodido','fornica','fornição','fudeção','fudendo','fudida',
    'fudido','furada','furado','furão','furnica','furnicar','furo','furona','gai','gaiata',
    'gaiato','gay','gilete','goianada','gonorrea','gonorreia','gonorréia','gosmenta',
    'gosmento','grelinho','grelo','gringo','homo-sexual','homosexual','homosexualismo',
    'homossexual','homossexualismo','idiota','idiotice','imbecil','inculto','iscrota',
    'iscroto','japa','judiar','ladra','ladrao','ladrão','ladroeira','ladrona','lalau',
    'lazarento','leprosa','leproso','lesbica','lésbica','louco','macaca','macaco','machona',
    'macumbeiro','malandro','maluco','maneta','marginal','masturba','meleca','meliante',
    'merda','mija','mijada','mijado','mijo','minorias','mocrea','mocreia','mocréia',
    'moleca','moleque','mondronga','mondrongo','mongol','mongoloide','mongolóide',
    'mulata','mulato','naba','nadega','nádega','nazista','negro','nhaca','nojeira',
    'nojenta','nojento','nojo','olhota','otaria','otária','otario','otário','paca',
    'palhaco','palhaço','paspalha','paspalhao','paspalho','pau','peão','peia','peido',
    'pemba','penis','pênis','pentelha','pentelho','perereca','perneta','peru','pica',
    'picao','picão','pilantra','pinel','pintão','pinto','pintudo','piranha','piroca',
    'piroco','piru','pivete','porra','prega','prequito','preso','priquito','prostibulo',
    'prostituta','prostituto','punheta','punhetao','punhetão','pus','pustula','puta',
    'puto','puxa-saco','puxasaco','rabao','rabão','rabo','rabuda','rabudao','rabudão',
    'rabudo','rabudona','racha','rachada','rachadao','rachadinha','rachadinho','rachado',
    'ramela','remela','retardada','retardado','ridícula','roceiro','rola','rolinha',
    'rosca','sacana','safada','safado','sapatao','sapatão','sifilis','sífilis','siririca',
    'tarada','tarado','testuda','tesuda','tesudo','tezao','tezuda','tezudo','traveco',
    'trocha','trolha','troucha','trouxa','troxa','tuberculoso','tupiniquim','turco',
    'vaca','vadia','vagabunda','vagabundo','vagal','vagina','veada','veadao','veado',
    'viada','viadagem','viadao','viadão','viado','víado','xana','xaninha','xavasca',
    'xerereca','xexeca','xibiu','xibumba','xiíta','xochota','xota','xoxota',
    'a coisa ficou preta','a coisa tá preta','cabeça chata','cabelo duro','cabelo pixaim',
    'cabelo ruim','criado mudo','débil mental','de menor','está russo',
    'farinha do mesmo saco','feito nas coxas','humor negro','inveja branca','lista negra',
    'maria vai com as outras','meia tigela','mercado negro','mulher da vida',
    'mulher de vida fácil','não sou tuas negas','pessoas especiais',
    'portador de necessidades especiais','preto de alma branca',
    'prostituição infantil','surdo-mudo'
].map(w => w.toLowerCase());

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsForbiddenWord(text) {
    const normalized = String(text || '').toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
        // Para palavras simples: usa delimitadores de palavra, para frases e termos com símbolo usa busca literal
        const escaped = escapeRegExp(word);
        let regex;
        if (/^[\p{L}\p{N}_-]+$/u.test(word)) {
            regex = new RegExp(`(^|[^\\p{L}\\p{N}_-])${escaped}([^\\p{L}\\p{N}_-]|$)`, 'u');
        } else {
            regex = new RegExp(`(^|\\b)${escaped}($|\\b)`, 'u');
        }
        if (regex.test(normalized)) {
            return word;
        }
    }
    return null;
}

export async function validateCommunityText(...texts) {
    for (const texto of texts) {
        const forbidden = containsForbiddenWord(texto);
        if (forbidden) {
            throw new Error(`Mensagem bloqueada por conter linguagem inadequada (xingamento: "${forbidden}").`);
        }
    }

    // Apenas validação local por forbidden words. Nenhuma chamada externa de moderação.
}


// ─── Tópicos ──────────────────────────────────────────────

export function subscribeToTopics(clubeId, callback) {
    if (!clubeId) {
        callback([]);
        return () => {};
    }
    const q = query(
        collection(db, 'forum_topicos'),
        where('clube_id', '==', clubeId)
    );
    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Ordena client-side: fixados primeiro, depois por última atividade
        docs.sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const aTime = a.lastActivityAt?.toMillis?.() || 0;
            const bTime = b.lastActivityAt?.toMillis?.() || 0;
            return bTime - aTime;
        });
        callback(docs);
    });
}

export async function createTopic({ clubeId, titulo, descricao, autor }) {
    if (!clubeId || !titulo?.trim() || !autor?.id) return null;
    await validateCommunityText(titulo, descricao);
    const ref = await addDoc(collection(db, 'forum_topicos'), {
        clube_id: clubeId,
        titulo: titulo.trim(),
        descricao: (descricao || '').trim(),
        autor_id: autor.id,
        autor_nome: autor.nome || 'Anônimo',
        createdAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        mensagens_count: 0,
        pinned: false,
        locked: false
    });
    return ref.id;
}

export async function togglePinTopic(topicId, currentPinned) {
    await updateDoc(doc(db, 'forum_topicos', topicId), { pinned: !currentPinned });
}

export async function toggleLockTopic(topicId, currentLocked) {
    await updateDoc(doc(db, 'forum_topicos', topicId), { locked: !currentLocked });
}

export async function deleteTopic(topicId) {
    // Deleta mensagens do tópico primeiro
    const msgsSnap = await getDocs(
        query(collection(db, 'forum_mensagens'), where('topico_id', '==', topicId))
    );
    const deletePromises = msgsSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    await deleteDoc(doc(db, 'forum_topicos', topicId));
}

// ─── Mensagens ────────────────────────────────────────────

export function subscribeToMessages(topicId, callback) {
    if (!topicId) {
        callback([]);
        return () => {};
    }
    const q = query(
        collection(db, 'forum_mensagens'),
        where('topico_id', '==', topicId)
    );
    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
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
        limit(pageSize)
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


export async function postMessage({ topicId, clubeId, autor, conteudo }) {
    if (!topicId || !conteudo?.trim() || !autor?.id) return null;
    await validateCommunityText(conteudo);
    const ref = await addDoc(collection(db, 'forum_mensagens'), {
        topico_id: topicId,
        clube_id: clubeId,
        autor_id: autor.id,
        autor_nome: autor.nome || 'Anônimo',
        conteudo: conteudo.trim(),
        createdAt: serverTimestamp()
    });
    // Atualiza contagem e última atividade no tópico
    await updateDoc(doc(db, 'forum_topicos', topicId), {
        mensagens_count: increment(1),
        lastActivityAt: serverTimestamp()
    });
    return ref.id;
}

export async function deleteMessage(messageId, topicId) {
    await deleteDoc(doc(db, 'forum_mensagens', messageId));
    await updateDoc(doc(db, 'forum_topicos', topicId), {
        mensagens_count: increment(-1)
    });
}

// ─── Solicitações de Entrada ──────────────────────────────

export function subscribeToJoinRequests(clubeId, callback) {
    if (!clubeId) {
        callback([]);
        return () => {};
    }
    const q = query(
        collection(db, 'forum_solicitacoes'),
        where('clube_id', '==', clubeId),
        where('status', '==', 'pendente')
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
    if (!clubeId || !solicitante?.id) return null;

    // Verifica se já existe solicitação pendente
    const existing = await getDocs(
        query(
            collection(db, 'forum_solicitacoes'),
            where('clube_id', '==', clubeId),
            where('solicitante_id', '==', solicitante.id),
            where('status', '==', 'pendente')
        )
    );
    if (!existing.empty) return null;

    // Verifica se já é membro externo aceito
    const memberSnap = await getDocs(
        query(
            collection(db, 'forum_membros_externos'),
            where('clube_id', '==', clubeId),
            where('membro_id', '==', solicitante.id)
        )
    );
    if (!memberSnap.empty) return null;

    const ref = await addDoc(collection(db, 'forum_solicitacoes'), {
        clube_id: clubeId,
        solicitante_id: solicitante.id,
        solicitante_nome: solicitante.nome || 'Anônimo',
        solicitante_clube_id: solicitante.clube_id || '',
        status: 'pendente',
        createdAt: serverTimestamp()
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
        respondidoAt: serverTimestamp()
    });

    if (accepted) {
        await addDoc(collection(db, 'forum_membros_externos'), {
            clube_id: data.clube_id,
            membro_id: data.solicitante_id,
            membro_nome: data.solicitante_nome,
            aceito_por: moderatorId,
            createdAt: serverTimestamp()
        });
    }
}

// ─── Membros Externos ─────────────────────────────────────

export function subscribeToExternalMembers(clubeId, callback) {
    if (!clubeId) {
        callback([]);
        return () => {};
    }
    const q = query(
        collection(db, 'forum_membros_externos'),
        where('clube_id', '==', clubeId)
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
        where('membro_id', '==', userId)
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

export async function removeExternalMember(memberId, clubeId) {
    const snap = await getDocs(
        query(
            collection(db, 'forum_membros_externos'),
            where('clube_id', '==', clubeId),
            where('membro_id', '==', memberId)
        )
    );
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
}

// ─── Listar fóruns paginados (cursor-based) ──────────────

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
            where('nome', '<=', end)
        );
        const snap = await getCountFromServer(q);
        return snap.data().count;
    }

    const snap = await getCountFromServer(collection(db, 'clubes_ciencia'));
    return snap.data().count;
}
