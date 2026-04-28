export const CLUB_BANNER_DISPLAY_MODES = [
    {
        id: 'cover',
        label: 'Capa preenchida',
        summary: 'Preenche todo o espaco do cabecalho com corte automatico.'
    },
    {
        id: 'contain',
        label: 'Imagem completa',
        summary: 'Mantem toda a imagem visivel com borda interna.'
    },
    {
        id: 'focus',
        label: 'Destaque cinematico',
        summary: 'Aplica zoom suave com contraste para destacar o clube.'
    },
    {
        id: 'poster',
        label: 'Poster em moldura',
        summary: 'Exibe o banner em quadro central com visual editorial.'
    }
];

export const DEFAULT_CLUB_BANNER_MODE = 'cover';

const BANNER_MODE_IDS = new Set(CLUB_BANNER_DISPLAY_MODES.map((mode) => mode.id));

export const normalizeClubBannerMode = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (BANNER_MODE_IDS.has(normalized)) {
        return normalized;
    }
    return DEFAULT_CLUB_BANNER_MODE;
};

export const getClubBannerModeMeta = (value) => {
    const normalized = normalizeClubBannerMode(value);
    return CLUB_BANNER_DISPLAY_MODES.find((mode) => mode.id === normalized) || CLUB_BANNER_DISPLAY_MODES[0];
};
