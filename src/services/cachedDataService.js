/**
 * Cached Data Service - Wrapper smart sobre Firestore com cache distribuido
 * Reduz leituras massivas usando IndexedDB como primeira camada
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  onSnapshot,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../firebase';
import indexedDBService from './indexedDBService';

const DEFAULT_TTL_MINUTES = 30; // Cache expira em 30 minutos
const COLLECTIONS_TTL = {
  clubes: 60, // 1 hora
  clubes_ciencia: 60, // legado
  usuarios: 45,
  unidades_escolares: 120, // 2 horas
  diario_bordo: 15, // 15 minutos (dados mais dinamicos)
  projetos: 30,
};

class CachedDataService {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await indexedDBService.init();
    this.initialized = true;
  }

  normalizeCollectionName(collectionName) {
    const normalized = String(collectionName || '').trim();
    if (!normalized) return normalized;
    return normalized;
  }

  /**
   * Obtem TTL apropriado para uma colecao
   */
  getTTL(collectionName) {
    const normalizedCollectionName = this.normalizeCollectionName(collectionName);
    return COLLECTIONS_TTL[normalizedCollectionName] || DEFAULT_TTL_MINUTES;
  }

  /**
   * Recupera um documento com cache
   * Tenta cache primeiro, depois Firestore
   */
  async getDocument(collectionName, docId, useCache = true) {
    if (!this.initialized) await this.init();

    const normalizedCollectionName = this.normalizeCollectionName(collectionName);

    // 1. Tenta cache se habilitado
    if (useCache) {
      const cached = await indexedDBService.get(normalizedCollectionName, docId);
      if (cached !== null) {
        return cached;
      }
    }

    // 2. Busca no Firestore
    try {
      const snap = await getDoc(doc(db, normalizedCollectionName, docId));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        // 3. Cacheia resultado
        const ttl = this.getTTL(normalizedCollectionName);
        await indexedDBService.set(normalizedCollectionName, docId, data, ttl);
        return data;
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar ${normalizedCollectionName}/${docId}:`, error);
      throw error;
    }
  }

  /**
   * Recupera lista de documentos com cache por colecao
   * Cacheia toda a colecao ou lista filtrada
   */
  async getCollectionList(collectionName, constraints = [], useCache = true) {
    if (!this.initialized) await this.init();

    const normalizedCollectionName = this.normalizeCollectionName(collectionName);

    // Gera key de cache (lista e identificada junto com constraints)
    const cacheKey = constraints.length > 0 ? `list:${JSON.stringify(constraints)}` : 'list';

    // 1. Tenta cache
    if (useCache) {
      const cached = await indexedDBService.get(normalizedCollectionName, cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // 2. Busca no Firestore
    console.log(`[Cache MISS] ${normalizedCollectionName}/${cacheKey} - buscando no Firestore...`);
    try {
      const collectionRef = collection(db, normalizedCollectionName);
      const q = constraints.length > 0
        ? query(collectionRef, ...constraints)
        : collectionRef;

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

      // 3. Cacheia resultado
      const ttl = this.getTTL(normalizedCollectionName);
      await indexedDBService.set(normalizedCollectionName, cacheKey, data, ttl);

      return data;
    } catch (error) {
      console.error(`Erro ao buscar colecao ${normalizedCollectionName}:`, error);
      throw error;
    }
  }

  /**
   * Recupera subcolecao de um documento
   * Util para diarios por projeto, etc.
   */
  async getSubcollection(parentCollection, parentId, subCollection, constraints = [], useCache = true) {
    if (!this.initialized) await this.init();

    const normalizedParentCollection = this.normalizeCollectionName(parentCollection);
    const cacheKey = `${parentId}:${subCollection}:${JSON.stringify(constraints)}`;

    // 1. Tenta cache
    if (useCache) {
      const cached = await indexedDBService.get(normalizedParentCollection, cacheKey);
      if (cached !== null) {
        console.log(`[Cache HIT] ${normalizedParentCollection}/${cacheKey}`);
        return cached;
      }
    }

    // 2. Busca no Firestore
    console.log(`[Cache MISS] ${normalizedParentCollection}/${cacheKey} - buscando no Firestore...`);
    try {
      const subcollectionRef = collection(
        db,
        normalizedParentCollection,
        parentId,
        subCollection,
      );

      const q = constraints.length > 0
        ? query(subcollectionRef, ...constraints)
        : subcollectionRef;

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

      // 3. Cacheia resultado
      const ttl = this.getTTL(normalizedParentCollection);
      await indexedDBService.set(normalizedParentCollection, cacheKey, data, ttl);

      return data;
    } catch (error) {
      console.error(`Erro ao buscar subcolecao ${normalizedParentCollection}/${parentId}/${subCollection}:`, error);
      throw error;
    }
  }

  /**
   * Real-time listener com fallback de cache
   * Usa snapshot listener do Firestore, mas com cache como fallback offline
   */
  onCollectionSnapshot(collectionName, constraints = [], callback, useCache = true) {
    if (!this.initialized) {
      this.init().catch((err) => console.error('Erro ao inicializar cache:', err));
    }

    const normalizedCollectionName = this.normalizeCollectionName(collectionName);

    let unsubscribe;

    try {
      const collectionRef = collection(db, normalizedCollectionName);
      const q = constraints.length > 0
        ? query(collectionRef, ...constraints)
        : collectionRef;

      unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

          // Cacheia dados em tempo real
          const ttl = this.getTTL(normalizedCollectionName);
          const cacheKey = constraints.length > 0 ? `list:${JSON.stringify(constraints)}` : 'list';
          await indexedDBService.set(normalizedCollectionName, cacheKey, data, ttl).catch((err) =>
            console.warn('Erro ao cachear snapshot:', err),
          );

          callback(data);
        },
        async (error) => {
          console.error(`Erro no listener ${normalizedCollectionName}:`, error);

          // Fallback: tenta servir dados do cache
          if (useCache) {
            console.warn(`Fallback para cache - ${normalizedCollectionName}`);
            const cacheKey = constraints.length > 0
              ? `list:${JSON.stringify(constraints)}`
              : 'list';
            const cached = await indexedDBService.get(normalizedCollectionName, cacheKey)
              .catch(() => null);

            if (cached) {
              callback(cached);
            }
          }
        },
      );
    } catch (error) {
      console.error(`Erro ao criar listener ${normalizedCollectionName}:`, error);
    }

    // Retorna funcao para desinscrever
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }

  /**
   * Conta documentos em uma colecao com cache
   */
  async getCountFromCollection(collectionName, useCache = true) {
    if (!this.initialized) await this.init();

    const normalizedCollectionName = this.normalizeCollectionName(collectionName);
    const cacheKey = 'count';

    // 1. Tenta cache
    if (useCache) {
      const cached = await indexedDBService.get(normalizedCollectionName, cacheKey);
      if (cached !== null) {
        console.log(`[Cache HIT] ${normalizedCollectionName}/count`);
        return cached;
      }
    }

    // 2. Busca no Firestore
    console.log(`[Cache MISS] ${normalizedCollectionName}/count - buscando no Firestore...`);
    try {
      const countSnapshot = await getCountFromServer(collection(db, normalizedCollectionName));
      const count = countSnapshot.data().count;

      // 3. Cacheia resultado
      await indexedDBService.set(normalizedCollectionName, cacheKey, count, 60); // TTL: 1 hora

      return count;
    } catch (error) {
      console.error(`Erro ao contar documentos em ${normalizedCollectionName}:`, error);
      throw error;
    }
  }

  /**
   * Invalida cache de uma colecao (chamar apos mutations)
   */
  async invalidateCollection(collectionName) {
    const normalizedCollectionName = this.normalizeCollectionName(collectionName);
    await indexedDBService.clearCollection(normalizedCollectionName);
    console.log(`[Cache INVALIDATED] ${normalizedCollectionName}`);
  }

  /**
   * Invalida um documento especifico no cache
   */
  async invalidateDocument(collectionName, docId) {
    const normalizedCollectionName = this.normalizeCollectionName(collectionName);
    await indexedDBService.delete(normalizedCollectionName, docId);
    console.log(`[Cache INVALIDATED] ${normalizedCollectionName}/${docId}`);
  }

  /**
   * Retorna estatisticas de cache para debug
   */
  async getStats() {
    return await indexedDBService.getStats();
  }
}

// Singleton
const cachedDataService = new CachedDataService();

export default cachedDataService;
