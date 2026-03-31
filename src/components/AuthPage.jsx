import React, { useState, useEffect } from "react";
import {
  Microscope,
  User,
  Mail,
  Lock,
  School,
  ExternalLink,
  ArrowRight,
  LoaderCircle,
  Beaker,
  Sparkles,
  Users,
  Award,
  Lightbulb,
  Rocket,
  AtomIcon,
  BookOpen,
  FlaskConical,
  Target,
  Star,
  Quote,
  GraduationCap,
  Brain,
  Globe,
  Chrome,
} from "lucide-react";

export default function AuthPage({
  authMode,
  setAuthMode,
  authError,
  isSubmitting,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  schoolSearchTerm,
  setSchoolSearchTerm,
  filteredSchoolGroups,
  allSchoolUnits,
  handleLogin,
  handleRegister,
  handleGoogleAuth,
  handleOutlookAuth,
  isMentoriaPerfil,
  setAuthError,
  PERFIS_LOGIN,
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Estados para visualização das senhas
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfPwd, setShowRegConfPwd] = useState(false);

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  useEffect(() => {
    if (!showAuthModal) return;
    const handleEsc = (event) => {
      if (event.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showAuthModal]);

  return (
    <div className="relative min-h-screen w-full font-sans text-[#334155] bg-[url('/images/BGHOME.png')] bg-cover bg-center bg-fixed">
      {/* CSS do Olho Animado Adaptado */}
      <style>{`
                .eye-btn {
                    position: relative; width: 24px; height: 24px; border-radius: 50%;
                    background: #fff; border: 2px solid #131a1d; overflow: hidden; box-sizing: border-box;
                    cursor: pointer; flex-shrink: 0;
                }
                .eye-btn::after {
                    content: ''; position: absolute; left: 0; top: -50%; width: 100%; height: 100%;
                    background: #263238; z-index: 5; border-bottom: 2px solid #131a1d; box-sizing: border-box;
                    transition: transform 0.3s ease;
                }
                .eye-btn.open::after { animation: eyeShade 3s infinite; transform: translateY(0); }
                .eye-btn.closed::after { transform: translateY(150%); animation: none; }
                
                .eye-btn::before {
                    content: ''; position: absolute; left: 5px; bottom: 4px; width: 10px; z-index: 2; height: 10px;
                    background: #111; border-radius: 50%;
                }
                .eye-btn.open::before { animation: eyeMove 3s infinite; }
                .eye-btn.closed::before { animation: none; }

                @keyframes eyeShade {
                    0% { transform: translateY(0) }
                    20% { transform: translateY(2px) }
                    40%, 50% { transform: translateY(-2px) }
                    60% { transform: translateY(-3px) }
                    75% { transform: translateY(2px) }
                    100% { transform: translateY(3px) }
                }
                @keyframes eyeMove {
                    0% { transform: translate(0, 0) }
                    20% { transform: translate(0, 2px) }
                    40%, 50% { transform: translate(0, -2px) }
                    60% { transform: translate(-3px, -2px) }
                    75% { transform: translate(-6px, 2px) }
                    100% { transform: translate(0, 3px) }
                }
            `}</style>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center p-3">
            <div className="flex items-center gap-3">
              <img
                src="/images/Secti_Vertical.png"
                alt="SECTI"
                className="h-20 object-contain opacity-95 hover:opacity-100 transition-opacity duration-300"
                loading="lazy"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => openAuthModal("login")}
                className="px-5 py-2 text-sm font-bold text-white bg-[#00B5B5] rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Entrar / Cadastrar
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 to-teal-100/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-100/30 to-blue-100/30 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left space-y-8">
              <h1 className="text-3xl sm:text-6xl lg:text-6xl font-black leading-tight">
                Transforme <br />
                <span className="text-transparent bg-clip-text bg-[#00B5B5]">
                  o Futuro
                </span>{" "}
                <br />
                Através da Ciência, Tecnologia e Inovação
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Una-se à comunidade baiana de jovens cientistas. Desenvolva
                projetos inovadores, conecte-se com mentores e transforme suas
                ideias em realidade.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => openAuthModal("register")}
                  className="group px-8 py-4 bg-[#00B5B5] text-white font-bold rounded-2xl shadow-xl shadow-[#00B5B5]/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#00B5B5]/30 transition-all flex items-center justify-center gap-2"
                >
                  Comece Agora
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-8 py-4 bg-white text-gray-700 font-bold rounded-2xl border-2 border-gray-200 hover:border-[#00B5B5] hover:text-[#00B5B5] transition-all"
                >
                  Saber Mais
                </button>
              </div>
            </div>

            <div className="flex-1 relative w-full">
              {/* Container com Flexbox e margens dinâmicas (mt) para o efeito cascata */}
              <div className="flex flex-row flex-wrap justify-center items-center gap-6 sm:gap-8 max-w-2xl mx-auto py-8">
                {/* Card 1: Ideias Inovadoras (Sobe em telas médias+) */}
                <div className="animated-card card-blue sm:-mt-12">
                  <div className="inner-content flex flex-col items-center p-6">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl mb-4">
                      <img
                        src="/book.svg"
                        alt=""
                        style={{ maxWidth: "80px" }}
                      />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-gray-800">
                      Colab<span className="text-[#01B5B5]">Tec</span>
                    </h3>
                    <p className="text-sm text-gray-500">
                      Desenvolva projetos que impactam
                    </p>
                  </div>
                </div>

                {/* Card 2: Pesquisa (Desce em telas médias+) */}
                <div className="animated-card card-teal sm:mt-12">
                  <div className="inner-content flex flex-col items-center p-6">
                    <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-4">
                      <img
                        src="/cert.svg"
                        alt=""
                        style={{ maxWidth: "80px" }}
                      />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-gray-800">
                      PatentesLab
                    </h3>
                    <p className="text-sm text-gray-500">
                      Sua ideia, sua marca.
                    </p>
                  </div>
                </div>

                {/* Card 3: Trilha pedagógica (Leve subida em telas médias+) */}
                <div className="animated-card card-indigo sm:-mt-6">
                  <div className="inner-content flex flex-col items-center p-6">
                    <div className="p-4 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl mb-4">
                      <Brain
                        className="w-16 h-16 text-white"
                        strokeWidth={1.6}
                      />
                    </div>
                    <h3 className="font-bold text-xl mb-2 text-gray-800">
                      Trilha CT&I
                    </h3>
                    <p className="text-sm text-gray-500">
                      CT&I nos clubes de ciência
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white to-slate-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Saiba Mais
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para desenvolver projetos científicos
              inovadores
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Rocket,
                title: "ColabTec",
                desc: "Crie e gerencie projetos científicos",
              },
              {
                icon: "/iconesAuth/logoAnimated.svg",
                title: "ConectaClub",
                desc: "Conecte-se com sua unidade escolar e seus orientadores",
              },
              {
                icon: "/iconesAuth/patentes.svg",
                title: "PatentesLab",
                desc: "Gerador de documentos, agente de instrução e suporte para patentes",
              },
              {
                icon: "/iconesAuth/mapa.svg",
                title: "RBCC",
                desc: "Faça parte da rede Baiana de clubes de ciência.",
              },
            ].map((feature, idx) => (
              <a
                key={idx}
                href="#"
                className="group relative block h-64 sm:h-80 lg:h-80"
              >
                {/* Borda tracejada de fundo */}
                <span className="absolute inset-0 border-2 border-dashed border-slate-300"></span>

                {/* Card principal com ícone de fundo transparente */}
                <div className="relative flex h-full w-full transform items-end border-2 border-slate-300 bg-white transition-transform group-hover:-translate-x-2 group-hover:-translate-y-2 overflow-hidden">
                  {(typeof feature.icon === "string" && feature.icon) ? (
                    <div className="pointer-events-none absolute inset-0">
                      <div
                        className="absolute inset-0 bg-center bg-no-repeat bg-contain opacity-20"
                        style={{ backgroundImage: `url(${feature.icon})` }}
                      />
                    </div>
                  ) : (
                    <feature.icon
                      className="pointer-events-none absolute right-4 top-4 w-28 h-28 text-[#004B8D] opacity-20"
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Estado Padrão (some no hover) */}
                  <div className="relative z-10 px-4 pb-4 transition-opacity group-hover:absolute group-hover:opacity-0 sm:px-6 sm:pb-4 lg:px-8 lg:pb-8 w-full">
                    <h2 className="mt-4 text-lg font-bold text-gray-900 sm:text-xl">
                      {feature.title}
                    </h2>
                  </div>

                  {/* Estado Hover (aparece no hover) */}
                  <div className="absolute p-4 opacity-0 transition-opacity group-hover:relative group-hover:opacity-100 sm:p-6 lg:p-8 w-full">
                    <h3 className="mt-4 text-lg font-bold text-[#004B8D] sm:text-xl">
                      {feature.title}
                    </h3>
                    <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#004B8D] via-[#007A99] to-[#00B5B5] text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 opacity-50">
            <AtomIcon className="w-full h-full animate-[spin_20s_linear_infinite]" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
              Como Funciona?
            </h2>
            <p className="text-xl text-teal-50 max-w-3xl mx-auto font-light">
              Apenas alguns passos simples para começar sua jornada científica
            </p>
          </div>
          <div className="relative grid md:grid-cols-4 gap-8">
            <div
              className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent -z-10"
              aria-hidden="true"
            />
            {[
              {
                step: "01",
                title: "Cadastre-se",
                desc: "Crie sua conta gratuitamente",
                icon: User,
              },
              {
                step: "02",
                title: "Crie seu Projeto",
                desc: "Defina o tema e objetivos",
                icon: Lightbulb,
              },
              {
                step: "03",
                title: "Conecte-se",
                desc: "Encontre orientadores e colaboradores",
                icon: Users,
              },
              {
                step: "04",
                title: "Desenvolva",
                desc: "Execute e apresente resultados",
                icon: Target,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="text-center group relative cursor-default"
              >
                <div className="relative mb-6 inline-block">
                  <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] group-hover:bg-white/20 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300 ease-out">
                    <item.icon
                      className="w-10 h-10 text-white transition-colors duration-300 group-hover:text-teal-200"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-teal-400 rounded-2xl flex items-center justify-center font-black text-[#004B8D] text-lg shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-teal-100 leading-relaxed max-w-[220px] mx-auto text-sm sm:text-base">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#004B8D] via-[#007A99] to-[#00B5B5] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-6xl font-black mb-6">
            Pronto para começar sua <br />
            jornada científica?
          </h2>
          <button
            onClick={() => openAuthModal("register")}
            className="group px-10 py-5 bg-white text-[#004B8D] font-black rounded-2xl shadow-2xl hover:scale-105 transition-all inline-flex items-center gap-3 text-lg"
          >
            Criar Conta
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeAuthModal}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeAuthModal}
              className="absolute top-4 right-4 rounded-full bg-white/90 p-2 hover:bg-white text-gray-500 hover:text-gray-900 z-50"
            >
              ✕
            </button>

            <div className="flex flex-col md:flex-row">
              {/* Lado esquerdo do modal */}
              <div className="md:w-5/12 bg-gradient-to-br from-[#004B8D] via-[#007A99] to-[#00B5B5] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden min-h-[600px]">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-black/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-3 mb-6">
                    <img
                      src="/images/Secti_Vertical.png"
                      alt="SECTI"
                      className="h-20 object-contain opacity-95 hover:opacity-100 transition-opacity duration-300"
                      loading="lazy"
                    />
                    <div className="bg-white backdrop-blur-sm">
                      <img src="/logo.svg" alt="SECTI" className="h-20" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base text-teal-50 font-medium leading-relaxed">
                      Descubra, crie e inove. Conecte-se à rede baiana de jovens
                      cientistas e transforme o futuro através da pesquisa
                      escolar.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-auto pt-8">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                      <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                      <span className="text-xs font-semibold">Inovação</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                      <Beaker className="w-3.5 h-3.5 text-teal-200" />
                      <span className="text-xs font-semibold">Pesquisa</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                      <School className="w-3.5 h-3.5 text-teal-200" />
                      <span className="text-xs font-semibold">Educação</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lado direito do modal - Formulários */}
              <div className="md:w-7/12 p-8 lg:p-12 flex flex-col justify-center bg-white/95 relative">
                <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8 max-w-sm mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${authMode === "login" ? "bg-white text-[#004B8D] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                    }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${authMode === "register" ? "bg-white text-[#004B8D] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Cadastrar
                  </button>
                </div>

                <div className="max-w-md mx-auto w-full">
                  {authError && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                      <span className="text-xl">⚠️</span>
                      <p className="mt-0.5 font-medium">{authError}</p>
                    </div>
                  )}

                  <div className="mb-6 space-y-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleGoogleAuth}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-70"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clip-path="url(#clip0_1_7)">
                            <path
                              d="M18.9572 9.69769C18.9535 8.91776 18.8871 8.34892 18.7465 7.75937L9.79301 7.80273L9.81006 11.323L15.0656 11.2975C14.9639 12.1729 14.3981 13.4931 13.1309 14.3846L13.1136 14.5025L15.9551 16.6703L16.1513 16.6888C17.9446 15.0253 18.9712 12.5856 18.9572 9.69769Z"
                              fill="#4285F4"
                            />
                            <path
                              d="M9.84733 19.017C12.4221 19.0046 14.5795 18.1509 16.1513 16.6888L13.1309 14.3846C12.3283 14.9471 11.2494 15.3423 9.82956 15.3492C7.30776 15.3614 5.15939 13.7171 4.38534 11.4336L4.27355 11.4436L1.34087 13.7239L1.30289 13.8306C2.88608 16.9216 6.11755 19.0351 9.84733 19.017Z"
                              fill="#34A853"
                            />
                            <path
                              d="M4.38534 11.4336C4.18116 10.8444 4.06159 10.2125 4.05842 9.55907C4.05526 8.90556 4.1687 8.27263 4.35657 7.68149L4.35063 7.55581L1.35894 5.26779L1.26164 5.31441C0.621552 6.6034 0.257686 8.04918 0.265089 9.57744C0.272491 11.1057 0.650345 12.5478 1.30289 13.8305L4.38534 11.4336Z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M9.7732 3.71328C11.5639 3.70461 12.7755 4.46816 13.4674 5.10779L16.1461 2.48087C14.4858 0.960619 12.3302 0.0329942 9.75543 0.0454659C6.02565 0.0635323 2.81481 2.20815 1.26164 5.31442L4.35657 7.6815C5.11906 5.39063 7.2514 3.7255 9.7732 3.71328Z"
                              fill="#EB4335"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_1_7">
                              <rect
                                width="19.1386"
                                height="19.0372"
                                fill="white"
                                transform="translate(0 0.0927124) rotate(-0.277528)"
                              />
                            </clipPath>
                          </defs>
                        </svg>
                        Continuar com Google
                      </span>
                    </button>
                    <div className="relative py-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200"></span>
                      </div>
                      <span className="relative block w-fit mx-auto bg-white px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        ou
                      </span>
                    </div>
                  </div>

                  {/* FORM DE LOGIN */}
                  {authMode === "login" && (
                    <form
                      onSubmit={handleLogin}
                      className="space-y-5 animate-in fade-in zoom-in-95 duration-300"
                    >
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                          E-mail
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            value={loginForm.email}
                            onChange={(e) =>
                              setLoginForm((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3.5 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                            placeholder="seu@email.com"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                          Senha
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type={showLoginPwd ? "text" : "password"}
                            value={loginForm.senha}
                            onChange={(e) =>
                              setLoginForm((prev) => ({
                                ...prev,
                                senha: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 p-3.5 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                            placeholder="••••••••"
                            required
                          />
                          <div
                            className="absolute right-3 cursor-pointer"
                            onClick={() => setShowLoginPwd(!showLoginPwd)}
                          >
                            <div
                              className={`eye-btn ${showLoginPwd ? "closed" : "open"}`}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#004B8D] to-[#00B5B5] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#00B5B5]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00B5B5]/30 disabled:opacity-70 disabled:hover:translate-y-0"
                        >
                          {isSubmitting ? (
                            <LoaderCircle className="w-5 h-5 animate-spin" />
                          ) : (
                            "Acessar Plataforma"
                          )}
                          {!isSubmitting && (
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* FORM DE CADASTRO */}
                  {authMode === "register" && (
                    <form
                      onSubmit={handleRegister}
                      className="space-y-4 animate-in fade-in zoom-in-95 duration-300"
                    >
                      <div className="max-h-[50vh] overflow-y-auto pr-2 -mr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                            Nome completo *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <User className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              value={registerForm.nome}
                              onChange={(e) =>
                                setRegisterForm((prev) => ({
                                  ...prev,
                                  nome: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                              placeholder="Digite seu nome completo"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                            E-mail *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="email"
                              value={registerForm.email}
                              onChange={(e) =>
                                setRegisterForm((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                              placeholder="seu@email.com"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                            Perfil *
                          </label>
                          <select
                            value={registerForm.perfil}
                            onChange={(e) => {
                              const novoPerfil = e.target.value || "";
                              const isEstudante =
                                novoPerfil
                                  .toLowerCase()
                                  .includes("estudante") ||
                                novoPerfil.toLowerCase().includes("aluno");
                              setRegisterForm((prev) => ({
                                ...prev,
                                perfil: novoPerfil,
                                matricula:
                                  isMentoriaPerfil(novoPerfil) || isEstudante
                                    ? prev.matricula
                                    : "",
                                lattes: isMentoriaPerfil(novoPerfil)
                                  ? prev.lattes
                                  : "",
                              }));
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10 appearance-none"
                          >
                            {PERFIS_LOGIN.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                              Senha *
                            </label>
                            <div className="relative flex items-center">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-400" />
                              </div>
                              <input
                                type={showRegPwd ? "text" : "password"}
                                value={registerForm.senha}
                                onChange={(e) =>
                                  setRegisterForm((prev) => ({
                                    ...prev,
                                    senha: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                placeholder="Min. 6"
                                required
                                minLength={6}
                              />
                              <div
                                className="absolute right-2 cursor-pointer"
                                onClick={() => setShowRegPwd(!showRegPwd)}
                              >
                                <div
                                  className={`eye-btn ${showRegPwd ? "open" : "closed"}`}
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                              Confirmar *
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type={showRegConfPwd ? "text" : "password"}
                                value={registerForm.confirmarSenha}
                                onChange={(e) =>
                                  setRegisterForm((prev) => ({
                                    ...prev,
                                    confirmarSenha: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pr-10 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                placeholder="Repita a senha"
                                required
                              />
                              <div
                                className="absolute right-2 cursor-pointer"
                                onClick={() =>
                                  setShowRegConfPwd(!showRegConfPwd)
                                }
                              >
                                <div
                                  className={`eye-btn ${showRegConfPwd ? "open" : "closed"}`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {(isMentoriaPerfil(registerForm.perfil) ||
                          (registerForm.perfil || "")
                            .toLowerCase()
                            .includes("estudante") ||
                          (registerForm.perfil || "")
                            .toLowerCase()
                            .includes("aluno")) && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                              Matrícula *
                            </label>
                            <input
                              type="text"
                              value={registerForm.matricula}
                              onChange={(e) =>
                                setRegisterForm((prev) => ({
                                  ...prev,
                                  matricula: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                              placeholder="Ex: 202600123"
                              required
                            />
                          </div>
                        )}

                        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80">
                          <label className="mb-1.5 block text-xs font-bold uppercase text-[#004B8D] tracking-wide flex items-center gap-1.5">
                            <School className="w-3.5 h-3.5" />
                            Vínculo Escolar
                          </label>
                          <input
                            type="text"
                            value={schoolSearchTerm}
                            onChange={(e) =>
                              setSchoolSearchTerm(e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none mb-3 transition-all focus:border-[#00B5B5] focus:ring-2 focus:ring-[#00B5B5]/20"
                            placeholder="🔍 Buscar escola pelo nome..."
                          />
                          <select
                            value={registerForm.escola_id}
                            onChange={(e) => {
                              const selected = allSchoolUnits.find(
                                (u) => u.escola_id === e.target.value,
                              );
                              setRegisterForm((prev) => ({
                                ...prev,
                                escola_id: e.target.value,
                                escola_nome: selected?.nome || "",
                              }));
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none transition-all focus:border-[#00B5B5] focus:ring-2 focus:ring-[#00B5B5]/20"
                            required
                          >
                            <option value="">
                              Selecione a unidade escolar *
                            </option>
                            {filteredSchoolGroups.length === 0 ? (
                              <option value="" disabled>
                                Nenhuma escola encontrada
                              </option>
                            ) : (
                              filteredSchoolGroups.map((group) => (
                                <optgroup
                                  key={group.key}
                                  label={group.label}
                                  className="font-semibold text-gray-700"
                                >
                                  {group.units.map((unit) => (
                                    <option
                                      key={`${group.key}-${unit.escola_id}`}
                                      value={unit.escola_id}
                                      className="font-normal"
                                    >
                                      {unit.nome}
                                    </option>
                                  ))}
                                </optgroup>
                              ))
                            )}
                          </select>
                        </div>

                        {isMentoriaPerfil(registerForm.perfil) && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                              Currículo Lattes (Opcional)
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <ExternalLink className="h-4 w-4 text-gray-400" />
                              </div>
                              <input
                                type="url"
                                value={registerForm.lattes}
                                onChange={(e) =>
                                  setRegisterForm((prev) => ({
                                    ...prev,
                                    lattes: e.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                placeholder="https://lattes.cnpq.br/..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="pt-4 mt-2 border-t border-gray-100">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#004B8D] to-[#00B5B5] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#00B5B5]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00B5B5]/30 disabled:opacity-70 disabled:hover:translate-y-0"
                        >
                          {isSubmitting && (
                            <LoaderCircle className="w-5 h-5 animate-spin" />
                          )}
                          Criar minha conta
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
