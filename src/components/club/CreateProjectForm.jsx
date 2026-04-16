import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronDown, CheckCircle, UploadCloud, Target, FileText, Image as ImageIcon, Users, BookOpen, Check } from 'lucide-react';

const MAX_PROJECT_IMAGES = 5;

const normalizeIdArray = (values = []) => {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
};

const buildInitialProjectForm = (project = null) => {
  const coorientadores = normalizeIdArray([
    ...(project?.coorientador_ids || []),
    ...(project?.coorientadores_ids || [])
  ]);

  const investigadores = normalizeIdArray(project?.investigadores_ids || []);

  const imagens = Array.isArray(project?.imagens)
    ? project.imagens.filter((img) => typeof img === 'string' && img.trim()).slice(0, MAX_PROJECT_IMAGES)
    : (typeof project?.imagem === 'string' && project.imagem.trim() ? [project.imagem.trim()] : []);

  return {
    titulo: String(project?.titulo || '').trim(),
    descricao: String(project?.descricao || '').trim(),
    area_tematica: String(project?.area_tematica || '').trim(),
    status: String(project?.status || 'Em andamento').trim(),
    tipo: String(project?.tipo || 'Projeto Científico').trim(),
    coorientador_ids: coorientadores,
    investigadores_ids: investigadores,
    imagens,
    termo_aceite_criacao: false
  };
};

export default function CreateProjectModal({
  isOpen,
  onClose,
  viewingClub,
  loggedUser,
  users = [],
  viewingClubOrientadores = [],
  viewingClubCoorientadores = [],
  viewingClubInvestigadores = [],
  handleCreateProject,
  handleUpdateProject,
  projectToEdit = null,
  mode = 'create',
  onSuccess
}) {
  const [projectForm, setProjectForm] = useState(() => buildInitialProjectForm(projectToEdit));

  const [projectMessage, setProjectMessage] = useState('');
  const [imageUploadMessage, setImageUploadMessage] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchCoorientador, setSearchCoorientador] = useState('');
  const [searchInvestigador, setSearchInvestigador] = useState('');

  const getPersonInitials = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts.map((part) => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const normalizeText = (value) => String(value || '').trim().toLowerCase();
  const isMentorProfile = ['orientador', 'coorientador'].includes(normalizeText(loggedUser?.perfil));
  const isEditing = mode === 'edit' || Boolean(projectToEdit?.id);
  const modalTitle = isEditing ? 'Editar Projeto' : 'Criar Novo Projeto';
  const modalSubtitle = isEditing
    ? 'Atualize os detalhes do projeto publicado no ecossistema'
    : 'Registre uma nova investigação científica para este clube';
  const selectedSchoolId = String(viewingClub?.escola_id || '').trim();
  const selectedSchoolName = normalizeText(viewingClub?.escola_nome);

  useEffect(() => {
    if (!isOpen) return;

    const initialForm = buildInitialProjectForm(projectToEdit);
    setProjectForm(initialForm);
    setDescriptionLength(String(initialForm.descricao || '').length);
    setProjectMessage('');
    setImageUploadMessage('');
    setFileInputKey(Date.now());
  }, [isOpen, projectToEdit]);

  const isSameSchoolUser = (person) => {
    if (!selectedSchoolId && !selectedSchoolName) return true;

    const schoolIds = [
      ...(Array.isArray(person?.escolas_ids) ? person.escolas_ids : []),
      person?.escola_id
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    const hasSchoolId = selectedSchoolId ? schoolIds.includes(selectedSchoolId) : false;
    const hasSchoolName = selectedSchoolName
      ? normalizeText(person?.escola_nome) === selectedSchoolName
      : false;

    return hasSchoolId || hasSchoolName;
  };

  const mentorCandidates = useMemo(() => {
    const byId = new Map();

    const schoolMentors = (users || []).filter((person) => {
      const perfil = normalizeText(person?.perfil);
      return ['orientador', 'coorientador'].includes(perfil) && isSameSchoolUser(person);
    });

    [...viewingClubCoorientadores, ...viewingClubOrientadores, ...schoolMentors].forEach((person) => {
      const personId = String(person?.id || person?.uid || '').trim();
      if (!personId) return;
      byId.set(personId, { ...person, id: personId });
    });

    return [...byId.values()].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
  }, [viewingClubCoorientadores, viewingClubOrientadores, users, selectedSchoolId, selectedSchoolName]);

  const filteredMentorCandidates = useMemo(() => {
    const term = String(searchCoorientador || '').trim().toLowerCase();
    return mentorCandidates.filter((person) => {
      if (!term) return true;

      const searchBase = [person?.nome, person?.email, person?.matricula]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

      return searchBase.includes(term);
    });
  }, [mentorCandidates, searchCoorientador]);

  const investigadorCandidates = useMemo(() => {
    const byId = new Map();

    const schoolStudents = (users || []).filter((person) => {
      const perfil = normalizeText(person?.perfil);
      return ['estudante', 'investigador', 'aluno'].includes(perfil) && isSameSchoolUser(person);
    });

    [...(viewingClubInvestigadores || []), ...schoolStudents].forEach((person) => {
      const personId = String(person?.id || person?.uid || '').trim();
      if (!personId) return;
      byId.set(personId, { ...person, id: personId });
    });

    return [...byId.values()].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
  }, [viewingClubInvestigadores, users, selectedSchoolId, selectedSchoolName]);

  const filteredInvestigadorCandidates = useMemo(() => {
    const term = String(searchInvestigador || '').trim().toLowerCase();
    return (investigadorCandidates || []).filter((person) => {
      if (!person) return false;

      if (!term) return true;
      const searchBase = [person?.nome, person?.email, person?.matricula]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

      return searchBase.includes(term);
    });
  }, [investigadorCandidates, searchInvestigador]);

  const compressImageFiles = async (files, limit = MAX_PROJECT_IMAGES) => {
    const toDataUrl = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const loadImage = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    const compressImage = async (file) => {
      const dataUrl = await toDataUrl(file);
      const img = await loadImage(dataUrl);

      const maxWidth = 1024;
      const maxHeight = 1024;
      const ratio = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
      const width = Math.round(img.naturalWidth * ratio);
      const height = Math.round(img.naturalHeight * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      return canvas.toDataURL('image/jpeg', 0.75);
    };

    const selectedFiles = Array.from(files).slice(0, limit);
    const compressed = [];

    for (const file of selectedFiles) {
      try {
        compressed.push(await compressImage(file));
      } catch (error) {
        console.error('Falha ao comprimir imagem', error);
      }
    }

    return compressed;
  };

  const handleImageChange = async (event) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      setFileInputKey(Date.now());
      return;
    }

    const selectedFiles = Array.from(files);
    const existingImages = Array.isArray(projectForm.imagens) ? projectForm.imagens : [];
    const availableSlots = Math.max(0, MAX_PROJECT_IMAGES - existingImages.length);

    if (availableSlots <= 0) {
      setImageUploadMessage(`Você pode adicionar até ${MAX_PROJECT_IMAGES} imagens.`);
      setFileInputKey(Date.now());
      return;
    }

    if (selectedFiles.length > availableSlots) {
      setImageUploadMessage(`Você pode adicionar no máximo ${MAX_PROJECT_IMAGES} imagens no total.`);
    } else {
      setImageUploadMessage('');
    }

    const compressedImages = await compressImageFiles(selectedFiles, availableSlots);
    setProjectForm((prev) => ({
      ...prev,
      imagens: [...(Array.isArray(prev.imagens) ? prev.imagens : []), ...compressedImages].slice(0, MAX_PROJECT_IMAGES)
    }));
    setFileInputKey(Date.now());
  };

  const handleRemoveImage = (indexToRemove) => {
    setProjectForm(prev => ({
      ...prev,
      imagens: prev.imagens.filter((_, index) => index !== indexToRemove)
    }));
    if (projectForm.imagens.length === 1) {
      setFileInputKey(Date.now());
    }
  }

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    if (value.length <= 1000) {
      setProjectForm((prev) => ({ ...prev, descricao: value }));
      setDescriptionLength(value.length);
    }
  }

  const toggleMemberSelection = (fieldName, id) => {
    setProjectForm((prev) => {
      const currentValues = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
      const normalizedId = String(id || '').trim();
      if (!normalizedId) {
        return prev;
      }

      const exists = currentValues.includes(normalizedId);
      return {
        ...prev,
        [fieldName]: exists
          ? currentValues.filter((value) => value !== normalizedId)
          : [...currentValues, normalizedId]
      };
    });
  };

  const termoAceiteSections = [
    {
      title: '1. VINCULO INSTITUCIONAL DO PROJETO',
      paragraphs: [
        'Declaro que compreendo que o projeto será desenvolvido no âmbito do Clube de Ciências da unidade escolar à qual estou vinculado(a), sendo, portanto, considerado uma atividade institucional do clube.',
        'Reconheço que:'
      ],
      items: [
        'o projeto integra as ações pedagógicas da escola;',
        'poderá utilizar recursos físicos, materiais e humanos da unidade escolar;',
        'poderá ser apresentado pela escola em eventos, feiras e atividades acadêmicas.'
      ]
    },
    {
      title: '2. AUTORIA E RECONHECIMENTO',
      paragraphs: [
        'Declaro que minha participação no projeto será devidamente registrada, garantindo o reconhecimento da autoria intelectual nas etapas de:'
      ],
      items: [
        'idealização;',
        'desenvolvimento;',
        'execução;',
        'apresentação dos resultados.'
      ],
      footer: 'Estou ciente de que minha autoria será preservada no histórico do projeto, independentemente de mudanças futuras.'
    },
    {
      title: '3. PARTICIPACAO EM EQUIPE',
      paragraphs: ['Nos casos de projetos coletivos:'],
      items: [
        'comprometo-me a respeitar a colaboração entre os membros;',
        'reconheço que o projeto não pertence individualmente a um único participante;',
        'concordo que decisões sobre continuidade poderão considerar o grupo como um todo.'
      ]
    },
    {
      title: '4. REGISTRO E ACOMPANHAMENTO',
      paragraphs: ['Declaro que todas as informações inseridas no sistema são de minha responsabilidade e que:'],
      items: [
        'o projeto será acompanhado e registrado ao longo de seu desenvolvimento;',
        'alterações relevantes deverão ser informadas e atualizadas no sistema;',
        'o histórico do projeto será mantido para fins pedagógicos e institucionais.'
      ]
    },
    {
      title: '5. COMPROMISSO ETICO E PEDAGOGICO',
      paragraphs: ['Comprometo-me a:'],
      items: [
        'desenvolver o projeto com responsabilidade e ética;',
        'respeitar as orientações do(a) professor(a) orientador(a);',
        'zelar pelo uso adequado dos recursos disponibilizados;',
        'respeitar as normas do Clube de Ciências e da unidade escolar.'
      ]
    },
    {
      title: '6. CIENCIA E CONCORDANCIA',
      paragraphs: ['Ao prosseguir com a criação do projeto, declaro que li, compreendi e concordo com todos os termos acima estabelecidos.']
    }
  ];

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!isEditing && isMentorProfile && !projectForm.termo_aceite_criacao) {
      setProjectMessage('Para criar o projeto, é obrigatório ler e aceitar o termo de criação de projetos.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditing) {
        const projectId = String(projectToEdit?.id || '').trim();

        if (!projectId) {
          setProjectMessage('Projeto inválido para edição.');
          return;
        }

        if (!handleUpdateProject) {
          setProjectMessage('Função de edição não disponível.');
          return;
        }

        await handleUpdateProject(projectId, projectForm);
        setProjectMessage('Projeto atualizado com sucesso!');
      } else {
        if (!handleCreateProject) {
          setProjectMessage('Função de criação não disponível.');
          return;
        }

        await handleCreateProject(projectForm);
        setProjectMessage('Projeto criado com sucesso!');
        const nextForm = buildInitialProjectForm(null);
        setProjectForm(nextForm);
        setImageUploadMessage('');
        setFileInputKey(Date.now());
        setDescriptionLength(0);
      }

      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      onClose(); 
    } catch (error) {
      const actionLabel = isEditing ? 'atualizar' : 'criar';
      console.error(`Erro ao ${actionLabel} projeto:`, error);
      setProjectMessage(String(error?.message || '').trim() || `Erro ao ${actionLabel} projeto. Verifique os dados e tente novamente.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClasses = "w-full rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all placeholder:text-slate-400";
  const labelClasses = "text-xs font-black uppercase tracking-widest text-slate-900 mb-2 block";
  const sectionTitleClasses = "text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3";

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      
      {/* INJEÇÃO DE CSS DA SCROLLBAR */}
      <style>{`
        .neo-scrollbar::-webkit-scrollbar { width: 8px; }
        .neo-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .neo-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 2px solid #fff; }
      `}</style>

      <div className="w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl bg-[#FAFAFA] border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] overflow-hidden animate-in zoom-in-[0.97] duration-200">
        
        {/* HEADER NEO-BRUTALISTA */}
        <div className="flex items-center justify-between px-8 py-6 border-b-4 border-slate-900 bg-pink-400">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <Target className="w-8 h-8 stroke-[3]" /> {modalTitle}
            </h2>
            <p className="text-sm font-bold text-slate-900 mt-2 bg-white inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transform -rotate-1">
              {modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:bg-slate-100 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center shrink-0"
            aria-label="Fechar formulário"
          >
            <X className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto neo-scrollbar p-8">
          <form id="project-form" onSubmit={handleSubmitProject} className="space-y-10">
            
            {/* INFORMAÇÕES BÁSICAS */}
            <section className="rounded-3xl border-4 border-slate-900 p-6 bg-cyan-300 shadow-[8px_8px_0px_0px_#0f172a]">
              <h3 className={sectionTitleClasses}>
                <FileText className="w-7 h-7 stroke-[3]" /> Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={labelClasses}>Título do Projeto *</label>
                  <input
                    value={projectForm.titulo}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, titulo: e.target.value }))}
                    required
                    placeholder="Ex: Análise da qualidade da água..."
                    className={inputClasses}
                  />
                </div>
                
                <div>
                  <label className={labelClasses}>Área Temática</label>
                  <input
                    value={projectForm.area_tematica}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, area_tematica: e.target.value }))}
                    placeholder="Engenharia, Biologia, etc."
                    className={inputClasses}
                  />
                </div>

                <div className="relative">
                  <label className={labelClasses}>Tipo do Projeto</label>
                  <select
                    value={projectForm.tipo}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, tipo: e.target.value }))}
                    className={`${inputClasses} appearance-none cursor-pointer`}
                  >
                    <option value="Projeto Científico">Projeto Científico</option>
                    <option value="Iniciação Tecnológica">Iniciação Tecnológica</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-10 w-5 h-5 text-slate-900 stroke-[3] pointer-events-none" />
                </div>

                <div className="md:col-span-2 relative">
                  <label className={labelClasses}>Status do Projeto</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}
                    className={`${inputClasses} appearance-none cursor-pointer`}
                  >
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Pausado">Pausado</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-10 w-5 h-5 text-slate-900 stroke-[3] pointer-events-none" />
                </div>
              </div>
            </section>

            {/* DESCRIÇÃO */}
            <section className="rounded-3xl border-4 border-slate-900 p-6 bg-yellow-300 shadow-[8px_8px_0px_0px_#0f172a]">
              <h3 className={sectionTitleClasses}>
                <BookOpen className="w-7 h-7 stroke-[3]" /> Resumo / Descrição
              </h3>
              <div className="relative">
                <textarea
                  value={projectForm.descricao}
                  onChange={handleDescriptionChange}
                  placeholder="Descreva os objetivos, a metodologia aplicada e o que esperam descobrir..."
                  className={`${inputClasses} resize-none`}
                  rows={5}
                  maxLength={1000}
                />
                <p className="absolute bottom-3 right-4 text-xs font-black text-slate-500 bg-white border-2 border-slate-900 px-2 py-1 shadow-[2px_2px_0px_0px_#0f172a]">
                  {descriptionLength} / 1000
                </p>
              </div>
            </section>

            {/* MÍDIA */}
            <section className="rounded-3xl border-4 border-slate-900 p-6 bg-blue-300 shadow-[8px_8px_0px_0px_#0f172a]">
              <h3 className={sectionTitleClasses}>
                <ImageIcon className="w-7 h-7 stroke-[3]" /> Galeria do Projeto
              </h3>
              
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <label className="flex-1 w-full relative group cursor-pointer border-4 border-dashed border-slate-900 rounded-2xl bg-white p-8 text-center hover:bg-slate-50 transition-colors flex flex-col justify-center items-center h-48">
                  <UploadCloud className="w-12 h-12 text-slate-900 stroke-[2] mb-4 group-hover:-translate-y-2 transition-transform" />
                  <span className="text-sm font-black text-slate-900 uppercase">
                    Arraste imagens ou clique
                  </span>
                  <span className="text-xs font-bold text-slate-500 mt-2">Máximo {MAX_PROJECT_IMAGES} fotos.</span>
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>

                {projectForm.imagens?.length > 0 && (
                  <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    {projectForm.imagens.map((imgSrc, index) => (
                      <div key={index} className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] bg-white overflow-hidden group">
                        <img
                          src={imgSrc}
                          alt={`Preview imagem ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="w-10 h-10 bg-red-400 border-2 border-slate-900 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[2px_2px_0px_0px_#0f172a]"
                          >
                            <X className="w-5 h-5 text-slate-900 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {imageUploadMessage && (
                <div className="mt-4 inline-block bg-white border-2 border-slate-900 px-3 py-1 font-black text-xs text-red-500 shadow-[2px_2px_0px_0px_#0f172a] transform -rotate-1">
                  ! {imageUploadMessage}
                </div>
              )}
            </section>

            {/* EQUIPE */}
            <section className="rounded-3xl border-4 border-slate-900 p-6 bg-purple-300 shadow-[8px_8px_0px_0px_#0f172a]">
              <h3 className={sectionTitleClasses}>
                <Users className="w-7 h-7 stroke-[3]" /> Equipe de Pesquisa
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                
                {/* Co-mentores */}
                <div className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex flex-col h-[350px]">
                  <div className="mb-4">
                    <label className={labelClasses}>Buscar Co-Mentores</label>
                    <div className="relative">
                      <input
                        type="search"
                        value={searchCoorientador}
                        onChange={(e) => setSearchCoorientador(e.target.value)}
                        placeholder="Nome ou e-mail..."
                        className="w-full border-2 border-slate-900 px-10 py-3 rounded-xl text-sm font-bold text-slate-900 focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all"
                      />
                      <Search className="absolute left-3 top-3.5 text-slate-900 w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto neo-scrollbar pr-2 space-y-3">
                    {filteredMentorCandidates.length === 0 ? (
                      <p className="text-xs font-bold text-slate-500 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center">Nenhum co-mentor encontrado.</p>
                    ) : (
                      filteredMentorCandidates.map((person) => {
                        const checked = projectForm.coorientador_ids.includes(String(person.id));
                        const initials = getPersonInitials(person?.nome);
                        return (
                          <label key={person.id} className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-slate-900 bg-teal-400 shadow-[2px_2px_0px_0px_#0f172a]' : 'border-slate-200 bg-slate-50 hover:border-slate-900 hover:shadow-[2px_2px_0px_0px_#0f172a]'}`}>
                            <div className="relative w-6 h-6 shrink-0">
                                <input type="checkbox" checked={checked} onChange={() => toggleMemberSelection('coorientador_ids', person.id)} className="sr-only" />
                                <div className={`absolute inset-0 rounded-md border-2 border-slate-900 flex items-center justify-center transition-colors ${checked ? 'bg-slate-900' : 'bg-white'}`}>
                                    {checked && <Check className="w-4 h-4 text-teal-400 stroke-[3]" />}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center text-slate-900 font-black text-sm shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-sm font-black text-slate-900 truncate">{person.nome || 'Sem nome'}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Investigadores */}
                <div className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex flex-col h-[350px]">
                  <div className="mb-4">
                    <label className={labelClasses}>Buscar Alunos / Investigadores</label>
                    <div className="relative">
                      <input
                        type="search"
                        value={searchInvestigador}
                        onChange={(e) => setSearchInvestigador(e.target.value)}
                        placeholder="Nome ou matrícula..."
                        className="w-full border-2 border-slate-900 px-10 py-3 rounded-xl text-sm font-bold text-slate-900 focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 outline-none transition-all"
                      />
                      <Search className="absolute left-3 top-3.5 text-slate-900 w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto neo-scrollbar pr-2 space-y-3">
                    {filteredInvestigadorCandidates.length === 0 ? (
                      <p className="text-xs font-bold text-slate-500 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center">Nenhum aluno encontrado.</p>
                    ) : (
                      filteredInvestigadorCandidates.map((person) => {
                        const personId = String(person?.id || '').trim();
                        const checked = projectForm.investigadores_ids.includes(personId);
                        const initials = getPersonInitials(person?.nome);
                        return (
                          <label key={personId} className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-slate-900 bg-yellow-300 shadow-[2px_2px_0px_0px_#0f172a]' : 'border-slate-200 bg-slate-50 hover:border-slate-900 hover:shadow-[2px_2px_0px_0px_#0f172a]'}`}>
                            <div className="relative w-6 h-6 shrink-0">
                                <input type="checkbox" checked={checked} onChange={() => toggleMemberSelection('investigadores_ids', personId)} className="sr-only" />
                                <div className={`absolute inset-0 rounded-md border-2 border-slate-900 flex items-center justify-center transition-colors ${checked ? 'bg-slate-900' : 'bg-white'}`}>
                                    {checked && <Check className="w-4 h-4 text-yellow-300 stroke-[3]" />}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center text-slate-900 font-black text-sm shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-sm font-black text-slate-900 truncate">{person?.nome || 'Sem nome'}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            </section>

            {/* TERMO DE ACEITE */}
            {isMentorProfile && !isEditing && (
              <section className="rounded-3xl border-4 border-slate-900 p-6 bg-slate-100 shadow-[8px_8px_0px_0px_#0f172a]">
                <h3 className={sectionTitleClasses}>
                  <CheckCircle className="w-7 h-7 stroke-[3]" /> Termo de Aceite
                </h3>

                <div className="bg-white border-4 border-slate-900 rounded-2xl overflow-hidden flex flex-col mb-6">
                  <div className="bg-slate-900 text-white px-6 py-3 font-black uppercase text-sm tracking-widest">
                    Diretrizes de Criação de Projetos
                  </div>
                  <div className="p-6 max-h-64 overflow-y-auto neo-scrollbar space-y-6 text-sm text-slate-700 font-bold">
                    {termoAceiteSections.map((section) => (
                      <div key={section.title} className="space-y-2">
                        <p className="font-black text-slate-900 text-base">{section.title}</p>
                        {(section.paragraphs || []).map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                        {(section.items || []).length > 0 && (
                          <ul className="list-disc list-outside ml-4 space-y-1">
                            {section.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                        {section.footer && <p className="mt-2 text-slate-900 bg-yellow-300 p-2 border-2 border-slate-900">{section.footer}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <label className={`flex items-center gap-4 p-4 rounded-2xl border-4 cursor-pointer transition-all ${projectForm.termo_aceite_criacao ? 'border-slate-900 bg-teal-400 shadow-[4px_4px_0px_0px_#0f172a]' : 'border-slate-300 bg-white hover:border-slate-900 hover:shadow-[4px_4px_0px_0px_#0f172a]'}`}>
                  <div className="relative w-8 h-8 shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(projectForm.termo_aceite_criacao)}
                      onChange={(e) => setProjectForm((prev) => ({ ...prev, termo_aceite_criacao: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`absolute inset-0 rounded-lg border-2 border-slate-900 flex items-center justify-center transition-colors ${projectForm.termo_aceite_criacao ? 'bg-slate-900' : 'bg-white'}`}>
                        {projectForm.termo_aceite_criacao && <Check className="w-5 h-5 text-teal-400 stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-base font-black text-slate-900 uppercase">Li e aceito os termos descritos acima.</span>
                </label>
              </section>
            )}

            {projectMessage && (
              <div className="bg-red-400 border-4 border-slate-900 rounded-xl p-4 font-black text-slate-900 text-center uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a]">
                {projectMessage}
              </div>
            )}

          </form>
        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 border-t-4 border-slate-900 bg-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-slate-900 bg-white text-slate-900 font-black uppercase tracking-widest hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="project-form"
            disabled={(!isEditing && isMentorProfile && !projectForm.termo_aceite_criacao) || isSubmitting}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-slate-900 bg-teal-400 text-slate-900 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f172a] active:shadow-none active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <Target className="w-5 h-5 stroke-[3]" />
            {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Projeto'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}