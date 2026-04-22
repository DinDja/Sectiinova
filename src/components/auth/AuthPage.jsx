import React, { useState, useEffect, useRef } from "react";
import lottie from "lottie-web/build/player/esm/lottie.min.js";
import {
  Microscope,
  User,
  Mail,
  Lock,
  School,
  ExternalLink,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  Users,
  Target,
  BookOpen,
  Brain,
  ChevronDown,
  Sparkles,
  Lightbulb,
  Rocket,
  Search,
  Asterisk,
} from "lucide-react";
import {
  PASSWORD_MIN_LENGTH,
  getPasswordSecurityChecks,
  getPasswordStrength,
} from "../../utils/authSecurity";

// --- HOOKS E ANIMAÇÕES ---

// Animação de revelação com efeito "Pop"
const Reveal = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-16 scale-90"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- COMPONENTES UI (NEO-BRUTALISMO / FLAT POP) ---

const SolidInput = ({ icon: Icon, label, type = "text", ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = props.value?.toString().length > 0;

  return (
    <div className="relative w-full mb-5">
      <div className="relative">
        <label
          className={`absolute left-12 transition-all duration-200 pointer-events-none z-10 ${
            isFocused || hasValue
              ? "-top-3 bg-[#FAFAFA] px-2 text-xs font-bold text-slate-900 border-2 border-slate-900 rounded-md shadow-[2px_2px_0px_0px_#0f172a]"
              : "top-4 text-sm font-bold text-slate-500"
          }`}
        >
          {label}
        </label>

        <div
          className={`absolute left-0 top-0 bottom-0 flex items-center justify-center w-12 transition-colors duration-200 ${
            isFocused ? "text-slate-900" : "text-slate-500"
          }`}
        >
          <Icon className="w-5 h-5 stroke-[2.5]" />
        </div>

        <input
          type={type}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full bg-white outline-none text-slate-900 text-sm font-bold py-4 pl-12 pr-4 rounded-xl border-2 border-slate-900 transition-all duration-200 ${
            isFocused
              ? "shadow-[4px_4px_0px_0px_#14b8a6] -translate-y-1 -translate-x-1"
              : "shadow-[4px_4px_0px_0px_#0f172a]"
          }`}
          {...props}
        />
      </div>
    </div>
  );
};

const SolidCheckbox = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-4 cursor-pointer group p-2 rounded-xl hover:bg-slate-100 transition-colors border-2 border-transparent">
    <div className="relative w-7 h-7">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div
        className={`absolute inset-0 rounded-lg border-2 border-slate-900 transition-all duration-200 flex items-center justify-center ${
          checked
            ? "bg-teal-400 shadow-[2px_2px_0px_0px_#0f172a]"
            : "bg-white shadow-[2px_2px_0px_0px_#0f172a] group-hover:bg-slate-50"
        }`}
      >
        <svg
          className={`w-4 h-4 text-slate-900 transition-transform duration-200 ${checked ? "scale-100" : "scale-0"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    </div>
    <span className="text-sm font-bold text-slate-800">{label}</span>
  </label>
);

const SolidButton = ({
  children,
  onClick,
  color = "bg-teal-400",
  type = "button",
  disabled,
  className = "",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`relative inline-flex items-center justify-center gap-2 px-8 py-4 font-black text-slate-900 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none ${color} ${className}`}
  >
    {children}
  </button>
);

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M21.35 11.1h-9.2v2.8h5.26c-.23 1.3-1.02 2.4-2.18 3.13v2.6h3.54c2.07-1.9 3.26-4.73 3.26-8.33 0-.56-.05-1.1-.15-1.6z" />
    <path fill="#34A853" d="M12.15 22.01c2.96 0 5.44-.98 7.25-2.64l-3.54-2.6c-.98.66-2.24 1.05-3.71 1.05-2.85 0-5.27-1.92-6.14-4.5H2.24v2.82c1.79 3.53 5.48 6.87 9.91 6.87z" />
    <path fill="#FBBC05" d="M6.01 13.32c-.22-.66-.35-1.35-.35-2.07s.13-1.41.35-2.07V6.36H2.24A10.91 10.91 0 0 0 1 11.25c0 1.76.42 3.42 1.24 4.89l3.77-2.82z" />
    <path fill="#EA4335" d="M12.15 5.58c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.6 2.18 15.12 1.2 12.15 1.2 7.72 1.2 3.99 4.54 2.24 8.95l3.77 2.82c.87-2.58 3.29-4.5 6.14-4.5z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5">
    <rect x="3" y="3" width="8" height="8" fill="#F35325" />
    <rect x="13" y="3" width="8" height="8" fill="#81BC06" />
    <rect x="3" y="13" width="8" height="8" fill="#05A6F0" />
    <rect x="13" y="13" width="8" height="8" fill="#FFBA08" />
  </svg>
);

const HeroNotebook = () => (
  <div className="nbk-container" aria-hidden="true">
    <style>{`
      .nbk-container {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        width: 100%;
        height: 100%;
        min-height: 950px;
      }

      .nbk-scale {
        transform: scale(2.9952);
        transform-origin: center;
      }

      .nbk-macbook {
        position: relative;
        width: 228px;
        height: 260px;
      }

      .nbk-macbook__topBord {
        position: absolute;
        z-index: 0;
        top: 34px;
        left: 0;
        width: 128px;
        height: 116px;
        border-radius: 6px;
        transform-origin: center;
        background: linear-gradient(-135deg, #c8c9c9 52%, #8c8c8c 56%);
        transform: scale(0) skewY(-30deg);
        animation: nbk-topbord 0.4s 1.7s ease-out;
        animation-fill-mode: forwards;
      }

      .nbk-macbook__topBord::before {
        content: "";
        position: absolute;
        z-index: 2;
        top: 8px;
        left: 6px;
        width: 100%;
        height: 100%;
        border-radius: 6px;
        background: #000;
      }

      .nbk-macbook__topBord::after {
        content: "";
        position: absolute;
        z-index: 1;
        bottom: -7px;
        left: 8px;
        width: 168px;
        height: 12px;
        transform-origin: left bottom;
        transform: rotate(-42deg) skew(-4deg);
        background: linear-gradient(-135deg, #c8c9c9 52%, #8c8c8c 56%);
      }

      .nbk-macbook__display {
        position: absolute;
        top: 17px;
        left: 12px;
        z-index: 2;
        width: calc(100% - 12px);
        height: calc(100% - 18px);
        background: radial-gradient(circle at 50% 20%, #FFFF 10%, #FFFF 72%);
        overflow: hidden;
      }

      .nbk-macbook__display::before {
        content: "";
        position: absolute;
        z-index: 5;
        top: -9px;
        left: -6px;
        width: calc(100% + 12px);
        height: calc(100% + 18px);
        border-radius: 6px;
        background: linear-gradient(60deg, rgba(255, 255, 255, 0) 58%, rgba(255, 255, 255, 0.28) 60%);
      }

      .nbk-macbook__screenLogo {
        position: absolute;
        inset: 0;
        margin: auto;
        width: 86px;
        height: 86px;
        object-fit: contain;
        opacity: 0;
        filter: blur(5px);
        transform: scale(0.88);
        z-index: 4;
        animation: nbk-logoIn 0.7s 4.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      }

      .nbk-macbook__load {
        position: relative;
        width: 100%;
        height: 100%;
        background: #111827;
        animation: nbk-display 0.4s 4.3s ease;
        opacity: 1;
        animation-fill-mode: forwards;
        z-index: 6;
      }

      .nbk-macbook__load::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        margin: auto;
        width: 80px;
        height: 6px;
        border-radius: 3px;
        box-sizing: border-box;
        border: solid 1px #fff;
      }

      .nbk-macbook__load::after {
        content: "";
        position: absolute;
        top: 0;
        left: 18px;
        bottom: 0;
        margin: auto;
        width: 0;
        height: 6px;
        border-radius: 3px;
        background: #fff;
        animation: nbk-load 2s 2s ease-out;
        animation-fill-mode: forwards;
      }

      .nbk-macbook__underBord {
        position: relative;
        left: 42px;
        bottom: -145px;
        width: 150px;
        height: 90px;
        border-radius: 6px;
        transform-origin: center;
        transform: rotate(-30deg) skew(30deg);
        background: linear-gradient(-45deg, #c8c9c9 61%, #8c8c8c 66%);
        animation: nbk-modal 0.5s 1s ease-out;
        opacity: 0;
        animation-fill-mode: forwards;
      }

      .nbk-macbook__underBord::before {
        content: "";
        position: absolute;
        z-index: 3;
        top: -8px;
        left: 8px;
        width: 100%;
        height: 100%;
        border-radius: 6px;
        background: #dcdede;
      }

      .nbk-macbook__underBord::after {
        content: "";
        position: absolute;
        z-index: 2;
        top: -8px;
        left: 12px;
        width: 170px;
        height: 15px;
        transform-origin: top left;
        background: linear-gradient(-45deg, #c8c9c9 61%, #8c8c8c 66%);
        transform: rotate(31deg) skew(-16deg);
      }

      .nbk-macbook__keybord {
        position: relative;
        top: 0;
        left: 16px;
        z-index: 3;
        border-radius: 3px;
        width: calc(100% - 16px);
        height: 45px;
        background: #c8c9c9;
      }

      .nbk-macbook__keybord::before {
        content: "";
        position: absolute;
        bottom: -30px;
        left: 0;
        right: 0;
        margin: 0 auto;
        width: 40px;
        height: 25px;
        border-radius: 3px;
        background: #c8c9c9;
      }

      .nbk-keybord {
        position: relative;
        top: 2px;
        left: 2px;
        display: flex;
        flex-direction: column;
        width: calc(100% - 3px);
        height: calc(100% - 4px);
      }

      .nbk-keybord__touchbar {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: #000;
      }

      .nbk-keybord__keyBox {
        display: grid;
        grid-template-rows: 3fr 1fr;
        grid-template-columns: repeat(11, 1fr);
        width: 100%;
        height: 24px;
        margin: 1px 0 0 0;
        padding: 0 0 0 1px;
        box-sizing: border-box;
        list-style: none;
      }

      .nbk-keybord__key {
        position: relative;
        width: 8px;
        height: 7px;
        margin: 1px;
        background: #000;
      }

      .nbk-keybord__keyBox .nbk-keybord__key {
        transform: translate(60px, -60px);
        animation: nbk-key 0.2s 1.4s ease-out;
        animation-fill-mode: forwards;
        opacity: 0;
      }

      .nbk-keybord__keyBox .nbk-keybord__key::before,
      .nbk-keybord__keyBox .nbk-keybord__key::after {
        content: "";
        position: absolute;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
      }

      .nbk-keybord__key::before {
        top: 8px;
        transform: translate(20px, -20px);
        animation: nbk-key1 0.2s 1.5s ease-out;
        animation-fill-mode: forwards;
      }

      .nbk-keybord__key::after {
        top: 16px;
        transform: translate(40px, -40px);
        animation: nbk-key2 0.2s 1.6s ease-out;
        animation-fill-mode: forwards;
      }

      .nbk-keybord__keyBox .nbk-key--12::before {
        width: 10px;
      }

      .nbk-keybord__keyBox .nbk-key--13::before {
        height: 10px;
      }

      .nbk-key--01 {
        grid-row: 1 / 2;
        grid-column: 1 / 2;
      }

      .nbk-key--02 {
        grid-row: 1 / 2;
        grid-column: 2 / 3;
      }

      .nbk-key--03 {
        grid-row: 1 / 2;
        grid-column: 3 / 4;
      }

      .nbk-key--04 {
        grid-row: 1 / 2;
        grid-column: 4 / 5;
      }

      .nbk-key--05 {
        grid-row: 1 / 2;
        grid-column: 5 / 6;
      }

      .nbk-key--06 {
        grid-row: 1 / 2;
        grid-column: 6 / 7;
      }

      .nbk-key--07 {
        grid-row: 1 / 2;
        grid-column: 7 / 8;
      }

      .nbk-key--08 {
        grid-row: 1 / 2;
        grid-column: 8 / 9;
      }

      .nbk-key--09 {
        grid-row: 1 / 2;
        grid-column: 9 / 10;
      }

      .nbk-key--10 {
        grid-row: 1 / 2;
        grid-column: 10 / 11;
      }

      .nbk-key--11 {
        grid-row: 1 / 2;
        grid-column: 11 / 12;
      }

      .nbk-key--12 {
        grid-row: 1 / 2;
        grid-column: 12 / 13;
      }

      .nbk-key--13 {
        grid-row: 1 / 2;
        grid-column: 13 / 14;
      }

      .nbk-keybord__keyBox--under {
        margin: 0;
        padding: 0 0 0 1px;
        box-sizing: border-box;
        list-style: none;
        display: flex;
      }

      .nbk-keybord__keyBox--under .nbk-keybord__key {
        transform: translate(80px, -80px);
        animation: nbk-key3 0.3s 1.6s linear;
        animation-fill-mode: forwards;
        opacity: 0;
      }

      .nbk-key--19 {
        width: 28px;
      }

      @keyframes nbk-topbord {
        0% {
          transform: scale(0) skewY(-30deg);
        }
        30% {
          transform: scale(1.1) skewY(-30deg);
        }
        45% {
          transform: scale(0.9) skewY(-30deg);
        }
        60% {
          transform: scale(1.05) skewY(-30deg);
        }
        75% {
          transform: scale(0.95) skewY(-30deg);
        }
        90% {
          transform: scale(1.02) skewY(-30deg);
        }
        100% {
          transform: scale(1) skewY(-30deg);
        }
      }

      @keyframes nbk-display {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      @keyframes nbk-load {
        0% {
          width: 0;
        }
        20% {
          width: 40px;
        }
        30% {
          width: 40px;
        }
        60% {
          width: 60px;
        }
        90% {
          width: 60px;
        }
        100% {
          width: 80px;
        }
      }

      @keyframes nbk-logoIn {
        0% {
          opacity: 0;
          filter: blur(5px);
          transform: scale(0.88);
        }
        100% {
          opacity: 1;
          filter: blur(0);
          transform: scale(1);
        }
      }

      @keyframes nbk-modal {
        0% {
          transform: scale(0) rotate(-30deg) skew(30deg);
          opacity: 0;
        }
        30% {
          transform: scale(1.1) rotate(-30deg) skew(30deg);
          opacity: 1;
        }
        45% {
          transform: scale(0.9) rotate(-30deg) skew(30deg);
          opacity: 1;
        }
        60% {
          transform: scale(1.05) rotate(-30deg) skew(30deg);
          opacity: 1;
        }
        75% {
          transform: scale(0.95) rotate(-30deg) skew(30deg);
          opacity: 1;
        }
        90% {
          transform: scale(1.02) rotate(-30deg) skew(30deg);
          opacity: 1;
        }
        100% {
          transform: scale(1) rotate(-30deg) skew(30deg);
          opacity: 1;
        }
      }

      @keyframes nbk-key {
        0% {
          transform: translate(60px, -60px);
          opacity: 0;
        }
        100% {
          transform: translate(0, 0);
          opacity: 1;
        }
      }

      @keyframes nbk-key1 {
        0% {
          transform: translate(20px, -20px);
          opacity: 0;
        }
        100% {
          transform: translate(0, 0);
          opacity: 1;
        }
      }

      @keyframes nbk-key2 {
        0% {
          transform: translate(40px, -40px);
          opacity: 0;
        }
        100% {
          transform: translate(0, 0);
          opacity: 1;
        }
      }

      @keyframes nbk-key3 {
        0% {
          transform: translate(80px, -80px);
          opacity: 0;
        }
        100% {
          transform: translate(0, 0);
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .nbk-macbook__topBord,
        .nbk-macbook__load,
        .nbk-macbook__load::after,
        .nbk-macbook__underBord,
        .nbk-keybord__keyBox .nbk-keybord__key,
        .nbk-keybord__key::before,
        .nbk-keybord__key::after,
        .nbk-keybord__keyBox--under .nbk-keybord__key,
        .nbk-macbook__screenLogo {
          animation: none !important;
        }

        .nbk-macbook__topBord {
          transform: scale(1) skewY(-30deg);
        }

        .nbk-macbook__underBord {
          transform: rotate(-30deg) skew(30deg);
          opacity: 1;
        }

        .nbk-keybord__keyBox .nbk-keybord__key,
        .nbk-keybord__key::before,
        .nbk-keybord__key::after,
        .nbk-keybord__keyBox--under .nbk-keybord__key {
          transform: translate(0, 0);
          opacity: 1;
        }

        .nbk-macbook__load {
          opacity: 0;
        }

        .nbk-macbook__screenLogo {
          opacity: 1;
          filter: blur(0);
          transform: scale(1);
        }
      }
    `}</style>

    <div className="nbk-scale">
      <div className="nbk-macbook">
        <div className="nbk-macbook__topBord">
          <div className="nbk-macbook__display">
            <img
              src="/logo-sistema.svg"
              alt=""
              className="nbk-macbook__screenLogo"
              loading="lazy"
            />
            <div className="nbk-macbook__load"></div>
          </div>
        </div>
        <div className="nbk-macbook__underBord">
          <div className="nbk-macbook__keybord">
            <div className="nbk-keybord">
              <div className="nbk-keybord__touchbar"></div>
              <ul className="nbk-keybord__keyBox">
                <li className="nbk-keybord__key nbk-key--01"></li>
                <li className="nbk-keybord__key nbk-key--02"></li>
                <li className="nbk-keybord__key nbk-key--03"></li>
                <li className="nbk-keybord__key nbk-key--04"></li>
                <li className="nbk-keybord__key nbk-key--05"></li>
                <li className="nbk-keybord__key nbk-key--06"></li>
                <li className="nbk-keybord__key nbk-key--07"></li>
                <li className="nbk-keybord__key nbk-key--08"></li>
                <li className="nbk-keybord__key nbk-key--09"></li>
                <li className="nbk-keybord__key nbk-key--10"></li>
                <li className="nbk-keybord__key nbk-key--11"></li>
                <li className="nbk-keybord__key nbk-key--12"></li>
                <li className="nbk-keybord__key nbk-key--13"></li>
              </ul>
              <ul className="nbk-keybord__keyBox--under">
                <li className="nbk-keybord__key nbk-key--14"></li>
                <li className="nbk-keybord__key nbk-key--15"></li>
                <li className="nbk-keybord__key nbk-key--16"></li>
                <li className="nbk-keybord__key nbk-key--17"></li>
                <li className="nbk-keybord__key nbk-key--18"></li>
                <li className="nbk-keybord__key nbk-key--19"></li>
                <li className="nbk-keybord__key nbk-key--20"></li>
                <li className="nbk-keybord__key nbk-key--21"></li>
                <li className="nbk-keybord__key nbk-key--22"></li>
                <li className="nbk-keybord__key nbk-key--23"></li>
                <li className="nbk-keybord__key nbk-key--24"></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

export default function AuthPage({
  authMode,
  setAuthMode,
  authError,
  authNotice,
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
  handlePasswordReset,
  handleRegister,
  handleGoogleAuth,
  handleOutlookAuth,
  handleLogout,
  isCompletingSocialProfile = false,
  forceOpenRegister = false,
  socialCompletionProvider = "",
  isMentoriaPerfil,
  setAuthError,
  setAuthNotice,
  PERFIS_LOGIN,
}) {
  const [showAuthModal, setShowAuthModal] = useState(Boolean(forceOpenRegister));
  const [scrolled, setScrolled] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfPwd, setShowRegConfPwd] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const lottieBgRef = useRef(null);
  const cycleLottieRefs = useRef([]);
  const cycleAnimations = [
    {
      path: "/lottieAnimated/Futuristic Virtual Reality Glasses Helmet.json",
      className:
        "absolute top-8 right-0 w-64 h-64 sm:w-80 sm:h-80 pointer-events-none opacity-95 z-0",
    },
    {
      path: "/lottieAnimated/Writing - Blue BG.json",
      className:
        "absolute top-14 left-0 w-56 h-56 sm:w-72 sm:h-72 pointer-events-none opacity-95 z-0",
    },
    {
      path: "/lottieAnimated/Industrial automatic Robot arms.json",
      className:
        "absolute bottom-16 right-24 w-64 h-64 sm:w-80 sm:h-80 pointer-events-none opacity-95 z-0",
    },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const handleViewportChange = (event) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  const shouldShowDecorativeLotties = !isMobileViewport;

  useEffect(() => {
    if (!forceOpenRegister) return;

    setAuthMode("register");
    setShowAuthModal(true);
    document.body.style.overflow = "hidden";
  }, [forceOpenRegister, setAuthMode]);

  useEffect(() => {
    if (!shouldShowDecorativeLotties) return undefined;

    let animation;
    if (lottieBgRef.current) {
      animation = lottie.loadAnimation({
        container: lottieBgRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: encodeURI("/lottieAnimated/Global Network.json"),
        rendererSettings: {
          preserveAspectRatio: "xMidYMid slice",
        },
      });
    }

    return () => {
      if (animation) animation.destroy();
    };
  }, [shouldShowDecorativeLotties]);

  useEffect(() => {
    if (!shouldShowDecorativeLotties) return undefined;

    const animations = [];
    cycleAnimations.forEach((item, index) => {
      const container = cycleLottieRefs.current[index];
      if (container) {
        animations.push(
          lottie.loadAnimation({
            container,
            renderer: "svg",
            loop: true,
            autoplay: true,
            path: encodeURI(item.path),
            rendererSettings: {
              preserveAspectRatio: "xMidYMid slice",
            },
          }),
        );
      }
    });

    return () => animations.forEach((animation) => animation.destroy());
  }, [shouldShowDecorativeLotties]);

  const openAuthModal = (mode) => {
    const nextMode = forceOpenRegister ? "register" : mode;
    setAuthMode(nextMode);
    setAuthError("");
    setAuthNotice(null);
    setShowAuthModal(true);
    document.body.style.overflow = "hidden";
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    document.body.style.overflow = "unset";
  };

  // Preparo de Dados
  const safePerfisLogin = PERFIS_LOGIN || [];
  const redeOptions = [
    { value: "estadual", label: "Rede Estadual" },
    { value: "municipal", label: "Rede Municipal" },
  ];
  const safeFilteredSchoolGroups = filteredSchoolGroups || [];
  const schoolOptions = safeFilteredSchoolGroups.map((group) => ({
    label: group.label,
    options: (group.units || []).map((unit) => ({
      value: unit.escola_id,
      label: unit.nome,
      unit,
    })),
  }));
  const hasSchoolError = String(authError || "")
    .toLowerCase()
    .includes("unidade escolar");
  const passwordChecks = getPasswordSecurityChecks(registerForm.senha, {
    email: registerForm.email,
    fullName: registerForm.nome,
  });
  const passwordStrength = getPasswordStrength(registerForm.senha, {
    email: registerForm.email,
    fullName: registerForm.nome,
  });
  const noticeClasses =
    authNotice?.tone === "success"
      ? "bg-emerald-300"
      : authNotice?.tone === "warning"
        ? "bg-yellow-300"
        : "bg-sky-300";
  const normalizedRegisterEmail = String(registerForm.email || "")
    .trim()
    .toLowerCase();
  const canUseMentorProfile = /@enova\.educacao\.ba\.gov\.br$/.test(
    normalizedRegisterEmail,
  );
  const socialProviderLabel =
    String(socialCompletionProvider || "").toLowerCase() === "google"
      ? "Google"
      : String(socialCompletionProvider || "").toLowerCase() === "microsoft"
        ? "Microsoft"
        : "conta social";
  useEffect(() => {
    if (typeof isMentoriaPerfil !== "function") return;
    if (canUseMentorProfile) return;
    if (!isMentoriaPerfil(registerForm.perfil)) return;

    setRegisterForm((prev) => ({
      ...prev,
      perfil: "estudante",
    }));
  }, [
    canUseMentorProfile,
    isMentoriaPerfil,
    registerForm.perfil,
    setRegisterForm,
  ]);

  return (
    <div className="relative min-h-screen w-full font-sans text-slate-900 bg-home bg-cover selection:bg-teal-400 selection:text-slate-900 overflow-x-hidden">
      {/* PADRÃO DE FUNDO - PONTILHADO SÓLIDO */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiM5NGEzYjgiLz48L3N2Zz4=')] opacity-20"></div>
      </div>

      {/* NAVBAR SÓLIDA */}
      <nav
        className={
          "fixed top-0 w-full z-40 transition-all duration-200 bg-[#FAFAFA] border-b-4 border-slate-900 "
        }
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 py-3">
              <img
                src="/images/Secti_Vertical.png"
                alt="SECTI"
                className="h-20 object-contain opacity-95 hover:opacity-100 transition-opacity duration-300"
                loading="lazy"
              />
            </div>

            <div className="flex items-center gap-4">
              <SolidButton
                onClick={() => openAuthModal("login")}
                className="hidden md:block px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Entrar
              </SolidButton>
              <SolidButton
                onClick={() => openAuthModal("register")}
                color="bg-teal-400"
              >
                Começar Agora
              </SolidButton>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION NEO-BRUTALISTA */}
      <section className="relative min-h-[95vh] flex items-center pt-32 pb-20 px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Texto Principal */}
          <div className="text-center lg:text-left space-y-8 relative z-20">
            <Reveal delay={100}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-400 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] mb-2 transform -rotate-2">
                <Asterisk className="w-4 h-4 text-slate-900 stroke-[3]" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                  Acelere suas ideias
                </span>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <h1 className="text-5xl sm:text-7xl lg:text-[5rem] font-black text-slate-900 leading-[1.1] tracking-tight">
                Crie. <br />
                Pesquise. <br />
                <span className="inline-block bg-teal-400 px-4 py-1 mt-2 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] transform rotate-1">
                  Transforme.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={300}>
              <p className="text-lg sm:text-xl text-slate-800 font-bold max-w-lg mx-auto lg:mx-0 leading-relaxed border-l-4 border-slate-900 pl-4 bg-white p-4 rounded-r-xl border-y-2 border-r-2 shadow-[4px_4px_0px_0px_#0f172a]">
                A ciência sai da teoria e ganha vida. Um ambiente criativo para
                alunos e professores da Bahia desenvolverem projetos reais.
              </p>
            </Reveal>

            <Reveal delay={400}>
              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start pt-4">
                <SolidButton
                  onClick={() => openAuthModal("register")}
                  color="bg-yellow-300"
                  className="text-lg px-10 py-5"
                >
                  Criar meu Projeto{" "}
                  <ArrowRight className="w-6 h-6 stroke-[3]" />
                </SolidButton>
              </div>
            </Reveal>
          </div>

          {/* Gráficos Sólidos Flutuantes */}
            <div className="relative hidden lg:flex w-full h-[980px] items-center justify-end pr-16">
              <HeroNotebook />
            </div>
        </div>
      </section>

      {/* SEÇÃO DE FERRAMENTAS */}
      <section className="py-24 px-6 lg:px-8 relative z-10 border-y-4 border-slate-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.22) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        ></div>
        {shouldShowDecorativeLotties &&
          cycleAnimations.map((item, index) => (
            <div key={item.path} className={item.className} aria-hidden="true">
              <div
                ref={(el) => {
                  cycleLottieRefs.current[index] = el;
                }}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ))}
        <div className="max-w-7xl mx-auto relative z-10">
          <Reveal>
            <div className="flex flex-col lg:flex-row justify-between items-end mb-16 border-b-4 border-slate-900 pb-8 gap-8">
              <div>
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                  O Ciclo da <br />
                  <span className="bg-yellow-300 px-4 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] transform -rotate-2 inline-block mt-3">
                    Inovação
                  </span>
                </h2>
              </div>
              <p className="text-xl text-slate-700 font-bold max-w-md text-left lg:text-right">
                Quatro estágios para transformar sua curiosidade científica em
                tecnologia real.
              </p>
            </div>
          </Reveal>

          <div className="space-y-6">
            {/* Cartões Escalonados (Staggered Vertical List) */}
            {[
              {
                num: "01",
                iconSrc: "/iconesSidebar/colabtec.svg",
                title: "Descobrir",
                desc: "Mão na massa no ColabTec. Registre suas hipóteses e valide seus experimentos em tempo real num ambiente estruturado.",
                color: "bg-teal-400",
                offset: "md:ml-0",
              },
              {
                num: "02",
                iconSrc: "/iconesSidebar/CafeDigital.svg",
                title: "Conectar",
                desc: "Sinergia total no POP Café. Encontre sua tribo, conecte-se com mentores e colabore sem fronteiras.",
                color: "bg-blue-400",
                offset: "md:ml-12 lg:ml-24",
              },
              {
                num: "03",
                iconSrc: "/iconesSidebar/patenteslab.svg",
                title: "Proteger",
                desc: "Segurança via PatentesLab. Sua ideia tem valor e nós ajudamos a blindá-la legalmente com a documentação certa.",
                color: "bg-pink-400",
                offset: "md:ml-24 lg:ml-48",
              },
              {
                num: "04",
                iconSrc: "/iconesSidebar/trilha.svg",
                title: "Escalar",
                desc: "Mostre ao mundo na RBCC. Ganhe visibilidade em toda a rede estadual de ensino e inspire novos estudantes.",
                color: "bg-orange-400",
                offset: "md:ml-36 lg:ml-72",
              },
            ].map((item, idx) => (
              <Reveal key={idx} delay={idx * 100}>
                <div
                  className={`max-w-4xl ${item.offset} ${item.color} rounded-2xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#0f172a] transition-all`}
                >
                  <div className="w-20 h-20 shrink-0 rounded-xl bg-white border-4 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-3">
                    <img
                      src={item.iconSrc}
                      alt={item.title}
                      className="w-10 h-10 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-3">
                      {item.title}
                    </h3>
                    <p className="text-lg font-bold text-slate-900/80 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6 lg:px-8 relative z-10 border-y-4 border-slate-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.22) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        ></div>

        {shouldShowDecorativeLotties && (
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] sm:w-[36rem] sm:h-[36rem] pointer-events-none opacity-100 overflow-hidden z-20">
            <div ref={lottieBgRef} className="absolute inset-0 w-full h-full" />
          </div>
        )}

        <div className="max-w-6xl mx-auto relative z-10">
          <Reveal>
            <div className="bg-yellow-300 border-4 border-slate-900 shadow-[16px_16px_0px_0px_#0f172a] p-10 md:p-16 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-12 transform hover:rotate-0 hover:-translate-y-2 hover:shadow-[24px_24px_0px_0px_#0f172a] transition-all duration-300">
              {/* Conteúdo Esquerda */}
              <div className="flex-1 text-center md:text-left space-y-6">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform ">
                  <Asterisk className="w-5 h-5 text-slate-900 stroke-[3]" />
                  <span className="font-black uppercase tracking-widest text-sm text-slate-900">
                    O Futuro Começa Aqui
                  </span>
                </div>

                <h2 className="text-6xl md:text-[5rem] lg:text-[6rem] font-black text-slate-900 uppercase tracking-tighter leading-[0.9]">
                  Vamos <br />
                  <span className="text-white [-webkit-text-stroke:2px_#0f172a] sm:[-webkit-text-stroke:3px_#0f172a]">
                    Inovar?
                  </span>
                </h2>

                <p className="text-2xl font-bold text-slate-800 max-w-md mx-auto md:mx-0">
                  Junte-se a mentes brilhantes e transforme a sua escola.
                </p>
              </div>

              {/* Botão e Info Direita */}
              <div className="shrink-0 flex flex-col items-center gap-6">
                <SolidButton
                  onClick={() => openAuthModal("register")}
                  color="bg-teal-400"
                  className="text-3xl sm:text-4xl px-12 py-8 animate-pulse shadow-[8px_8px_0px_0px_#0f172a] hover:shadow-[12px_12px_0px_0px_#0f172a]"
                >
                  Criar Conta
                </SolidButton>

                <p className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2 bg-white px-4 py-2 border-2 border-slate-900 rounded-full">
                  <Lock className="w-4 h-4 stroke-[3]" /> 100% Gratuito
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MODAL DE AUTENTICAÇÃO NEO-BRUTALISTA */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop Escuro Sólido */}
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={closeAuthModal}
          ></div>

          {/* Container do Modal */}
          <div
            className="relative w-full max-w-[1000px] h-[92vh] sm:h-[85vh] rounded-3xl bg-[#FAFAFA] border-4 border-slate-900 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-[0.95] duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fechar Modal */}
            <button
              onClick={closeAuthModal}
              className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:bg-slate-100 flex items-center justify-center text-slate-900 transition-colors z-50 hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[2px_2px_0px_0px_#0f172a] active:shadow-none active:translate-y-1 active:translate-x-1"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Painel Esquerdo (Amarelo Vibrante) */}
            <div className="hidden md:flex md:w-5/12 bg-yellow-300 relative flex-col justify-between p-12 border-r-4 border-slate-900">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwZjE3MmEiLz48L3N2Zz4=')] opacity-10 mix-blend-overlay"></div>

              <div className="relative z-10">
                <div className="rounded-xl bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center mb-8">
                  <img
                    src="/images/Secti_Vertical.png"
                    alt="SECTI"
                    className="h-20 object-contain opacity-95 hover:opacity-100 transition-opacity duration-300"
                    loading="lazy"
                  />
                  <img
                    src="/logo-sistema.svg"
                    alt="SECTI"
                    className="w-[140px] object-contain opacity-95 hover:opacity-100 transition-opacity duration-300"
                    loading="lazy"
                  />
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-6 leading-none tracking-tight">
                  Bem-vindo à <br />
                  <span className="bg-white px-2 mt-2 inline-block border-2 border-slate-900 -rotate-2">
                    Inovação.
                  </span>
                </h2>
                <p className="text-slate-800 font-bold text-lg leading-relaxed">
                  O seu laboratório digital oficial. Junte-se a projetos
                  criativos e conecte-se com mentes brilhantes da Bahia.
                </p>
              </div>

              <div className="relative z-10 bg-white p-6 rounded-xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a]">
                <p className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">
                  Acesso Protegido
                </p>
                <p className="text-xs text-slate-700 font-bold">
                  Plataforma criptografada para segurança total dos seus dados e
                  projetos.
                </p>
              </div>
            </div>

            {/* Painel Direito: Formulário */}
            <div className="md:w-7/12 h-full overflow-y-auto bg-[#FAFAFA] p-8 sm:p-12">
              <div className="max-w-[480px] mx-auto">
                {/* Abas Estilo Botão Sólido */}
                {!isCompletingSocialProfile ? (
                <div className="flex gap-4 mb-10">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                      setAuthNotice(null);
                    }}
                    className={`flex-1 py-3 text-sm font-black rounded-xl border-2 border-slate-900 transition-all ${
                      authMode === "login"
                        ? "bg-teal-400 shadow-[4px_4px_0px_0px_#0f172a] translate-y-0"
                        : "bg-white shadow-none text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                      setAuthNotice(null);
                    }}
                    className={`flex-1 py-3 text-sm font-black rounded-xl border-2 border-slate-900 transition-all ${
                      authMode === "register"
                        ? "bg-blue-400 shadow-[4px_4px_0px_0px_#0f172a] translate-y-0 text-slate-900"
                        : "bg-white shadow-none text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Criar Conta
                  </button>
                </div>
                ) : (
                  <div className="mb-10 rounded-xl border-2 border-slate-900 bg-yellow-300 p-4 shadow-[4px_4px_0px_0px_#0f172a]">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                      Cadastro Pendente
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-2">
                      Você entrou com {socialProviderLabel}. Complete os dados para finalizar seu cadastro.
                    </p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-3 text-xs font-black uppercase tracking-wider underline underline-offset-4 text-slate-900 hover:text-teal-700"
                    >
                      Sair desta conta
                    </button>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                    {isCompletingSocialProfile
                      ? "Quase lá!"
                      : authMode === "login"
                        ? "Olá de novo!"
                        : "Vamos nessa!"}
                  </h3>
                  <p className="text-slate-600 font-bold">
                    {isCompletingSocialProfile
                      ? "Preencha os dados de cadastro para liberar seu acesso."
                      : authMode === "login"
                        ? "Pronto para continuar pesquisando?"
                        : "Crie sua credencial em segundos."}
                  </p>
                </div>

                {authNotice?.message && (
                  <div
                    className={`mb-6 rounded-xl border-2 border-slate-900 ${noticeClasses} p-4 flex items-center gap-3 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] animate-in fade-in`}
                  >
                    <div className="font-black text-xl">i</div>
                    <p className="text-sm font-black">{authNotice.message}</p>
                  </div>
                )}

                {authError && (
                  <div className="mb-6 rounded-xl border-2 border-slate-900 bg-red-400 p-4 flex items-center gap-3 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] animate-in fade-in">
                    <div className="font-black text-xl">!</div>
                    <p className="text-sm font-black">{authError}</p>
                  </div>
                )}

                {!isCompletingSocialProfile && (
                  <div className="space-y-3 mb-6">
                    <SolidButton
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isSubmitting}
                      color="bg-white"
                      className="w-full"
                    >
                      <GoogleIcon />
                      Continuar com Google
                    </SolidButton>
                  </div>
                )}

                {!isCompletingSocialProfile && (
                  <div className="mb-8">
                    <div className="flex items-center gap-4 my-8">
                      <div className="flex-1 border-t-2 border-slate-900"></div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                        Ou
                      </span>
                      <div className="flex-1 border-t-2 border-slate-900"></div>
                    </div>
                  </div>
                )}

                {/* === FORM DE LOGIN === */}
                {authMode === "login" && (
                  <form
                    onSubmit={handleLogin}
                    className="animate-in fade-in duration-300"
                  >
                    <SolidInput
                      icon={Mail}
                      label="Endereço de e-mail"
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                    <div className="relative">
                      <SolidInput
                        icon={Lock}
                        label="Senha secreta"
                        type={showLoginPwd ? "text" : "password"}
                        autoComplete="current-password"
                        value={loginForm.senha}
                        onChange={(e) =>
                          setLoginForm((prev) => ({
                            ...prev,
                            senha: e.target.value,
                          }))
                        }
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 hover:text-teal-500 font-black text-xs uppercase tracking-wider"
                        onClick={() => setShowLoginPwd(!showLoginPwd)}
                      >
                        {showLoginPwd ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>

                    <div className="mb-6 rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_#0f172a]">
                      <SolidCheckbox
                        label="Manter sessão neste dispositivo"
                        checked={loginForm.rememberDevice || false}
                        onChange={(e) =>
                          setLoginForm((prev) => ({
                            ...prev,
                            rememberDevice: e.target.checked,
                          }))
                        }
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold text-slate-700">
                          Em computador compartilhado, deixe essa opção
                          desmarcada.
                        </p>
                        <button
                          type="button"
                          onClick={handlePasswordReset}
                          disabled={isSubmitting}
                          className="text-xs font-black uppercase tracking-wider text-slate-900 underline underline-offset-4 hover:text-teal-600 disabled:opacity-50"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                    </div>

                    <SolidButton
                      type="submit"
                      disabled={isSubmitting}
                      color="bg-teal-400"
                      className="w-full mt-4"
                    >
                      {isSubmitting ? (
                        <LoaderCircle className="w-6 h-6 animate-spin" />
                      ) : (
                        "Entrar na Plataforma"
                      )}
                    </SolidButton>

                  </form>
                )}

                {/* === FORM DE CADASTRO === */}
                {authMode === "register" && (
                  <form
                    onSubmit={handleRegister}
                    className="animate-in fade-in duration-300"
                  >
                    <SolidInput
                      icon={User}
                      label="Nome Completo *"
                      autoComplete="name"
                      value={registerForm.nome}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          nome: e.target.value,
                        }))
                      }
                      required
                    />
                    <SolidInput
                      icon={Mail}
                      label="E-mail de Contato *"
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={registerForm.email}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      readOnly={isCompletingSocialProfile}
                      required
                    />
                    {isCompletingSocialProfile && (
                      <p className="mb-4 mt-[-8px] text-xs font-bold text-slate-700">
                        O e-mail segue o mesmo da conta {socialProviderLabel}.
                      </p>
                    )}

                    {/* Select Sólido */}
                    <div className="relative mb-5 group">
                      <label className="absolute left-12 -top-3 bg-[#FAFAFA] px-2 text-xs font-bold text-slate-900 border-2 border-slate-900 rounded-md shadow-[2px_2px_0px_0px_#0f172a] z-10 pointer-events-none">
                        Quem é você? *
                      </label>
                      <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-12 text-slate-900 z-10 pointer-events-none">
                        <Users className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <select
                        value={registerForm.perfil || ""}
                        onChange={(e) => {
                          const novoPerfil = e.target.value;
                          const isEstudante =
                            novoPerfil.toLowerCase().includes("estudante") ||
                            novoPerfil.toLowerCase().includes("aluno");
                          const needsExtra =
                            (typeof isMentoriaPerfil === "function"
                              ? isMentoriaPerfil(novoPerfil)
                              : false) || isEstudante;
                          setRegisterForm((prev) => ({
                            ...prev,
                            perfil: novoPerfil,
                            matricula: needsExtra ? prev.matricula : "",
                            lattes: needsExtra ? prev.lattes : "",
                          }));
                        }}
                        className="w-full bg-white outline-none text-slate-900 text-sm font-bold py-4 pl-12 pr-10 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] focus:shadow-[4px_4px_0px_0px_#14b8a6] focus:-translate-y-1 focus:-translate-x-1 transition-all appearance-none cursor-pointer relative z-0"
                        required
                      >
                        <option value="" disabled>
                          Selecione seu perfil
                        </option>
                        {safePerfisLogin.map((opt) => {
                          const isMentorOption =
                            typeof isMentoriaPerfil === "function" &&
                            isMentoriaPerfil(opt.value);
                          const shouldDisableMentorOption =
                            isMentorOption && !canUseMentorProfile;

                          return (
                            <option
                              key={opt.value}
                              value={opt.value}
                              disabled={shouldDisableMentorOption}
                            >
                              {opt.label}
                              {shouldDisableMentorOption
                                ? " (exige e-mail Enova)"
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-900 stroke-[3] pointer-events-none z-10" />
                    </div>
                    {!canUseMentorProfile && (
                      <p className="mb-4 mt-[-8px] text-xs font-bold text-slate-700">
                        Perfis orientador e coorientador exigem e-mail
                        @enova.educacao.ba.gov.br.
                      </p>
                    )}

                    <div className="space-y-2 mb-6 p-4 border-2 border-slate-900 bg-white rounded-xl shadow-[4px_4px_0px_0px_#0f172a]">
                      <SolidCheckbox
                        label="Sou bolsista da FAPESB"
                        checked={registerForm.recebeBolsaFAPESB || false}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            recebeBolsaFAPESB: e.target.checked,
                          }))
                        }
                      />
                      <SolidCheckbox
                        label="Participo do programa +Ciência"
                        checked={registerForm.recebeIncentivo || false}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            recebeIncentivo: e.target.checked,
                          }))
                        }
                      />
                    </div>

                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isCompletingSocialProfile ? "hidden" : ""}`}
                    >
                      <div className="relative">
                        <SolidInput
                          icon={Lock}
                          label="Crie uma Senha *"
                          type={showRegPwd ? "text" : "password"}
                          autoComplete="new-password"
                          minLength={PASSWORD_MIN_LENGTH}
                          value={registerForm.senha}
                          onChange={(e) =>
                            setRegisterForm((prev) => ({
                              ...prev,
                              senha: e.target.value,
                            }))
                          }
                          required={!isCompletingSocialProfile}
                        />
                      </div>
                      <div className="relative">
                        <SolidInput
                          icon={ShieldCheck}
                          label="Confirme *"
                          type={showRegConfPwd ? "text" : "password"}
                          autoComplete="new-password"
                          value={registerForm.confirmarSenha}
                          onChange={(e) =>
                            setRegisterForm((prev) => ({
                              ...prev,
                              confirmarSenha: e.target.value,
                            }))
                          }
                          required={!isCompletingSocialProfile}
                        />
                      </div>
                    </div>

                    <div
                      className={`mb-6 mt-3 rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_#0f172a] ${isCompletingSocialProfile ? "hidden" : ""}`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                          Segurança da senha
                        </span>
                        <span
                          className={`rounded-full border-2 border-slate-900 px-3 py-1 text-xs font-black uppercase ${
                            passwordStrength.tone === "emerald"
                              ? "bg-emerald-300"
                              : passwordStrength.tone === "amber"
                                ? "bg-yellow-300"
                                : "bg-rose-300"
                          }`}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {passwordChecks.map((check) => (
                          <div
                            key={check.id}
                            className="flex items-center gap-3 text-sm font-bold text-slate-800"
                          >
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-md border-2 border-slate-900 text-xs font-black ${
                                check.passed ? "bg-emerald-300" : "bg-slate-100"
                              }`}
                            >
                              {check.passed ? "OK" : "--"}
                            </span>
                            <span>{check.label}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-xs font-bold text-slate-700">
                        Prefira uma frase longa e única. Sem reutilizar senha de
                        outro serviço.
                      </p>
                    </div>
                    {isCompletingSocialProfile && (
                      <div className="mb-6 mt-3 rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_#0f172a]">
                        <p className="text-xs font-bold text-slate-700">
                          Sua senha é gerenciada pela conta {socialProviderLabel}.
                        </p>
                      </div>
                    )}

                    {/* Dados Acadêmicos Adicionais */}
                    {((typeof isMentoriaPerfil === "function"
                      ? isMentoriaPerfil(registerForm.perfil)
                      : false) ||
                      (registerForm.perfil || "")
                        .toLowerCase()
                        .includes("estudante") ||
                      (registerForm.perfil || "")
                        .toLowerCase()
                        .includes("aluno")) && (
                      <div className="bg-pink-300 p-5 rounded-xl border-4 border-slate-900 mb-6 mt-2 shadow-[6px_6px_0px_0px_#0f172a] animate-in slide-in-from-top-4">
                        <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                          <BookOpen className="w-5 h-5 stroke-[2.5]" /> Dados
                          Acadêmicos
                        </h4>
                        <SolidInput
                          icon={ExternalLink}
                          label="Link Lattes (Opcional)"
                          type="url"
                          value={registerForm.lattes}
                          onChange={(e) =>
                            setRegisterForm((prev) => ({
                              ...prev,
                              lattes: e.target.value,
                            }))
                          }
                        />
                        <div className="mb-[-20px]">
                          <SolidInput
                            icon={User}
                            label="Número de Matrícula *"
                            value={registerForm.matricula}
                            onChange={(e) =>
                              setRegisterForm((prev) => ({
                                ...prev,
                                matricula: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Vínculo Escolar */}
                    <div className="bg-blue-300 p-5 rounded-xl border-4 border-slate-900 mb-6 shadow-[6px_6px_0px_0px_#0f172a]">
                      <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <School className="w-5 h-5 stroke-[2.5]" /> Vínculo
                        Escolar
                      </h4>

                      <div className="relative mb-5">
                        <label className="absolute left-4 -top-3 bg-blue-300 px-2 text-xs font-bold text-slate-900 border-2 border-slate-900 rounded-md z-10 pointer-events-none">
                          Rede de Ensino *
                        </label>
                        <select
                          value={registerForm.rede_administrativa || "estadual"}
                          onChange={(e) => {
                            const novaRede =
                              e.target.value === "municipal"
                                ? "municipal"
                                : "estadual";
                            setRegisterForm((prev) => ({
                              ...prev,
                              rede_administrativa: novaRede,
                              escola_id: "",
                              escola_nome: "",
                            }));
                            setSchoolSearchTerm("");
                          }}
                          className="w-full bg-white outline-none text-slate-900 font-bold text-sm py-3.5 pl-4 pr-10 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] appearance-none cursor-pointer focus:-translate-y-1 focus:-translate-x-1 transition-transform"
                        >
                          {redeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-900 stroke-[3] pointer-events-none" />
                      </div>

                      <div className="mb-5">
                        <SolidInput
                          icon={Search}
                          label="Buscar unidade escolar"
                          type="search"
                          value={schoolSearchTerm}
                          onChange={(e) => setSchoolSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <label
                          className={`absolute left-4 -top-3 px-2 text-xs font-bold rounded-md border-2 border-slate-900 z-10 pointer-events-none ${hasSchoolError ? "bg-red-400 text-slate-900" : "bg-blue-300 text-slate-900"}`}
                        >
                          Qual Unidade? *
                        </label>
                        <select
                          value={registerForm.escola_id || ""}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            if (!selectedId) {
                              setRegisterForm((prev) => ({
                                ...prev,
                                escola_id: "",
                                escola_nome: "",
                              }));
                              return;
                            }
                            const allOptions = schoolOptions.flatMap(
                              (g) => g.options,
                            );
                            const selectedOption = allOptions.find(
                              (o) => String(o.value) === String(selectedId),
                            );
                            setRegisterForm((prev) => ({
                              ...prev,
                              escola_id: selectedId,
                              escola_nome: selectedOption?.label || "",
                            }));
                          }}
                          className={`w-full bg-white outline-none text-slate-900 font-bold text-sm py-3.5 pl-4 pr-10 rounded-xl border-2 transition-transform appearance-none cursor-pointer focus:-translate-y-1 focus:-translate-x-1 ${hasSchoolError ? "border-red-500 shadow-[4px_4px_0px_0px_#ef4444]" : "border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]"}`}
                        >
                          <option value="" disabled>
                            Buscar na lista...
                          </option>
                          {schoolOptions.map((group) => (
                            <optgroup
                              key={group.label}
                              label={group.label}
                              className="bg-slate-100 text-slate-900 font-black"
                            >
                              {group.options.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                  className="bg-white font-bold"
                                >
                                  {option.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-900 stroke-[3] pointer-events-none" />
                      </div>
                    </div>

                    <SolidButton
                      type="submit"
                      disabled={isSubmitting}
                      color="bg-blue-400"
                      className="w-full mt-6"
                    >
                      {isSubmitting ? (
                        <LoaderCircle className="w-6 h-6 animate-spin" />
                      ) : (
                        "Concluir Cadastro"
                      )}
                    </SolidButton>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


