#!/usr/bin/env python3
# coding: utf-8
"""
Preenche arrays vazios em `public/trilha_enriquecida.json` e grava
`public/trilha_enriquecida_filled.json` com inferências heurísticas simples.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "public" / "trilha_enriquecida.json"
FALLBACK = ROOT / "public" / "trilha.json"
OUTPUT = ROOT / "public" / "trilha_enriquecida_filled.json"

if not INPUT.exists():
    if FALLBACK.exists():
        print(f"Arquivo {INPUT} não encontrado. Usando fallback {FALLBACK}")
        INPUT = FALLBACK
    else:
        print("Nenhum arquivo de entrada encontrado.")
        raise SystemExit(1)

with INPUT.open("r", encoding="utf-8") as f:
    data = json.load(f)


def first_sentence(text: str) -> str:
    if not text:
        return ""
    txt = text.strip()
    # pega até o primeiro ponto final, quebra de linha ou 200 caracteres
    for sep in (".\n", "\n", "."):
        if sep in txt:
            return txt.split(sep)[0].strip()
    return txt[:200]


def contains_any(text: str, keywords) -> bool:
    t = (text or "").lower()
    return any(k.lower() in t for k in keywords)


def infer_objectives_from(q: dict):
    res = []
    investigacao = q.get("a_investigação_científica") or q.get("a_investigacao_cientifica") or ""
    comp_tec = q.get("o_componente_tecnológico") or q.get("o_componente_tecnologico") or ""
    inovacao = q.get("inovacao") or q.get("inovação") or q.get("inovacao") or ""
    foco = q.get("foco") or ""
    if investigacao:
        res.append({"descricao": f"Investigar: {first_sentence(investigacao)}"})
    if comp_tec:
        res.append({"descricao": f"Desenvolver e testar soluções usando: {first_sentence(comp_tec)}"})
    if inovacao:
        res.append({"descricao": f"Prototipar: {first_sentence(inovacao)}"})
    if foco:
        res.append({"descricao": f"Contextualizar o projeto no foco: {first_sentence(foco)}"})
    if not res:
        res.append({"descricao": "Executar pesquisa, prototipagem e divulgação dos resultados."})
    return res


def infer_resources(proj: dict, q: dict):
    resources = []
    r = proj.get("recursos") or {}
    imgs = r.get("imagens") or []
    refs = r.get("referencias") or []
    conteudo = r.get("conteudo_adicional") or {}
    if imgs:
        resources.append("Imagens, fotos e material gráfico para divulgação")
    if refs:
        resources.append("Acesso à bibliografia e materiais de referência")
    if conteudo:
        resources.append("Conteúdos multimídia (vídeos, tutoriais) e ferramentas citadas em conteúdo adicional")

    comp_tec = q.get("o_componente_tecnológico") or q.get("o_componente_tecnologico") or ""
    mapping = [
        (['arduino','micro:bit','microbit'], 'Kits Arduino/Micro:bit, sensores, cabos e componentes eletrônicos'),
        (['tableau','powerbi','infovis','data viz','visualization','orange data'], 'Softwares de visualização (Tableau/PowerBI/alternativas open-source) e computadores'),
        (['python','pandas','nlp','machine learning','scikit','spacy','nltk'],'Computadores com Python e bibliotecas de análise de dados e ML (pandas, numpy, scikit-learn, spaCy)'),
        (['mediapipe','opencv','visão computacional'], 'Câmeras, computadores com GPU (opcional) e bibliotecas de visão computacional (MediaPipe/OpenCV)'),
        (['fotogrametria','3d','realidade aumentada','ar','modelagem 3d'], 'Câmeras e software de fotogrametria / ferramentas de AR e modelagem 3D'),
        (['iot','sensores','wifi','conectividade'], 'Sensores IoT, microcontroladores e conectividade (Wi‑Fi/LoRa)')
    ]
    for keys, desc in mapping:
        if contains_any(comp_tec, keys):
            resources.append(desc)

    if not resources:
        resources.append('Acesso à internet, computadores e espaço para trabalho colaborativo')

    # deduplicate preservando ordem
    seen = set()
    out = []
    for item in resources:
        if item not in seen:
            out.append(item)
            seen.add(item)
    return out


def infer_parcerias(q: dict):
    return [
        'Universidade ou centro de pesquisa local',
        'Organizações comunitárias e ONGs',
        'Secretaria Municipal de Educação',
        'Laboratórios makers / FabLab'
    ]


def infer_competencias(q: dict):
    comp_tec = q.get("o_componente_tecnológico") or ""
    skills = ['Trabalho em equipe', 'Comunicação científica', 'Pensamento crítico']
    if contains_any(comp_tec, ['arduino','micro:bit','microbit']):
        skills += ['Eletrônica básica', 'Prototipagem']
    if contains_any(comp_tec, ['python','pandas','nlp','machine learning','scikit','spacy','nltk']):
        skills += ['Programação em Python', 'Análise de dados', 'Introdução a ML']
    if contains_any(comp_tec, ['tableau','visualization','infovis','canva','orange']):
        skills += ['Design de informação', 'Visualização de dados']
    if contains_any(comp_tec, ['mediapipe','opencv','visão']):
        skills += ['Visão computacional', 'Processamento de vídeo']
    # dedupe
    out = []
    for s in skills:
        if s not in out:
            out.append(s)
    return out


def infer_avaliacao_indicators(proj: dict):
    return [
        'Número de participantes envolvidos',
        'Protótipo funcional testado com usuário(s)',
        'Relatório técnico e apresentação pública',
        'Feedback qualitativo da comunidade beneficiada'
    ]


def infer_cronograma_phases():
    phases = [
        {'fase':'Planejamento','duracao_semanas':1},
        {'fase':'Pesquisa e coleta de dados','duracao_semanas':2},
        {'fase':'Desenvolvimento / Prototipagem','duracao_semanas':4},
        {'fase':'Testes e validação','duracao_semanas':2},
        {'fase':'Divulgação e avaliação','duracao_semanas':1}
    ]
    total = sum(p['duracao_semanas'] for p in phases)
    return {'duracao_semanas': total, 'fases': phases}


def infer_acessibilidade():
    return [
        'Material com fonte ampliada e contraste alto',
        'Legendagem e transcrições para vídeos',
        'Documentação em linguagem acessível',
        'Adaptações de protótipos para usuários com deficiência'
    ]

# percorre e preenche
for area in data:
    for objetivo in area.get('objetivos', []):
        projetos = objetivo.get('projetos', [])
        for proj in projetos:
            q = proj.get('qualidades_do_projeto') or {}
            if not proj.get('objetivos_especificos'):
                proj['objetivos_especificos'] = infer_objectives_from(q)
            if not proj.get('atividades'):
                proj['atividades'] = [
                    {'titulo':'Planejamento','descricao':'Definir metas, equipe e cronograma','duracao':'1 semana'},
                    {'titulo':'Pesquisa e coleta','descricao':'Coletar dados e referências','duracao':'2 semanas'},
                    {'titulo':'Desenvolvimento','descricao':'Construir protótipos e ferramentas','duracao':'4 semanas'},
                    {'titulo':'Testes','descricao':'Testar com usuários e iterar','duracao':'2 semanas'},
                    {'titulo':'Divulgação','descricao':'Apresentar resultados à comunidade','duracao':'1 semana'},
                ]
            if not proj.get('metodologias'):
                proj['metodologias'] = ['Pesquisa-ação','Prototipagem','Avaliação participativa']
            if not proj.get('recursos_necessarios'):
                proj['recursos_necessarios'] = infer_resources(proj, q)
            if not proj.get('parcerias'):
                proj['parcerias'] = infer_parcerias(q)
            if not proj.get('cronograma') or not proj['cronograma'].get('fases'):
                proj['cronograma'] = infer_cronograma_phases()
            if not isinstance(proj.get('avaliacao'), dict):
                proj['avaliacao'] = {'metodos':['Relatório','Apresentação'],'indicadores':[]}
            if not proj['avaliacao'].get('indicadores'):
                proj['avaliacao']['indicadores'] = infer_avaliacao_indicators(proj)
            if not proj.get('competencias'):
                proj['competencias'] = infer_competencias(q)
            if not proj.get('nivel_serie'):
                proj['nivel_serie'] = 'Ensino Médio'
            if not proj.get('duracao_estimada_horas'):
                weeks = proj.get('cronograma', {}).get('duracao_semanas') or 8
                proj['duracao_estimada_horas'] = weeks * 8
            if not proj.get('impacto_esperado'):
                inov = q.get('inovacao') or q.get('inovação') or ''
                proj['impacto_esperado'] = first_sentence(inov) or 'Aumentar a participação e alfabetização científica na comunidade escolar.'
            if not proj.get('acessibilidade'):
                proj['acessibilidade'] = {'adaptacoes': infer_acessibilidade()}
            elif not proj['acessibilidade'].get('adaptacoes'):
                proj['acessibilidade']['adaptacoes'] = infer_acessibilidade()

with OUTPUT.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Arquivo preenchido gerado: {OUTPUT}")
