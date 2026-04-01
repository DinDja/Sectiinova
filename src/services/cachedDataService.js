/**
 * Cached Data Service - Wrapper smart sobre Firestore com cache distribuído
 * Reduz leituras massivas usando IndexedDB como primeira camada
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../../firebase';
import indexedDBService from './indexedDBService';

const DEFAULT_TTL_MINUTES = 30; // Cache expira em 30 minutos
const COLLECTIONS_TTL = {
  clubes_ciencia: 60, // 1 hora
  usuarios: 45,
  unidades_escolares: 120, // 2 horas
  diario_bordo: 15, // 15 minutos (dados mais dinâmicos)
  projetos: 30
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

  /**
   * Obtém TTL apropriado para uma coleção
   */
  getTTL(collectionName) {
    return COLLECTIONS_TTL[collectionName] || DEFAULT_TTL_MINUTES;
  }

  /**
   * Recupera um documento com cache
   * Tenta cache primeiro, depois Firestore
   */
  async getDocument(collectionName, docId, useCache = true) {
    if (!this.initialized) await this.init();

    // 1. Tenta cache se habilitado
    if (useCache) {
      const cached = await indexedDBService.get(collectionName, docId);
      if (cached !== null) {
        return cached;
      }
    }

    // 2. Busca no Firestore
    try {
      const snap = await getDoc(doc(db, collectionName, docId));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        // 3. Cacheia resultado
        const ttl = this.getTTL(collectionName);
        await indexedDBService.set(collectionName, docId, data, ttl);
        return data;
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar ${collectionName}/${docId}:`, error);
      throw error;
    }
  }

  /**
   * Recupera lista de documentos com cache por coleção
   * Cacheia toda a coleção ou lista filtrada
   */
  async getCollectionList(collectionName, constraints = [], useCache = true) {
    if (!this.initialized) await this.init();

    // Gera key de cache (lista é identificada junto com constraints)
    const cacheKey = constraints.length > 0 ? `list:${JSON.stringify(constraints)}` : 'list';

    // 1. Tenta cache
    if (useCache) {
      const cached = await indexedDBService.get(collectionName, cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // 2. Busca no Firestore
    console.log(`[Cache MISS] ${collectionName}/${cacheKey} - buscando no Firestore...`);
    try {
      const collectionRef = collection(db, collectionName);
      const q = constraints.length > 0
        ? query(collectionRef, ...constraints)
        : collectionRef;

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

      // 3. Cacheia resultado
      const ttl = this.getTTL(collectionName);
      await indexedDBService.set(collectionName, cacheKey, data, ttl);

      return data;
    } catch (error) {
      console.error(`Erro ao buscar coleção ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Recupera subcoleção de um documento
   * Útil para diários por projeto, etc.
   */
  async getSubcollection(parentCollection, parentId, subCollection, constraints = [], useCache = true) {
    if (!this.initialized) await this.init();

    const cacheKey = `${parentId}:${subCollection}:${JSON.stringify(constraints)}`;

    // 1. Tenta cache
    if (useCache) {
      const cached = await indexedDBService.get(parentCollection, cacheKey);
      if (cached !== null) {
        console.log(`[Cache HIT] ${parentCollection}/${cacheKey}`);
        return cached;
      }
    }

    // 2. Busca no Firestore
    console.log(`[Cache MISS] ${parentCollection}/${cacheKey} - buscando no Firestore...`);
    try {
      const subcollectionRef = collection(
        db,
        parentCollection,
        parentId,
        subCollection
      );

      const q = constraints.length > 0
        ? query(subcollectionRef, ...constraints)
        : subcollectionRef;

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

      // 3. Cacheia resultado
      const ttl = this.getTTL(parentCollection);
      await indexedDBService.set(parentCollection, cacheKey, data, ttl);

      return data;
    } catch (error) {
      console.error(`Erro ao buscar subcoleção ${parentCollection}/${parentId}/${subCollection}:`, error);
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

    let unsubscribe;

    try {
      const collectionRef = collection(db, collectionName);
      const q = constraints.length > 0
        ? query(collectionRef, ...constraints)
        : collectionRef;

      unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

          // Cacheia dados em tempo real
          const ttl = this.getTTL(collectionName);
          const cacheKey = constraints.length > 0 ? `list:${JSON.stringify(constraints)}` : 'list';
          await indexedDBService.set(collectionName, cacheKey, data, ttl).catch((err) =>
            console.warn('Erro ao cachear snapshot:', err)
          );

          callback(data);
        },
        async (error) => {
          console.error(`Erro no listener ${collectionName}:`, error);

          // Fallback: tenta servir dados do cache
          if (useCache) {
            console.warn(`Fallback para cache - ${collectionName}`);
            const cacheKey = constraints.length > 0
              ? `list:${JSON.stringify(constraints)}`
              : 'list';
            const cached = await indexedDBService.get(collectionName, cacheKey)
              .catch(() => null);

            if (cached) {
              callback(cached);
            }
          }
        }
      );
    } catch (error) {
      console.error(`Erro ao criar listener ${collectionName}:`, error);
    }

    // Retorna função para desinscrever
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }

  /**
   * Conta documentos em uma coleção com cache
   */
  async getCountFromCollection(collectionName, useCache = true) {
    if (!this.initialized) await this.init();

    const cacheKey = 'count';

    // 1. Tenta cache
    if (useCache) {
      const cached = await indexedDBService.get(collectionName, cacheKey);
      if (cached !== null) {
        console.log(`[Cache HIT] ${collectionName}/count`);
        return cached;
      }
    }

    // 2. Busca no Firestore
    console.log(`[Cache MISS] ${collectionName}/count - buscando no Firestore...`);
    try {
      const countSnapshot = await getCountFromServer(collection(db, collectionName));
      const count = countSnapshot.data().count;

      // 3. Cacheia resultado
      await indexedDBService.set(collectionName, cacheKey, count, 60); // TTL: 1 hora

      return count;
    } catch (error) {
      console.error(`Erro ao contar documentos em ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Invalida cache de uma coleção (chamar após mutations)
   */
  async invalidateCollection(collectionName) {
    await indexedDBService.clearCollection(collectionName);
    console.log(`[Cache INVALIDATED] ${collectionName}`);
  }

  /**
   * Invalida um documento específico no cache
   */
  async invalidateDocument(collectionName, docId) {
    await indexedDBService.delete(collectionName, docId);
    console.log(`[Cache INVALIDATED] ${collectionName}/${docId}`);
  }

  /**
   * Retorna estatísticas de cache para debug
   */
  async getStats() {
    return await indexedDBService.getStats();
  }
}

// Singleton
const cachedDataService = new CachedDataService();

export default cachedDataService;
