import { useCallback, useMemo } from 'react';

import dadosUnidades from '../../DadosUnidades.json';
import dadosUnidadesMunicipais from '../../DadosUnidadesMunicipaisBA_8_9.json';

function prettifyGroupLabel(groupKey) {
    if (!groupKey) return '';
    const normalized = String(groupKey).trim().toLowerCase();

    if (normalized === 'ept') return 'EPT';
    if (normalized === 'propedeutica') return 'Propedeutica';

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildSchoolGroups(dataset) {
    return Object.entries(dataset || {})
        .filter(([, value]) => Array.isArray(value))
        .map(([groupKey, values]) => {
            const units = (values || [])
                .map((unit) => {
                    const escolaId = String(unit?.cod_sec || unit?.codigo_sec || unit?.codigoSec || '').trim();
                    const nome = String(unit?.nome || '').trim();

                    if (!escolaId || !nome) {
                        return null;
                    }

                    return {
                        escola_id: escolaId,
                        nome,
                        cod_inep: String(unit?.cod_inep || '').trim(),
                        tipo_unidade: String(unit?.['TIPO DE UNIDADE'] || '').trim()
                    };
                })
                .filter(Boolean)
                .reduce((acc, unit) => {
                    if (!acc.find((item) => item.escola_id === unit.escola_id)) acc.push(unit);
                    return acc;
                }, [])
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

            return {
                key: groupKey,
                label: prettifyGroupLabel(groupKey),
                units
            };
        })
        .filter((group) => group.units.length > 0);
}

function normalizeGroupKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeSearchValue(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
}

function buildMunicipalSchoolGroups(dataset) {
    const schools = Array.isArray(dataset?.escolas) ? dataset.escolas : [];
    const groupsByMunicipio = new Map();

    for (const school of schools) {
        const escolaId = String(school?.escola_id || school?.cod_inep || '').trim();
        const nome = String(school?.nome || '').trim();
        const municipio = String(school?.municipio || '').trim();
        const uf = String(school?.uf || 'BA').trim() || 'BA';

        if (!escolaId || !nome) {
            continue;
        }

        const groupKeyBase = municipio || 'Municipio nao informado';
        const groupKey = `municipal-${normalizeGroupKey(groupKeyBase)}`;

        if (!groupsByMunicipio.has(groupKey)) {
            groupsByMunicipio.set(groupKey, {
                key: groupKey,
                label: municipio || 'Municipio nao informado',
                units: []
            });
        }

        const group = groupsByMunicipio.get(groupKey);
        if (!group.units.find((item) => item.escola_id === escolaId)) {
            group.units.push({
                escola_id: escolaId,
                nome,
                cod_inep: String(school?.cod_inep || escolaId).trim(),
                tipo_unidade: 'MUNICIPAL',
                municipio,
                uf
            });
        }
    }

    return [...groupsByMunicipio.values()]
        .map((group) => ({
            ...group,
            units: group.units.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

function flattenSchoolGroups(groups) {
    return (groups || []).flatMap((group) => group.units || []);
}

export default function useSchoolCatalog({ redeAdministrativa, schoolSearchTerm }) {
    const normalizeSchoolName = useCallback((value) => normalizeSearchValue(value), []);

    const estadualSchoolGroups = useMemo(() => buildSchoolGroups(dadosUnidades), []);
    const municipalSchoolGroups = useMemo(
        () => buildMunicipalSchoolGroups(dadosUnidadesMunicipais),
        []
    );

    const selectedSchoolGroups = useMemo(() => {
        if (redeAdministrativa === 'municipal') {
            return municipalSchoolGroups;
        }

        return estadualSchoolGroups;
    }, [redeAdministrativa, municipalSchoolGroups, estadualSchoolGroups]);

    const allSchoolUnits = useMemo(
        () => flattenSchoolGroups(selectedSchoolGroups),
        [selectedSchoolGroups]
    );

    const fallbackSchoolUnits = useMemo(
        () => flattenSchoolGroups([...estadualSchoolGroups, ...municipalSchoolGroups]),
        [estadualSchoolGroups, municipalSchoolGroups]
    );

    const filteredSchoolGroups = useMemo(() => {
        const term = normalizeSearchValue(schoolSearchTerm);
        if (!term) {
            return selectedSchoolGroups;
        }

        return selectedSchoolGroups
            .map((group) => ({
                ...group,
                units: (group.units || []).filter((unit) => {
                    const searchable = normalizeSearchValue([
                        unit?.nome,
                        unit?.municipio,
                        unit?.escola_id,
                        unit?.cod_inep,
                        group?.label
                    ].filter(Boolean).join(' '));

                    return searchable.includes(term);
                })
            }))
            .filter((group) => (group.units || []).length > 0);
    }, [selectedSchoolGroups, schoolSearchTerm]);

    return {
        filteredSchoolGroups,
        allSchoolUnits,
        fallbackSchoolUnits,
        normalizeSchoolName
    };
}
