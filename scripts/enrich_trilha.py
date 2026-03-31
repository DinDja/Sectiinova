#!/usr/bin/env python3
# coding: utf-8
"""
Gera `public/trilha_enriquecida.json` adicionando campos padrão a cada projeto
sem sobrescrever o arquivo original. Use como base para personalizar campos.
"""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "public" / "trilha.json"
OUTPUT = ROOT / "public" / "trilha_enriquecida.json"

if not INPUT.exists():
    print(f"Arquivo de entrada não encontrado: {INPUT}")
    sys.exit(1)

with INPUT.open("r", encoding="utf-8") as f:
    data = json.load(f)


def enrich_project(proj: dict) -> dict:
    proj = dict(proj)  # shallow copy
    titulo = proj.get("titulo", "")
    q = proj.get("qualidades_do_projeto") or {}
    resumo_guess = ""
    if isinstance(q, dict):
        foco = q.get("foco", "")
        investigacao = q.get("a_investigação_científica") or q.get("a_investigacao_cientifica") or ""
        resumo_guess = " ".join(p for p in [foco, investigacao] if p)
    if not proj.get("resumo"):
        proj["resumo"] = resumo_guess or f"Resumo do projeto '{titulo}' — preencher."

    defaults = {
        "objetivos_especificos": [],
        "atividades": [
            {"titulo": "Planejamento", "descricao": "Definir objetivos, dividir tarefas e cronograma", "duracao": "1 semana"},
            {"titulo": "Pesquisa", "descricao": "Coleta de dados e revisão bibliográfica", "duracao": "2 semanas"},
            {"titulo": "Prototipagem", "descricao": "Construir protótipos, pilotos ou visualizações", "duracao": "3 semanas"}
        ],
        "metodologias": ["Pesquisa-ação", "Experimentação", "Prototipagem rápida"],
        "recursos_necessarios": [],
        "parcerias": [],
        "cronograma": {"duracao_semanas": None, "fases": []},
        "avaliacao": {"metodos": ["Relatório final", "Apresentação pública"], "indicadores": []},
        "competencias": [],
        "nivel_serie": None,
        "duracao_estimada_horas": None,
        "impacto_esperado": "",
        "acessibilidade": {"adaptacoes": []}
    }

    for k, v in defaults.items():
        if k not in proj:
            proj[k] = v
    return proj


def enrich(data_obj):
    if not isinstance(data_obj, list):
        raise RuntimeError("Formato inesperado do JSON: esperado lista no topo")
    for area in data_obj:
        for objetivo in area.get("objetivos", []):
            projetos = objetivo.get("projetos")
            if isinstance(projetos, list):
                objetivo["projetos"] = [enrich_project(p) for p in projetos]
    return data_obj


enriched = enrich(data)

with OUTPUT.open("w", encoding="utf-8") as f:
    json.dump(enriched, f, ensure_ascii=False, indent=2)

print(f"Arquivo enriquecido gerado: {OUTPUT}")
