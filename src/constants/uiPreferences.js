export const DEFAULT_UI_FONT_ID = 'comic';
export const DEFAULT_UI_THEME_ID = 'oceano';
export const DEFAULT_UI_STYLE_ID = 'neo';

export const UI_FONT_OPTIONS = [
    {
        id: 'comic',
        label: 'Comic Neue',
        sample: 'Pesquisa que inspira',
        stack: '"Comic Neue", "Comic Sans MS", cursive, sans-serif'
    },
    {
        id: 'nunito',
        label: 'Nunito',
        sample: 'Leitura clara e suave',
        stack: '"Nunito", "Trebuchet MS", "Segoe UI", sans-serif'
    },
    {
        id: 'poppins',
        label: 'Poppins',
        sample: 'Visual moderno e firme',
        stack: '"Poppins", "Segoe UI", sans-serif'
    },
    {
        id: 'merriweather',
        label: 'Merriweather',
        sample: 'Tom editorial e elegante',
        stack: '"Merriweather", "Georgia", serif'
    }
];

export const UI_THEME_OPTIONS = [
    {
        id: 'oceano',
        label: 'Oceano Neo',
        summary: 'Paleta azul-turquesa classica da plataforma.',
        preview: {
            primary: '#2dd4bf',
            secondary: '#60a5fa',
            soft: '#ccfbf1'
        },
        vars: {
            '--auth-primary': '#2dd4bf',
            '--auth-primary-strong': '#14b8a6',
            '--auth-secondary': '#60a5fa',
            '--studio-accent': '#2dd4bf',
            '--studio-accent-strong': '#14b8a6',
            '--studio-accent-soft': '#ccfbf1',
            '--ui-selection-bg': 'rgba(45, 212, 191, 0.32)',
            '--ui-focus-ring': 'rgba(20, 184, 166, 0.65)',
            '--studio-main-dot': 'rgba(15, 23, 42, 0.1)',
            '--studio-main-spot-a': 'rgba(242, 245, 244, 0.12)',
            '--studio-main-spot-b': 'rgba(96, 165, 250, 0.1)'
        }
    },
    {
        id: 'floresta',
        label: 'Floresta Viva',
        summary: 'Tons verdes e citricos para uma identidade natural.',
        preview: {
            primary: '#22c55e',
            secondary: '#84cc16',
            soft: '#dcfce7'
        },
        vars: {
            '--auth-primary': '#22c55e',
            '--auth-primary-strong': '#16a34a',
            '--auth-secondary': '#84cc16',
            '--studio-accent': '#22c55e',
            '--studio-accent-strong': '#16a34a',
            '--studio-accent-soft': '#dcfce7',
            '--ui-selection-bg': 'rgba(34, 197, 94, 0.3)',
            '--ui-focus-ring': 'rgba(22, 163, 74, 0.65)',
            '--studio-main-dot': 'rgba(20, 83, 45, 0.13)',
            '--studio-main-spot-a': 'rgba(217, 249, 157, 0.2)',
            '--studio-main-spot-b': 'rgba(134, 239, 172, 0.2)'
        }
    },
    {
        id: 'solar',
        label: 'Solar Criativo',
        summary: 'Laranja vibrante com energia de laboratorio em acao.',
        preview: {
            primary: '#fb923c',
            secondary: '#facc15',
            soft: '#ffedd5'
        },
        vars: {
            '--auth-primary': '#fb923c',
            '--auth-primary-strong': '#f97316',
            '--auth-secondary': '#facc15',
            '--studio-accent': '#fb923c',
            '--studio-accent-strong': '#f97316',
            '--studio-accent-soft': '#ffedd5',
            '--ui-selection-bg': 'rgba(251, 146, 60, 0.28)',
            '--ui-focus-ring': 'rgba(249, 115, 22, 0.62)',
            '--studio-main-dot': 'rgba(124, 45, 18, 0.14)',
            '--studio-main-spot-a': 'rgba(254, 215, 170, 0.24)',
            '--studio-main-spot-b': 'rgba(253, 224, 71, 0.18)'
        }
    },
    {
        id: 'aurora',
        label: 'Aurora Pop',
        summary: 'Mistura rosa e violeta para um visual expressivo.',
        preview: {
            primary: '#f472b6',
            secondary: '#a78bfa',
            soft: '#fce7f3'
        },
        vars: {
            '--auth-primary': '#f472b6',
            '--auth-primary-strong': '#ec4899',
            '--auth-secondary': '#a78bfa',
            '--studio-accent': '#f472b6',
            '--studio-accent-strong': '#ec4899',
            '--studio-accent-soft': '#fce7f3',
            '--ui-selection-bg': 'rgba(244, 114, 182, 0.28)',
            '--ui-focus-ring': 'rgba(236, 72, 153, 0.58)',
            '--studio-main-dot': 'rgba(80, 7, 36, 0.12)',
            '--studio-main-spot-a': 'rgba(244, 114, 182, 0.16)',
            '--studio-main-spot-b': 'rgba(167, 139, 250, 0.18)'
        }
    }
];

export const UI_STYLE_OPTIONS = [
    {
        id: 'neo',
        label: 'Neo Brutalist',
        summary: 'Bordas fortes, contraste alto e sombra marcada.'
    },
    {
        id: 'material',
        label: 'Material',
        summary: 'Superfícies suaves, relevo leve e leitura limpa.'
    },
    {
        id: 'modern',
        label: 'Modern Clean',
        summary: 'Visual minimalista, linhas leves e foco no conteúdo.'
    },
    {
        id: 'glass',
        label: 'Glassmorphism',
        summary: 'Camadas translúcidas com blur e profundidade.'
    },
    {
        id: 'editorial',
        label: 'Editorial',
        summary: 'Layout de leitura com blocos organizados e tipografia refinada.'
    }
];

const FONT_OPTIONS_BY_ID = new Map(UI_FONT_OPTIONS.map((option) => [option.id, option]));
const THEME_OPTIONS_BY_ID = new Map(UI_THEME_OPTIONS.map((option) => [option.id, option]));
const STYLE_OPTIONS_BY_ID = new Map(UI_STYLE_OPTIONS.map((option) => [option.id, option]));

export const normalizeUiFontId = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return FONT_OPTIONS_BY_ID.has(normalized) ? normalized : DEFAULT_UI_FONT_ID;
};

export const normalizeUiThemeId = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return THEME_OPTIONS_BY_ID.has(normalized) ? normalized : DEFAULT_UI_THEME_ID;
};

export const normalizeUiStyleId = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return STYLE_OPTIONS_BY_ID.has(normalized) ? normalized : DEFAULT_UI_STYLE_ID;
};

export const getUiFontOption = (value) => {
    const id = normalizeUiFontId(value);
    return FONT_OPTIONS_BY_ID.get(id) || UI_FONT_OPTIONS[0];
};

export const getUiThemeOption = (value) => {
    const id = normalizeUiThemeId(value);
    return THEME_OPTIONS_BY_ID.get(id) || UI_THEME_OPTIONS[0];
};

export const getUiStyleOption = (value) => {
    const id = normalizeUiStyleId(value);
    return STYLE_OPTIONS_BY_ID.get(id) || UI_STYLE_OPTIONS[0];
};

const getRawUiPreferences = (user = {}) => {
    if (user?.ui_preferences && typeof user.ui_preferences === 'object') {
        return user.ui_preferences;
    }
    if (user?.uiPreferences && typeof user.uiPreferences === 'object') {
        return user.uiPreferences;
    }
    return {};
};

export const resolveUserUiPreferences = (user = {}) => {
    const raw = getRawUiPreferences(user);
    const fontCandidate = raw.font_id ?? raw.fontId ?? user?.ui_font_id ?? user?.uiFontId;
    const themeCandidate = raw.theme_id ?? raw.themeId ?? user?.ui_theme_id ?? user?.uiThemeId;
    const styleCandidate = raw.style_id ?? raw.styleId ?? user?.ui_style_id ?? user?.uiStyleId;

    return {
        font_id: normalizeUiFontId(fontCandidate),
        theme_id: normalizeUiThemeId(themeCandidate),
        style_id: normalizeUiStyleId(styleCandidate)
    };
};


