import { formatFirestoreDate, composeMentoriaLabel } from '../utils/helpers';

export function buildProjectEntries(project, diaryEntries, projectTeam) {
    const mappedDiaryEntries = diaryEntries
        .filter((entry) => entry.projeto_id === project.id)
        .map((entry) => ({
            id: entry.id,
            title: entry.title || 'Registro de diario',
            date: formatFirestoreDate(entry.createdAt),
            duration: entry.duration || 'Nao informado',
            stage: entry.stage || 'Registro complementar',
            whatWasDone: entry.whatWasDone || 'Sem detalhamento.',
            discoveries: entry.discoveries || 'Nenhuma descoberta registrada nesta sessao.',
            obstacles: entry.obstacles || 'Nenhum obstaculo registrado.',
            nextSteps: entry.nextSteps || 'A definir.',
            tags: Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags : ['Geral'],
            author: entry.author || projectTeam.investigadores[0]?.nome || 'Autor nao informado',
            mediator: entry.mediator || composeMentoriaLabel(projectTeam.orientadores, projectTeam.coorientadores)
        }));

    const summaryEntry = {
        id: `${project.id}-summary`,
        title: project.titulo || 'Projeto sem titulo',
        date: 'Resumo do projeto',
        duration: project.status || 'Status nao informado',
        stage: project.tipo || 'Projeto cientifico',
        whatWasDone: project.descricao || project.introducao || 'Sem descricao registrada.',
        discoveries: project.objetivo || 'Objetivo nao informado.',
        obstacles: project.custos || project.referencias || 'Sem custos, referencias ou obstaculos informados.',
        nextSteps: project.etapas || 'Sem etapas registradas.',
        tags: [project.area_tematica, project.status].filter(Boolean),
        author: projectTeam.investigadores[0]?.nome || 'Equipe do projeto',
        mediator: composeMentoriaLabel(projectTeam.orientadores, projectTeam.coorientadores)
    };

    return [summaryEntry, ...mappedDiaryEntries];
}

export function getProjectTeam(project, users, selectedClubId = '') {
    const searchableUsers = users;

    const memberReferences = extractMemberReferences(project);
    const hasExplicitMembers = memberReferences.length > 0;
    const memberUsers = findUsersByReferences(memberReferences, searchableUsers);

    const orientadorReferences = extractRoleReferences(project, 'orientador');
    const coorientadorReferences = extractRoleReferences(project, 'coorientador');
    const investigadorReferences = hasExplicitMembers ? [] : extractInvestigatorReferences(project);

    const orientadores = uniqueUsers([
        ...findUsersByReferences(orientadorReferences, searchableUsers),
        ...memberUsers.filter((person) => normalizePerfil(person.perfil) === 'orientador')
    ]);

    const coorientadores = uniqueUsers([
        ...findUsersByReferences(coorientadorReferences, searchableUsers),
        ...memberUsers.filter((person) => normalizePerfil(person.perfil) === 'coorientador')
    ]);

    const blockedIds = new Set([...orientadores, ...coorientadores].map((person) => String(person.id)));

    let investigadores = uniqueUsers([
        ...findUsersByReferences(investigadorReferences, searchableUsers),
        ...memberUsers
    ].filter((person) => !blockedIds.has(String(person.id))));

    return { orientadores, coorientadores, investigadores };
}

export function getInvestigatorDisplayNames(project, team, entries = []) {
    const resolvedNames = (team?.investigadores || [])
        .map((person) => person?.nome)
        .filter((name) => Boolean(name && String(name).trim()));

    if (resolvedNames.length > 0) {
        return resolvedNames;
    }

    const memberReferences = extractMemberReferences(project);

    if (memberReferences.length > 0) {
        return [...new Set(memberReferences)].slice(0, 20);
    }

    const fallbackReferences = extractInvestigatorReferences(project).filter(Boolean);

    return [...new Set(fallbackReferences)].slice(0, 20);
}

export function normalizePerfil(perfil) {
    return String(perfil || '').trim().toLowerCase();
}

export function normalizeIdList(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

export function getUserClubIds(user) {
    const clubsFromArray = normalizeIdList(user?.clubes_ids);
    if (clubsFromArray.length > 0) {
        return clubsFromArray;
    }

    return normalizeIdList([user?.clube_id]);
}

export function getUserSchoolIds(user) {
    const schoolsFromArray = normalizeIdList(user?.escolas_ids);
    if (schoolsFromArray.length > 0) {
        return schoolsFromArray;
    }

    return normalizeIdList([user?.escola_id]);
}

export function getPrimaryUserClubId(user) {
    return getUserClubIds(user)[0] || '';
}

export function getPrimaryUserSchoolId(user) {
    return getUserSchoolIds(user)[0] || '';
}

export function withLegacyUserMembership(user) {
    if (!user || typeof user !== 'object') {
        return user;
    }

    const clubesIds = getUserClubIds(user);
    const escolasIds = getUserSchoolIds(user);

    return {
        ...user,
        clubes_ids: clubesIds,
        escolas_ids: escolasIds,
        clube_id: String(user.clube_id || clubesIds[0] || '').trim(),
        escola_id: String(user.escola_id || escolasIds[0] || '').trim()
    };
}

export function isUserInProject(project, usuario, users = []) {
    if (!project || !usuario) return false;

    const userId = String(usuario.id || usuario.uid || usuario.matricula || '').trim();
    const userEmail = String(usuario.email || usuario.emailPrincipal || usuario.email_usuario || '').toLowerCase().trim();
    const userName = String(usuario.nome || usuario.nomeCompleto || usuario.fullName || '').toLowerCase().trim();

    const userTokens = [userId, userEmail, userName]
        .flatMap((v) => generateReferenceTokens(v))
        .filter(Boolean);

    try {
        const team = getProjectTeam(project, users, project?.clube_id || '');
        const participants = [
            ...(team.orientadores || []),
            ...(team.coorientadores || []),
            ...(team.investigadores || [])
        ];

        for (const m of participants) {
            if (!m) continue;
            const memberTokens = [m.id, m.uid, m.matricula, m.email, m.nome]
                .flatMap((v) => generateReferenceTokens(v))
                .filter(Boolean);

            if (memberTokens.some((t) => userTokens.includes(t))) {
                return true;
            }
        }
    } catch (err) {
        // ignore and fallback to raw refs
    }

    const refs = [
        ...extractMemberReferences(project),
        ...extractRoleReferences(project, 'orientador'),
        ...extractRoleReferences(project, 'coorientador'),
        ...extractInvestigatorReferences(project)
    ];

    for (const ref of refs) {
        if (!ref) continue;
        const refTokens = generateReferenceTokens(ref);
        if (refTokens.some((t) => userTokens.includes(t))) return true;
        const refLower = String(ref).toLowerCase();
        if (userName && refLower.includes(userName)) return true;
        if (userEmail && refLower.includes(userEmail)) return true;
    }

    return false;
}

function extractMemberReferences(project) {
    const references = [];

    const candidateFields = [
        'membros',
        'membros_ids',
        'membros_matriculas',
        'integrantes',
        'estudantes',
        'investigadores'
    ];

    candidateFields.forEach((fieldName) => {
        const fieldValue = project?.[fieldName];

        if (!fieldValue) {
            return;
        }

        if (Array.isArray(fieldValue)) {
            fieldValue.forEach((item) => {
                if (item && typeof item === 'object') {
                    [item.id, item.matricula, item.email, item.nome].forEach((value) => {
                        if (value !== undefined && value !== null && String(value).trim()) {
                            references.push(String(value).trim());
                        }
                    });
                    return;
                }

                if (item !== undefined && item !== null && String(item).trim()) {
                    references.push(...splitReferenceValues(String(item).trim()));
                }
            });
            return;
        }

        if (typeof fieldValue === 'object') {
            [fieldValue.id, fieldValue.matricula, fieldValue.email, fieldValue.nome].forEach((value) => {
                if (value !== undefined && value !== null && String(value).trim()) {
                    references.push(String(value).trim());
                }
            });
            return;
        }

        references.push(...splitReferenceValues(String(fieldValue).trim()));
    });

    return [...new Set(references.filter(Boolean))];
}

function extractInvestigatorReferences(project) {
    const references = [];
    const candidateFields = [
        'investigador',
        'investigadores',
        'estudante',
        'estudantes',
        'aluno',
        'alunos',
        'investigadores_ids',
        'investigadores_matriculas'
    ];

    candidateFields.forEach((fieldName) => {
        const value = project?.[fieldName];

        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (item && typeof item === 'object') {
                    [item.id, item.matricula, item.email, item.nome].forEach((ref) => {
                        if (ref !== undefined && ref !== null && String(ref).trim()) {
                            references.push(String(ref).trim());
                        }
                    });
                    return;
                }

                if (item !== undefined && item !== null && String(item).trim()) {
                    references.push(...splitReferenceValues(String(item).trim()));
                }
            });
            return;
        }

        references.push(...splitReferenceValues(String(value).trim()));
    });

    return [...new Set(references.filter(Boolean))];
}

function extractRoleReferences(project, roleName) {
    const candidateFields = [
        roleName,
        `${roleName}_id`,
        `${roleName}_ids`,
        `${roleName}_matricula`,
        `${roleName}_matriculas`,
        `${roleName}es`
    ];

    const references = [];

    candidateFields.forEach((fieldName) => {
        const value = project?.[fieldName];
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (item && typeof item === 'object') {
                    [item.id, item.matricula, item.email, item.nome].forEach((ref) => {
                        if (ref !== undefined && ref !== null && String(ref).trim()) {
                            references.push(...splitReferenceValues(String(ref).trim()));
                        }
                    });
                    return;
                }

                references.push(...splitReferenceValues(String(item).trim()));
            });
            return;
        }

        references.push(...splitReferenceValues(String(value).trim()));
    });

    return [...new Set(references.filter(Boolean))];
}

function findUsersByReferences(references, users) {
    if (references.length === 0) {
        return [];
    }

    const normalizedReferences = references
        .flatMap((reference) => generateReferenceTokens(reference))
        .filter(Boolean);

    return users.filter((person) => {
        const valuesToCompare = [
            person.id,
            person.matricula,
            person['matrícula'],
            person.codigo,
            person.nome,
            person.email
        ]
            .flatMap((value) => generateReferenceTokens(value))
            .filter(Boolean);

        return normalizedReferences.some((reference) => valuesToCompare.includes(reference));
    });
}

function generateReferenceTokens(value) {
    if (value === undefined || value === null) {
        return [];
    }

    const raw = String(value).trim().toLowerCase();

    if (!raw) {
        return [];
    }

    const normalized = normalizeDigits(raw);
    const tokens = [raw];

    if (normalized !== raw) {
        tokens.push(normalized);
    }

    return [...new Set(tokens)];
}

function splitReferenceValues(value) {
    return String(value || '')
        .split(/[,;\n]+/)
        .map((part) => part.trim())
        .filter((part) => {
            if (!part) {
                return false;
            }

            const normalized = part.toLowerCase();
            return !['0', 'null', 'undefined', 'nao informado', 'não informado'].includes(normalized);
        });
}

function normalizeDigits(value) {
    const digitsOnly = value.replace(/\D/g, '');

    if (!digitsOnly) {
        return value;
    }

    const withoutLeadingZeros = digitsOnly.replace(/^0+/, '');
    return withoutLeadingZeros || '0';
}

function uniqueUsers(users) {
    const seen = new Set();

    return users.filter((person) => {
        if (!person?.id || seen.has(person.id)) {
            return false;
        }

        seen.add(person.id);
        return true;
    });
}
