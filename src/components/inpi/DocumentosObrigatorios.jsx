"use client";

import { Download, FileText, AlertCircle, CheckSquare, Sparkles, UploadCloud, PenTool, LayoutTemplate, Layers } from "lucide-react";

export default function DocumentosObrigatorios({ viewMode = "leitura_rapida" }) {
  if (viewMode === "leitura_rapida") {
    return (
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[12px_12px_0px_0px_#0f172a] border-4 border-slate-900 animate-in fade-in duration-500 transform  hover:rotate-0 transition-transform">
        <div className="inline-flex items-center gap-2 bg-yellow-300 px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform - mb-6">
            <Layers className="w-5 h-5 text-slate-900 stroke-[3]" />
            <span className="font-black uppercase tracking-widest text-xs text-slate-900">Checklist Rápido</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-[0.9]">
          Os 4 arquivos que <br/>
          <span className="text-white [-webkit-text-stroke:2px_#0f172a] sm:[-webkit-text-stroke:3px_#0f172a]">
            você precisa enviar
          </span>
        </h2>
        <p className="text-base md:text-lg font-bold text-slate-800 mb-8 bg-slate-100 p-4 border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#cbd5e1] inline-block">
          Pense nesses documentos como um kit básico. Sem eles, o pedido não segue.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="rounded-2xl border-4 border-slate-900 bg-teal-400 p-6 shadow-[6px_6px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform">
            <p className="font-black text-xl uppercase tracking-tighter text-slate-900 mb-2 bg-white px-3 py-1 border-2 border-slate-900 inline-block transform -">1. Relatório Descritivo</p>
            <p className="text-sm font-bold text-slate-900 leading-relaxed">
              Explica a invenção em detalhes: problema, solução e funcionamento.
            </p>
          </div>
          <div className="rounded-2xl border-4 border-slate-900 bg-pink-400 p-6 shadow-[6px_6px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform">
            <p className="font-black text-xl uppercase tracking-tighter text-slate-900 mb-2 bg-white px-3 py-1 border-2 border-slate-900 inline-block transform ">2. Reivindicações</p>
            <p className="text-sm font-bold text-slate-900 leading-relaxed">
              Define exatamente o que você quer proteger legalmente.
            </p>
          </div>
          <div className="rounded-2xl border-4 border-slate-900 bg-yellow-300 p-6 shadow-[6px_6px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform">
            <p className="font-black text-xl uppercase tracking-tighter text-slate-900 mb-2 bg-white px-3 py-1 border-2 border-slate-900 inline-block transform -">3. Resumo</p>
            <p className="text-sm font-bold text-slate-900 leading-relaxed">
              Um parágrafo curto (50 a 200 palavras) sobre a invenção.
            </p>
          </div>
          <div className="rounded-2xl border-4 border-slate-900 bg-blue-400 p-6 shadow-[6px_6px_0px_0px_#0f172a] transform hover:-translate-y-1 transition-transform">
            <p className="font-black text-xl uppercase tracking-tighter text-slate-900 mb-2 bg-white px-3 py-1 border-2 border-slate-900 inline-block transform ">4. Desenhos (se houver)</p>
            <p className="text-sm font-bold text-slate-900 leading-relaxed">
              Figuras numeradas para facilitar o entendimento técnico.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border-4 border-slate-900 bg-orange-400 p-6 md:p-8 shadow-[8px_8px_0px_0px_#0f172a] mb-6">
          <p className="text-base font-black uppercase tracking-widest text-slate-900 mb-3 flex items-center gap-2">
            <UploadCloud className="w-6 h-6 stroke-[3]" /> Envio no e-Patentes:
          </p>
          <p className="text-sm md:text-base font-bold text-slate-900 leading-relaxed bg-white/60 p-4 border-2 border-slate-900 rounded-xl">
            Informe a GRU paga, anexe os 4 arquivos (DOCX ou PDF), revise o
            documento de veracidade, assine digitalmente e só então finalize e
            guarde o protocolo.
          </p>
        </div>

        <div className="rounded-2xl border-4 border-slate-900 bg-red-400 p-6 md:p-8 shadow-[8px_8px_0px_0px_#0f172a] transform -">
          <p className="text-base font-black uppercase tracking-widest text-slate-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 stroke-[3]" /> Documento adicional do protocolo
          </p>
          <p className="text-sm font-bold text-slate-900 leading-relaxed bg-white/60 p-4 border-2 border-slate-900 rounded-xl">
            O documento de veracidade não substitui Relatório, Reivindicações,
            Resumo ou Desenhos. Ele entra no fechamento do peticionamento para
            validar formalmente o conteúdo enviado e precisa ser assinado
            digitalmente antes da confirmação final, com o certificado ICP-Brasil
            compatível exigido no fluxo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 relative">
      
      {/* Intro Completa */}
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[12px_12px_0px_0px_#0f172a] border-4 border-slate-900">
        <div className="inline-flex items-center gap-3 bg-yellow-300 px-4 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform - mb-6">
            <FileText className="w-5 h-5 stroke-[3] text-slate-900" />
            <span className="font-black uppercase tracking-widest text-xs text-slate-900">Kit Documental</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-6 leading-none">
          Documentos Técnicos para o <span className="bg-teal-400 px-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] inline-block transform -">Pedido de Patente</span>
        </h2>
        <p className="text-lg font-bold text-slate-700 mb-8 max-w-3xl leading-relaxed">
          Todo pedido de patente (PI ou MU) deve conter os quatro documentos
          abaixo, em arquivos separados, nos formatos DOCX ou PDF.
        </p>

        <div className="rounded-2xl border-4 border-slate-900 bg-red-400 p-6 md:p-8 shadow-[8px_8px_0px_0px_#0f172a] transform ">
          <h3 className="font-black uppercase tracking-tighter text-2xl text-slate-900 mb-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 stroke-[3]" />
            Documento de veracidade e assinatura digital
          </h3>
          <p className="text-base font-bold text-slate-900 leading-relaxed bg-white/70 p-5 rounded-xl border-2 border-slate-900">
            Além dos quatro documentos técnicos, o fechamento do protocolo no
            e-Patentes exige revisar o documento de veracidade exibido pelo
            sistema e aplicar a assinatura por certificado ICP-Brasil exigida
            naquele fluxo. A assinatura gov.br não substitui esse requisito
            quando o portal pede e-CPF ou e-CNPJ. Sem essa etapa, o envio pode
            ficar incompleto mesmo com todos os anexos corretos.
          </p>
        </div>
      </div>

      {/* Os 4 Documentos em Cards Neo-Brutais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 pt-4">
        
        {/* 1. Relatório */}
        <div className="bg-teal-400 border-4 border-slate-900 rounded-[2rem] p-8 md:p-10 shadow-[8px_8px_0px_0px_#0f172a] relative mt-4 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#0f172a] transition-all">
          <div className="absolute -top-6 -left-4 bg-white border-4 border-slate-900 px-4 py-2 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-3 flex items-center gap-3 z-10">
            <span className="text-3xl font-black text-slate-900">1</span>
            <FileText className="w-6 h-6 stroke-[3] text-teal-500" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mt-4 mb-4">
            Relatório Descritivo
          </h3>
          <p className="text-sm font-bold text-slate-900 mb-6">
            Descreve a invenção de forma clara e completa, permitindo a
            reprodução por um técnico no assunto. Deve conter:
          </p>
          <ul className="space-y-3 mb-6">
            {['Campo da invenção (setor técnico)', 'Fundamentos da invenção / estado da técnica', 'Problema técnico e solução proposta', 'Descrição detalhada (materiais, dimensões, funcionamento)', 'Exemplos de concretização (se houver)', 'Breve descrição dos desenhos (quando houver)'].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm font-bold text-slate-900 bg-white/60 p-2 rounded-lg border-2 border-slate-900">
                <CheckSquare className="w-5 h-5 shrink-0 stroke-[3]" /> {item}
              </li>
            ))}
          </ul>
          <p className="text-xs font-black uppercase tracking-widest text-slate-900 bg-white inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
            <PenTool className="w-4 h-4 stroke-[3]" /> Use o Gerador de Documentos
          </p>
        </div>

        {/* 2. Reivindicações */}
        <div className="bg-pink-400 border-4 border-slate-900 rounded-[2rem] p-8 md:p-10 shadow-[8px_8px_0px_0px_#0f172a] relative mt-4 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#0f172a] transition-all">
          <div className="absolute -top-6 -left-4 bg-white border-4 border-slate-900 px-4 py-2 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] transform rotate-3 flex items-center gap-3 z-10">
            <span className="text-3xl font-black text-slate-900">2</span>
            <LayoutTemplate className="w-6 h-6 stroke-[3] text-pink-500" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mt-4 mb-4">
            Quadro Reivindicatório
          </h3>
          <p className="text-sm font-bold text-slate-900 mb-6">
            Define o escopo de proteção legal. As reivindicações delimitam o que
            você quer proteger. Devem ser claras, concisas e apoiadas no
            relatório descritivo.
          </p>
          <ul className="space-y-4 mb-6">
            <li className="text-sm font-bold text-slate-900 bg-white/60 p-4 rounded-xl border-2 border-slate-900 shadow-sm">
              <strong className="font-black uppercase tracking-wider block mb-1">Reivindicação independente:</strong> define a essência da
              invenção (formato: "preâmbulo" + "caracterizado por" + matéria pleiteada).
            </li>
            <li className="text-sm font-bold text-slate-900 bg-white/60 p-4 rounded-xl border-2 border-slate-900 shadow-sm">
              <strong className="font-black uppercase tracking-wider block mb-1">Reivindicações dependentes:</strong> acrescentam características adicionais.
            </li>
            <li className="text-sm font-bold text-slate-900 bg-white/60 p-4 rounded-xl border-2 border-slate-900 shadow-sm">
              <strong className="font-black uppercase tracking-wider block mb-1">Estrutura:</strong> Numeração sequencial e redação em um único período.
            </li>
          </ul>
        </div>

        {/* 3. Resumo */}
        <div className="bg-yellow-300 border-4 border-slate-900 rounded-[2rem] p-8 md:p-10 shadow-[8px_8px_0px_0px_#0f172a] relative mt-4 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#0f172a] transition-all">
          <div className="absolute -top-6 -left-4 bg-white border-4 border-slate-900 px-4 py-2 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] transform - flex items-center gap-3 z-10">
            <span className="text-3xl font-black text-slate-900">3</span>
            <FileText className="w-6 h-6 stroke-[3] text-yellow-500" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mt-4 mb-4">
            Resumo
          </h3>
          <p className="text-sm font-bold text-slate-900 mb-4 bg-white/60 p-5 rounded-2xl border-2 border-slate-900 leading-relaxed">
            Um parágrafo de 50 a 200 palavras que serve para divulgação da
            invenção. Deve indicar o título, o setor técnico e a principal
            característica da invenção.
          </p>
          <p className="text-sm font-black uppercase text-slate-900 bg-white px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] inline-block transform ">
            NÃO DEVE CONTER REIVINDICAÇÕES nem ser usado para interpretação do escopo.
          </p>
        </div>

        {/* 4. Desenhos */}
        <div className="bg-blue-400 border-4 border-slate-900 rounded-[2rem] p-8 md:p-10 shadow-[8px_8px_0px_0px_#0f172a] relative mt-4 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_#0f172a] transition-all">
          <div className="absolute -top-6 -left-4 bg-white border-4 border-slate-900 px-4 py-2 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] transform  flex items-center gap-3 z-10">
            <span className="text-3xl font-black text-slate-900">4</span>
            <FileText className="w-6 h-6 stroke-[3] text-blue-500" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mt-4 mb-4">
            Desenhos (se houver)
          </h3>
          <p className="text-sm font-bold text-slate-900 mb-6 bg-white/60 p-5 rounded-2xl border-2 border-slate-900 leading-relaxed">
            Ilustrações técnicas (figuras, gráficos, fluxogramas) necessárias
            para o entendimento da invenção. Devem ser numeradas sequencialmente
            (Figura 1, Figura 2...), com legendas claras.
          </p>
          <p className="text-xs font-black uppercase tracking-widest text-slate-900 bg-white px-3 py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] inline-block transform -">
            * Se não precisar, declare "não se aplica".
          </p>
        </div>
      </div>

      {/* Como enviar no e-Patentes */}
      <div className="bg-white p-8 md:p-12 rounded-[2rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_#0f172a] mt-12 transform  hover:rotate-0 transition-transform duration-300">
        <h3 className="flex items-center gap-4 font-black text-3xl md:text-4xl text-slate-900 uppercase tracking-tighter mb-8 border-b-4 border-slate-900 pb-6">
          <div className="w-16 h-16 bg-teal-400 border-4 border-slate-900 rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_#0f172a] transform -rotate-3 shrink-0">
            <Download className="w-8 h-8 stroke-[3] text-slate-900" />
          </div>
          Como enviar no e-Patentes 4.0
        </h3>
        
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Lista de Passos */}
          <ol className="space-y-4 text-sm font-bold text-slate-800 list-decimal list-inside marker:font-black marker:text-lg">
            <li className="bg-slate-100 p-3 rounded-xl border-2 border-slate-900 shadow-sm">
              Acesse o <strong>sistema e-Patentes</strong> com seu login.
            </li>
            <li className="bg-slate-100 p-3 rounded-xl border-2 border-slate-900 shadow-sm">
              Informe o número da GRU já paga (código 200).
            </li>
            <li className="bg-slate-100 p-3 rounded-xl border-2 border-slate-900 shadow-sm">
              Preencha o formulário eletrônico (dados do depositante, inventor, classificação).
            </li>
            <li className="bg-slate-100 p-3 rounded-xl border-2 border-slate-900 shadow-sm">
              Na seção "Documentos", anexe cada um dos 4 arquivos (Relatório, Reivindicações, Resumo, Desenhos) em <strong>DOCX ou PDF</strong>.
            </li>
            <li className="bg-slate-100 p-3 rounded-xl border-2 border-slate-900 shadow-sm">
              Revise o documento de veracidade exibido no fluxo e faça a assinatura com e-CPF ou e-CNPJ compatível com o signatário.
            </li>
            <li className="bg-slate-100 p-3 rounded-xl border-2 border-slate-900 shadow-sm">
              Confirme e envie. Guarde o comprovante de protocolo.
            </li>
          </ol>

          {/* Dicas e Alertas */}
          <div className="space-y-6">
            <div className="rounded-2xl border-4 border-slate-900 bg-orange-400 p-6 shadow-[6px_6px_0px_0px_#0f172a]">
              <p className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-4 bg-white px-3 py-1 inline-block border-2 border-slate-900 transform -">
                Regra prática para não travar no final
              </p>
              <ul className="space-y-3 text-sm font-bold text-slate-900 list-none">
                <li className="flex gap-2 items-start"><AlertCircle className="w-5 h-5 shrink-0 stroke-[3]" /> A assinatura gov.br não resolve esse ponto quando o fluxo exige certificado ICP-Brasil.</li>
                <li className="flex gap-2 items-start"><AlertCircle className="w-5 h-5 shrink-0 stroke-[3]" /> Se o depósito for assinado por procurador, o certificado normalmente precisa estar no CPF do procurador signatário.</li>
                <li className="flex gap-2 items-start"><AlertCircle className="w-5 h-5 shrink-0 stroke-[3]" /> Se a titular for pessoa jurídica, confirme antes se o fechamento será com e-CNPJ ou com e-CPF do representante habilitado.</li>
                <li className="flex gap-2 items-start"><AlertCircle className="w-5 h-5 shrink-0 stroke-[3]" /> Se ainda não houver certificado, o Serpro oferece e-CPF/e-CNPJ A1, A3 e SerproID em nuvem.</li>
              </ul>
            </div>
            
            <div className="inline-flex items-center gap-3 text-xs md:text-sm font-black uppercase tracking-widest text-slate-900 bg-yellow-300 px-4 py-3 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transform ">
              <Sparkles className="w-6 h-6 stroke-[3]" />
              <span>
                <strong>Novidade:</strong> O novo sistema aceita DOCX e fará validação automática em breve. Prefira DOCX!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}