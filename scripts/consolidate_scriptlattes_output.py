import argparse
import json
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description='Consolida o JSON individual gerado pelo ScriptLattes em um payload pronto para atualizar usuarios no Firestore.'
    )
    parser.add_argument(
        '--source-map',
        default='scriptlattes-workdir/source-map.json',
        help='Arquivo source-map.json gerado pelo prepare_scriptlattes.py.'
    )
    parser.add_argument(
        '--json-dir',
        default='scriptlattes-output/json',
        help='Pasta json/ gerada pelo ScriptLattes.'
    )
    parser.add_argument(
        '--output-file',
        default='scriptlattes-output/firestore-lattes-updates.json',
        help='Arquivo de saida com as atualizacoes consolidadas.'
    )
    return parser.parse_args()


def load_json(path):
    with open(path, 'r', encoding='utf-8') as file:
        return json.load(file)


def summarize_person(person_json, source_member):
    informacoes = person_json.get('informacoes_pessoais', {})
    estatisticas = person_json.get('estatisticas', {})
    areas = person_json.get('areas_atuacao', [])
    formacao = person_json.get('formacao_academica', [])
    projetos_pesquisa = person_json.get('projetos_pesquisa', [])
    projetos_extensao = person_json.get('projetos_extensao', [])
    projetos_desenvolvimento = person_json.get('projetos_desenvolvimento', [])

    return {
        'nome': informacoes.get('nome_completo') or source_member['nome'],
        'id_lattes': informacoes.get('id_lattes') or source_member['lattes_id'],
        'link': source_member['lattes_link'],
        'resumo': informacoes.get('resumo') or '',
        'ultima_atualizacao': informacoes.get('atualizacao_cv') or '',
        'nome_citacoes': informacoes.get('nome_citacoes') or '',
        'bolsa_produtividade': informacoes.get('bolsa_produtividade') or '',
        'endereco_profissional': informacoes.get('endereco_profissional') or '',
        'areas_atuacao': areas,
        'formacao_academica': formacao,
        'estatisticas': estatisticas,
        'projetos': {
            'pesquisa': projetos_pesquisa,
            'extensao': projetos_extensao,
            'desenvolvimento': projetos_desenvolvimento
        },
        'fonte': 'scriptlattes',
        'sincronizado_em': None
    }


def main():
    args = parse_args()
    source_map = load_json(args.source_map)
    json_dir = Path(args.json_dir)
    output_file = Path(args.output_file)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    generated_jsons = {}
    for path in sorted(json_dir.glob('*.json')):
        payload = load_json(path)
        id_lattes = str(payload.get('informacoes_pessoais', {}).get('id_lattes', '')).strip()
        if id_lattes:
            generated_jsons[id_lattes] = payload

    updates = []
    missing = []

    for member in source_map.get('members', []):
        id_lattes = member['lattes_id']
        person_json = generated_jsons.get(id_lattes)
        if not person_json:
            missing.append({
                'document_id': member['document_id'],
                'nome': member['nome'],
                'id_lattes': id_lattes
            })
            continue

        updates.append({
            'document_id': member['document_id'],
            'uid': member['uid'],
            'perfil': member['perfil'],
            'lattes_data': summarize_person(person_json, member)
        })

    result = {
        'meta': {
            'total_members': len(source_map.get('members', [])),
            'total_updates': len(updates),
            'total_missing_json': len(missing)
        },
        'updates': updates,
        'missing': missing
    }

    output_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')

    print('Consolidacao concluida:')
    print(f'- atualizacoes: {len(updates)}')
    print(f'- jsons ausentes: {len(missing)}')
    print(f'- arquivo: {output_file}')


if __name__ == '__main__':
    main()