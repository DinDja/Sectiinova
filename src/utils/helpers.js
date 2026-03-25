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
    return person?.lattes || person?.lattes_link || person?.link_lattes || person?.curriculo_lattes || '';
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
