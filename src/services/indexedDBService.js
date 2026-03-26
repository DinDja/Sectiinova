/**
 * IndexedDB Service - Cache distribuído para reduzir leituras massivas do Firestore
 * Estratégia: LRU (Least Recently Used) com TTL (Time To Live)
 */

const DB_NAME = 'InovaSectiCache';
const DB_VERSION = 1;

class IndexedDBService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa o banco de dados IndexedDB
   */
  async init() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Coleção de cache geral
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('collection', 'collection', { unique: false });
        }

        // Fila de sincronização para operações offline
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }

        // Metadados de última sincronização
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'collection' });
        }
      };
    });
  }

  /**
   * Salva dados no cache com TTL
   * @param {string} collection - Nome da coleção
   * @param {string} docId - ID do documento (ou 'list' para listas)
   * @param {any} data - Dados a cachear
   * @param {number} ttlMinutes - Tempo de vida em minutos (padrão: 30)
   */
  async set(collection, docId, data, ttlMinutes = 30) {
    if (!this.db) await this.init();

    const key = `${collection}:${docId}`;
    const now = Date.now();
    const expiresAt = now + ttlMinutes * 60 * 1000;

    const cacheEntry = {
      key,
      collection,
      docId,
      data,
      timestamp: now,
      expiresAt,
      accessCount: 1
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve(cacheEntry);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Recupera dados do cache
   * @param {string} collection - Nome da coleção
   * @param {string} docId - ID do documento
   * @returns {Promise<any|null>} Dados se encontrados e não expirados, null caso contrário
   */
  async get(collection, docId) {
    if (!this.db) await this.init();

    const key = `${collection}:${docId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) {
          resolve(null);
          return;
        }

        // Verifica se expirou
        if (Date.now() > entry.expiresAt) {
          // Remove entrada expirada
          this.delete(collection, docId).catch((err) =>
            console.warn('Erro ao remover entrada expirada:', err)
          );
          resolve(null);
          return;
        }

        // Atualiza timestamp de acesso e contagem
        this.updateAccessInfo(key).catch((err) =>
          console.warn('Erro ao atualizar info de acesso:', err)
        );

        resolve(entry.data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Atualiza informações de acesso para LRU
   */
  async updateAccessInfo(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          entry.timestamp = Date.now();
          entry.accessCount = (entry.accessCount || 0) + 1;
          store.put(entry);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deleta uma entrada do cache
   */
  async delete(collection, docId) {
    if (!this.db) await this.init();

    const key = `${collection}:${docId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa cache de uma coleção específica
   */
  async clearCollection(collection) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('collection');
      const range = IDBKeyRange.only(collection);
      const request = index.getAll(range);

      request.onsuccess = () => {
        const entries = request.result;
        entries.forEach((entry) => {
          store.delete(entry.key);
        });
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa todo o cache
   */
  async clearAll() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Implementa estratégia LRU: Remove 20% dos itens menos acessados quando DB cresce
   */
  async enforceMemoryLimit(maxEntries = 5000) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const entries = request.result;

        if (entries.length > maxEntries) {
          // Remove 20% dos mais antigos
          const toRemove = Math.ceil(entries.length * 0.2);
          const entriesToDelete = entries.slice(0, toRemove);

          entriesToDelete.forEach((entry) => {
            store.delete(entry.key);
          });
        }

        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Adiciona operação à fila de sincronização (para offline-first)
   */
  async addToSyncQueue(operation) {
    if (!this.db) await this.init();

    const syncEntry = {
      ...operation,
      timestamp: Date.now(),
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add(syncEntry);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Recupera fila de sincronização
   */
  async getSyncQueue() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove operação da fila de sincronização
   */
  async removeFromSyncQueue(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Atualiza metadados de sincronização
   */
  async updateSyncMetadata(collection, lastSync) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncMetadata'], 'readwrite');
      const store = transaction.objectStore('syncMetadata');
      const request = store.put({
        collection,
        lastSync,
        lastSyncTimestamp: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Recupera metadados de sincronização
   */
  async getSyncMetadata(collection) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncMetadata'], 'readonly');
      const store = transaction.objectStore('syncMetadata');
      const request = store.get(collection);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retorna estatísticas do cache
   */
  async getStats() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        const now = Date.now();
        const validEntries = entries.filter((e) => e.expiresAt > now);

        resolve({
          totalEntries: entries.length,
          validEntries: validEntries.length,
          expiredEntries: entries.length - validEntries.length,
          collections: [...new Set(entries.map((e) => e.collection))],
          oldestEntry: entries.length > 0 ? entries[0].timestamp : null,
          newestEntry: entries.length > 0 ? entries[entries.length - 1].timestamp : null
        });
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton
const indexedDBService = new IndexedDBService();

export default indexedDBService;
