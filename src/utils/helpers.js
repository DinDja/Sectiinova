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
