#!/usr/bin/env python3
# coding: utf-8
"""
Gera o JSON da trilha de Ensino Fundamental (8º/9º) a partir do DOCX,
preservando estritamente o texto do documento (tema, objetivo e encontros).
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = Path(r"C:\Users\Bruno.queiroz\Downloads\DCRbv1 - Copia.docx")
DEFAULT_OUTPUT = ROOT / "public" / "trilha_anos_finais_8_9.json"


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text.upper()


def startswith_label(line: str, label: str) -> bool:
    return normalize(line).startswith(normalize(label))


def remove_label(line: str) -> str:
    if ":" not in line:
        return line.strip()
    return line.split(":", 1)[1].strip()


def first_sentence(text: str) -> str:
    txt = (text or "").strip()
    if not txt:
        return ""
    for sep in (". ", ".\n", "\n"):
        if sep in txt:
            return txt.split(sep, 1)[0].strip().rstrip(".")
    return txt


def read_docx_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as zipped:
        xml = zipped.read("word/document.xml")

    root = ET.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []

    for para in root.findall(".//w:p", ns):
        text = "".join(t.text for t in para.findall(".//w:t", ns) if t.text).strip()
        if text:
            paragraphs.append(text)

    return paragraphs


def is_area_header(line: str) -> bool:
    n = normalize(line)
    return n.startswith("AREA DE ") or n.startswith("AREA: ")


def clean_area_name(line: str) -> str:
    cleaned = re.sub(r"^\s*ÁREA\s+DE\s*", "", line, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"^\s*ÁREA\s*:\s*", "", cleaned, flags=re.IGNORECASE).strip()
    return cleaned


def is_objective_line(line: str) -> bool:
    return bool(re.match(r"^\d+\.\s*\S+", line.strip()))


def strip_objective_number(line: str) -> str:
    return re.sub(r"^\d+\.\s*", "", line.strip())


def parse_public_info(
    publico_line: str,
    duracao_line: str,
    encontros_count: int,
) -> tuple[str, str, int]:
    full = remove_label(publico_line) if publico_line else ""
    publico = full.strip()
    duracao = remove_label(duracao_line) if duracao_line else ""

    marker = "DURACAO SUGERIDA:"
    normalized_full = normalize(full)
    if marker in normalized_full:
        marker_index = normalized_full.index(marker)
        publico = full[:marker_index].strip().rstrip(".")
        raw_duration = full[marker_index:].strip()
        if ":" in raw_duration:
            duracao = raw_duration.split(":", 1)[1].strip()
        else:
            duracao = raw_duration

    n = normalize(" ".join([publico_line, duracao_line]))
    n_enc = re.search(r"(\d+)\s+ENCONTROS", n)
    n_min = re.search(r"(\d+)\s+MINUTOS", n)
    encontros = int(n_enc.group(1)) if n_enc else max(encontros_count, 1)
    minutos = int(n_min.group(1)) if n_min else 90
    horas = round((encontros * minutos) / 60)
    return publico, duracao, max(horas, 1)


def parse_encounters(lines: list[str]) -> list[dict]:
    encounters: list[dict] = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        title_match = re.match(r"^Encontro\s+(\d+):\s*(.*)$", line, flags=re.IGNORECASE)
        if not title_match:
            i += 1
            continue

        numero = int(title_match.group(1))
        titulo = title_match.group(2).strip()
        foco = ""
        description_lines: list[str] = []

        i += 1
        while i < len(lines):
            curr = lines[i].strip()
            if re.match(r"^Encontro\s+\d+:", curr, flags=re.IGNORECASE):
                break
            if startswith_label(curr, "Foco:"):
                foco = remove_label(curr)
            elif startswith_label(curr, "Dinâmica:"):
                pass
            else:
                description_lines.append(curr)
            i += 1

        descricao = "\n".join(description_lines).strip()
        encounters.append(
            {
                "numero": numero,
                "titulo": titulo,
                "foco": foco,
                "descricao_linhas": description_lines,
                "descricao": descricao,
            }
        )

    return encounters


def encounter_to_activity(encounter: dict) -> dict:
    description_parts: list[str] = []
    if encounter.get("foco"):
        description_parts.append(f"Foco: {encounter['foco']}")
    if encounter.get("descricao_linhas"):
        description_parts.append(" ".join(encounter["descricao_linhas"]))
    return {
        "titulo": f"Encontro {encounter['numero']}: {encounter['titulo']}",
        "descricao": " ".join(description_parts).strip(),
        "duracao": "90 minutos",
    }


def parse_area_blocks(paragraphs: list[str]) -> list[dict]:
    markers: list[tuple[int, str]] = []
    for idx, line in enumerate(paragraphs):
        if is_area_header(line):
            markers.append((idx, clean_area_name(line)))

    if not markers:
        raise RuntimeError("Nao foi possivel localizar cabecalhos de area no DOCX.")

    output: list[dict] = []

    for i, (area_start, area_name) in enumerate(markers):
        area_end = markers[i + 1][0] if i + 1 < len(markers) else len(paragraphs)
        area_lines = paragraphs[area_start:area_end]

        objective_starts = [idx for idx, line in enumerate(area_lines) if is_objective_line(line)]
        objetivos: list[dict] = []

        for j, obj_start in enumerate(objective_starts):
            obj_end = objective_starts[j + 1] if j + 1 < len(objective_starts) else len(area_lines)
            block = area_lines[obj_start:obj_end]
            if not block:
                continue

            objective_text = strip_objective_number(block[0])
            tema_central = ""
            objetivo_geral = ""
            publico_line = ""
            duracao_line = ""

            for line in block[1:]:
                if startswith_label(line, "Tema Central:"):
                    tema_central = remove_label(line)
                elif startswith_label(line, "Objetivo Geral:"):
                    objetivo_geral = remove_label(line)
                elif startswith_label(line, "Público atendido:") or startswith_label(line, "Publico atendido:"):
                    publico_line = line
                elif startswith_label(line, "Duração sugerida:") or startswith_label(line, "Duracao sugerida:"):
                    duracao_line = line

            encontros = parse_encounters(block)
            publico_atendido, duracao_sugerida, duracao_horas = parse_public_info(
                publico_line,
                duracao_line,
                len(encontros),
            )

            encontro_4_foco = encontros[3]["foco"] if len(encontros) >= 4 else ""
            culminancia = encontros[-1]["descricao"] if encontros else ""
            impacto = first_sentence(culminancia) if culminancia else ""

            projeto = {
                "titulo": f'Projeto: "{tema_central or first_sentence(objective_text)}"',
                "tema_central": tema_central,
                "objetivo_geral": objetivo_geral,
                "publico_atendido": publico_atendido,
                "duracao_sugerida": duracao_sugerida,
                "descricao_objetivo_original": objective_text,
                "encontros": encontros,
                "qualidades_do_projeto": {
                    "foco": tema_central,
                    "a_investigação_científica": objetivo_geral,
                    "o_componente_tecnológico": encontro_4_foco,
                    "inovação": impacto,
                },
                "resumo": objetivo_geral,
                "objetivos_especificos": [{"descricao": objective_text}],
                "atividades": [encounter_to_activity(enc) for enc in encontros],
                "metodologias": [],
                "recursos_necessarios": [],
                "parcerias": [],
                "cronograma": {"duracao_semanas": None, "fases": []},
                "avaliacao": {"metodos": [], "indicadores": []},
                "competencias": [],
                "nivel_serie": "Ensino Fundamental - Anos Finais (8º/9º)",
                "duracao_estimada_horas": duracao_horas,
                "impacto_esperado": impacto,
                "acessibilidade": {"adaptacoes": []},
                "tags": ["anos-finais", "8o-9o-ano"],
                "fonte_documento": "DCRbv1 - Copia.docx",
            }

            objetivos.append(
                {
                    "descricao_objetivo": objective_text,
                    "projetos": [projeto],
                }
            )

        output.append(
            {
                "area_de_conhecimento": area_name,
                "objetivos": objetivos,
            }
        )

    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"Arquivo de entrada nao encontrado: {args.input}")

    paragraphs = read_docx_paragraphs(args.input)
    trilha = parse_area_blocks(paragraphs)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as file:
        json.dump(trilha, file, ensure_ascii=False, indent=2)

    total_areas = len(trilha)
    total_objetivos = sum(len(area.get("objetivos", [])) for area in trilha)
    total_projetos = sum(
        len(obj.get("projetos", []))
        for area in trilha
        for obj in area.get("objetivos", [])
    )

    print(f"JSON gerado com sucesso: {args.output}")
    print(
        f"Areas: {total_areas} | Objetivos: {total_objetivos} | Projetos: {total_projetos}"
    )


if __name__ == "__main__":
    main()
