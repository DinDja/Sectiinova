import React from 'react';
import { Microscope, User, Mail, Lock, School, ExternalLink, ArrowRight, LoaderCircle } from 'lucide-react';

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
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-[#334155]">
            <div className="w-full max-w-5xl glass-surface rounded-3xl overflow-hidden flex flex-col md:flex-row border border-white/70">
                <div className="md:w-5/12 bg-gradient-to-br from-[#004B8D] via-[#007A99] to-[#00B5B5] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-black/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Microscope className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="font-extrabold text-xl tracking-tight leading-none">SECTI</h2>
                                <p className="text-xs uppercase tracking-widest text-teal-100 font-semibold">Bahia</p>
                            </div>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-black mb-4 leading-tight">
                            Plataforma de <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-white">Clubes de Ciência</span>
                        </h1>
                        <p className="text-base text-teal-50 font-medium leading-relaxed max-w-sm">Descubra, crie e inove. Conecte-se à rede baiana de jovens cientistas e transforme o futuro através da pesquisa escolar.</p>
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
    );
};
