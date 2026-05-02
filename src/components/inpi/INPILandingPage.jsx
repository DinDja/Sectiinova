import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Search,
  Landmark,
  FileText,
  Shield,
  MapPin,
  Mail,
  ExternalLink,
  Menu,
  X,
  Bot,
  Download,
  FolderArchive,
  ChevronRight,
  DatabaseZap,
  Quote,
  Key,
  AlertTriangle,
  Fingerprint, 
  Lock 
} from 'lucide-react';

export default function INPILandingPage({ onEnterModule }) {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const handleEnterModule = () => {
    if (typeof onEnterModule === 'function') {
      onEnterModule();
    }
    setIsMobileMenuOpen(false);
  };

  const icts = [
    'UFBA',
    'SENAI CIMATEC',
    'UNEB',
    'UESC',
    'UESB',
    'UEFS',
    'IFBA',
    'IFBAIANO',
    'FIOCRUZ',
    'SEBRAE',
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F0] text-[#111111] font-sans selection:bg-[#E30059] selection:text-[#F4F4F0] overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-50 flex h-1.5 w-full">
        <div className="flex-1 bg-[#F2A900]" />
        <div className="flex-1 bg-[#E30059]" />
        <div className="flex-1 bg-[#009CA6]" />
        <div className="flex-1 bg-[#84BD00]" />
        <div className="flex-1 bg-[#E30613]" />
      </div>

      <div className="relative z-50 bg-[#111111] text-[#F4F4F0] text-[10px] py-2.5 px-6 uppercase tracking-[0.1em] font-medium font-mono hidden sm:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <Landmark size={12} className="text-[#009CA6]" />
            <span>
              Gov. Bahia <span className="opacity-30 mx-1">/</span> Secretaria da
              Ciência, Tecnologia e Inovação
            </span>
          </div>
          <div className="flex gap-6 opacity-70">
            <a href="#" className="hover:text-[#F2A900] hover:opacity-100 transition-colors">
              Transparência
            </a>
            <a
              href="#"
              className="hover:text-[#F2A900] hover:opacity-100 transition-colors flex items-center gap-1"
            >
              Portal Oficial <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      <nav className="relative z-50 border-b-2 border-[#111111] bg-[#F4F4F0] sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 cursor-pointer relative group z-50">
            <div className="hidden sm:block absolute -left-4 -top-2 w-2 h-2 border-l border-t border-[#111111] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="hidden sm:block absolute -right-4 -bottom-2 w-2 h-2 border-r border-b border-[#111111] opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-[#111111] bg-white p-1.5 flex items-center justify-center">
              <img
                src="/iconesSidebar/patenteslab.svg"
                alt="Logo PatentesLab"
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>

            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#111111] leading-none">
                patentesLab<span className="text-[#E30613]">.</span>
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-10 text-sm font-bold text-[#111111] tracking-tight uppercase">
            <a
              href="#fluxo"
              className="hover:text-[#009CA6] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#009CA6] hover:after:w-full after:transition-all"
            >
              O Fluxo
            </a>
            <a
              href="#gerador"
              className="hover:text-[#009CA6] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#009CA6] hover:after:w-full after:transition-all"
            >
              Gerador DOCX
            </a>
            <a
              href="#monitoramento"
              className="hover:text-[#009CA6] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#009CA6] hover:after:w-full after:transition-all"
            >
              Rastreador 24/7
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <img
              src="/images/Secti_Vertical.png"
              alt="Logo da Secretaria da Ciência, Tecnologia e Inovação"
              className="h-12 w-auto object-contain"
              loading="eager"
            />
            <button
              type="button"
              onClick={handleEnterModule}
              className="bg-[#111111] hover:bg-[#F2A900] hover:text-[#111111] text-[#F4F4F0] px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-3"
            >
              Acesso ao Sistema
            </button>
          </div>

          <button
            type="button"
            className="lg:hidden p-2 text-[#111111] z-50"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Alternar menu"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <div
          className={`fixed inset-0 bg-[#F4F4F0] z-40 transition-transform duration-500 ease-in-out lg:hidden ${
            isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 text-center">
            <a
              href="#fluxo"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-3xl font-black uppercase tracking-tight text-[#111111] hover:text-[#E30059]"
            >
              O Fluxo
            </a>
            <a
              href="#gerador"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-3xl font-black uppercase tracking-tight text-[#111111] hover:text-[#E30059]"
            >
              Gerador DOCX
            </a>
            <a
              href="#monitoramento"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-3xl font-black uppercase tracking-tight text-[#111111] hover:text-[#E30059]"
            >
              Rastreador 24/7
            </a>

            <div className="w-full h-0.5 bg-[#111111]/10 my-4" />

            <img
              src="/images/Secti_Vertical.png"
              alt="Logo da Secretaria da Ciência, Tecnologia e Inovação"
              className="h-20 w-auto object-contain"
              loading="eager"
            />

            <button
              type="button"
              onClick={handleEnterModule}
              className="w-full bg-[#111111] text-[#F4F4F0] px-6 py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
            >
              <img
                src="https://logodownload.org/wp-content/uploads/2019/12/gov-br-logo-1.png"
                alt="gov.br"
                className="h-4 brightness-0 invert"
              />
              Acesso ao Sistema
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="relative pt-12 pb-16 lg:pt-24 lg:pb-32 border-b-2 border-[#111111] overflow-hidden max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center lg:items-stretch">
            <div
              className={`lg:col-span-7 flex flex-col justify-center space-y-6 lg:space-y-10 transition-all duration-1000 ${
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="w-8 sm:w-12 h-0.5 bg-[#111111]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-mono bg-[#F2A900] px-2 py-1">
                  Ambiente Integrado
                </span>
              </div>

              <h1 className="text-[3.25rem] sm:text-[4.5rem] lg:text-[4.8rem] font-black tracking-[-0.04em] lg:tracking-[-0.05em] leading-[0.95] lg:leading-[0.9] text-[#111111] uppercase break-words">
                A burocracia
                <br />
                <span className="text-[#E30059] italic font-serif lowercase tracking-normal text-[3.75rem] sm:text-[5rem] lg:text-[5.5rem]">
                  automatizada.
                </span>
                <br />
              </h1>

              <p className="text-lg sm:text-xl text-[#111111]/80 max-w-lg leading-relaxed font-medium">
                Módulo completo para orientar o depósito no INPI. Crie
                relatórios, faça buscas de anterioridade, exporte em ZIP e deixe
                nosso robô rastrear seus despachos a cada 30 minutos.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 pt-2 lg:pt-4 max-w-xl">
                <input
                  type="text"
                  placeholder="Número do Processo INPI..."
                  className="flex-1 bg-white border-2 border-[#111111] sm:border-r-0 px-4 sm:px-6 py-4 text-[#111111] font-mono text-sm placeholder-[#111111]/40 focus:outline-none focus:bg-[#009CA6]/10 transition-colors"
                />
                <button
                  type="button"
                  className="bg-[#111111] text-[#F4F4F0] px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-[#009CA6] transition-colors flex items-center justify-center gap-2 border-2 border-[#111111] sm:border-l-0"
                >
                  <Search size={16} />
                  Consultar Base
                </button>
              </div>
            </div>

            <div
              className={`lg:col-span-5 relative transition-all duration-1000 delay-300 ${
                mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
              } mt-8 lg:mt-0`}
            >
              <div className="w-full h-full min-h-[400px] lg:min-h-[500px] bg-white border-2 border-[#111111] p-6 sm:p-8 relative shadow-[8px_8px_0px_#111111] lg:shadow-[16px_16px_0px_#111111] flex flex-col">
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-3 h-3 border-l-2 border-t-2 border-[#111111]" />
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-3 h-3 border-r-2 border-t-2 border-[#111111]" />
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-3 h-3 border-l-2 border-b-2 border-[#111111]" />
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-3 h-3 border-r-2 border-b-2 border-[#111111]" />

                <div className="flex justify-between items-start border-b-2 border-[#111111] pb-4 sm:pb-6 mb-4 sm:mb-6">
                  <div>
                    <h3 className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 text-[#009CA6]">
                      Gerador de Dossiê
                    </h3>
                    <h4 className="font-black text-xl sm:text-2xl uppercase tracking-tight">
                      Quadro Reivindicatório
                    </h4>
                  </div>
                  <Shield
                    size={28}
                    className="text-[#111111] hidden sm:block"
                    strokeWidth={1.5}
                  />
                </div>

                <div className="space-y-4 flex-1">
                  <div className="overflow-hidden w-full">
                    <p className="font-mono text-xs sm:text-sm text-[#111111]/80 leading-relaxed border-r-2 border-[#111111] animate-[typing_4s_steps(40,end)_infinite,blink-caret_.75s_step-end_infinite] whitespace-nowrap overflow-hidden">
                      1. Um dispositivo semicondutor...
                    </p>
                  </div>
                  <div className="w-full h-2 bg-[#F2A900] mt-4" />
                  <div className="w-3/4 h-2 bg-[#111111]/10" />

                  <div className="w-full h-24 sm:h-32 border-2 border-dashed border-[#111111]/20 mt-6 flex items-center justify-center relative overflow-hidden bg-slate-50">
                    <span className="font-mono text-[10px] sm:text-xs text-[#111111]/40 uppercase tracking-widest">
                      Estruturação validada por IA
                    </span>
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-[#009CA6]/50 animate-[scan-vertical_3s_ease-in-out_infinite]" />
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-24 h-24 sm:w-32 sm:h-32 border-4 border-[#E30613] text-[#E30613] rounded-full flex items-center justify-center transform -rotate-12 animate-[stamp_4s_ease-in_infinite] mix-blend-multiply opacity-90 bg-white/50 backdrop-blur-sm">
                  <div className="text-center">
                    <span className="block font-black text-lg sm:text-xl uppercase tracking-tighter">
                      Viável
                    </span>
                    <span className="block font-mono text-[6px] sm:text-[8px] uppercase tracking-widest border-t-2 border-[#E30613] mt-1 pt-1">
                      SECTI/BA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-4 sm:py-6 border-b-2 border-[#111111] bg-[#F2A900] text-[#111111] overflow-hidden">
          <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite]">
            {[...icts, ...icts, ...icts, ...icts].map((ict, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 sm:gap-6 mx-4 sm:mx-6 text-xs sm:text-sm font-mono font-bold uppercase tracking-widest"
              >
                <span>{ict}</span>
                <span className="text-[#E30059] font-black">+++</span>
              </div>
            ))}
          </div>
        </section>

        <section id="fluxo" className="py-16 lg:py-32 max-w-7xl mx-auto px-4 sm:px-6 border-b-2 border-[#111111]">
          <div className="mb-12 lg:mb-20 max-w-3xl">
            <h2 className="text-4xl lg:text-5xl font-black text-[#111111] uppercase tracking-tighter leading-[1]">
              A Jornada do Inventor
            </h2>
            <p className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#009CA6] mt-4 font-bold border-l-4 border-[#009CA6] pl-4">
              Fluxo guiado em 6 abas lógicas
            </p>
            <p className="font-serif text-lg text-[#111111]/70 mt-6 leading-relaxed">
              O sistema não apenas gera arquivos. Ele guia o usuário passo a passo
              com didática, salvando o progresso e destravando a
              complexidade do INPI.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-0 border-2 border-[#111111] bg-[#111111] p-[2px]">
            {[
              {
                id: '01',
                name: 'Comece Aqui',
                desc: 'Tutorial de integração, links oficiais e visão geral da plataforma.',
                color: 'hover:bg-[#F2A900]',
              },
              {
                id: '02',
                name: 'Guia Técnico',
                desc: 'Passo a passo didático de depósito, prazos vitais e boas práticas legais.',
                color: 'hover:bg-[#E30059]',
                textHover: 'hover:text-white',
              },
              {
                id: '03',
                name: 'Documentos',
                desc: 'Explicações de cada peça obrigatória: relatório, resumo, desenhos e reivindicações.',
                color: 'hover:bg-[#009CA6]',
              },
              {
                id: '04',
                name: 'Gerador',
                desc: 'Criação guiada, validação em tempo real e exportação direta do dossiê.',
                color: 'hover:bg-[#84BD00]',
              },
              {
                id: '05',
                name: 'Assinatura Digital',
                desc: 'Integração e orientações para assinar digitalmente seu pacote de arquivos.',
                color: 'hover:bg-[#E30613]',
                textHover: 'hover:text-white',
              },
              {
                id: '06',
                name: 'Acompanhamento',
                desc: 'Monitoramento autônomo, histórico de despachos RPI e gestão de alertas.',
                color: 'hover:bg-[#111111]',
                textHover: 'hover:text-[#F4F4F0]',
                bg: 'bg-white',
              },
            ].map((aba, i) => (
              <div
                key={i}
                className={`bg-[#F4F4F0] p-6 sm:p-8 ${aba.color} ${aba.textHover || 'hover:text-[#111111]'} transition-colors duration-300 group border-b-2 lg:border-b-0 border-[#111111] ${
                  i !== 2 && i !== 5 ? 'lg:border-r-2' : ''
                } ${i % 2 === 0 ? 'border-r-2 md:border-r-0' : ''}`}
              >
                <span className="font-mono text-2xl sm:text-3xl font-black text-[#111111]/20 group-hover:text-current/40 block mb-4 sm:mb-6">
                  {aba.id}
                </span>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-3">
                  {aba.name}
                </h3>
                <p className="font-serif text-[#111111]/70 group-hover:text-current/90 leading-relaxed text-sm sm:text-base">
                  {aba.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="gerador" className="py-16 lg:py-32 bg-[#111111] text-[#F4F4F0] border-b-2 border-[#111111]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1 relative p-6 sm:p-10 border-2 border-[#F4F4F0]/20 bg-[#1a1a1a] shadow-[8px_8px_0px_#F2A900]">
                <div className="absolute -top-4 -right-4 bg-[#F2A900] text-[#111111] px-4 py-2 font-black font-mono text-xs uppercase">
                  Exportação
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-6 border-b border-[#F4F4F0]/10">
                    <FolderArchive size={40} className="text-[#009CA6]" />
                    <div>
                      <h4 className="font-black text-xl uppercase tracking-tight">
                        Pacote INPI Final
                      </h4>
                      <p className="font-mono text-xs text-[#F4F4F0]/50 mt-1">
                        Status: Validado e salvo
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-3 font-mono text-sm">
                    <li className="flex justify-between items-center bg-black/40 p-3">
                      <span className="flex items-center gap-2">
                        <FileText size={16} className="text-[#E30059]" />
                        relatorio_descritivo.docx
                      </span>
                      <span className="text-[#84BD00] uppercase text-[10px] font-bold">
                        OK
                      </span>
                    </li>
                    <li className="flex justify-between items-center bg-black/40 p-3">
                      <span className="flex items-center gap-2">
                        <FileText size={16} className="text-[#E30059]" />
                        quadro_reivindicacoes.docx
                      </span>
                      <span className="text-[#84BD00] uppercase text-[10px] font-bold">
                        OK
                      </span>
                    </li>
                    <li className="flex justify-between items-center bg-black/40 p-3">
                      <span className="flex items-center gap-2">
                        <FileText size={16} className="text-[#E30059]" />
                        resumo.docx
                      </span>
                      <span className="text-[#84BD00] uppercase text-[10px] font-bold">
                        OK
                      </span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    className="w-full bg-[#009CA6] text-[#111111] font-black uppercase tracking-widest py-4 mt-4 flex justify-center items-center gap-2 hover:bg-[#F4F4F0] transition-colors"
                  >
                    <Download size={18} /> Baixar ZIP
                  </button>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <Quote size={40} className="text-[#009CA6] mb-6" />
                <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none mb-6">
                  Menos redigitação.
                  <br />
                  Mais inteligência.
                </h2>
                <p className="font-serif text-lg sm:text-xl text-[#F4F4F0]/70 mb-6">
                  O Gerador de Documentos INPI possui validações rigorosas de
                  formato e conteúdo. Ele não te deixa esquecer campos
                  obrigatórios.
                </p>
                <ul className="space-y-4 font-mono text-xs sm:text-sm text-[#F4F4F0]/60 uppercase tracking-widest">
                  <li className="flex items-center gap-3">
                    <ChevronRight className="text-[#E30059]" size={16} />
                    Documentos salvos no seu perfil.
                  </li>
                  <li className="flex items-center gap-3">
                    <ChevronRight className="text-[#E30059]" size={16} />
                    Explicações didáticas campo a campo.
                  </li>
                  <li className="flex items-center gap-3">
                    <ChevronRight className="text-[#E30059]" size={16} />
                    Exportação pronta (DOCX ou ZIP).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="monitoramento" className="py-16 lg:py-32 bg-[#F4F4F0] border-b-2 border-[#111111]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                {/* <span className="text-[#E30613] font-black tracking-[0.2em] uppercase text-[11px] mb-4 block">
                  Netlify Cron Jobs
                </span> */}
                <h2 className="text-4xl lg:text-5xl font-black text-[#111111] uppercase tracking-tighter leading-none mb-6">
                  Varredura Ativa.
                  <br /> A cada 30 minutos.
                </h2>
                <p className="font-serif text-lg sm:text-xl text-[#111111]/80 mb-6">
                  Não perca prazos. Nosso motor realiza uma varredura automática
                  (Cron) nas bases da Revista da Propriedade Industrial (RPI) para
                  detectar despachos.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="border-2 border-[#111111] p-4 bg-white">
                    <DatabaseZap size={24} className="text-[#84BD00] mb-2" />
                    <h4 className="font-black uppercase text-sm mb-1">
                      Múltiplas Bases
                    </h4>
                    <p className="font-mono text-[10px] text-[#111111]/60">
                      Patentes, Marcas e Programas.
                    </p>
                  </div>
                  <div className="border-2 border-[#111111] p-4 bg-white">
                    <Shield size={24} className="text-[#F2A900] mb-2" />
                    <h4 className="font-black uppercase text-sm mb-1">
                      Acesso Restrito
                    </h4>
                    <p className="font-mono text-[10px] text-[#111111]/60">
                      Tratamento para processos sigilosos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative border-2 border-[#111111] bg-[#111111] shadow-[8px_8px_0px_#E30613] p-4 sm:p-6 overflow-hidden">
                <div className="flex gap-2 mb-4 border-b border-white/20 pb-4">
                  <div className="w-3 h-3 rounded-full bg-[#E30613]" />
                  <div className="w-3 h-3 rounded-full bg-[#F2A900]" />
                  <div className="w-3 h-3 rounded-full bg-[#84BD00]" />
                </div>
                <div className="font-mono text-xs sm:text-sm text-[#84BD00] space-y-2 h-[250px] overflow-hidden relative">
                  <p className="opacity-50">~ system/cron/inpi-watch.js rodando...</p>
                  <p className="text-white">
                    [{new Date().toLocaleTimeString()}] Iniciando varredura manual /
                    automática.
                  </p>
                  <p>+ Conectando inpiProcessProxy.js</p>
                  <p>+ Buscando RPI: Processo BR 10 2026...</p>
                  <p className="text-[#F2A900]">
                    ! Aviso: Processo em sigilo (Acesso Restrito).
                  </p>
                  <p>+ Autenticando token do usuário.</p>
                  <p className="text-cyan-400">
                    {'>'} Novo Despacho 3.1 (Publicação do Pedido) detectado!
                  </p>
                  <p>+ inpiTrackerPreferencesService: Salvando histórico.</p>
                  <p>+ Disparando alerta para o painel do usuário.</p>
                  <p className="opacity-50 animate-pulse mt-4">
                    _aguardando próximo ciclo de 30 min...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

 <section className="py-16 lg:py-32 bg-[#111111] text-[#F4F4F0] border-b-2 border-[#111111] relative overflow-hidden">
          {/* Background Grid Escuro */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#F4F4F00a_1px,transparent_1px),linear-gradient(to_bottom,#F4F4F00a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              
              <div>
                <h2 className="flex text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-[1] mb-6">
                  Cofre Digital.<br/>Sigilo Absoluto.
                </h2>
                <p className="font-serif text-lg sm:text-xl text-[#F4F4F0]/70 mb-8 leading-relaxed">
                  Ideias são valiosas. Até a data oficial de publicação (Art. 30 LPI), sua invenção deve permanecer em segredo absoluto. Garantimos isso em cada byte.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-[#E30613] p-2 border-2 border-[#F4F4F0]">
                      <AlertTriangle size={20} className="text-[#F4F4F0]" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-lg">Contorno de Acesso Restrito</h4>
                      <p className="font-mono text-xs text-[#F4F4F0]/60 mt-1">Motor preparado para lidar com processos na janela de 18 meses de sigilo no INPI.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Padlock Illustration Abstract */}
              <div className="relative p-8 border-2 border-[#F4F4F0]/20 bg-[#1a1a1a] shadow-[12px_12px_0px_#E30613] aspect-square flex flex-col items-center justify-center text-center">
                <div className="absolute top-4 left-4 w-3 h-3 bg-[#E30613] animate-pulse"></div>
                <div className="w-32 h-40 border-8 border-[#E30613] rounded-t-full mb-[-20px] relative z-0"></div>
                <div className="w-full bg-[#111111] border-4 border-[#F4F4F0] p-6 relative z-10 flex flex-col items-center max-w-[250px]">
                  <Fingerprint size={48} className="text-[#F4F4F0] mb-4 opacity-50" />
                  <span className="font-mono text-sm font-black text-[#F4F4F0] uppercase tracking-widest">Base de Dados<br/>Criptografada</span>
                </div>
              </div>

            </div>
          </div>
        </section>

     <section className="py-16 lg:py-32 bg-[#E30059] text-[#F4F4F0] border-b-2 border-[#111111]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <div className="w-20 h-20 bg-[#111111] border-2 border-[#F4F4F0] flex items-center justify-center mx-auto mb-8 shadow-[8px_8px_0px_#F4F4F0]">
              <Bot size={40} className="text-[#F4F4F0]" />
            </div>
            <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-8">
              Assistente Autônomo & <br/> Checklist Dinâmico
            </h2>
            <p className="font-serif text-lg sm:text-2xl text-[#F4F4F0] max-w-3xl mx-auto mb-12 leading-relaxed">
              Não sabe como fazer uma Pesquisa de Anterioridade? Nosso modal te ensina. O Checklist de tarefas lateral garante que você marque cada etapa cumprida.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4 sm:gap-6 font-mono text-sm font-black uppercase tracking-widest text-[#111111]">
              <span className="bg-[#F4F4F0] px-8 py-4 shadow-[4px_4px_0px_#111111] border-2 border-[#111111] hover:bg-[#F2A900] transition-colors cursor-default">Anterioridade</span>
              <span className="bg-[#F4F4F0] px-8 py-4 shadow-[4px_4px_0px_#111111] border-2 border-[#111111] hover:bg-[#009CA6] transition-colors cursor-default">Checklist Persistente</span>
              <span className="bg-[#111111] text-[#F4F4F0] px-8 py-4 shadow-[4px_4px_0px_#F4F4F0] border-2 border-[#111111] hover:bg-transparent hover:border-[#F4F4F0] transition-colors cursor-default">Tira-Dúvidas IA</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#111111] text-[#F4F4F0] pt-16 lg:pt-24 pb-8 lg:pb-12 border-t-2 border-[#111111]">
        <div className="flex h-2 w-full mb-16 lg:mb-24">
          <div className="flex-1 bg-[#F2A900]" />
          <div className="flex-1 bg-[#E30059]" />
          <div className="flex-1 bg-[#009CA6]" />
          <div className="flex-1 bg-[#84BD00]" />
          <div className="flex-1 bg-[#E30613]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-16 mb-16 lg:mb-20 border-b border-[#F4F4F0]/20 pb-12 lg:pb-16">
            <div className="sm:col-span-2 lg:col-span-6">
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-4 sm:mb-6">
                patentesLab.
              </h2>
              <p className="font-serif text-lg sm:text-xl text-[#F4F4F0]/60 max-w-md mb-6 sm:mb-8">
                Plataforma oficial de estruturação e rastreio processual INPI.
                <br /> Secretaria da Ciência, Tecnologia e Inovação.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleEnterModule}
                  className="border-2 border-[#009CA6] text-[#009CA6] px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#009CA6] hover:text-[#111111] transition-colors"
                >
                  Acessar Plataforma
                </button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <h4 className="font-mono text-xs text-[#F2A900] font-bold uppercase tracking-widest mb-4 sm:mb-6">
                Ecossistema
              </h4>
              <ul className="space-y-4 font-bold uppercase tracking-tight text-sm">
                <li>
                  <a
                    href="#"
                    className="hover:text-[#F2A900] transition-colors flex justify-between border-b border-[#F4F4F0]/10 pb-2"
                  >
                    <span>Portal Gov.ba</span> <ArrowRight size={14} />
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#F2A900] transition-colors flex justify-between border-b border-[#F4F4F0]/10 pb-2"
                  >
                    <span>Tutoriais Internos</span> <ArrowRight size={14} />
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#F2A900] transition-colors flex justify-between border-b border-[#F4F4F0]/10 pb-2"
                  >
                    <span>Painel INPI</span> <ArrowRight size={14} />
                  </a>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h4 className="font-mono text-xs text-[#009CA6] font-bold uppercase tracking-widest mb-4 sm:mb-6">
                Suporte
              </h4>
              <ul className="space-y-4 font-serif text-[#F4F4F0]/70 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="shrink-0 mt-1 text-[#009CA6]" />
                  <span>
                    5ª Avenida, nº 250, CAB
                    <br />
                    Salvador - BA, 41745-004
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="shrink-0 text-[#009CA6]" />
                  <a
                    href="mailto:suporte@secti.ba.gov.br"
                    className="hover:text-[#009CA6] transition-colors border-b border-transparent hover:border-[#009CA6]"
                  >
                    suporte@secti.ba.gov.br
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 font-mono text-[10px] uppercase tracking-widest text-[#F4F4F0]/40 text-center md:text-left">
            <p>
              &copy; {new Date().getFullYear()} Gov. Bahia. O código reflete as
              normativas vigentes do INPI.
            </p>
            <div className="flex gap-4 sm:gap-6">
              <a href="#" className="hover:text-[#F4F4F0] transition-colors">
                LGPD
              </a>
              <a href="#" className="hover:text-[#F4F4F0] transition-colors">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes scan-vertical {
            0%, 100% { top: 0; opacity: 0; }
            10%, 90% { opacity: 1; }
            50% { top: 100%; }
          }
          @keyframes typing {
            from { max-width: 0 }
            to { max-width: 100% }
          }
          @keyframes blink-caret {
            from, to { border-color: transparent }
            50% { border-color: #111111 }
          }
          @keyframes stamp {
            0% { transform: scale(1.5) rotate(-12deg); opacity: 0; }
            10% { transform: scale(1) rotate(-12deg); opacity: 0.9; }
            90% { transform: scale(1) rotate(-12deg); opacity: 0.9; }
            100% { transform: scale(0.9) rotate(-12deg); opacity: 0; }
          }
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          html { scroll-behavior: smooth; }
        `,
        }}
      />
    </div>
  );
}