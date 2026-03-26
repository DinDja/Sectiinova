import React, { useState, Fragment } from 'react';
import { X, Search, ChevronDown, CheckCircle, UploadCloud } from 'lucide-react';

export default function CreateProjectModal({
  isOpen,
  onClose,
  // Mantendo os mesmos props funcionais para integração
  viewingClub,
  viewingClubOrientadores = [],
  viewingClubCoorientadores = [],
  viewingClubInvestigadores = [],
  handleCreateProject,
  onSuccess
}) {
  // Estado do formulário
  const [projectForm, setProjectForm] = useState({
    titulo: '',
    descricao: '',
    area_tematica: '', // Campo opcional baseado na imagem
    status: 'Em andamento', // Padrão
    tipo: 'Projeto Científico', // Padrão
    coorientador_ids: [],
    investigadores_ids: [],
    imagens: [] // Lista de URLs base64 para preview
  });

  // Estados de feedback e UI
  const [projectMessage, setProjectMessage] = useState('');
  const [imageUploadMessage, setImageUploadMessage] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [descriptionLength, setDescriptionLength] = useState(0);

  // Estados de busca (simulados para a UI)
  const [searchCoorientador, setSearchCoorientador] = useState('');
  const [searchInvestigador, setSearchInvestigador] = useState('');

  // Mantendo a lógica de compressão de imagens original
  const compressImageFiles = async (files) => {
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

    const selectedFiles = Array.from(files).slice(0, 2);
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
      setProjectForm((prev) => ({ ...prev, imagens: [] }));
      setImageUploadMessage('');
      return;
    }

    if (files.length > 2) {
      setImageUploadMessage('Você pode adicionar até 2 imagens.');
    } else {
      setImageUploadMessage('');
    }

    const compressedImages = await compressImageFiles(files);
    setProjectForm((prev) => ({ ...prev, imagens: compressedImages }));
  };

  // Função para remover uma imagem específica
  const handleRemoveImage = (indexToRemove) => {
    setProjectForm(prev => ({
      ...prev,
      imagens: prev.imagens.filter((_, index) => index !== indexToRemove)
    }));
    // Resetar o input para permitir re-upload do mesmo arquivo
    if (projectForm.imagens.length === 1) {
      setFileInputKey(Date.now());
    }
  }

  // Atualizar contagem de caracteres na descrição
  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    if (value.length <= 1000) {
      setProjectForm((prev) => ({ ...prev, descricao: value }));
      setDescriptionLength(value.length);
    }
  }

  // Mantendo a lógica de seleção de membros original
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

  const handleSubmitProject = async (e) => {
    e.preventDefault();

    if (!handleCreateProject) {
      setProjectMessage('Função de criação não disponível.');
      return;
    }

    try {
      await handleCreateProject(projectForm);
      setProjectMessage('Projeto criado com sucesso!');
      // Limpar formulário
      setProjectForm({
        titulo: '',
        descricao: '',
        area_tematica: '',
        status: 'Em andamento',
        tipo: 'Projeto Científico',
        coorientador_ids: [],
        investigadores_ids: [],
        imagens: []
      });
      setImageUploadMessage('');
      setFileInputKey(Date.now());
      setDescriptionLength(0);
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      onClose(); // Fechar o modal após sucesso
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      setProjectMessage('Erro ao criar projeto. Verifique os dados e tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header do Modal */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-[#0E0F0F] tracking-tight">Criar Novo Projeto</h2>
          <p className="text-base text-slate-500 mt-1">Preencha os detalhes para registrar seu projeto</p>
        </div>

        <form onSubmit={handleSubmitProject} className="space-y-6">
          
          {/* 1. INFORMAÇÕES BÁSICAS */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. INFORMAÇÕES BÁSICAS</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Título */}
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Título do Projeto</label>
                <input
                  value={projectForm.titulo}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, titulo: e.target.value }))}
                  required
                  placeholder="Ex: Análise da qualidade da água..."
                  className="w-full border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-800 focus:border-[#00B5B5] focus:ring-[#00B5B5]/20 focus:ring-1 transition"
                />
              </div>
              
              {/* Área Temática (Simplificado na imagem) */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Área Temática</label>
                <input
                  value={projectForm.area_tematica}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, area_tematica: e.target.value }))}
                  placeholder="Área"
                  className="w-full border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-800 focus:border-[#00B5B5] focus:ring-[#00B5B5]/20 focus:ring-1 transition"
                />
              </div>

              {/* Tipo (Dropdown) */}
              <div className="space-y-1 relative">
                <label className="text-sm font-medium text-slate-700">Tipo</label>
                <select
                  value={projectForm.tipo}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, tipo: e.target.value }))}
                  className="w-full border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-800 focus:border-[#00B5B5] focus:ring-[#00B5B5]/20 focus:ring-1 transition appearance-none"
                >
                  <option value="Projeto Científico">Projeto Científico</option>
                  <option value="Iniciação Tecnológica">Iniciação Tecnológica</option>
                  {/* Adicionar mais opções */}
                </select>
                <ChevronDown className="absolute right-3 top-10 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>

              {/* Status (Dropdown - na mesma linha do Tipo) */}
              <div className="col-span-2 md:col-span-1 space-y-1 relative">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-800 focus:border-[#00B5B5] focus:ring-[#00B5B5]/20 focus:ring-1 transition appearance-none"
                >
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Pausado">Pausado</option>
                </select>
                <ChevronDown className="absolute right-3 top-10 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>

            </div>
          </section>

          {/* 2. DESCRIÇÃO */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. DESCRIÇÃO</h3>
            <div className="space-y-1 relative">
              <textarea
                value={projectForm.descricao}
                onChange={handleDescriptionChange}
                placeholder="Descreva os objetivos, metodologia..."
                className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-800 focus:border-[#00B5B5] focus:ring-[#00B5B5]/20 focus:ring-1 transition"
                rows={5}
                maxLength={1000}
              />
              <p className="absolute bottom-2 right-4 text-xs text-slate-400 font-mono">{descriptionLength} / 1000</p>
            </div>
          </section>

          {/* 3. MÍDIA */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. MÍDIA</h3>
            <div className="flex gap-4">
              {/* Área de Upload (Inspirado na UI da nuvem) */}
              <div className="flex-1 relative group cursor-pointer border-2 border-dashed border-slate-200 rounded-xl hover:border-[#00B5B5]/50 transition bg-slate-50 p-6 text-center">
                <UploadCloud className="w-10 h-10 text-slate-300 group-hover:text-[#00B5B5]/70 mx-auto transition" />
                <p className="text-sm text-slate-500 font-medium mt-2">Arraste até 2 fotos ou clique para enviar</p>
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Área de Preview (Adaptando o preview original) */}
              {projectForm.imagens?.length > 0 && (
                <div className="flex gap-2">
                  {projectForm.imagens.map((imgSrc, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden group">
                      <img
                        src={imgSrc}
                        alt={`Preview imagem ${index + 1}`}
                        className="w-full h-full object-cover group-hover:opacity-80 transition"
                      />
                      {/* Botão X para remover (Novo) */}
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

          {/* 4. EQUIPE */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">4. EQUIPE</h3>
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Professores */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="search"
                    value={searchCoorientador}
                    onChange={(e) => setSearchCoorientador(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full border border-slate-200 px-10 py-2 rounded-lg text-sm text-slate-800 focus:border-[#00B5B5] focus:ring-[#00B5B5]/20 focus:ring-1 transition"
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
                <div className="space-y-1 max-h-48 overflow-auto pr-1">
                  <h4 className="text-xs font-semibold text-slate-600 mb-1">PROFESSORES COORIENTADORES</h4>
                  
                  {/* EXEMPLOS VISUAIS DA IMAGEM (Substituir pela lógica real) */}
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={projectForm.coorientador_ids.includes("ana_souza_id")}
                        onChange={() => toggleMemberSelection('coorientador_ids', 'ana_souza_id')}
                        className="w-4 h-4 rounded border-slate-300 text-[#00B5B5] focus:ring-[#00B5B5]"
                     />
                     <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-xs">AS</div>
                     <span className="text-sm text-slate-800 font-medium">Ana Souza</span>
                  </label>
                   <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={projectForm.coorientador_ids.includes("carlos_lima_id")}
                        onChange={() => toggleMemberSelection('coorientador_ids', 'carlos_lima_id')}
                        className="w-4 h-4 rounded border-slate-300 text-[#00B5B5] focus:ring-[#00B5B5]"
                     />
                     <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">CL</div>
                     <span className="text-sm text-slate-800 font-medium">Carlos Lima</span>
                  </label>

                  {/* LÓGICA ORIGINAL (Integrada) */}
                  {[...new Map(
                    [...viewingClubCoorientadores, ...viewingClubOrientadores]
                      .map((person) => [String(person.id), person])
                  ).values()].map((person) => {
                    // Filtrar exemplos visuais acima
                    if (['ana_souza_id', 'carlos_lima_id'].includes(String(person.id))) return null;

                    const checked = projectForm.coorientador_ids.includes(String(person.id));
                    // Gerar iniciais para o avatar
                    const initials = person.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                      <label key={person.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMemberSelection('coorientador_ids', person.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#00B5B5] focus:ring-[#00B5B5]"
                        />
                        {/* Avatar dinâmico */}
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">{initials}</div>
                        <span className="text-sm text-slate-800 font-medium">{person.nome}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Alunos */}
              <div className="space-y-2">
                 <div className="relative">
                  <input
                    type="search"
                    value={searchInvestigador}
                    onChange={(e) => setSearchInvestigador(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full border border-slate-200 px-10 py-2 rounded-lg text-sm text-slate-800 focus:border-[#00B5B5] focus:ring-[#00B5B5]/20 focus:ring-1 transition"
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
                 <div className="space-y-1 max-h-48 overflow-auto pr-1">
                  <h4 className="text-xs font-semibold text-slate-600 mb-1">ALUNOS INVESTIGADORES</h4>
                  
                  {/* EXEMPLOS VISUAIS DA IMAGEM (Substituir pela lógica real) */}
                   <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={projectForm.investigadores_ids.includes("bruno_silva_id")}
                        onChange={() => toggleMemberSelection('investigadores_ids', 'bruno_silva_id')}
                        className="w-4 h-4 rounded border-slate-300 text-[#00B5B5] focus:ring-[#00B5B5]"
                     />
                     <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">BS</div>
                     <span className="text-sm text-slate-800 font-medium">Bruno Silva</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={projectForm.investigadores_ids.includes("marina_dias_id")}
                        onChange={() => toggleMemberSelection('investigadores_ids', 'marina_dias_id')}
                        className="w-4 h-4 rounded border-slate-300 text-[#00B5B5] focus:ring-[#00B5B5]"
                     />
                     <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xs">MD</div>
                     <span className="text-sm text-slate-800 font-medium">Marina Dias</span>
                  </label>

                  {/* LÓGICA ORIGINAL (Integrada) */}
                  {viewingClubInvestigadores.map((person) => {
                     // Filtrar exemplos visuais acima
                     if (['bruno_silva_id', 'marina_dias_id'].includes(String(person.id))) return null;

                    const checked = projectForm.investigadores_ids.includes(String(person.id));
                    const initials = person.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                      <label key={person.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMemberSelection('investigadores_ids', person.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#00B5B5] focus:ring-[#00B5B5]"
                        />
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">{initials}</div>
                        <span className="text-sm text-slate-800 font-medium">{person.nome}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>
          </section>

          {/* Rodapé e Botões de Ação */}
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
             <button
              type="submit"
              className="px-6 py-2.5 bg-[#00B5B5] text-white font-bold text-sm rounded-full shadow-lg hover:bg-[#009191] transition flex items-center gap-2 group"
            >
              Criar Projeto
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

        {/* Botão X para fechar o modal (Novo) */}
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