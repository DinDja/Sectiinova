import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

export default function useProjectSearch(searchTerm) {
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    const normalizeText = useCallback((text) =>
        String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/\s+/g, ' ')
            .trim(), []);

    const getLevenshteinDistance = useCallback((a, b) => {
        const matrix = Array.from({ length: b.length + 1 }, () => []);

        for (let i = 0; i <= b.length; i += 1) {
            matrix[i][0] = i;
        }

        for (let j = 0; j <= a.length; j += 1) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i += 1) {
            for (let j = 1; j <= a.length; j += 1) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[b.length][a.length];
    }, []);

    const isFuzzyMatch = useCallback((term, text) => {
        if (!term || !text) return false;

        if (text.includes(term)) return true;

        const termLength = term.length;
        const maxDistance = Math.max(1, Math.floor(termLength * 0.35));

        const words = text.split(/\s+/).filter(Boolean);
        for (const word of words) {
            if (Math.abs(word.length - termLength) > Math.max(2, termLength)) continue;
            if (getLevenshteinDistance(term, word) <= maxDistance) {
                return true;
            }
        }

        return false;
    }, [getLevenshteinDistance]);

    const normalizedSearchTerm = useMemo(() => normalizeText(searchTerm), [searchTerm, normalizeText]);
    const deferredSearchTerm = useDeferredValue(normalizedSearchTerm);

    useEffect(() => {
        if (!searchTerm || !searchTerm.trim()) {
            setIsSearchLoading(false);
            return;
        }

        setIsSearchLoading(true);
        const timer = window.setTimeout(() => {
            setIsSearchLoading(false);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    return {
        normalizedSearchTerm,
        deferredSearchTerm,
        isSearchLoading,
        normalizeText,
        isFuzzyMatch
    };
}
