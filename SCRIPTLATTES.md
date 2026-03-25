# Integração local com ScriptLattes

Este projeto já salva o link do Currículo Lattes dos professores em `usuarios.lattes`.
Os scripts abaixo usam esses links para gerar a entrada do ScriptLattes e consolidar o retorno em um JSON pronto para atualizar o Firestore.

## O que foi adicionado

- `scripts/prepare_scriptlattes.py`
  - Lê um JSON de usuários
  - Extrai o identificador Lattes de 16 dígitos a partir do link
  - Gera `membros.csv`, `scriptlattes.config` e `source-map.json`

- `scripts/consolidate_scriptlattes_output.py`
  - Lê os JSONs individuais gerados pelo ScriptLattes
  - Consolida tudo em `scriptlattes-output/firestore-lattes-updates.json`
  - Mantém o vínculo com o documento original do usuário

## Pré-requisitos

Você vai precisar de duas coisas fora deste repositório:

1. Python 3 instalado
2. Uma cópia local do ScriptLattes em Python 3

Repositório recomendado:

- https://github.com/jpmenachalco/scriptLattes

O ScriptLattes depende de Chrome/Chromium e ChromeDriver para baixar os currículos HTML.

## Formato do JSON de entrada

O `prepare_scriptlattes.py` aceita qualquer um destes formatos:

1. Lista simples:

```json
[
  {
    "id": "abc123",
    "nome": "Professora Exemplo",
    "perfil": "orientador",
    "lattes": "https://lattes.cnpq.br/1234567890123456"
  }
]
```

2. Objeto com `usuarios`:

```json
{
  "usuarios": [
    {
      "id": "abc123",
      "nome": "Professora Exemplo",
      "perfil": "orientador",
      "lattes": "https://lattes.cnpq.br/1234567890123456"
    }
  ]
}
```

3. Objeto indexado por id:

```json
{
  "abc123": {
    "nome": "Professora Exemplo",
    "perfil": "orientador",
    "lattes": "https://lattes.cnpq.br/1234567890123456"
  }
}
```

## Passo 1: gerar os arquivos de entrada do ScriptLattes

Exemplo:

```powershell
python scripts/prepare_scriptlattes.py --users-json .\usuarios.json --group-name "Mentoria InovaSecti"
```

Saída esperada em `scriptlattes-workdir/`:

- `membros.csv`
- `scriptlattes.config`
- `source-map.json`

O `membros.csv` segue o formato aceito pelo ScriptLattes:

```text
IDLATTES16,NOME,,ROTULO
```

## Passo 2: executar o ScriptLattes

Dentro do repositório clonado do ScriptLattes:

```powershell
python scriptLattes.py ..\Projeto\scriptlattes-workdir\scriptlattes.config
```

Observação importante:

- o config gerado usa caminhos absolutos para entrada, saída e cache
- isso evita erro quando o ScriptLattes é executado fora da pasta do seu projeto

Após a execução, a pasta esperada é:

- `scriptlattes-output/json/`

## Passo 3: consolidar a saída para atualizar o Firestore

```powershell
python scripts/consolidate_scriptlattes_output.py
```

Saída gerada:

- `scriptlattes-output/firestore-lattes-updates.json`

Esse arquivo terá este formato:

```json
{
  "updates": [
    {
      "document_id": "abc123",
      "uid": "abc123",
      "perfil": "orientador",
      "lattes_data": {
        "nome": "Professora Exemplo",
        "id_lattes": "1234567890123456",
        "link": "https://lattes.cnpq.br/1234567890123456",
        "resumo": "...",
        "ultima_atualizacao": "...",
        "areas_atuacao": [],
        "formacao_academica": [],
        "estatisticas": {},
        "projetos": {
          "pesquisa": [],
          "extensao": [],
          "desenvolvimento": []
        },
        "fonte": "scriptlattes",
        "sincronizado_em": null
      }
    }
  ]
}
```

## Como usar no app

Depois de importar esse payload no Firestore, cada usuário poderá ter um campo novo:

```json
{
  "lattes": "https://lattes.cnpq.br/1234567890123456",
  "lattes_data": {
    "resumo": "...",
    "areas_atuacao": [],
    "formacao_academica": []
  }
}
```

Com isso, o frontend pode exibir:

- resumo profissional
- áreas de atuação
- formação acadêmica
- estatísticas de produção
- projetos de pesquisa, extensão e desenvolvimento

## Limitações importantes

- ScriptLattes não roda no frontend
- a coleta depende do HTML público do Lattes
- mudanças no site do Lattes podem exigir ajuste no ScriptLattes
- alguns links podem não conter um id válido de 16 dígitos; esses casos vão para `ignored` no `source-map.json`

## Próximo passo recomendado

Depois de validar esse fluxo localmente, o ideal é automatizar a atualização com um backend separado, por exemplo:

- script Python agendado
- Cloud Run
- servidor próprio

Assim o React continua só lendo `lattes_data` do Firestore.