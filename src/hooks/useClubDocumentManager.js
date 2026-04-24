import { deleteDoc, doc, setDoc } from 'firebase/firestore';

import { db } from '../../firebase';
import { CLUB_REQUIRED_DOCUMENTS } from '../constants/appConstants';
import { compressImageToBase64 } from '../utils/imageCompression';

const CLUB_DOCUMENT_INLINE_MAX_BYTES = 200 * 1024;
const CLUB_DOCUMENT_INLINE_TOTAL_MAX_BYTES = 420 * 1024;
const CLUB_DOCUMENT_CHUNK_CHAR_SIZE = 220000;

const isFileLike = (value) => typeof File !== 'undefined' && value instanceof File;

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    if (!isFileLike(file)) {
        resolve('');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nao foi possivel ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
});

const getDataUrlByteSize = (dataUrl) => {
    const base64 = String(dataUrl || '').split(',')[1] || '';
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.ceil((base64.length * 3) / 4) - padding;
};

const sanitizeStorageFileName = (fileName) => {
    const baseName = String(fileName || 'documento')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '');

    return (baseName || 'documento').slice(0, 120);
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const buildClubDocumentChunkDocId = (documentKey, index) => `${String(documentKey || 'doc').trim()}_${index}`;

const splitTextIntoChunks = (text, chunkSize = CLUB_DOCUMENT_CHUNK_CHAR_SIZE) => {
    const payload = String(text || '');
    const safeChunkSize = Math.max(50000, Number(chunkSize || CLUB_DOCUMENT_CHUNK_CHAR_SIZE));
    const chunks = [];

    for (let cursor = 0; cursor < payload.length; cursor += safeChunkSize) {
        chunks.push(payload.slice(cursor, cursor + safeChunkSize));
    }

    return chunks.length > 0 ? chunks : [''];
};

const deleteClubDocumentChunks = async ({ clubId, documentKey, chunkCount = 0 }) => {
    const normalizedClubId = String(clubId || '').trim();
    const normalizedDocumentKey = String(documentKey || '').trim();
    const normalizedChunkCount = Math.max(0, Number(chunkCount || 0));

    if (!normalizedClubId || !normalizedDocumentKey || normalizedChunkCount <= 0) {
        return;
    }

    await Promise.all(
        Array.from({ length: normalizedChunkCount }, (_, index) => deleteDoc(
            doc(db, 'clubes', normalizedClubId, 'documentos_chunks', buildClubDocumentChunkDocId(normalizedDocumentKey, index))
        ))
    );
};

const writeClubDocumentChunks = async ({
    clubId,
    documentKey,
    dataUrl,
    uploadedAt
}) => {
    const normalizedClubId = String(clubId || '').trim();
    const normalizedDocumentKey = String(documentKey || '').trim();
    const normalizedDataUrl = String(dataUrl || '');

    if (!normalizedClubId || !normalizedDocumentKey || !normalizedDataUrl.startsWith('data:')) {
        throw new Error('Documento invalido para segmentacao em Firestore.');
    }

    const chunks = splitTextIntoChunks(normalizedDataUrl, CLUB_DOCUMENT_CHUNK_CHAR_SIZE);

    await Promise.all(
        chunks.map((chunk, index) => setDoc(
            doc(db, 'clubes', normalizedClubId, 'documentos_chunks', buildClubDocumentChunkDocId(normalizedDocumentKey, index)),
            {
                document_key: normalizedDocumentKey,
                index,
                total: chunks.length,
                chunk,
                uploaded_at: uploadedAt
            }
        ))
    );

    return chunks.length;
};

const compressClubDocumentDataUrl = async (dataUrl, contentType) => {
    if (!String(dataUrl || '').startsWith('data:')) {
        return String(dataUrl || '');
    }

    const normalizedType = String(contentType || '').toLowerCase();
    if (!normalizedType.startsWith('image/')) {
        return String(dataUrl || '');
    }

    let compressed = String(dataUrl || '');
    let compressedBytes = getDataUrlByteSize(compressed);

    const compressionProfiles = [
        { maxWidth: 1600, maxHeight: 1600, quality: 0.68, maxSizeKB: 700 },
        { maxWidth: 1280, maxHeight: 1280, quality: 0.56, maxSizeKB: 520 },
        { maxWidth: 1024, maxHeight: 1024, quality: 0.48, maxSizeKB: 380 },
        { maxWidth: 900, maxHeight: 900, quality: 0.42, maxSizeKB: 300 }
    ];

    for (const profile of compressionProfiles) {
        if (compressedBytes <= CLUB_DOCUMENT_INLINE_MAX_BYTES) {
            break;
        }

        try {
            compressed = await compressImageToBase64(compressed, profile);
            compressedBytes = getDataUrlByteSize(compressed);
        } catch (compressionError) {
            console.warn('Falha ao comprimir documento de clube:', compressionError);
            break;
        }
    }

    return compressed;
};

const getDocumentInlineBytes = (documentPayload) => {
    const dataUrl = String(documentPayload?.data_url || '').trim();
    if (!dataUrl.startsWith('data:')) {
        return 0;
    }

    return Math.max(0, getDataUrlByteSize(dataUrl));
};

const materializeClubDocumentPayload = async ({
    clubId,
    uploadedAt,
    requiredDocument,
    documentPayload,
    previousDocument = null,
    forceChunk = false
}) => {
    if (!documentPayload || typeof documentPayload !== 'object') {
        return null;
    }

    const previousChunkCount = Math.max(0, Number(previousDocument?.chunk_count || previousDocument?.chunkCount || 0));
    const dataUrl = String(documentPayload?.data_url || documentPayload?.url || '').trim();
    const fileName = sanitizeStorageFileName(documentPayload?.nome_arquivo || `${requiredDocument.key}.pdf`);
    const contentType = String(documentPayload?.content_type || 'application/octet-stream').trim() || 'application/octet-stream';

    if (!dataUrl) {
        if (previousChunkCount > 0) {
            await deleteClubDocumentChunks({ clubId, documentKey: requiredDocument.key, chunkCount: previousChunkCount });
        }
        return null;
    }

    if (!dataUrl.startsWith('data:')) {
        if (previousChunkCount > 0) {
            await deleteClubDocumentChunks({ clubId, documentKey: requiredDocument.key, chunkCount: previousChunkCount });
        }

        return {
            key: requiredDocument.key,
            label: requiredDocument.label,
            nome_arquivo: fileName,
            caminho_storage: '',
            url: dataUrl,
            data_url: '',
            content_type: contentType,
            tamanho_bytes: Number(documentPayload?.tamanho_bytes || 0),
            storage_mode: isHttpUrl(dataUrl) ? 'external_url' : 'inline',
            chunk_count: 0,
            uploaded_at: uploadedAt
        };
    }

    const sizeBytes = Math.max(0, getDataUrlByteSize(dataUrl));
    const shouldChunk = forceChunk || sizeBytes > CLUB_DOCUMENT_INLINE_MAX_BYTES;

    if (!shouldChunk) {
        if (previousChunkCount > 0) {
            await deleteClubDocumentChunks({ clubId, documentKey: requiredDocument.key, chunkCount: previousChunkCount });
        }

        return {
            key: requiredDocument.key,
            label: requiredDocument.label,
            nome_arquivo: fileName,
            caminho_storage: '',
            url: dataUrl,
            data_url: dataUrl,
            content_type: contentType,
            tamanho_bytes: sizeBytes,
            storage_mode: 'inline',
            chunk_count: 0,
            uploaded_at: uploadedAt
        };
    }

    if (previousChunkCount > 0) {
        await deleteClubDocumentChunks({ clubId, documentKey: requiredDocument.key, chunkCount: previousChunkCount });
    }

    const chunkCount = await writeClubDocumentChunks({
        clubId,
        documentKey: requiredDocument.key,
        dataUrl,
        uploadedAt
    });

    return {
        key: requiredDocument.key,
        label: requiredDocument.label,
        nome_arquivo: fileName,
        caminho_storage: '',
        url: '',
        data_url: '',
        content_type: contentType,
        tamanho_bytes: sizeBytes,
        storage_mode: 'firestore_chunks',
        chunk_count: chunkCount,
        uploaded_at: uploadedAt
    };
};

export default function useClubDocumentManager() {
    const hasProvidedClubDocument = (documentValue) => {
        if (isFileLike(documentValue)) {
            return true;
        }

        if (documentValue && typeof documentValue === 'object') {
            const dataUrl = String(
                documentValue?.data_url
                || documentValue?.dataUrl
                || documentValue?.base64
                || documentValue?.url
                || ''
            ).trim();
            const chunkCount = Number(documentValue?.chunk_count || documentValue?.chunkCount || 0);
            return Boolean(dataUrl) || chunkCount > 0;
        }

        if (typeof documentValue === 'string') {
            return Boolean(String(documentValue).trim());
        }

        return false;
    };

    const normalizeClubDocumentPayload = async ({
        rawDocument,
        requiredDocument,
        uploadedAt
    }) => {
        let dataUrl = '';
        let contentType = '';
        let fileName = `${requiredDocument.key}.pdf`;
        let sizeBytes = 0;
        let chunkCount = 0;

        if (isFileLike(rawDocument)) {
            dataUrl = await readFileAsDataUrl(rawDocument);
            contentType = String(rawDocument.type || 'application/octet-stream').trim();
            fileName = String(rawDocument.name || fileName).trim() || fileName;
            sizeBytes = Number(rawDocument.size || 0);
        } else if (rawDocument && typeof rawDocument === 'object') {
            dataUrl = String(
                rawDocument?.data_url
                || rawDocument?.dataUrl
                || rawDocument?.base64
                || rawDocument?.url
                || ''
            ).trim();
            contentType = String(
                rawDocument?.content_type
                || rawDocument?.mime_type
                || rawDocument?.mimeType
                || ''
            ).trim();
            chunkCount = Math.max(0, Number(rawDocument?.chunk_count || rawDocument?.chunkCount || 0));
            fileName = String(
                rawDocument?.nome_arquivo
                || rawDocument?.file_name
                || rawDocument?.name
                || fileName
            ).trim() || fileName;
            sizeBytes = Number(
                rawDocument?.tamanho_bytes
                || rawDocument?.size
                || 0
            );
        } else if (typeof rawDocument === 'string') {
            dataUrl = String(rawDocument || '').trim();
        }

        if (!dataUrl) {
            return null;
        }

        if (!contentType && dataUrl.startsWith('data:')) {
            const match = dataUrl.match(/^data:([^;]+);/i);
            contentType = String(match?.[1] || '').trim();
        }

        if (!contentType) {
            contentType = 'application/octet-stream';
        }

        if (dataUrl.startsWith('data:')) {
            dataUrl = await compressClubDocumentDataUrl(dataUrl, contentType);
        }

        if (!sizeBytes && dataUrl.startsWith('data:')) {
            sizeBytes = Math.max(0, getDataUrlByteSize(dataUrl));
        }

        return {
            key: requiredDocument.key,
            label: requiredDocument.label,
            nome_arquivo: sanitizeStorageFileName(fileName),
            caminho_storage: '',
            url: dataUrl,
            data_url: dataUrl,
            content_type: contentType,
            tamanho_bytes: Number(sizeBytes || 0),
            storage_mode: chunkCount > 0 ? 'firestore_chunks' : 'inline',
            chunk_count: chunkCount,
            uploaded_at: uploadedAt
        };
    };

    const normalizeClubDocumentsForFirestore = async ({
        clubId,
        uploadedAt,
        documentsByKey = {},
        previousDocumentsByKey = {}
    }) => {
        const normalizedClubId = String(clubId || '').trim();
        const sourceDocuments = documentsByKey && typeof documentsByKey === 'object' ? documentsByKey : {};
        const previousDocuments = previousDocumentsByKey && typeof previousDocumentsByKey === 'object'
            ? previousDocumentsByKey
            : {};
        const materializedDocuments = {};

        const allDocumentKeys = new Set([
            ...Object.keys(sourceDocuments),
            ...Object.keys(previousDocuments)
        ]);

        for (const documentKey of allDocumentKeys) {
            const hasCurrentDocument = Object.prototype.hasOwnProperty.call(sourceDocuments, documentKey);
            if (hasCurrentDocument) {
                continue;
            }

            const previousDocument = previousDocuments[documentKey];
            const previousChunkCount = Math.max(0, Number(previousDocument?.chunk_count || previousDocument?.chunkCount || 0));
            if (previousChunkCount > 0) {
                await deleteClubDocumentChunks({
                    clubId: normalizedClubId,
                    documentKey,
                    chunkCount: previousChunkCount
                });
            }
        }

        for (const [documentKey, documentPayload] of Object.entries(sourceDocuments)) {
            const requiredDocument = CLUB_REQUIRED_DOCUMENTS.find((item) => item.key === documentKey) || {
                key: String(documentKey || 'documento').trim() || 'documento',
                label: String(documentPayload?.label || 'Documento').trim() || 'Documento'
            };
            const previousDocument = previousDocuments[documentKey] || null;

            const materializedPayload = await materializeClubDocumentPayload({
                clubId: normalizedClubId,
                uploadedAt,
                requiredDocument,
                documentPayload,
                previousDocument,
                forceChunk: false
            });

            if (!materializedPayload) {
                continue;
            }

            materializedDocuments[documentKey] = materializedPayload;
        }

        const collectInlineEntries = () => Object.entries(materializedDocuments)
            .filter(([, item]) => String(item?.storage_mode || '').trim() === 'inline')
            .filter(([, item]) => String(item?.data_url || '').trim().startsWith('data:'))
            .map(([key, item]) => ({ key, item }));

        let inlineEntries = collectInlineEntries();
        let inlineTotalBytes = inlineEntries.reduce((total, entry) => total + getDocumentInlineBytes(entry.item), 0);

        while (inlineEntries.length > 0 && inlineTotalBytes > CLUB_DOCUMENT_INLINE_TOTAL_MAX_BYTES) {
            const largestInline = inlineEntries
                .slice()
                .sort((a, b) => getDocumentInlineBytes(b.item) - getDocumentInlineBytes(a.item))[0];
            if (!largestInline) {
                break;
            }

            const requiredDocument = CLUB_REQUIRED_DOCUMENTS.find((item) => item.key === largestInline.key) || {
                key: largestInline.key,
                label: String(largestInline.item?.label || 'Documento').trim() || 'Documento'
            };

            const chunkedPayload = await materializeClubDocumentPayload({
                clubId: normalizedClubId,
                uploadedAt,
                requiredDocument,
                documentPayload: largestInline.item,
                previousDocument: previousDocuments[largestInline.key] || null,
                forceChunk: true
            });

            if (!chunkedPayload) {
                delete materializedDocuments[largestInline.key];
            } else {
                materializedDocuments[largestInline.key] = chunkedPayload;
            }

            inlineEntries = collectInlineEntries();
            inlineTotalBytes = inlineEntries.reduce((total, entry) => total + getDocumentInlineBytes(entry.item), 0);
        }

        return materializedDocuments;
    };

    return {
        hasProvidedClubDocument,
        normalizeClubDocumentPayload,
        normalizeClubDocumentsForFirestore
    };
}
