const MEMBERSHIP_BARCODE_PREFIX = 'CTI1';

const stripDiacritics = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const clampTokenLength = (value, maxLength = 64) => {
    const normalizedMax = Number.isFinite(Number(maxLength)) ? Math.max(1, Number(maxLength)) : 64;
    return String(value || '').slice(0, normalizedMax);
};

export const normalizeBarcodeToken = (value, fallback = 'X', maxLength = 64) => {
    const cleaned = stripDiacritics(value)
        .replace(/[^a-zA-Z0-9@._:-]/g, '')
        .trim();

    const limited = clampTokenLength(cleaned, maxLength);
    if (limited) return limited;

    const fallbackClean = stripDiacritics(fallback)
        .replace(/[^a-zA-Z0-9@._:-]/g, '')
        .trim();

    return clampTokenLength(fallbackClean || 'X', maxLength);
};

export const normalizeExpiryYmd = (value, fallbackYear = new Date().getFullYear()) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (/^\d{8}$/.test(digits)) return digits;
    return `${Number(fallbackYear || new Date().getFullYear())}1231`;
};

export const computeMembershipBarcodeChecksum = (parts = []) => {
    const raw = Array.isArray(parts)
        ? parts.map((part) => String(part || '')).join('|')
        : String(parts || '');

    let hash = 17;
    for (let index = 0; index < raw.length; index += 1) {
        hash = (hash + (raw.charCodeAt(index) * (index + 1))) % 1000;
    }

    return String(hash).padStart(3, '0');
};

export const buildMembershipBarcodePayload = ({
    clubId = '',
    memberId = '',
    roleCode = 'C',
    expiryYmd = '',
    prefix = MEMBERSHIP_BARCODE_PREFIX,
} = {}) => {
    const normalizedPrefix = normalizeBarcodeToken(prefix, MEMBERSHIP_BARCODE_PREFIX, 12);
    const normalizedClubId = normalizeBarcodeToken(clubId, 'CLUBE', 72);
    const normalizedMemberId = normalizeBarcodeToken(memberId, 'MEMBRO', 96);
    const normalizedRoleCode = String(roleCode || '').trim().toUpperCase() === 'M' ? 'M' : 'C';
    const normalizedExpiry = normalizeExpiryYmd(expiryYmd);

    const baseParts = [
        normalizedPrefix,
        normalizedClubId,
        normalizedMemberId,
        normalizedRoleCode,
        normalizedExpiry,
    ];
    const checksum = computeMembershipBarcodeChecksum(baseParts);

    return [...baseParts, checksum].join('|');
};

export const parseMembershipBarcodePayload = (rawValue) => {
    const raw = String(rawValue || '').trim();
    if (!raw) {
        return { ok: false, error: 'Codigo vazio.' };
    }

    const parts = raw.split('|').map((part) => String(part || '').trim());
    if (parts.length !== 6) {
        return { ok: false, error: 'Formato invalido do codigo da carteirinha.' };
    }

    const [prefix, clubId, memberId, roleCodeRaw, expiryYmdRaw, checksum] = parts;
    if (!prefix || !clubId || !memberId || !roleCodeRaw || !expiryYmdRaw || !checksum) {
        return { ok: false, error: 'Campos obrigatorios ausentes no codigo da carteirinha.' };
    }

    const roleCode = roleCodeRaw.toUpperCase() === 'M' ? 'M' : 'C';
    if (!/^\d{8}$/.test(expiryYmdRaw)) {
        return { ok: false, error: 'Validade invalida no codigo da carteirinha.' };
    }
    const expiryYmd = expiryYmdRaw;
    const expectedChecksum = computeMembershipBarcodeChecksum([
        prefix,
        clubId,
        memberId,
        roleCode,
        expiryYmd,
    ]);

    if (String(checksum).padStart(3, '0') !== expectedChecksum) {
        return { ok: false, error: 'Checksum invalido no codigo da carteirinha.' };
    }

    return {
        ok: true,
        prefix,
        clubId,
        memberId,
        roleCode,
        expiryYmd,
        checksum: String(checksum).padStart(3, '0'),
        expectedChecksum,
        raw,
    };
};

export const ymdToIsoDate = (value) => {
    const normalized = normalizeExpiryYmd(value);
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
};

export const isExpiryYmdExpired = (value, nowDate = new Date()) => {
    const normalized = normalizeExpiryYmd(value);
    const now = new Date(nowDate);
    const nowYmd = Number.isFinite(now.getTime())
        ? Number(now.toISOString().slice(0, 10).replace(/-/g, ''))
        : Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));

    return Number(normalized) < nowYmd;
};

export { MEMBERSHIP_BARCODE_PREFIX };
