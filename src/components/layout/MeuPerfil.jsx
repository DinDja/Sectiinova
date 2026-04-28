import React, { useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';
import {
    User, School, Lock, Edit2, Copy, Check, 
    LogOut, Mail, Shield, Camera, X, Phone, 
    MapPin, Calendar, Award, Star, TrendingUp, Briefcase, 
    Globe, Users, Heart, BookOpen, Palette, Link as LinkIcon, LoaderCircle, RefreshCw
} from 'lucide-react';
import { fetchLattesPreviewByHtml, fetchLattesPreviewByLink } from '../../services/lattesService';
import MembershipCardGenerator from '../club/MembershipCardGenerator';
import {
    UI_FONT_OPTIONS,
    UI_STYLE_OPTIONS,
    UI_THEME_OPTIONS,
    getUiFontOption,
    getUiStyleOption,
    getUiThemeOption,
    normalizeUiFontId,
    normalizeUiStyleId,
    normalizeUiThemeId,
    resolveUserUiPreferences
} from '../../constants/uiPreferences';

const dedupeMembersByIdentity = (members = []) => {
    const byKey = new Map();
    (Array.isArray(members) ? members : []).forEach((member, index) => {
        const key = String(
            member?.id
            || member?.uid
            || member?.email
            || member?.matricula
            || `${member?.nome || 'membro'}-${index}`
        ).trim();

        if (!key || byKey.has(key)) return;
        byKey.set(key, member);
    });

    return [...byKey.values()];
};

export default function MeuPerfilPro({
    loggedUser,
    myClub,
    schools = [],
    users = [],
    onLogout,
    onSaveProfile,
    onChangeClubCardTemplate = async () => {},
    onClose
}) {
    const lattesIframeRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState(null);
    const [avatarSrc, setAvatarSrc] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [isFetchingLattes, setIsFetchingLattes] = useState(false);
    const [lattesPreview, setLattesPreview] = useState(null);
    const [lattesImportSelection, setLattesImportSelection] = useState({
        nome: false,
        resumo: false,
        areas_atuacao: false,
        formacao_academica: false,
        ultima_atualizacao: false
    });
    const [lattesFetchError, setLattesFetchError] = useState('');
    const [lattesImportInfo, setLattesImportInfo] = useState('');
    const [showManualLattesForm, setShowManualLattesForm] = useState(false);
    const [showLattesIframe, setShowLattesIframe] = useState(false);
    const [showHtmlPasteForm, setShowHtmlPasteForm] = useState(false);
    const [iframeLoadError, setIframeLoadError] = useState('');
    const [htmlPasteValue, setHtmlPasteValue] = useState('');
    const [manualLattesDraft, setManualLattesDraft] = useState({
        nome: '',
        resumo: '',
        areas: '',
        formacao: '',
        ultimaAtualizacao: ''
    });
    const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
    const [selectedSchoolChangeId, setSelectedSchoolChangeId] = useState('');
    const [schoolChangeEnabled, setSchoolChangeEnabled] = useState(false);
    const [schoolChangeReason, setSchoolChangeReason] = useState('');
    const [schoolChangeError, setSchoolChangeError] = useState('');

    const buildDefaultLattesSelection = (data) => ({
        nome: Boolean(data?.nome),
        resumo: Boolean(data?.resumo),
        areas_atuacao: Array.isArray(data?.areas_atuacao) && data.areas_atuacao.length > 0,
        formacao_academica: Array.isArray(data?.formacao_academica) && data.formacao_academica.length > 0,
        ultima_atualizacao: Boolean(data?.ultima_atualizacao)
    });

    const formatListPreview = (items = []) => {
        if (!Array.isArray(items) || items.length === 0) {
            return '';
        }

        const cleaned = items
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        if (cleaned.length === 0) {
            return '';
        }

        if (cleaned.length <= 2) {
            return cleaned.join(' | ');
        }

        return `${cleaned.slice(0, 2).join(' | ')} (+${cleaned.length - 2})`;
    };

    const extractLattesIdFromLink = (value = '') => {
        const matched = String(value || '').match(/(\d{16})/);
        return matched?.[1] || '';
    };

    const getLattesIframeUrl = () => {
        const id = extractLattesIdFromLink(formData?.lattesLink || '');
        return id ? `https://lattes.cnpq.br/${id}` : '';
    };

    const looksLikeHtmlContent = (value = '') => {
        const normalized = String(value || '').toLowerCase();
        return normalized.includes('<html')
            || normalized.includes('<body')
            || normalized.includes('<div')
            || normalized.includes('&lt;html')
            || normalized.includes('currículo')
            || normalized.includes('curriculo')
            || normalized.includes('lattes');
    };

    const isIframeShellOnly = (value = '') => {
        const raw = String(value || '');
        const normalized = raw.toLowerCase();
        const hasIframeLattes = /<iframe[\s\S]*lattes\.cnpq\.br\/\d{16}[\s\S]*>/i.test(raw);
        const hasCurriculumMarkers = /curr[ií]culo|resumo informado|áreas de atuação|areas de atuacao|formação acadêmica|formacao academica|ultima atualizacao|id_lattes/i.test(raw);
        return hasIframeLattes && !hasCurriculumMarkers && normalized.length < 2500;
    };

    const tryCaptureIframeHtml = () => {
        try {
            const iframeDoc = lattesIframeRef.current?.contentWindow?.document;
            const iframeHtml = iframeDoc?.documentElement?.outerHTML || '';
            return String(iframeHtml || '').trim();
        } catch {
            return '';
        }
    };

    const tryReadClipboardHtml = async () => {
        try {
            if (!navigator?.clipboard?.readText) return '';
            const clipboardText = await navigator.clipboard.readText();
            return String(clipboardText || '').trim();
        } catch {
            return '';
        }
    };

    const schoolOptions = useMemo(() => {
        const uniqueById = new Map();

        (Array.isArray(schools) ? schools : []).forEach((school) => {
            const schoolId = String(school?.escola_id || school?.id || '').trim();
            const schoolName = String(school?.nome || school?.escola_nome || '').trim();
            if (!schoolId || !schoolName) return;

            uniqueById.set(schoolId, {
                id: schoolId,
                nome: schoolName,
                municipio: String(school?.municipio || school?.escola_municipio || '').trim(),
                uf: String(school?.uf || school?.escola_uf || '').trim() || 'BA'
            });
        });

        return [...uniqueById.values()].sort((a, b) => (
            a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
        ));
    }, [schools]);

    const schoolChangeCount = Number(loggedUser?.school_change_count || 0);
    const hasUsedSchoolChange = Number.isFinite(schoolChangeCount) && schoolChangeCount >= 1;
    const normalizedProfile = String(loggedUser?.perfil || '').trim().toLowerCase();
    const isSelfSchoolCorrectionProfile = ['estudante', 'investigador', 'aluno', 'clubista', 'orientador', 'coorientador'].includes(normalizedProfile);
    const hasClubLink = Boolean(String(loggedUser?.clube_id || '').trim())
        || (Array.isArray(loggedUser?.clubes_ids)
            && loggedUser.clubes_ids.some((clubId) => String(clubId || '').trim()));
    const canRequestSchoolChange = isSelfSchoolCorrectionProfile && !hasUsedSchoolChange && !hasClubLink;
    const currentSchoolId = String(loggedUser?.escola_id || '').trim();
    const currentSchoolName = String(loggedUser?.escola_nome || '').trim();
    const schoolChangeBlockedReason = hasUsedSchoolChange
        ? 'A correcao de unidade escolar ja foi utilizada neste perfil.'
        : hasClubLink
            ? 'Seu perfil ja possui vinculo com clube. Procure a coordenação para ajuste manual.'
            : !isSelfSchoolCorrectionProfile
                ? 'Seu perfil nao pode corrigir unidade por conta propria.'
                : '';

    const filteredSchoolOptions = useMemo(() => {
        const term = String(schoolSearchTerm || '').trim().toLowerCase();
        if (!term) {
            return schoolOptions.slice(0, 120);
        }

        return schoolOptions
            .filter((option) => {
                const normalizedName = String(option?.nome || '').toLowerCase();
                const normalizedMunicipio = String(option?.municipio || '').toLowerCase();
                const normalizedId = String(option?.id || '').toLowerCase();
                return normalizedName.includes(term)
                    || normalizedMunicipio.includes(term)
                    || normalizedId.includes(term);
            })
            .slice(0, 180);
    }, [schoolOptions, schoolSearchTerm]);

    const resetForm = () => {
        if (loggedUser) {
            const initialLattesData = loggedUser.lattes_data || loggedUser.lattesData || null;
            const initialUiPreferences = resolveUserUiPreferences(loggedUser);
            setFormData({
                nome: loggedUser.nome || '',
                email: loggedUser.email || '',
                telefone: loggedUser.telefone || '',
                lattesLink: loggedUser.lattes || loggedUser.lattesLink || '',
                bio: loggedUser.bio || '',
                localizacao: loggedUser.localizacao || '',
                fotoBase64: loggedUser.fotoBase64 || loggedUser.fotoUrl || '',
                lattesData: initialLattesData,
                uiPreferences: initialUiPreferences
            });
            setAvatarSrc(loggedUser.fotoBase64 || loggedUser.fotoUrl || '');
            setLattesPreview(initialLattesData);
            setLattesImportSelection(buildDefaultLattesSelection(initialLattesData));
            setLattesFetchError('');
            setLattesImportInfo('');
            setShowManualLattesForm(false);
            setShowLattesIframe(false);
            setShowHtmlPasteForm(false);
            setIframeLoadError('');
            setHtmlPasteValue('');
            setManualLattesDraft({
                nome: '',
                resumo: '',
                areas: '',
                formacao: '',
                ultimaAtualizacao: ''
            });
            setSchoolSearchTerm('');
            setSchoolChangeReason('');
            setSchoolChangeError('');
            setSchoolChangeEnabled(false);
            setSelectedSchoolChangeId(String(loggedUser.escola_id || '').trim());
        }
    };

    useEffect(() => {
        resetForm();
    }, [loggedUser]);

    const loggedUserId = String(loggedUser?.id || loggedUser?.uid || '').trim();
    const myClubId = String(myClub?.id || '').trim();

    const usersById = useMemo(() => {
        const map = new Map();
        (Array.isArray(users) ? users : []).forEach((person) => {
            const personId = String(person?.id || person?.uid || '').trim();
            if (!personId) return;
            map.set(personId, person);
        });
        return map;
    }, [users]);

    const myClubMentorIds = useMemo(() => new Set([
        myClub?.mentor_id,
        ...(myClub?.orientador_ids || []),
        ...(myClub?.orientadores_ids || []),
        ...(myClub?.coorientador_ids || []),
        ...(myClub?.coorientadores_ids || [])
    ].map((value) => String(value || '').trim()).filter(Boolean)), [myClub]);

    const myClubStudentIds = useMemo(() => (
        [...new Set([
            ...(myClub?.clubistas_ids || []),
            ...(myClub?.investigadores_ids || []),
            ...(myClub?.membros_ids || [])
        ].map((value) => String(value || '').trim()).filter(Boolean))]
    ), [myClub]);

    const fallbackLoggedUserMember = useMemo(() => {
        if (!loggedUser) return null;
        if (!loggedUserId) return loggedUser;
        return { ...loggedUser, id: loggedUserId };
    }, [loggedUser, loggedUserId]);

    const profileCardMentors = useMemo(() => {
        const mentors = [...myClubMentorIds]
            .map((memberId) => usersById.get(memberId))
            .filter(Boolean);

        if (myClubMentorIds.has(loggedUserId) && fallbackLoggedUserMember) {
            mentors.push(fallbackLoggedUserMember);
        }

        return dedupeMembersByIdentity(mentors);
    }, [myClubMentorIds, usersById, loggedUserId, fallbackLoggedUserMember]);

    const profileCardStudents = useMemo(() => {
        const students = myClubStudentIds
            .filter((memberId) => !myClubMentorIds.has(memberId))
            .map((memberId) => usersById.get(memberId))
            .filter(Boolean);

        if (fallbackLoggedUserMember && !myClubMentorIds.has(loggedUserId)) {
            students.push(fallbackLoggedUserMember);
        }

        return dedupeMembersByIdentity(students);
    }, [myClubStudentIds, myClubMentorIds, usersById, loggedUserId, fallbackLoggedUserMember]);

    const canManageProfileCardTemplate = Boolean(myClubId && loggedUserId && myClubMentorIds.has(loggedUserId));
    const profileClubSchool = useMemo(() => ({
        nome: String(myClub?.escola_nome || loggedUser?.escola_nome || '').trim()
    }), [myClub?.escola_nome, loggedUser?.escola_nome]);

    if (!loggedUser) {
        return (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_#0f172a] text-center max-w-md mx-auto mt-20">
                <div className="w-24 h-24 rounded-2xl bg-yellow-300 border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#0f172a] transform --3">
                    <User className="w-12 h-12 text-slate-900 stroke-[3]" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase">Nenhum utilizador conectado</h3>
                <p className="text-sm font-bold text-slate-600 mt-2">Faça login para visualizar o seu perfil oficial.</p>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_#0f172a] text-center max-w-md mx-auto mt-20">
                <div className="w-24 h-24 rounded-2xl bg-teal-400 border-4 border-slate-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#0f172a] animate-spin">
                    <RefreshCw className="w-10 h-10 text-slate-900 stroke-[3]" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase">A Carregar Perfil...</h3>
            </div>
        );
    }

    const formatPhone = (value) => {
        if (!value) return '';
        const numbers = value.replace(/\D/g, ''); 
        if (numbers.length <= 2) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    };

    const compressImageFile = (file, maxDimension = 600, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Arquivo inválido, deve ser uma imagem.'));
                return;
            }

            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const ratio = Math.min(maxDimension / width, maxDimension / height, 1);

                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                };
                img.onerror = () => reject(new Error('Falha ao carregar imagem para compressão.'));
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);

        try {
            const compressedBase64 = await compressImageFile(file, 600, 0.7);
            setAvatarSrc(compressedBase64);
            setFormData((prev) => ({ ...prev, fotoBase64: compressedBase64 }));
            if (!isEditing) setIsEditing(true);
        } catch (error) {
            console.error('Erro ao processar a foto:', error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleCopyId = () => {
        const id = loggedUser.id || loggedUser.uid;
        if (id) {
            navigator.clipboard.writeText(id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => prev ? { ...prev, [field]: value } : null);
        if (field === 'lattesLink') {
            setLattesImportInfo('');
            setLattesFetchError('');
        }
    };

    const handleUiPreferenceChange = (field, value) => {
        setFormData((prev) => {
            if (!prev) return prev;

            const currentPreferences = resolveUserUiPreferences({
                ui_preferences: prev.uiPreferences
            });

            const nextPreferences = {
                ...currentPreferences,
                [field]: field === 'font_id'
                    ? normalizeUiFontId(value)
                    : field === 'theme_id'
                        ? normalizeUiThemeId(value)
                        : normalizeUiStyleId(value)
            };

            return {
                ...prev,
                uiPreferences: nextPreferences
            };
        });
    };

    const applyLattesExtractionResult = (result, failureMessage, successMessage) => {
        const payload = result?.data && typeof result.data === 'object' ? result.data : null;

        setLattesPreview(payload);
        setLattesImportSelection(buildDefaultLattesSelection(payload));

        if (!result?.success) {
            setLattesFetchError(result?.message || failureMessage);
            return false;
        }

        setLattesImportInfo(successMessage);
        return true;
    };

    const handleFetchLattesData = async () => {
        const link = String(formData?.lattesLink || '').trim();
        if (!link) {
            setLattesFetchError('Informe o link do Lattes para buscar os dados.');
            setLattesImportInfo('');
            return;
        }

        setIsFetchingLattes(true);
        setLattesFetchError('');
        setLattesImportInfo('');

        try {
            const result = await fetchLattesPreviewByLink(link);
            const success = applyLattesExtractionResult(
                result,
                'Não foi possível extrair os campos do Lattes para esse link.',
                'Dados do Lattes carregados. Selecione os campos e aplique no formulário.'
            );

            if (!success) {
                if (result?.requiresCaptcha || String(result?.message || '').toLowerCase().includes('captcha')) {
                    setShowManualLattesForm(true);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar dados do Lattes:', error);
            setLattesFetchError(error?.message || 'Falha ao buscar dados do Lattes.');
        } finally {
            setIsFetchingLattes(false);
        }
    };

    const handleFetchLattesDataFromHtml = async (rawHtml = null) => {
        const link = String(formData?.lattesLink || '').trim();
        const html = String(rawHtml ?? htmlPasteValue ?? '').trim();

        if (!link) {
            setLattesFetchError('Informe o link do Lattes antes de processar o HTML.');
            setLattesImportInfo('');
            return;
        }

        if (!html) {
            setLattesFetchError('Cole o HTML da página do currículo para extrair os dados.');
            setLattesImportInfo('');
            return;
        }

        if (isIframeShellOnly(html)) {
            setIsFetchingLattes(true);
            setLattesFetchError('');
            setLattesImportInfo('Você colou apenas a tag do iframe. Tentando extrair automaticamente pelo link...');

            try {
                const result = await fetchLattesPreviewByLink(link);
                const success = applyLattesExtractionResult(
                    result,
                    'Foi colada apenas a tag do iframe (sem o conteúdo interno do currículo). Abra o conteúdo interno no DevTools e copie o HTML completo da página do currículo.',
                    'Dados extraídos automaticamente pelo link após detectar iframe.'
                );

                if (!success) {
                    setShowHtmlPasteForm(true);
                }
            } catch (error) {
                setLattesFetchError(error?.message || 'Falha ao tentar extrair automaticamente pelo link após detectar iframe.');
                setShowHtmlPasteForm(true);
            } finally {
                setIsFetchingLattes(false);
            }

            return;
        }

        setIsFetchingLattes(true);
        setLattesFetchError('');
        setLattesImportInfo('');

        try {
            if (rawHtml !== null) {
                setHtmlPasteValue(rawHtml);
            }
            const result = await fetchLattesPreviewByHtml({ link, html });
            const success = applyLattesExtractionResult(
                result,
                'Não foi possível extrair os campos do HTML informado.',
                'Dados extraídos do HTML colado. Selecione os campos e aplique no formulário.'
            );
            if (success && rawHtml !== null) {
                setShowHtmlPasteForm(false);
            }
        } catch (error) {
            console.error('Erro ao extrair dados do HTML do Lattes:', error);
            setLattesFetchError(error?.message || 'Falha ao processar o HTML do Lattes.');
        } finally {
            setIsFetchingLattes(false);
        }
    };

    const handleProcessPostCaptcha = async () => {
        const link = String(formData?.lattesLink || '').trim();
        if (!link) {
            setLattesFetchError('Informe o link do Lattes antes de processar o pós-CAPTCHA.');
            setLattesImportInfo('');
            return;
        }

        setLattesFetchError('');
        setLattesImportInfo('Tentando capturar o HTML automaticamente...');

        const iframeHtml = tryCaptureIframeHtml();
        if (looksLikeHtmlContent(iframeHtml)) {
            await handleFetchLattesDataFromHtml(iframeHtml);
            return;
        }

        const clipboardHtml = await tryReadClipboardHtml();
        if (looksLikeHtmlContent(clipboardHtml)) {
            await handleFetchLattesDataFromHtml(clipboardHtml);
            return;
        }

        // Tentativa final automática: buscar novamente por link depois do usuário
        // ter concluído o CAPTCHA no navegador.
        setIsFetchingLattes(true);
        try {
            const result = await fetchLattesPreviewByLink(link);
            const success = applyLattesExtractionResult(
                result,
                'Não foi possível capturar o HTML do iframe nem extrair novamente pelo link após o CAPTCHA.',
                'Dados extraídos automaticamente após nova tentativa por link.'
            );

            if (success) {
                return;
            }
        } catch (error) {
            setLattesFetchError(error?.message || 'Falha ao processar automaticamente o pós-CAPTCHA.');
        } finally {
            setIsFetchingLattes(false);
        }

        setShowHtmlPasteForm(true);
        setLattesFetchError('Não foi possível ler o HTML direto do iframe (bloqueio de origem cruzada do navegador). Copie o código-fonte da página do currículo e cole no campo abaixo para processar.');
    };

    const toggleLattesImportField = (field) => {
        setLattesImportSelection((prev) => ({ ...prev, [field]: !prev[field] }));
        setLattesImportInfo('');
    };

    const handleBuildManualLattesPreview = () => {
        const toList = (value) => String(value || '')
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);

        const manualData = {
            id_lattes: extractLattesIdFromLink(formData?.lattesLink || ''),
            link: String(formData?.lattesLink || '').trim(),
            nome: String(manualLattesDraft.nome || '').trim(),
            resumo: String(manualLattesDraft.resumo || '').trim(),
            areas_atuacao: toList(manualLattesDraft.areas),
            formacao_academica: toList(manualLattesDraft.formacao),
            ultima_atualizacao: String(manualLattesDraft.ultimaAtualizacao || '').trim(),
            fonte: 'manual-lattes',
            sincronizado_em: new Date().toISOString()
        };

        const hasAnyManualData = Boolean(
            manualData.nome
            || manualData.resumo
            || manualData.ultima_atualizacao
            || manualData.areas_atuacao.length > 0
            || manualData.formacao_academica.length > 0
        );

        if (!hasAnyManualData) {
            setLattesFetchError('Preencha ao menos um campo manual para montar a pré-visualização.');
            setLattesImportInfo('');
            return;
        }

        setLattesPreview(manualData);
        setLattesImportSelection(buildDefaultLattesSelection(manualData));
        setLattesFetchError('');
        setLattesImportInfo('Pré-visualização manual criada. Selecione os campos e aplique no formulário.');
    };

    const handleApplySelectedLattesFields = () => {
        if (!lattesPreview) {
            setLattesFetchError('Busque os dados do Lattes antes de aplicar.');
            setLattesImportInfo('');
            return;
        }

        const selectedFields = Object.entries(lattesImportSelection)
            .filter(([, checked]) => checked)
            .map(([field]) => field);

        if (selectedFields.length === 0) {
            setLattesFetchError('Selecione ao menos um campo para importar.');
            setLattesImportInfo('');
            return;
        }

        setFormData((prev) => {
            if (!prev) return prev;

            const mergedLattesData = {
                ...(prev.lattesData && typeof prev.lattesData === 'object' ? prev.lattesData : {}),
                id_lattes: lattesPreview.id_lattes || '',
                id_hash: lattesPreview.id_hash || '',
                link: String(prev.lattesLink || lattesPreview.link || '').trim(),
                fonte: lattesPreview.fonte || 'lattes-cnpq',
                sincronizado_em: new Date().toISOString()
            };
            const next = { ...prev, lattesData: mergedLattesData };

            if (lattesImportSelection.nome && lattesPreview.nome) {
                next.nome = lattesPreview.nome;
            }

            if (lattesImportSelection.resumo && lattesPreview.resumo) {
                next.bio = lattesPreview.resumo;
                next.lattesData = { ...next.lattesData, resumo: lattesPreview.resumo };
            }

            if (lattesImportSelection.areas_atuacao && Array.isArray(lattesPreview.areas_atuacao)) {
                next.lattesData = {
                    ...next.lattesData,
                    areas_atuacao: lattesPreview.areas_atuacao
                };
            }

            if (lattesImportSelection.formacao_academica && Array.isArray(lattesPreview.formacao_academica)) {
                next.lattesData = {
                    ...next.lattesData,
                    formacao_academica: lattesPreview.formacao_academica
                };
            }

            if (lattesImportSelection.ultima_atualizacao && lattesPreview.ultima_atualizacao) {
                next.lattesData = {
                    ...next.lattesData,
                    ultima_atualizacao: lattesPreview.ultima_atualizacao
                };
            }

            return next;
        });

        setLattesFetchError('');
        setLattesImportInfo('Campos selecionados aplicados. Clique em Salvar Alterações para persistir no perfil.');
    };

    const handleCancelEdit = () => {
        resetForm(); 
        setIsEditing(false);
    };

    const handleToggleSchoolChange = () => {
        if (!canRequestSchoolChange) {
            setSchoolChangeEnabled(false);
            return;
        }

        setSchoolChangeEnabled((previous) => {
            const next = !previous;
            if (!next) {
                setSchoolSearchTerm('');
                setSchoolChangeReason('');
                setSchoolChangeError('');
                setSelectedSchoolChangeId(currentSchoolId);
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData) return;
        setSchoolChangeError('');

        const payload = {
            ...formData,
            uiPreferences: resolveUserUiPreferences({
                ui_preferences: formData.uiPreferences
            })
        };

        if (schoolChangeEnabled) {
            const nextSchoolId = String(selectedSchoolChangeId || '').trim();
            const reason = String(schoolChangeReason || '').trim();

            if (!canRequestSchoolChange) {
                setSchoolChangeError('Seu perfil nao atende aos criterios para corrigir unidade.');
                return;
            }

            if (!nextSchoolId) {
                setSchoolChangeError('Selecione a nova unidade escolar.');
                return;
            }

            if (nextSchoolId === currentSchoolId) {
                setSchoolChangeError('Escolha uma unidade diferente da unidade atual.');
                return;
            }

            if (reason.length < 10) {
                setSchoolChangeError('Informe um motivo com pelo menos 10 caracteres.');
                return;
            }

            payload.schoolChangeRequest = {
                escola_id: nextSchoolId,
                motivo: reason
            };
        }

        try {
            if (onSaveProfile) {
                await onSaveProfile(payload);
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Erro ao salvar o perfil:', error);
        }
    };

    const handleSavePhoto = async () => {
        if (!onSaveProfile || !formData) return;
        try {
            await onSaveProfile(formData);
            setIsEditing(false);
        } catch (error) {
            console.error('Erro ao salvar foto:', error);
        }
    };

    const projetosCount = loggedUser?.projetosCount || 0;
    const selectedUiPreferences = resolveUserUiPreferences({
        ui_preferences: formData?.uiPreferences
    });
    const selectedUiFontOption = getUiFontOption(selectedUiPreferences.font_id);
    const selectedUiThemeOption = getUiThemeOption(selectedUiPreferences.theme_id);
    const selectedUiStyleOption = getUiStyleOption(selectedUiPreferences.style_id);

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 ">
            <style>{`
                .neo-scrollbar::-webkit-scrollbar { width: 8px; }
                .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
            `}</style>
            
            <div className="w-full max-w-4xl max-h-[95vh] flex flex-col rounded-[2rem] bg-[#FAFAFA] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] overflow-x-hidden overflow-y-auto animate-in zoom-in-[0.97] duration-200 my-auto">
                
                {/* HEADER NEO-BRUTALISTA */}
                <div className="relative z-10 h-36 bg-blue-400 border-b-4 border-slate-900 flex-shrink-0">
                    <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=')] opacity-20"></div>
                    
                    <div className="absolute top-4 left-4 flex gap-3 z-10">
                        <button 
                            onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
                            className="p-3 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-y-0.5 hover:translate-x-0.5 rounded-xl text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all"
                            title={isEditing ? "Cancelar edição" : "Editar Perfil"}
                        >
                            {isEditing ? <X className="w-4 h-4 stroke-[3]" /> : <Edit2 className="w-4 h-4 stroke-[3]" />}
                            {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                        
                        {onLogout && (
                            <button 
                                onClick={onLogout}
                                className="p-3 bg-red-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-y-0.5 hover:translate-x-0.5 rounded-xl text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all"
                                title="Sair"
                            >
                                <LogOut className="w-4 h-4 stroke-[3]" /> Sair
                            </button>
                        )}
                    </div>
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 p-3 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-y-0.5 hover:translate-x-0.5 rounded-xl text-slate-900 transition-all z-10"
                        >
                            <X className="w-5 h-5 stroke-[3]" />
                        </button>
                    )}
                </div>

                {/* CORPO DO MODAL */}
                <div className="flex-1 neo-scrollbar px-6 sm:px-10 pb-10 relative z-20">       
                    
                    {/* INFO PRINCIPAL DO UTILIZADOR */}
                    <div className="relative z-[60] flex flex-col items-center -mt-20 mb-8 isolate">
                        <div className="relative group z-50">
                            <div className="relative z-20 w-32 h-32 rounded-3xl border-4 border-slate-900 bg-yellow-300 flex items-center justify-center overflow-hidden shadow-[6px_6px_0px_0px_#0f172a] transform -2">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt={loggedUser.nome} className="relative z-10 w-full h-full object-cover transform --2" />
                                ) : (
                                    <span className="text-5xl font-black text-slate-900 transform --2">
                                        {getInitials(loggedUser.nome)}
                                    </span>
                                )}

                                <input
                                    id="profileImageInput"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                />

                                {isEditing && (
                                    <label htmlFor="profileImageInput" className="absolute inset-0 z-50 rounded-3xl bg-slate-900/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                        {uploadingAvatar ? (
                                            <LoaderCircle className="w-8 h-8 text-white animate-spin stroke-[3]" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-white stroke-[3]" />
                                        )}
                                    </label>
                                )}
                            </div>
                        </div>

                        {isEditing && formData && formData.fotoBase64 !== (loggedUser.fotoBase64 || loggedUser.fotoUrl || '') && (
                            <button
                                type="button"
                                onClick={handleSavePhoto}
                                className="mt-4 text-xs font-black uppercase tracking-widest text-slate-900 bg-teal-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] rounded-lg px-4 py-2 transition-all hover:translate-y-0.5 hover:shadow-none"
                            >
                                Salvar foto
                            </button>
                        )}

                        <h1 className="mt-6 text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter text-center leading-none">
                            {loggedUser.nome || 'Usuário'}
                        </h1>
                        
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                            <span className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-3 py-1 text-xs font-black text-slate-900 uppercase">
                                <Mail className="w-4 h-4 stroke-[3]" /> {loggedUser.email || 'Sem e-mail'}
                            </span>
                            {formData && formData.telefone && (
                                <span className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] px-3 py-1 text-xs font-black text-slate-900 uppercase">
                                    <Phone className="w-4 h-4 stroke-[3]" /> {formData.telefone}
                                </span>
                            )}
                        </div>

                        {formData && formData.bio && !isEditing && (
                            <p className="mt-6 text-slate-800 font-bold text-center max-w-lg bg-white border-2 border-slate-900 p-4 shadow-[4px_4px_0px_0px_#0f172a] transform -1 text-sm leading-relaxed">
                                "{formData.bio}"
                            </p>
                        )}
                    </div>

                    {/* MODO VISUALIZAÇÃO */}
                    {!isEditing ? (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            
                            {/* Card do Clube */}
                            <div className="flex justify-center mb-8">
                                <div className="p-6 rounded-2xl bg-teal-400 border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] text-center w-full transform --1 hover:-0 transition-transform">
                                    <div className="w-14 h-14 rounded-xl bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center mx-auto mb-4 transform --3">
                                        <School className="w-6 h-6 stroke-[3] text-slate-900" />
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight break-words">
                                        {myClub?.nome || 'Não vinculado a um clube'}
                                    </p>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-900 mt-3 bg-white inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">Clube de Ciências</p>
                                </div>
                            </div>

                            {myClubId ? (
                                <MembershipCardGenerator
                                    viewingClub={myClub}
                                    viewingClubSchool={profileClubSchool}
                                    mentors={profileCardMentors}
                                    students={profileCardStudents}
                                    clubBannerUrl={String(myClub?.banner_url || myClub?.banner || '').trim()}
                                    clubLogoUrl={String(myClub?.logo_url || myClub?.logo || '').trim()}
                                    loggedUser={loggedUser}
                                    canManageTemplate={canManageProfileCardTemplate}
                                    onChangeTemplate={(templateId) => onChangeClubCardTemplate(myClubId, templateId)}
                                />
                            ) : (
                                <div className="rounded-2xl border-4 border-slate-900 bg-white p-6 text-center shadow-[6px_6px_0px_0px_#0f172a]">
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                                        A carteirinha será exibida aqui quando você estiver vinculado a um clube.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] rounded-2xl p-5 flex flex-col items-center text-center transition-all">
                                    <TrendingUp className="w-8 h-8 mb-3 stroke-[2.5] text-blue-500" />
                                    <span className="text-4xl font-black text-slate-900">{projetosCount}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Projetos</span>
                                </div>
                                
                                <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] rounded-2xl p-5 flex flex-col items-center text-center transition-all">
                                    <Shield className="w-8 h-8 mb-3 stroke-[2.5] text-purple-500" />
                                    <span className="text-lg font-black text-slate-900 uppercase mt-auto leading-tight">{loggedUser.perfil || 'Membro'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Perfil</span>
                                </div>
                                
                                <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] rounded-2xl p-5 flex flex-col items-center text-center transition-all">
                                    <LinkIcon className="w-8 h-8 mb-3 stroke-[2.5] text-orange-500" />
                                    {formData && formData.lattesLink ? (
                                        <a 
                                            href={formData.lattesLink.startsWith('http') ? formData.lattesLink : `https://${formData.lattesLink}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-sm font-black text-slate-900 bg-yellow-300 px-4 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all uppercase mt-auto truncate w-full"
                                        >
                                            Acessar
                                        </a>
                                    ) : (
                                        <span className="text-sm font-black text-slate-400 uppercase mt-auto border-2 border-dashed border-slate-300 px-3 py-1">Nenhum</span>
                                    )}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2 bg-slate-100 border border-slate-900 px-2 py-1">Lattes</span>
                                </div>
                            </div>

                            <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] rounded-2xl p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidade escolar atual</p>
                                        <p className="text-lg font-black text-slate-900 uppercase mt-2 break-words">
                                            {currentSchoolName || 'Nao informada'}
                                        </p>
                                        {currentSchoolId && (
                                            <p className="text-xs font-bold text-slate-600 mt-1">
                                                Codigo: {currentSchoolId}
                                            </p>
                                        )}
                                    </div>
                                    <School className="w-7 h-7 stroke-[2.5] text-teal-500 shrink-0" />
                                </div>
                                {hasUsedSchoolChange && (
                                    <p className="mt-4 text-xs font-black uppercase tracking-widest text-red-700 bg-red-100 border-2 border-red-700 inline-block px-2 py-1">
                                        Correcao de unidade ja utilizada
                                    </p>
                                )}
                            </div>

                            <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] rounded-2xl p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Personalizacao ativa</p>
                                        <p className="text-sm font-black text-slate-900 uppercase mt-2">
                                            Fonte: {selectedUiFontOption.label}
                                        </p>
                                        <p className="text-sm font-black text-slate-900 uppercase mt-1">
                                            Paleta: {selectedUiThemeOption.label}
                                        </p>
                                        <p className="text-sm font-black text-slate-900 uppercase mt-1">
                                            UI: {selectedUiStyleOption.label}
                                        </p>
                                    </div>
                                    <Palette className="w-7 h-7 stroke-[2.5] text-pink-500 shrink-0" />
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <span
                                        className="w-7 h-7 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                                        style={{ backgroundColor: selectedUiThemeOption.preview.primary }}
                                    />
                                    <span
                                        className="w-7 h-7 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                                        style={{ backgroundColor: selectedUiThemeOption.preview.secondary }}
                                    />
                                    <span
                                        className="w-7 h-7 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                                        style={{ backgroundColor: selectedUiThemeOption.preview.soft }}
                                    />
                                </div>
                                <p
                                    className="mt-4 text-sm font-black text-slate-800 border-2 border-slate-900 rounded-xl px-3 py-2 bg-slate-50 inline-block"
                                    style={{ fontFamily: selectedUiFontOption.stack }}
                                >
                                    {selectedUiFontOption.sample}
                                </p>
                            </div>
                        </div>

                    ) : (
                        
                        /* MODO EDIÇÃO (FORMULÁRIO) */
                        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
                            
                            <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                                    <User className="w-6 h-6 stroke-[3] text-teal-500" /> Dados Pessoais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputGroup 
                                        label="Nome Completo" 
                                        value={formData?.nome || ''} 
                                        onChange={(e) => handleInputChange('nome', e.target.value)}
                                        icon={User}
                                        placeholder="Seu nome completo"
                                        required
                                    />
                                    <InputGroup 
                                        label="E-mail" 
                                        type="email"
                                        value={formData?.email || ''} 
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        icon={Mail}
                                        disabled
                                    />
                                    <InputGroup 
                                        label="Telefone" 
                                        type="tel"
                                        value={formData?.telefone || ''} 
                                        onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                                        icon={Phone}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                    <InputGroup 
                                        label="Link do Lattes" 
                                        value={formData?.lattesLink || ''} 
                                        onChange={(e) => handleInputChange('lattesLink', e.target.value)}
                                        icon={LinkIcon}
                                        placeholder="https://lattes.cnpq.br/..."
                                    />
                                </div>
                            </div>
     <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                                <InputGroup 
                                    label="Biografia" 
                                    type="textarea"
                                    value={formData?.bio || ''} 
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                    icon={BookOpen}
                                    placeholder="Conte um pouco sobre você..."
                                    rows={4}
                                />
                            </div>
                            <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4 flex items-center gap-2">
                                    <School className="w-6 h-6 stroke-[3] text-blue-500" /> Unidade Escolar
                                </h3>

                                <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vinculo atual</p>
                                    <p className="text-base font-black text-slate-900 mt-1 break-words">
                                        {currentSchoolName || 'Nao informada'}
                                    </p>
                                    <p className="text-xs font-bold text-slate-700 mt-1">
                                        Codigo: {currentSchoolId || 'Nao informado'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleToggleSchoolChange}
                                    disabled={!canRequestSchoolChange}
                                    className={`mt-5 w-full md:w-auto px-5 py-3 border-2 border-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        schoolChangeEnabled
                                            ? 'bg-yellow-300 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:shadow-none hover:translate-y-0.5'
                                            : canRequestSchoolChange
                                                ? 'bg-teal-400 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:shadow-none hover:translate-y-0.5'
                                                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    {schoolChangeEnabled ? 'Cancelar correcao de unidade' : 'Corrigir unidade escolar (uso unico)'}
                                </button>

                                {!canRequestSchoolChange && (
                                    <p className="mt-3 text-xs font-bold text-red-700">
                                        {schoolChangeBlockedReason}
                                    </p>
                                )}

                                {schoolChangeEnabled && (
                                    <div className="mt-6 space-y-4">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-900 mb-2">
                                                Buscar unidade escolar
                                            </label>
                                            <input
                                                type="text"
                                                value={schoolSearchTerm}
                                                onChange={(event) => setSchoolSearchTerm(event.target.value)}
                                                placeholder="Digite nome, municipio ou codigo"
                                                className="block w-full px-4 py-3 border-2 border-slate-900 rounded-xl text-sm font-bold shadow-[3px_3px_0px_0px_#0f172a] focus:shadow-[3px_3px_0px_0px_#14b8a6] focus:-translate-y-0.5 focus:-translate-x-0.5 outline-none transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-900 mb-2">
                                                Nova unidade escolar *
                                            </label>
                                            <select
                                                value={selectedSchoolChangeId}
                                                onChange={(event) => setSelectedSchoolChangeId(event.target.value)}
                                                className="block w-full px-4 py-3 border-2 border-slate-900 rounded-xl text-sm font-bold bg-white shadow-[3px_3px_0px_0px_#0f172a] focus:shadow-[3px_3px_0px_0px_#14b8a6] focus:-translate-y-0.5 focus:-translate-x-0.5 outline-none transition-all"
                                            >
                                                <option value="">Selecione uma unidade</option>
                                                {filteredSchoolOptions.map((option) => (
                                                    <option key={option.id} value={option.id}>
                                                        {option.nome} {option.municipio ? `• ${option.municipio}` : ''} • {option.id}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-2 text-[11px] font-bold text-slate-600">
                                                Exibindo {filteredSchoolOptions.length} opcoes filtradas.
                                            </p>
                                        </div>

                                        <InputGroup
                                            label="Motivo da correcao *"
                                            type="textarea"
                                            value={schoolChangeReason}
                                            onChange={(event) => setSchoolChangeReason(event.target.value)}
                                            icon={BookOpen}
                                            placeholder="Explique por que a unidade cadastrada esta incorreta."
                                            rows={3}
                                            maxLength={240}
                                        />

                                        {schoolChangeError && (
                                            <p className="text-xs font-bold text-red-700 bg-red-100 border-2 border-red-700 rounded-lg px-3 py-2">
                                                {schoolChangeError}
                                            </p>
                                        )}

                                        <p className="text-xs font-bold text-slate-700 bg-yellow-100 border-2 border-yellow-700 rounded-lg px-3 py-2">
                                            Regra de seguranca: essa correcao pode ser feita apenas 1 vez e somente antes de entrar em clube.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#0f172a]">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4 flex items-center gap-2">
                                    <Palette className="w-6 h-6 stroke-[3] text-pink-500" /> Personalizacao do Sistema
                                </h3>
                                <p className="text-xs font-bold text-slate-700 mb-6">
                                    Escolha fonte, paleta de cores e estilo visual geral da interface. As configuracoes sao salvas no seu perfil.
                                </p>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                            Fonte
                                        </p>
                                        <div className="space-y-3">
                                            {UI_FONT_OPTIONS.map((fontOption) => {
                                                const isSelected = selectedUiPreferences.font_id === fontOption.id;
                                                return (
                                                    <button
                                                        key={fontOption.id}
                                                        type="button"
                                                        onClick={() => handleUiPreferenceChange('font_id', fontOption.id)}
                                                        className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                                                            isSelected
                                                                ? 'border-slate-900 bg-yellow-200 shadow-[3px_3px_0px_0px_#0f172a]'
                                                                : 'border-slate-300 bg-white hover:border-slate-900'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-sm font-black text-slate-900 uppercase">
                                                                {fontOption.label}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white border border-slate-900 px-2 py-0.5">
                                                                    Ativa
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p
                                                            className="mt-2 text-sm text-slate-800"
                                                            style={{ fontFamily: fontOption.stack }}
                                                        >
                                                            {fontOption.sample}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                            Paleta de cores
                                        </p>
                                        <div className="space-y-3">
                                            {UI_THEME_OPTIONS.map((themeOption) => {
                                                const isSelected = selectedUiPreferences.theme_id === themeOption.id;
                                                return (
                                                    <button
                                                        key={themeOption.id}
                                                        type="button"
                                                        onClick={() => handleUiPreferenceChange('theme_id', themeOption.id)}
                                                        className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                                                            isSelected
                                                                ? 'border-slate-900 bg-yellow-200 shadow-[3px_3px_0px_0px_#0f172a]'
                                                                : 'border-slate-300 bg-white hover:border-slate-900'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-sm font-black text-slate-900 uppercase">
                                                                {themeOption.label}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white border border-slate-900 px-2 py-0.5">
                                                                    Ativa
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-2 text-xs font-bold text-slate-700">
                                                            {themeOption.summary}
                                                        </p>
                                                        <div className="mt-3 flex items-center gap-2">
                                                            <span
                                                                className="w-6 h-6 rounded-lg border-2 border-slate-900"
                                                                style={{ backgroundColor: themeOption.preview.primary }}
                                                            />
                                                            <span
                                                                className="w-6 h-6 rounded-lg border-2 border-slate-900"
                                                                style={{ backgroundColor: themeOption.preview.secondary }}
                                                            />
                                                            <span
                                                                className="w-6 h-6 rounded-lg border-2 border-slate-900"
                                                                style={{ backgroundColor: themeOption.preview.soft }}
                                                            />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                            Estilo da interface
                                        </p>
                                        <div className="space-y-3">
                                            {UI_STYLE_OPTIONS.map((styleOption) => {
                                                const isSelected = selectedUiPreferences.style_id === styleOption.id;
                                                return (
                                                    <button
                                                        key={styleOption.id}
                                                        type="button"
                                                        onClick={() => handleUiPreferenceChange('style_id', styleOption.id)}
                                                        className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                                                            isSelected
                                                                ? 'border-slate-900 bg-yellow-200 shadow-[3px_3px_0px_0px_#0f172a]'
                                                                : 'border-slate-300 bg-white hover:border-slate-900'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-sm font-black text-slate-900 uppercase">
                                                                {styleOption.label}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white border border-slate-900 px-2 py-0.5">
                                                                    Ativa
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-2 text-xs font-bold text-slate-700">
                                                            {styleOption.summary}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>


                       

                            <div className="pt-6 border-t-4 border-slate-900 flex flex-col sm:flex-row justify-end gap-4">
                                <button 
                                    type="button" 
                                    onClick={handleCancelEdit}
                                    className="px-8 py-4 bg-white border-4 border-slate-900 text-slate-900 font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-none transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-8 py-4 bg-teal-400 border-4 border-slate-900 text-slate-900 font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Check className="w-5 h-5 stroke-[3]" /> Salvar Perfil
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function InputGroup({ label, type = "text", value, onChange, icon: Icon, disabled = false, placeholder, required, rows, maxLength }) {
    const isTextarea = type === 'textarea';
    
    return (
        <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-900 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon className="h-5 w-5 stroke-[2.5] text-slate-500" />
                </div>
                {isTextarea ? (
                    <textarea
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        rows={rows || 3}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        className={`block w-full pl-12 pr-4 py-3 border-2 border-slate-900 rounded-xl text-sm font-bold shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all resize-none ${
                            disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                        }`}
                    />
                ) : (
                    <input
                        type={type}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        placeholder={placeholder}
                        required={required}
                        maxLength={maxLength}
                        className={`block w-full pl-12 pr-4 py-3 border-2 border-slate-900 rounded-xl text-sm font-bold shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all ${
                            disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                        }`}
                    />
                )}
            </div>
        </div>
    );
}
