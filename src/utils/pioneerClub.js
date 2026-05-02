export const PIONEER_CUTOFF_MS = new Date('2026-05-01T00:00:00-03:00').getTime();
export const PIONEER_SEAL_LABEL = 'Clube Pioneiro';
export const PIONEER_SEAL_REASON = 'Este clube recebeu o selo por participar dos testes iniciais do sistema da Secretaria de Ciencias, Tecnologia e Inovacao do Estado da Bahia.';

export const parseTimestampMillis = (value) => {
    if (!value) return 0;

    if (typeof value?.toMillis === 'function') {
        const millis = value.toMillis();
        return Number.isFinite(millis) ? millis : 0;
    }

    if (typeof value?.toDate === 'function') {
        const dateValue = value.toDate();
        const millis = dateValue?.getTime?.();
        return Number.isFinite(millis) ? millis : 0;
    }

    if (typeof value === 'object') {
        const seconds = Number(value?.seconds ?? value?._seconds);
        if (Number.isFinite(seconds)) {
            const nanos = Number(value?.nanoseconds ?? value?._nanoseconds ?? 0);
            return Math.floor(seconds * 1000 + nanos / 1000000);
        }
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

export const hasPioneerSeal = (club) => {
    const createdAtSource = club?.createdAt
        ?? club?.created_at
        ?? club?.dataCriacao
        ?? club?.data_criacao;

    const createdAtMillis = parseTimestampMillis(createdAtSource);
    if (createdAtMillis <= 0) return false;
    return createdAtMillis < PIONEER_CUTOFF_MS;
};