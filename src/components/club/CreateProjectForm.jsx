import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, ChevronDown, CheckCircle, UploadCloud } from 'lucide-react';

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
    ? 'Atualize os detalhes do projeto publicado'
    : 'Preencha os detalhes para registrar seu projeto';
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
        'Declaro que compreendo que o projeto sera desenvolvido no ambito do Clube de Ciencias da unidade escolar a qual estou vinculado(a), sendo, portanto, considerado uma atividade institucional do clube.',
        'Reconheco que:'
      ],
      items: [
        'o projeto integra as acoes pedagogicas da escola;',
        'podera utilizar recursos fisicos, materiais e humanos da unidade escolar;',
        'podera ser apresentado pela escola em eventos, feiras e atividades academicas.'
      ]
    },
    {
      title: '2. AUTORIA E RECONHECIMENTO',
      paragraphs: [
        'Declaro que minha participacao no projeto sera devidamente registrada, garantindo o reconhecimento da autoria intelectual nas etapas de:'
      ],
      items: [
        'idealizacao;',
        'desenvolvimento;',
        'execucao;',
        'apresentacao dos resultados.'
      ],
      footer: 'Estou ciente de que minha autoria sera preservada no historico do projeto, independentemente de mudancas futuras.'
    },
    {
      title: '3. PARTICIPACAO EM EQUIPE',
      paragraphs: ['Nos casos de projetos coletivos:'],
      items: [
        'comprometo-me a respeitar a colaboracao entre os membros;',
        'reconheco que o projeto nao pertence individualmente a um unico participante;',
        'concordo que decisoes sobre continuidade poderao considerar o grupo como um todo.'
      ]
    },
    {
      title: '4. REGISTRO E ACOMPANHAMENTO',
      paragraphs: ['Declaro que todas as informacoes inseridas no sistema sao de minha responsabilidade e que:'],
      items: [
        'o projeto sera acompanhado e registrado ao longo de seu desenvolvimento;',
        'alteracoes relevantes deverao ser informadas e atualizadas no sistema;',
        'o historico do projeto sera mantido para fins pedagogicos e institucionais.'
      ]
    },
    {
      title: '5. COMPROMISSO ETICO E PEDAGOGICO',
      paragraphs: ['Comprometo-me a:'],
      items: [
        'desenvolver o projeto com responsabilidade e etica;',
        'respeitar as orientacoes do(a) professor(a) orientador(a);',
        'zelar pelo uso adequado dos recursos disponibilizados;',
        'respeitar as normas do Clube de Ciencias e da unidade escolar.'
      ]
    },
    {
      title: '6. CIENCIA E CONCORDANCIA',
      paragraphs: ['Ao prosseguir com a criacao do projeto, declaro que li, compreendi e concordo com todos os termos acima estabelecidos.']
    }
  ];

  const handleSubmitProject = async (e) => {
    e.preventDefault();

    if (!isEditing && isMentorProfile && !projectForm.termo_aceite_criacao) {
      setProjectMessage('Para criar o projeto, e obrigatorio ler e aceitar o termo de criacao de projetos.');
      return;
    }

    try {
      if (isEditing) {
        const projectId = String(projectToEdit?.id || '').trim();

        if (!projectId) {
          setProjectMessage('Projeto invalido para edicao.');
          return;
        }

        if (!handleUpdateProject) {
          setProjectMessage('Funcao de edicao nao disponivel.');
          return;
        }

        await handleUpdateProject(projectId, projectForm);
        setProjectMessage('Projeto atualizado com sucesso!');
      } else {
        if (!handleCreateProject) {
          setProjectMessage('Funcao de criacao nao disponivel.');
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
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
        
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-[#0E0F0F] tracking-tight">{modalTitle}</h2>
          <p className="text-base text-slate-500 mt-1">{modalSubtitle}</p>
        </div>

        <form onSubmit={handleSubmitProject} className="space-y-6">
          
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. INFORMAÇÕES BÁSICAS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Título do Projeto</label>
                <input
                  value={projectForm.titulo}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, titulo: e.target.value }))}
                  required
                  placeholder="Ex: Análise da qualidade da água..."
                  className="w-full border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-800 focus:border-[#10B981] focus:ring-[#10B981]/20 focus:ring-1 transition"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Área Temática</label>
                <input
                  value={projectForm.area_tematica}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, area_tematica: e.target.value }))}
                  placeholder="Área"
                  className="w-full border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-800 focus:border-[#10B981] focus:ring-[#10B981]/20 focus:ring-1 transition"
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-sm font-medium text-slate-700">Tipo</label>
                <select
                  value={projectForm.tipo}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, tipo: e.target.value }))}
                  className="w-full border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-800 focus:border-[#10B981] focus:ring-[#10B981]/20 focus:ring-1 transition appearance-none"
                >
                  <option value="Projeto Científico">Projeto Científico</option>
                  <option value="Iniciação Tecnológica">Iniciação Tecnológica</option>
                </select>
                <ChevronDown className="absolute right-3 top-10 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>

              <div className="col-span-2 md:col-span-1 space-y-1 relative">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-800 focus:border-[#10B981] focus:ring-[#10B981]/20 focus:ring-1 transition appearance-none"
                >
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Pausado">Pausado</option>
                </select>
                <ChevronDown className="absolute right-3 top-10 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>

            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. DESCRIÇÃO</h3>
            <div className="space-y-1 relative">
              <textarea
                value={projectForm.descricao}
                onChange={handleDescriptionChange}
                placeholder="Descreva os objetivos, metodologia..."
                className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-800 focus:border-[#10B981] focus:ring-[#10B981]/20 focus:ring-1 transition"
                rows={5}
                maxLength={1000}
              />
              <p className="absolute bottom-2 right-4 text-xs text-slate-400 font-mono">{descriptionLength} / 1000</p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. MÍDIA</h3>
            <div className="flex gap-4">
              <div className="flex-1 relative group cursor-pointer border-2 border-dashed border-slate-200 rounded-xl hover:border-[#10B981]/50 transition bg-slate-50 p-6 text-center">
                <UploadCloud className="w-10 h-10 text-slate-300 group-hover:text-[#10B981]/70 mx-auto transition" />
                <p className="text-sm text-slate-500 font-medium mt-2">Arraste até {MAX_PROJECT_IMAGES} fotos ou clique para enviar</p>
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {projectForm.imagens?.length > 0 && (
                <div className="flex gap-2">
                  {projectForm.imagens.map((imgSrc, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden group">
                      <img
                        src={imgSrc}
                        alt={`Preview imagem ${index + 1}`}
                        className="w-full h-full object-cover group-hover:opacity-80 transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {imageUploadMessage && <p className="text-xs text-orange-600 mt-1">{imageUploadMessage}</p>}
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">4. EQUIPE</h3>
            <div className="grid md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="search"
                    value={searchCoorientador}
                    onChange={(e) => setSearchCoorientador(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full border border-slate-200 px-10 py-2 rounded-lg text-sm text-slate-800 focus:border-[#10B981] focus:ring-[#10B981]/20 focus:ring-1 transition"
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
                <div className="space-y-1 max-h-48 overflow-auto pr-1">
                  <h4 className="text-xs font-semibold text-slate-600 mb-1">PROFESSORES CO-MENTORES</h4>

                  {filteredMentorCandidates.length === 0 ? (
                    <p className="text-xs text-slate-500 px-2 py-3">Nenhum co-mentor elegível encontrado para este clube.</p>
                  ) : (
                    filteredMentorCandidates.map((person) => {
                      const checked = projectForm.coorientador_ids.includes(String(person.id));
                      const initials = getPersonInitials(person?.nome);

                      return (
                        <label key={person.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMemberSelection('coorientador_ids', person.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#10B981] focus:ring-[#10B981]"
                          />
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">{initials}</div>
                          <span className="text-sm text-slate-800 font-medium">{person.nome || 'Mentor sem nome'}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-2">
                 <div className="relative">
                  <input
                    type="search"
                    value={searchInvestigador}
                    onChange={(e) => setSearchInvestigador(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full border border-slate-200 px-10 py-2 rounded-lg text-sm text-slate-800 focus:border-[#10B981] focus:ring-[#10B981]/20 focus:ring-1 transition"
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
                 <div className="space-y-1 max-h-48 overflow-auto pr-1">
                  <h4 className="text-xs font-semibold text-slate-600 mb-1">ALUNOS CLUBISTAS</h4>

                  {filteredInvestigadorCandidates.length === 0 ? (
                    <p className="text-xs text-slate-500 px-2 py-3">Nenhum clubista elegível encontrado para este clube.</p>
                  ) : (
                    filteredInvestigadorCandidates.map((person) => {
                      const personId = String(person?.id || '').trim();
                      const checked = projectForm.investigadores_ids.includes(personId);
                      const initials = getPersonInitials(person?.nome);

                      return (
                        <label key={personId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMemberSelection('investigadores_ids', personId)}
                            className="w-4 h-4 rounded border-slate-300 text-[#10B981] focus:ring-[#10B981]"
                          />
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">{initials}</div>
                          <span className="text-sm text-slate-800 font-medium">{person?.nome || 'Clubista sem nome'}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </section>

          {isMentorProfile && !isEditing && (
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">5. TERMO DE ACEITE</h3>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-wide">
                  TERMO DE ACEITE PARA CRIACAO DE PROJETOS NOS CLUBES DE CIENCIAS
                </h4>

                <div className="max-h-64 overflow-y-auto pr-2 space-y-4 text-sm text-slate-700 leading-relaxed">
                  {termoAceiteSections.map((section) => (
                    <div key={section.title} className="space-y-2">
                      <p className="font-bold text-slate-900">{section.title}</p>
                      {(section.paragraphs || []).map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {(section.items || []).length > 0 && (
                        <ul className="list-disc list-inside space-y-1">
                          {section.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {section.footer && <p>{section.footer}</p>}
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(projectForm.termo_aceite_criacao)}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, termo_aceite_criacao: e.target.checked }))}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-[#10B981] focus:ring-[#10B981]"
                  />
                  <span className="text-sm font-semibold text-slate-800">Declaro que li e aceito os termos.</span>
                </label>
              </div>
            </section>
          )}

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="submit"
              disabled={!isEditing && isMentorProfile && !projectForm.termo_aceite_criacao}
              className="px-6 py-2.5 bg-[#10B981] text-white font-bold text-sm rounded-full shadow-lg hover:bg-[#047857] transition flex items-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Salvar Alterações' : 'Criar Projeto'}
              <CheckCircle className="w-5 h-5 transition group-hover:scale-110" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-full hover:bg-slate-50 hover:border-slate-300 transition"
            >
              Cancelar
            </button>
          </div>

          {projectMessage && <p className="text-sm mt-3 text-slate-600 font-medium text-center">{projectMessage}</p>}
        </form>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
}

