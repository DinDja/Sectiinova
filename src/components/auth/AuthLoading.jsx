import React from "react";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans text-slate-900 overflow-hidden relative bg-[radial-gradient(circle_at_10%_20%,rgba(45,212,191,0.2),transparent_35%),radial-gradient(circle_at_90%_5%,rgba(96,165,250,0.14),transparent_30%),linear-gradient(180deg,#fefce8_0%,#f8fafc_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.1)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

      <div className="sr-only" role="status" aria-live="polite">
        Autenticando, aguarde...
      </div>

      <style>{`
        .loading-wide {
          width: 150px;
          height: 150px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .color {
          background-color: var(--auth-secondary, #60a5fa);
          box-shadow: 0 0 10px rgba(96, 165, 250, 0.6);
        }

        .l1,
        .l2,
        .e1,
        .e2,
        .e4,
        .e5,
        .e7,
        .e8 {
          border-radius: 4px;
          position: absolute;
        }

        .l1 {
          width: 15px;
          height: 65px;
          animation: move-h 1.2s infinite cubic-bezier(0.65, 0.05, 0.36, 1);
        }

        .l2 {
          width: 15px;
          height: 60px;
          transform: rotate(90deg);
          animation: move-v 1.2s infinite cubic-bezier(0.65, 0.05, 0.36, 1);
        }

        @keyframes move-h {
          0% {
            top: 0;
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          50% {
            top: 30%;
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }

        @keyframes move-v {
          0% {
            left: 0;
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          50% {
            left: 45%;
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        .animation-effect-light,
        .animation-effect-light-d {
          animation: effect 0.3s infinite linear;
        }

        .animation-effect-light {
          animation-duration: 0.2s;
          animation-delay: 0.1s;
        }

        .animation-effect-light-d {
          animation-duration: 0.3s;
          animation-delay: 0.2s;
        }

        .animation-effect-rot {
          animation: rot 0.8s infinite cubic-bezier(0.65, 0.05, 0.36, 1);
        }

        .animation-effect-scale {
          animation: scale 0.8s infinite cubic-bezier(0.65, 0.05, 0.36, 1);
        }

        @keyframes effect {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes rot {
          0% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes scale {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.9);
          }
          100% {
            transform: scale(1);
          }
        }

        .e1 {
          width: 1px;
          height: 40px;
          opacity: 0.3;
          top: 0;
          left: 8%;
        }

        .e2 {
          width: 60px;
          height: 1px;
          opacity: 0.8;
          top: 8%;
          left: 0;
        }

        .e3 {
          position: absolute;
          top: 10%;
          left: 12%;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-weight: 900;
          font-size: 18px;
          color: var(--auth-secondary, #60a5fa);
          text-shadow: 0 0 5px rgba(96, 165, 250, 0.45);
        }

        .e4 {
          width: 1px;
          height: 40px;
          opacity: 0.3;
          top: 90%;
          right: 10%;
        }

        .e5 {
          width: 40px;
          height: 1px;
          opacity: 0.3;
          top: 100%;
          right: 0;
        }

        .e6 {
          position: absolute;
          top: 100%;
          right: 0;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-size: 32px;
          color: var(--auth-secondary, #60a5fa);
          text-shadow: 0 0 5px rgba(96, 165, 250, 0.45);
        }

        .e7 {
          width: 1px;
          height: 20px;
          position: absolute;
          bottom: 0;
          left: 0;
          transform: rotate(45deg);
          animation: height 1s infinite cubic-bezier(0.65, 0.05, 0.36, 1);
        }

        @keyframes height {
          0% {
            bottom: 0%;
            left: 0%;
            height: 0px;
          }
          25% {
            height: 90px;
          }
          50% {
            bottom: 100%;
            left: 100%;
            height: 90px;
          }
          75% {
            height: 0px;
          }
          100% {
            bottom: 0%;
            left: 0%;
            height: 0px;
          }
        }

        .e8 {
          width: 20px;
          height: 1px;
          position: absolute;
          bottom: 50%;
          left: 0;
          animation: width 1.5s infinite cubic-bezier(0.65, 0.05, 0.36, 1);
        }

        @keyframes width {
          0% {
            left: 0%;
            width: 0px;
          }
          50% {
            left: 100%;
            width: 90px;
          }
          100% {
            left: 0%;
            width: 0px;
          }
        }

        .dots::after {
          content: "";
          animation: ellipsis 1.5s infinite;
        }

        @keyframes ellipsis {
          0% {
            content: "";
          }
          25% {
            content: ".";
          }
          50% {
            content: "..";
          }
          75% {
            content: "...";
          }
          100% {
            content: "";
          }
        }
      `}</style>

      <div className="relative z-10 p-8 sm:p-12 rounded-3xl border-4 border-slate-900 bg-[#FAFAFA] shadow-[10px_10px_0px_0px_#0f172a] flex flex-col items-center gap-10">
        <div className="loading">
          <div className="loading-wide">
            <div className="l1 color"></div>
            <div className="l2 color"></div>
            <div className="e1 color animation-effect-light"></div>
            <div className="e2 color animation-effect-light-d"></div>
            <div className="e3 animation-effect-rot">X</div>
            <div className="e4 color animation-effect-light"></div>
            <div className="e5 color animation-effect-light-d"></div>
            <div className="e6 animation-effect-scale">*</div>
            <div className="e7 color"></div>
            <div className="e8 color"></div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-black tracking-widest text-slate-900 uppercase">
            Autenticando<span className="dots text-teal-600"></span>
          </h1>
          <p className="text-slate-700 text-sm font-bold tracking-wide">
            Verificando credenciais e <br />
            a estabelecer ligacao segura.
          </p>
        </div>
      </div>
    </div>
  );
}
