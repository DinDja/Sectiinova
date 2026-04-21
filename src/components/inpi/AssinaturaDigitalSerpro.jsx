import React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ExternalLink,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";

export default function AssinaturaDigitalSerpro({ viewMode = "leitura_rapida" }) {
  const quickCards = [
    {
      title: "Por que o INPI exige assinatura digital",
      text:
        "No deposito eletronico no e-Patentes, o INPI exige certificado digital ICP-Brasil para assinatura dos documentos, feita pelo responsavel legal (depositante ou procurador).",
      icon: <ShieldCheck className="w-6 h-6 stroke-[3]" />,
      color: "bg-teal-400",
    },
    {
      title: "Como conseguir no Serpro (resumo)",
      text:
        "No SerproID, o fluxo oficial e: pagamento, agendamento na Autoridade de Registro, validacao documental e emissao do certificado para uso no app.",
      icon: <BadgeCheck className="w-6 h-6 stroke-[3]" />,
      color: "bg-yellow-300",
    },
    {
      title: "Documentos que voce precisa separar",
      text:
        "Pessoa fisica: documento com foto e demais comprovacoes quando exigidas. Pessoa juridica: documentos da PJ + documentos do responsavel.",
      icon: <FileCheck2 className="w-6 h-6 stroke-[3]" />,
      color: "bg-pink-400",
    },
    {
      title: "Risco comum",
      text:
        "Deixar para emitir o certificado na ultima hora. Isso costuma travar o envio final do pedido quando chega a etapa de assinatura.",
      icon: <AlertTriangle className="w-6 h-6 stroke-[3]" />,
      color: "bg-orange-400",
    },
  ];

  const detailedSteps = [
    "Defina quem sera o assinante legal do pedido (depositante ou procurador).",
    "Escolha o tipo de certificado: e-CPF (pessoa fisica) ou e-CNPJ (pessoa juridica).",
    "Siga o fluxo de contratacao do SerproID: pagamento, agendamento na AR e validacao de documentos.",
    "Apos emissao, faca o primeiro acesso e teste a assinatura antes do protocolo no INPI.",
    "No envio do pedido no e-Patentes, assine digitalmente com certificado ICP-Brasil valido.",
  ];

  if (viewMode === "leitura_rapida") {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div className="rounded-[2rem] border-4 border-slate-900 bg-white p-8 md:p-10 shadow-[10px_10px_0px_0px_#0f172a]">
          <p className="inline-flex items-center gap-2 border-2 border-slate-900 bg-lime-300 px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#0f172a]">
            Assinatura digital
          </p>
          <h2 className="mt-4 text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-900">
            Como conseguir no Serpro e por que ela e obrigatoria
          </h2>
          <p className="mt-4 text-sm md:text-base font-bold text-slate-700 bg-slate-100 border-2 border-slate-900 rounded-xl p-4">
            Esta aba foi feita para iniciantes. Ela explica em linguagem direta
            o motivo da exigencia no INPI e o caminho pratico para emitir seu
            certificado digital no Serpro.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {quickCards.map((card) => (
            <article
              key={card.title}
              className={`rounded-2xl border-4 border-slate-900 p-6 shadow-[6px_6px_0px_0px_#0f172a] ${card.color}`}
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-xl border-2 border-slate-900 bg-white p-3">
                {card.icon}
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                {card.title}
              </h3>
              <p className="mt-3 text-sm font-bold text-slate-900 leading-relaxed bg-white/70 border-2 border-slate-900 rounded-xl p-3">
                {card.text}
              </p>
            </article>
          ))}
        </div>

        <div className="rounded-[2rem] border-4 border-slate-900 bg-white p-8 shadow-[8px_8px_0px_0px_#0f172a]">
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">
            Links oficiais
          </h3>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.gov.br/inpi/es/servicios/patentes/guia-basica/manual-para-o-depositante-de-patentes.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[3px_3px_0px_0px_#0f172a]"
            >
              Manual do INPI <ExternalLink className="w-4 h-4 stroke-[3]" />
            </a>
            <a
              href="https://centraldeajuda.serpro.gov.br/serproid/comocontratar/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-teal-400 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[3px_3px_0px_0px_#0f172a]"
            >
              Como contratar no Serpro <ExternalLink className="w-4 h-4 stroke-[3]" />
            </a>
            <a
              href="https://www.serpro.gov.br/links-fixos-superiores/assinador-digital/assinador-serpro"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-pink-400 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[3px_3px_0px_0px_#0f172a]"
            >
              Assinador Serpro <ExternalLink className="w-4 h-4 stroke-[3]" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="rounded-[2rem] border-4 border-slate-900 bg-white p-8 md:p-10 shadow-[10px_10px_0px_0px_#0f172a]">
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900">
          Guia tecnico: assinatura digital (Serpro + INPI)
        </h2>
        <p className="mt-4 text-sm md:text-base font-bold text-slate-700 bg-slate-100 border-2 border-slate-900 rounded-xl p-4">
          No e-Patentes, o INPI indica uso de certificacao digital ICP-Brasil no
          deposito eletronico e destaca que a assinatura deve ser do responsavel
          legal pelo pedido (depositante ou procurador).
        </p>
      </div>

      <div className="rounded-[2rem] border-4 border-slate-900 bg-lime-300 p-8 md:p-10 shadow-[10px_10px_0px_0px_#0f172a]">
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-6">
          Passo a passo no Serpro
        </h3>
        <ol className="space-y-4">
          {detailedSteps.map((step, index) => (
            <li
              key={step}
              className="rounded-xl border-4 border-slate-900 bg-white p-4 shadow-[3px_3px_0px_0px_#0f172a]"
            >
              <p className="text-sm font-bold text-slate-900 leading-relaxed">
                <span className="mr-2 inline-flex min-w-[28px] items-center justify-center rounded-md border-2 border-slate-900 bg-yellow-300 px-2 py-1 text-[11px] font-black uppercase tracking-widest">
                  {index + 1}
                </span>
                {step}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border-4 border-slate-900 bg-white p-8 shadow-[8px_8px_0px_0px_#0f172a]">
          <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-4">
            Documentos (pessoa fisica)
          </h4>
          <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-100 border-2 border-slate-900 rounded-xl p-4">
            A Central de Ajuda do Serpro lista documento de identificacao com
            foto e outros documentos complementares quando aplicavel.
          </p>
          <a
            href="https://centraldeajuda.serpro.gov.br/serproid/documentos/docs_pessoafisica/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[3px_3px_0px_0px_#0f172a]"
          >
            Ver lista oficial PF <ExternalLink className="w-4 h-4 stroke-[3]" />
          </a>
        </div>

        <div className="rounded-[2rem] border-4 border-slate-900 bg-white p-8 shadow-[8px_8px_0px_0px_#0f172a]">
          <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-4">
            Documentos (pessoa juridica)
          </h4>
          <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-100 border-2 border-slate-900 rounded-xl p-4">
            Para PJ, alem dos dados do responsavel, o Serpro pede atos
            constitutivos, documentos da empresa e CNPJ.
          </p>
          <a
            href="https://centraldeajuda.serpro.gov.br/serproid/documentos/docs_pessoajuridica/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-4 border-slate-900 bg-teal-400 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-900 shadow-[3px_3px_0px_0px_#0f172a]"
          >
            Ver lista oficial PJ <ExternalLink className="w-4 h-4 stroke-[3]" />
          </a>
        </div>
      </div>

      <div className="rounded-[2rem] border-4 border-slate-900 bg-pink-400 p-8 md:p-10 shadow-[10px_10px_0px_0px_#0f172a]">
        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">
          Fontes oficiais usadas nesta aba
        </h3>
        <ul className="space-y-3">
          <li className="rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900">
            Manual do depositante de patentes (INPI): exigencia de certificacao
            digital ICP-Brasil no e-deposito e assinatura pelo responsavel legal.
          </li>
          <li className="rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900">
            Central SerproID: fluxo de contratacao e documentos para PF/PJ.
          </li>
          <li className="rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900">
            Assinador Serpro: para assinar, exige certificado emitido por AC
            credenciada na ICP-Brasil.
          </li>
        </ul>
      </div>
    </div>
  );
}
