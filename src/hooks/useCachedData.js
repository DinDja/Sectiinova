/**
 * useCachedData Hook - Integra cache distribuído aos componentes
 * Substitui chamadas diretas do Firestore em hooks/componentes
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  orderBy,
  where,
  limit,
  startAfter,
  collection,
  getDocs,
  query,
  getCountFromServer,
  onSnapshot,
  getDoc,
  doc,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import cachedDataService from '../services/cachedDataService';
import indexedDBService from '../services/indexedDBService';

/**
 * Hook para gerenciar dados com cache automático
 * @param {string} collectionName - Nome da coleção Firestore
 * @param {array} constraints - Constraints de query (where, orderBy, limit, etc.)
 * @param {boolean} useCache - Habilitar cache (padrão: true)
 * @param {boolean} isRealtime - Usar listener em tempo real (padrão: false)
 */
export function useCachedCollection(
  collectionName,
  constraints = [],
  useCache = true,
  isRealtime = false
) {
  const [data, setData] = useStateIfMounted([]);
  const [loading, setLoading] = useStateIfMounted(true);
  const [error, setError] = useStateIfMounted(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isRealtime) {
          // Usa listener em tempo real com cache
          unsubscribeRef.current = cachedDataService.onCollectionSnapshot(
            collectionName,
            constraints,
            (snapshot) => {
              if (isMounted) {
                setData(snapshot);
                setLoading(false);
              }
            },
            useCache
          );
        } else {
          // Busca única com cache
          const result = await cachedDataService.getCollectionList(
            collectionName,
            constraints,
            useCache
          );
          if (isMounted) {
            setData(result);
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, JSON.stringify(constraints), useCache, isRealtime]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await cachedDataService.getCollectionList(
        collectionName,
        constraints,
        useCache
      );
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, constraints, useCache]);

  const invalidateCache = useCallback(async () => {
    await cachedDataService.invalidateCollection(collectionName);
  }, [collectionName]);

  return { data, loading, error, refetch, invalidateCache };
}

/**
 * Hook para recuperar um documento único com cache
 */
export function useCachedDocument(collectionName, docId, useCache = true) {
  const [data, setData] = useStateIfMounted(null);
  const [loading, setLoading] = useStateIfMounted(true);
  const [error, setError] = useStateIfMounted(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!docId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Usa listener real-time
        unsubscribeRef.current = onSnapshot(doc(db, collectionName, docId), async (snap) => {
          if (snap.exists()) {
            const docData = { id: snap.id, ...snap.data() };
            if (isMounted) {
              setData(docData);
              // Cacheia automaticamente
              if (useCache) {
                await cachedDataService.init();
                await indexedDBService.set(
                  collectionName,
                  docId,
                  docData,
                  cachedDataService.getTTL(collectionName)
                );
              }
            }
          }
          if (isMounted) setLoading(false);
        });
      } catch (err) {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, docId, useCache]);

  const refetch = useCallback(async () => {
    if (!docId) return;
    try {
      setLoading(true);
      const result = await cachedDataService.getDocument(collectionName, docId, useCache);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, docId, useCache]);

  const invalidateCache = useCallback(async () => {
    if (docId) {
      await cachedDataService.invalidateDocument(collectionName, docId);
    }
  }, [collectionName, docId]);

  return { data, loading, error, refetch, invalidateCache };
}

/**
 * Helper: Hook auxiliar para estado que respeita mounting
 */
function useStateIfMounted(initialValue) {
  const [state, setState] = React.useState(initialValue);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setStateIfMounted = useCallback((value) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, setStateIfMounted];
}

export { cachedDataService };
