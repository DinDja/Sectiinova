import React, { useState, useEffect } from 'react';
import { Microscope, User, Mail, Lock, School, ExternalLink, ArrowRight, LoaderCircle, Beaker, Sparkles, Users, Award, Lightbulb, Rocket, AtomIcon, BookOpen, FlaskConical, Target, Star, Quote, GraduationCap, Brain, Globe } from 'lucide-react';

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
    isMentoriaPerfil,
    setAuthError,
    PERFIS_LOGIN
}) {
    const [showAuthModal, setShowAuthModal] = useState(false);

    const openAuthModal = (mode) => {
        setAuthMode(mode);
        setAuthError('');
        setShowAuthModal(true);
    };

    const closeAuthModal = () => {
        setShowAuthModal(false);
    };

    useEffect(() => {
        if (!showAuthModal) return;

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                closeAuthModal();
            }
        };

        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showAuthModal]);

    return (
        <div className="min-h-screen w-full font-sans text-[#334155] bg-gradient-to-b from-white via-teal-50/30 to-white">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-[#004B8D] to-[#00B5B5] rounded-xl">
                                <Microscope className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-extrabold text-lg tracking-tight leading-none text-[#004B8D]">SECTI</h2>
                                <p className="text-[10px] uppercase tracking-widest text-teal-600 font-semibold">Clubes de Ciência</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => openAuthModal('login')}
                                className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#004B8D] to-[#00B5B5] rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"                            >
                                Entrar/Cadastrar
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
                {/* Background decorativo */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 to-teal-100/40 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-100/30 to-blue-100/30 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        {/* Coluna esquerda - Conteúdo */}
                        <div className="flex-1 text-center lg:text-left space-y-8">
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight">
                                Transforme <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#004B8D] via-[#007A99] to-[#00B5B5]">o Futuro</span> <br />
                                Através da Ciência
                            </h1>

                            <p className="text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                Una-se à comunidade baiana de jovens cientistas. Desenvolva projetos inovadores, conecte-se com mentores e transforme suas ideias em realidade.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <button
                                    onClick={() => openAuthModal('register')}
                                    className="group px-8 py-4 bg-gradient-to-r from-[#004B8D] to-[#00B5B5] text-white font-bold rounded-2xl shadow-xl shadow-[#00B5B5]/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#00B5B5]/30 transition-all flex items-center justify-center gap-2"
                                >
                                    Comece Agora
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => openAuthModal('login')}
                                    className="px-8 py-4 bg-white text-gray-700 font-bold rounded-2xl border-2 border-gray-200 hover:border-[#00B5B5] hover:text-[#00B5B5] transition-all"
                                >
                                    Saber Mais
                                </button>
                            </div>
                        </div>

                        {/* Coluna direita - Visual com cards */}
                        <div className="flex-1 relative">
                            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                                <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 hover:scale-105 transition-transform">
                                    <div className="p-3 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl w-fit mb-4">
                                        <Lightbulb className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Ideias Inovadoras</h3>
                                    <p className="text-sm text-gray-600">Desenvolva projetos que impactam</p>
                                </div>
                                <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 hover:scale-105 transition-transform">
                                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl w-fit mb-4">
                                        <FlaskConical className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Pesquisa</h3>
                                    <p className="text-sm text-gray-600">Metodologia científica</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: Rocket, title: 'Projetos Inovadores', desc: 'Crie e gerencie projetos científicos', color: 'from-blue-500 to-cyan-500' },
                            { icon: Users, title: 'Orientadores e coorientadores', desc: 'Conecte-se com sua unidade escolar e seus orientadores', color: 'from-purple-500 to-pink-500' },
                            { icon: BookOpen, title: 'Recurso instrutor para patentes no INPI', desc: 'Gerador de documentos, agente de instrução e suporte para patentes', color: 'from-orange-500 to-red-500' },
                            { icon: Globe, title: 'Rede Estadual', desc: 'Faça parte da rede de jovens cientistas da Bahia', color: 'from-teal-500 to-blue-500' }
                        ].map((feature, idx) => (
                            <div key={idx} className="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                                <div className={`p-4 bg-gradient-to-br ${feature.color} rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#004B8D] via-[#007A99] to-[#00B5B5] text-white relative overflow-hidden">
                {/* Background decorativo */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-10 w-64 h-64">
                    </div>
                    <div className="absolute bottom-10 right-10 w-80 h-80">
                        <AtomIcon className="w-full h-full" />
                    </div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl sm:text-5xl font-black mb-4">
                            Como Funciona?
                        </h2>
                        <p className="text-xl text-teal-100 max-w-3xl mx-auto">
                            Apenas alguns passos simples para começar sua jornada científica
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { step: '01', title: 'Cadastre-se', desc: 'Crie sua conta gratuitamente', icon: User },
                            { step: '02', title: 'Crie seu Projeto', desc: 'Defina o tema e objetivos', icon: Lightbulb },
                            { step: '03', title: 'Conecte-se', desc: 'Encontre orientadores e colaboradores', icon: Users },
                            { step: '04', title: 'Desenvolva', desc: 'Execute e apresente resultados', icon: Target }
                        ].map((item, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="relative mb-6">
                                    <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20 group-hover:bg-white/20 group-hover:scale-110 transition-all">
                                        <item.icon className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-teal-400 rounded-2xl flex items-center justify-center font-black text-[#004B8D] text-lg shadow-lg">
                                        {item.step}
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                                <p className="text-teal-100">{item.desc}</p>
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
                        Pronto para começar sua <br />jornada científica?
                    </h2>
                    <button
                        onClick={() => openAuthModal('register')}
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
                            className="absolute top-4 right-4 rounded-full bg-white/90 p-2 hover:bg-white text-gray-500 hover:text-gray-900"
                            aria-label="Fechar"
                        >
                            ✕
                        </button>
                        <div className="flex flex-col md:flex-row">

                            <div className="md:w-5/12 bg-gradient-to-br from-[#004B8D] via-[#007A99] to-[#00B5B5] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden min-h-[600px]">
                                {/* Elementos decorativos animados */}
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-black/10 rounded-full blur-3xl"></div>

                                <div className="relative z-10 space-y-8">
                                    {/* Header com logo */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <Microscope className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="font-extrabold text-xl tracking-tight leading-none">SECTI</h2>
                                            <p className="text-xs uppercase tracking-widest text-teal-100 font-semibold">Bahia</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h1 className="text-3xl lg:text-4xl font-black mb-4 leading-tight">
                                            Plataforma de <br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-white">Clubes de Ciência</span>
                                        </h1>
                                        <p className="text-base text-teal-50 font-medium leading-relaxed">Descubra, crie e inove. Conecte-se à rede baiana de jovens cientistas e transforme o futuro através da pesquisa escolar.</p>
                                    </div>
                                </div>

                                {/* Footer com badges */}
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

                            <div className="md:w-7/12 p-8 lg:p-12 flex flex-col justify-center bg-white/95 relative">
                                <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8 max-w-sm mx-auto w-full">
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${authMode === 'login' ? 'bg-white text-[#004B8D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Entrar

                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('register'); setAuthError(''); }}
                                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${authMode === 'register' ? 'bg-white text-[#004B8D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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

                                    {authMode === 'login' && (
                                        <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">E-mail</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <Mail className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="email"
                                                        value={loginForm.email}
                                                        onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3.5 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                                        placeholder="seu@email.com"
                                                        required
                                                        autoComplete="email"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">Senha</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <Lock className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="password"
                                                        value={loginForm.senha}
                                                        onChange={(e) => setLoginForm((prev) => ({ ...prev, senha: e.target.value }))}
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3.5 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                                        placeholder="••••••••"
                                                        required
                                                        autoComplete="current-password"
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#004B8D] to-[#00B5B5] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#00B5B5]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00B5B5]/30 disabled:opacity-70 disabled:hover:translate-y-0"
                                                >
                                                    {isSubmitting ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Acessar Plataforma'}
                                                    {!isSubmitting && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {authMode === 'register' && (
                                        <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                            <div className="max-h-[50vh] overflow-y-auto pr-2 -mr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">Nome completo *</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                            <User className="h-4 w-4 text-gray-400" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={registerForm.nome}
                                                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, nome: e.target.value }))}
                                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                                            placeholder="Digite seu nome completo"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">E-mail *</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                            <Mail className="h-4 w-4 text-gray-400" />
                                                        </div>
                                                        <input
                                                            type="email"
                                                            value={registerForm.email}
                                                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                                            placeholder="seu@email.com"
                                                            required
                                                            autoComplete="email"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">Perfil *</label>
                                                    <select
                                                        value={registerForm.perfil}
                                                        onChange={(e) => {
                                                            const novoPerfil = e.target.value;
                                                            setRegisterForm((prev) => ({
                                                                ...prev,
                                                                perfil: novoPerfil,
                                                                matricula: isMentoriaPerfil(novoPerfil) ? prev.matricula : '',
                                                                lattes: isMentoriaPerfil(novoPerfil) ? prev.lattes : ''
                                                            }));
                                                        }}
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10 appearance-none"
                                                    >
                                                        {PERFIS_LOGIN.map((p) => (
                                                            <option key={p.value} value={p.value}>{p.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">Senha *</label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                                <Lock className="h-4 w-4 text-gray-400" />
                                                            </div>
                                                            <input
                                                                type="password"
                                                                value={registerForm.senha}
                                                                onChange={(e) => setRegisterForm((prev) => ({ ...prev, senha: e.target.value }))}
                                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                                                placeholder="Min. 6"
                                                                required
                                                                minLength={6}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">Confirmar *</label>
                                                        <input
                                                            type="password"
                                                            value={registerForm.confirmarSenha}
                                                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmarSenha: e.target.value }))}
                                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                                            placeholder="Repita a senha"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                {isMentoriaPerfil(registerForm.perfil) && (
                                                    <div className="animate-in fade-in slide-in-from-top-2">
                                                        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">Matrícula *</label>
                                                        <input
                                                            type="text"
                                                            value={registerForm.matricula}
                                                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, matricula: e.target.value }))}
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
                                                        onChange={(e) => setSchoolSearchTerm(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none mb-3 transition-all focus:border-[#00B5B5] focus:ring-2 focus:ring-[#00B5B5]/20"
                                                        placeholder="🔍 Buscar escola pelo nome..."
                                                    />
                                                    <select
                                                        value={registerForm.escola_id}
                                                        onChange={(e) => {
                                                            const selected = allSchoolUnits.find((u) => u.escola_id === e.target.value);
                                                            setRegisterForm((prev) => ({ ...prev, escola_id: e.target.value, escola_nome: selected?.nome || '' }));
                                                        }}
                                                        className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none transition-all focus:border-[#00B5B5] focus:ring-2 focus:ring-[#00B5B5]/20"
                                                        required
                                                    >
                                                        <option value="">Selecione a unidade escolar *</option>
                                                        {filteredSchoolGroups.length === 0 ? (
                                                            <option value="" disabled>Nenhuma escola encontrada</option>
                                                        ) : (
                                                            filteredSchoolGroups.map((group) => (
                                                                <optgroup key={group.key} label={group.label} className="font-semibold text-gray-700">
                                                                    {group.units.map((unit) => (
                                                                        <option key={`${group.key}-${unit.escola_id}`} value={unit.escola_id} className="font-normal">{unit.nome}</option>
                                                                    ))}
                                                                </optgroup>
                                                            ))
                                                        )}
                                                    </select>
                                                </div>
                                                {isMentoriaPerfil(registerForm.perfil) && (
                                                    <div className="animate-in fade-in slide-in-from-top-2">
                                                        <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500 tracking-wide">Currículo Lattes *</label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                                <ExternalLink className="h-4 w-4 text-gray-400" />
                                                            </div>
                                                            <input
                                                                type="url"
                                                                value={registerForm.lattes}
                                                                onChange={(e) => setRegisterForm((prev) => ({ ...prev, lattes: e.target.value }))}
                                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 p-3 text-sm outline-none transition-all focus:border-[#00B5B5] focus:bg-white focus:ring-4 focus:ring-[#00B5B5]/10"
                                                                placeholder="https://lattes.cnpq.br/..."
                                                                required
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
                                                    {isSubmitting && <LoaderCircle className="w-5 h-5 animate-spin" />}
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
