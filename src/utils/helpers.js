export function getInitials(name) {
    if (!name) {
        return 'CL';
    }

    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

export function getAvatarSrc(user) {
    if (!user || typeof user !== 'object') {
        return '';
    }

    return String(
        user.fotoBase64 ||
        user.fotoUrl ||
        user.foto ||
        user.photoUrl ||
        user.photo ||
        user.profilePhoto ||
        user.imagemPerfil ||
        user.avatar ||
        ''
    ).trim();
}

export function formatFirestoreDate(timestamp) {
    if (!timestamp?.toDate) {
        return 'Agora';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short'
    }).format(timestamp.toDate());
}

export function getLattesLink(person) {
    const link = person?.lattes || person?.lattesLink || person?.lattes_link || person?.link_lattes || person?.curriculo_lattes || '';
    if (typeof link !== 'string') {
        return '';
    }

    const trimmed = link.trim();
    return trimmed === '' ? '' : trimmed;
}

export function getLattesData(person) {
    const candidate = person?.lattes_data || person?.lattesData || null;
    return candidate && typeof candidate === 'object' ? candidate : null;
}

export function getLattesSummary(person) {
    const data = getLattesData(person);
    const summary = data?.resumo || data?.texto_resumo || data?.informacoes_pessoais?.resumo || '';
    return typeof summary === 'string' ? summary.trim() : '';
}

export function getLattesUpdatedAt(person) {
    const data = getLattesData(person);
    const updatedAt = data?.ultima_atualizacao || data?.atualizacao_cv || data?.informacoes_pessoais?.atualizacao_cv || '';
    return typeof updatedAt === 'string' ? updatedAt.trim() : '';
}

export function getLattesAreas(person) {
    const data = getLattesData(person);
    const rawAreas = Array.isArray(data?.areas_atuacao)
        ? data.areas_atuacao
        : Array.isArray(data?.informacoes_pessoais?.areas_atuacao)
            ? data.informacoes_pessoais.areas_atuacao
            : [];

    return rawAreas
        .map((area) => {
            if (typeof area === 'string') {
                return area.trim();
            }

            if (!area || typeof area !== 'object') {
                return '';
            }

            return area.descricao_completa
                || [area.grande_area, area.area, area.subarea, area.especialidade]
                    .filter((value) => typeof value === 'string' && value.trim())
                    .join(' / ')
                || '';
        })
        .filter(Boolean);
}

export function getLattesEducation(person) {
    const data = getLattesData(person);
    const rawEducation = Array.isArray(data?.formacao_academica)
        ? data.formacao_academica
        : Array.isArray(data?.informacoes_pessoais?.formacao_academica)
            ? data.informacoes_pessoais.formacao_academica
            : [];

    return rawEducation
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return '';
            }

            const institution = item.nome_instituicao || item.instituicao || '';
            const year = item.ano_conclusao || item.anoInicio || item.ano_inicio || '';
            return [item.tipo, institution, year].filter((value) => typeof value === 'string' && value.trim()).join(' · ');
        })
        .filter(Boolean);
}

export function getLattesStats(person) {
    const data = getLattesData(person);
    const stats = data?.estatisticas;
    return stats && typeof stats === 'object' ? stats : null;
}

export function composeMentoriaLabel(orientadores, coorientadores) {
    const orientadorNames = orientadores.map((person) => person.nome);
    const coorientadorNames = coorientadores.map((person) => person.nome);

    const mentorList = [];

    if (orientadorNames.length > 0) {
        mentorList.push(`Orientador: ${orientadorNames.join(', ')}`);
    }

    if (coorientadorNames.length > 0) {
        mentorList.push(`Coorientador: ${coorientadorNames.join(', ')}`);
    }

    return mentorList.length > 0 ? mentorList.join(' | ') : 'Sem Orientador informado';
}

export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

export function compressImageFile(file, options = {}) {
    const { maxWidth = 1024, maxHeight = 1024, quality = 0.75, outputType = 'image/jpeg' } = options;

    return readFileAsDataURL(file)
        .then((dataUrl) => loadImage(dataUrl))
        .then((img) => {
            const ratio = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
            const width = Math.round(img.naturalWidth * ratio);
            const height = Math.round(img.naturalHeight * ratio);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            return canvas.toDataURL(outputType, quality);
        });
}

export async function compressImageFiles(files, options = {}) {
    const selectedFiles = Array.from(files).slice(0, 2);
    const compressed = [];

    for (const file of selectedFiles) {
        try {
            const dataUrl = await compressImageFile(file, options);
            compressed.push(dataUrl);
        } catch (err) {
            console.error('Falha ao processar imagem:', err);
        }
    }

    return compressed;
}

export function isFailedToFetchError(error) {
    return error instanceof TypeError && /failed to fetch/i.test(String(error?.message || ''));
}

export function normalizeNetworkErrorMessage(error, fallbackMessage, context = 'generic') {
    if (!error) {
        return fallbackMessage;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
        return error.message || 'Operação interrompida.';
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    if (isFailedToFetchError(error)) {
        if (context === 'inpi-tracker') {
            return 'Não foi possível alcançar a consulta do agente no endpoint /api/inpi/process. Em ambiente local, rode o projeto Next.js com npm run dev. Em produção na Netlify, verifique se a Function inpi-process foi publicada e se o redirect do netlify.toml está ativo.';
        }

        if (context === 'openrouter-agent') {
            return 'Não foi possível conectar ao serviço do agente. Verifique sua conexão com a internet e se o navegador consegue acessar a OpenRouter a partir deste ambiente.';
        }

        return fallbackMessage;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallbackMessage;
}



