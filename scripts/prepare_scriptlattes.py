import argparse
import json
import re
from pathlib import Path


LATTES_ID_PATTERN = re.compile(r'(\d{16})')


def parse_args():
    parser = argparse.ArgumentParser(
        description='Gera arquivos de entrada do ScriptLattes a partir de links Lattes salvos no projeto.'
    )
    parser.add_argument(
        '--users-json',
        required=True,
        help='Arquivo JSON com usuarios. Aceita lista simples ou estrutura contendo a colecao usuarios.'
    )
    parser.add_argument(
        '--output-dir',
        default='scriptlattes-workdir',
        help='Diretorio onde serao gerados membros.csv, scriptlattes.config e source-map.json.'
    )
    parser.add_argument(
        '--group-name',
        default='Mentoria Clube de Ciencia',
        help='Nome do grupo no relatorio do ScriptLattes.'
    )
    parser.add_argument(
        '--profiles',
        default='orientador,coorientador',
        help='Perfis separados por virgula que devem entrar na coleta.'
    )
    parser.add_argument(
        '--from-year',
        default='',
        help='Ano inicial global de filtro do ScriptLattes. Deixe vazio para sem corte.'
    )
    parser.add_argument(
        '--to-year',
        default='',
        help='Ano final global de filtro do ScriptLattes. Deixe vazio para sem corte.'
    )
    parser.add_argument(
        '--admin-email',
        default='',
        help='Email opcional para o config gerado do ScriptLattes.'
    )
    return parser.parse_args()


def load_json(path):
    with open(path, 'r', encoding='utf-8') as file:
        return json.load(file)


def coerce_users(payload):
    if isinstance(payload, list):
        return payload

    if not isinstance(payload, dict):
        raise ValueError('O JSON de usuarios precisa ser uma lista ou um objeto JSON.')

    if 'usuarios' in payload:
        usuarios = payload['usuarios']
        if isinstance(usuarios, list):
            return usuarios
        if isinstance(usuarios, dict):
            return [merge_document_id(doc_id, data) for doc_id, data in usuarios.items()]

    if 'documents' in payload and isinstance(payload['documents'], list):
        return payload['documents']

    if all(isinstance(value, dict) for value in payload.values()):
        return [merge_document_id(doc_id, data) for doc_id, data in payload.items()]

    raise ValueError('Nao foi possivel localizar a colecao de usuarios no JSON informado.')


def merge_document_id(doc_id, data):
    merged = dict(data)
    merged.setdefault('id', doc_id)
    return merged


def normalize_profile(value):
    return str(value or '').strip().lower()


def extract_lattes_link(user):
    for field_name in ('lattes', 'lattesLink', 'lattes_link', 'link_lattes', 'curriculo_lattes'):
        value = user.get(field_name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ''


def extract_lattes_id(link):
    if not link:
        return ''

    match = LATTES_ID_PATTERN.search(link)
    return match.group(1) if match else ''


def build_members(users, accepted_profiles):
    members = []
    ignored = []

    for user in users:
        perfil = normalize_profile(user.get('perfil'))
        if accepted_profiles and perfil not in accepted_profiles:
            continue

        link = extract_lattes_link(user)
        lattes_id = extract_lattes_id(link)

        if not lattes_id:
            ignored.append({
                'id': user.get('id') or user.get('uid') or '',
                'nome': user.get('nome') or 'Sem nome',
                'perfil': perfil,
                'link': link,
                'motivo': 'link_lattes_ausente_ou_sem_id_16'
            })
            continue

        members.append({
            'document_id': user.get('id') or user.get('uid') or '',
            'uid': user.get('uid') or user.get('id') or '',
            'nome': str(user.get('nome') or '').strip() or 'Sem nome',
            'perfil': perfil,
            'grupo': str(user.get('clube_id') or user.get('escola_nome') or 'Mentoria').strip() or 'Mentoria',
            'lattes_id': lattes_id,
            'lattes_link': link,
            'email': str(user.get('email') or '').strip(),
            'escola_id': str(user.get('escola_id') or '').strip(),
            'clube_id': str(user.get('clube_id') or '').strip()
        })

    unique_members = []
    seen_ids = set()
    for member in members:
        if member['lattes_id'] in seen_ids:
            continue
        seen_ids.add(member['lattes_id'])
        unique_members.append(member)

    return unique_members, ignored


def write_members_csv(output_dir, members):
    rows = []
    for member in members:
        safe_name = member['nome'].replace(',', ' ').replace(';', ' ').strip()
        safe_group = member['grupo'].replace(',', ' ').replace(';', ' ').strip()
        rows.append(f"{member['lattes_id']},{safe_name},,{safe_group}")

    members_path = output_dir / 'membros.csv'
    members_path.write_text('\n'.join(rows) + ('\n' if rows else ''), encoding='utf-8')
    return members_path


def write_config(output_dir, members_path, args):
    output_root = (output_dir.parent / 'scriptlattes-output').resolve()
    cache_root = (output_root / 'cache').resolve()
    config_lines = [
        f'global-nome_do_grupo={args.group_name}',
        f'global-arquivo_de_entrada={members_path.resolve()}',
        f'global-diretorio_de_saida={output_root}',
        f'global-email_do_admin={args.admin_email}',
        'global-idioma=PT',
        f'global-itens_desde_o_ano={args.from_year}',
        f'global-itens_ate_o_ano={args.to_year}',
        f'global-diretorio_de_armazenamento_de_cvs={cache_root}'
    ]

    config_path = output_dir / 'scriptlattes.config'
    config_path.write_text('\n'.join(config_lines) + '\n', encoding='utf-8')
    return config_path


def write_source_map(output_dir, members, ignored, args):
    payload = {
        'meta': {
            'group_name': args.group_name,
            'profiles': [item for item in args.profiles.split(',') if item.strip()],
            'members_count': len(members),
            'ignored_count': len(ignored)
        },
        'members': members,
        'ignored': ignored
    }

    source_map_path = output_dir / 'source-map.json'
    source_map_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')
    return source_map_path


def main():
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    payload = load_json(args.users_json)
    users = coerce_users(payload)
    accepted_profiles = {normalize_profile(item) for item in args.profiles.split(',') if item.strip()}

    members, ignored = build_members(users, accepted_profiles)
    if not members:
        raise SystemExit('Nenhum usuario com link Lattes valido foi encontrado para os perfis informados.')

    members_path = write_members_csv(output_dir, members)
    config_path = write_config(output_dir, members_path, args)
    source_map_path = write_source_map(output_dir, members, ignored, args)

    print('Arquivos gerados com sucesso:')
    print(f'- {members_path}')
    print(f'- {config_path}')
    print(f'- {source_map_path}')
    print(f'- membros validos: {len(members)}')
    print(f'- usuarios ignorados: {len(ignored)}')


if __name__ == '__main__':
    main()