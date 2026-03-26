/**
 * GUIA DE INTEGRAÇÃO: Cache distribuído no useAppController
 * 
 * Este arquivo demonstra como integrar IndexedDB no seu useAppController existente.
 * Siga os passos abaixo para implementar o cache com mínimas mudanças.
 */

// ============================================================================
// PASSO 1: IMPORTS
// ============================================================================
// Adicione no topo do seu useAppController.js:

import cachedDataService from '../services/cachedDataService';
import indexedDBService from '../services/indexedDBService';

// ============================================================================
// PASSO 2: INICIALIZAÇÃO
// ============================================================================
// Adicione inside do seu componente/hook (antes do useEffect principal):

useEffect(() => {
  // Inicializa cache na primeira renderização
  indexedDBService.init().catch((err) => {
    console.error('Erro ao inicializar cache:', err);
  });
}, []);

// ============================================================================
// PASSO 3: SUBSTITUIR LISTENERS DE COLEÇÃO
// ============================================================================
// ANTES (código atual):
/*
const subscribeToCollection = (collectionName, setter, options = {}) => {
  const collectionRef = options.queryBuilder
    ? options.queryBuilder(collection(db, collectionName))
    : collection(db, collectionName);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      setter(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      finishLoading();
    },
    (error) => {
      console.error(`Erro ao carregar ${collectionName}:`, error);
      setErrorMessage('Nao foi possivel carregar todos os dados do Banco de Dados. Verifique conexão.');
      finishLoading();
    }
  );
};
*/

// DEPOIS (com cache distribuído):
const subscribeToCollection = (collectionName, setter, options = {}) => {
  return cachedDataService.onCollectionSnapshot(
    collectionName,
    options.constraints || [],
    setter,
    true // useCache
  );
};

// ============================================================================
// PASSO 4: SUBSTITUIR BUSCA DE DOCUMENTOS INDIVIDUAIS
// ============================================================================
// BEFORE (código que busca documentos):
/*
const snap = await getDoc(doc(db, 'usuarios', user.uid));
if (snap.exists()) {
  setLoggedUser({ id: snap.id, ...snap.data() });
}
*/

// AFTER (com cache):
const userData = await cachedDataService.getDocument('usuarios', user.uid);
if (userData) {
  setLoggedUser(userData);
}

// ============================================================================
// PASSO 5: SUBSTITUIR PAGINAÇÃO DE PROJETOS
// ============================================================================
// BEFORE (código atual fetchProjectsPage):
/*
const projectsQuery = query(collection(db, 'projetos'), ...constraints);
const snapshot = await getDocs(projectsQuery);
const loadedProjects = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
*/

// AFTER (com cache):
const loadedProjects = await cachedDataService.getCollectionList(
  'projetos',
  constraints,
  true // useCache
);

// ============================================================================
// PASSO 6: SUBSTITUIR CONTAGEM DE DOCUMENTOS
// ============================================================================
// BEFORE (código atual):
/*
const totalSnapshot = await getCountFromServer(collection(db, 'projetos'));
setProjectsTotalCount(totalSnapshot.data().count || 0);
*/

// AFTER (com cache):
const count = await cachedDataService.getCountFromCollection('projetos');
setProjectsTotalCount(count || 0);

// ============================================================================
// PASSO 7: INVALIDAR CACHE APÓS MUTATIONS
// ============================================================================
// Após criar/atualizar/deletar documentos, invalide o cache:

// Após adicionar novo diário:
await addDoc(collection(db, 'diario_bordo'), { /* ... */ });
await cachedDataService.invalidateCollection('diario_bordo');

// Após atualizar projeto:
await updateDoc(doc(db, 'projetos', projectId), { /* ... */ });
await cachedDataService.invalidateDocument('projetos', projectId);

// ============================================================================
// PASSO 8: MONITORAR PERFORMANCE (DEBUG)
// ============================================================================
// Adicione esta função para ver estatísticas do cache:

const debugCacheStats = async () => {
  const stats = await cachedDataService.getStats();
  console.table(stats);
};

// Para usar no console:
// window.debugCacheStats = debugCacheStats;

// ============================================================================
// RESULTADO ESPERADO
// ============================================================================
/*
✓ Primeira carga: busca Firestore + cacheia em IndexedDB
✓ Carregamentos subsequentes: servir de IndexedDB (imediato)
✓ Real-time updates: listener Firestore atualiza + recacheia
✓ Fallback offline: dados servidos do cache mesmo se conexão cair
✓ TTL automático: dados antigos removidos per-collection
✓ LRU management: limite inteligente de memória

Redução esperada:
- 80-90% menos leituras do Firestore
- UX mais rápido (dados locais)
- Funciona offline (com dados em cache)
*/

// ============================================================================
// CONFIGURAÇÃO AVANÇADA
// ============================================================================
// TTL customizado por coleção (em cachedDataService.js):

const COLLECTIONS_TTL = {
  clubes_ciencia: 60,      // atualiza a cada 1h
  usuarios: 45,            // atualiza a cada 45min
  unidades_escolares: 120, // 2 horas
  diario_bordo: 15,        // 15 min (dados mais dinâmicos)
  projetos: 30
};

// TTL mais agressivo para dados que mudam frequentemente:
// COLLECTIONS_TTL['diario_bordo'] = 5; // Atualiza a cada 5 minutos

// ============================================================================
// MONITORAMENTO E LIMPEZA
// ============================================================================

// Limpar cache específico (se necessário):
await cachedDataService.invalidateCollection('diario_bordo');

// Limpar tudo:
await indexedDBService.clearAll();

// Ver estatísticas:
const stats = await indexedDBService.getStats();
console.log('Cache Stats:', stats);

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/*
Q: Dados não estão sendo sincronizados?
A: Verifique se vocate invalidou o cache após mutations

Q: Cache crescendo demais?
A: Sistema LRU remove automaticamente 20% dos antigos quando atinge limite

Q: Offline não funciona?
A: Dados só servem offline se foram cacheiados antes (use listeners real-time)

Q: Performance piorou?
A: Reduz TTL (COLLECTIONS_TTL) ou limpa cache frequentemente
*/
