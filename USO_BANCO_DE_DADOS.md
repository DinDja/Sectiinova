# Uso do Banco de Dados (Firestore) para o Sistema de Clubes de CiÃªncia

Este repositÃ³rio contÃ©m scripts e dados para importar o conteÃºdo de um Excel (`TODOS OS PROJETOS.xlsx`) para o **Firestore**, criando as coleÃ§Ãµes usadas pelo sistema de clubes de ciÃªncia e seus projetos.

---

## ðŸ—‚ï¸ Estrutura do Banco de Dados (coleÃ§Ãµes)

A exportaÃ§Ã£o padrÃ£o gera as seguintes coleÃ§Ãµes no Firestore:

- **`unidades_escolares`**
  - Documento por escola
  - ID do documento: cÃ³digo da escola (`codigo` extraÃ­do do Excel)
  - Campos principais: `nome`, `nte`

- **`clubes`**
  - Documento por clube (um por escola)
  - ID do documento: `clube_{escola_id}`
  - Campos principais: `escola_id`, `nome`

- **`usuarios`**
  - Documento por usuÃ¡rio (orientadores, coorientadores e estudantes)
  - ID do documento: nÃºmero de matrÃ­cula (string)
  - Campos principais: `nome`, `email`, `telefone`, `perfil`, `escolas_ids`, `clubes_ids` (e campos legados `escola_id`/`clube_id` para compatibilidade)
  - Campos adicionais do mÃ³dulo INPI:
    - `inpi_saved_searches`: buscas salvas do rastreador de acompanhamento
    - `inpi_tracking_alerts`: alertas de mudanÃ§as detectadas automaticamente
    - `inpi_tracking_monitoring_count`: quantidade de buscas com monitoramento ativo
    - `inpi_tracking_last_watch_run_at`: horÃ¡rio da Ãºltima varredura da function
    - `inpi_tracking_last_watch_summary`: resumo textual da Ãºltima varredura

- **`projetos`**
  - Documento por projeto
  - ID do documento: UUID gerado automaticamente (`uuid4`)
  - Campos principais:
    - `clube_id` (liga o projeto ao clube/escola)
    - `titulo`, `tipo`, `status`
    - `membros`: lista de `matricula` dos usuÃ¡rios envolvidos
    - `descricao`, `introducao`, `objetivo`, `etapas`, `custos`, `referencias`, `area_tematica`
    - `pdf_links`: links dos PDFs submetidos (quando existirem)

---

## â–¶ï¸ Como gerar os dados (de Excel para JSON)

1. Instale dependÃªncias (assumindo que vocÃª jÃ¡ ativou o venv em `./.venv`):

```powershell
# No terminal PowerShell dentro da pasta do projeto
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

> ðŸ’¡ Se nÃ£o existir `requirements.txt`, instale ao menos `pandas`:
>
> ```powershell
> python -m pip install pandas
> ```

2. Execute o conversor:

```powershell
python convert_todos_to_firestore.py
```

Isso criarÃ¡ ou atualizarÃ¡ o arquivo `firestore_export.json` com as coleÃ§Ãµes descritas acima.

---

## â–¶ï¸ Como enviar os dados para o Firestore

### 1) Preparar o serviÃ§o (service account)

O script usa o arquivo `adminSDK.json` como **credencial de serviÃ§o** do Firebase (Firestore).

- Coloque o JSON do service account em `adminSDK.json`.
- O arquivo deve ser o `serviceAccountKey.json` baixado do Firebase Console.

### 2) Enviar todas as coleÃ§Ãµes para o Firestore

```powershell
python upload_to_firestore.py
```

Isso farÃ¡ _overwrite_ (sobrescreverÃ¡) documentos que existam com os mesmos IDs.

### 3) Enviar apenas os projetos (quando precisar atualizar sÃ³ projetos)

```powershell
python upload_projetos_only.py
```

---

## ðŸ§© Como usar no seu sistema (exemplos de consulta)

### ðŸ”Ž Carregar a lista de clubes de ciÃªncia

ColeÃ§Ã£o: `clubes`

Exemplo (JavaScript / Node.js com Firebase Web SDK):

```js
import { getFirestore, collection, getDocs } from "firebase/firestore";

const db = getFirestore();
const clubesCol = collection(db, "clubes");
const snapshot = await getDocs(clubesCol);
const clubes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
```

### ðŸ”Ž Carregar projetos de um clube

ColeÃ§Ã£o: `projetos`, filtro por `clube_id`.

```js
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const db = getFirestore();
const q = query(
  collection(db, "projetos"),
  where("clube_id", "==", "clube_1178115")
);
const snapshot = await getDocs(q);
const projetos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
```

### ðŸ‘¥ Carregar membros de um clube

A coleÃ§Ã£o `usuarios` contÃ©m `escola_id` e `clube_id`:

```js
const q = query(
  collection(db, "usuarios"),
  where("clube_id", "==", "clube_1178115")
);
```

---

## ðŸ§  Dicas de uso / boas prÃ¡ticas

- **IDs previsÃ­veis**: `unidades_escolares` e `usuarios` usam IDs previsÃ­veis (cÃ³digo da escola e matrÃ­cula), o que facilita buscas e links.
- **Relacionamentos**: nÃ£o hÃ¡ `subcoleÃ§Ãµes`; os relacionamentos sÃ£o feitos via campos (`clube_id`, `escola_id`, `membros`).
- **AtualizaÃ§Ã£o incremental**: para atualizar apenas projetos (sem tocar em usuÃ¡rios/clubes), use `upload_projetos_only.py`.
- **Cuidado com quotas**: Firestore impÃµe limites de escrita; `upload_projetos_only.py` faz pausa entre gravaÃ§Ãµes para evitar erros de `RESOURCE_EXHAUSTED`.

---

## ðŸ” Regras do Firestore

O projeto agora inclui o arquivo `firestore.rules` com a seguinte polÃ­tica:

- qualquer pessoa pode ler `clubes`, `projetos`, `usuarios`, `unidades_escolares` e `diario_bordo`
- apenas **professor orientador** pode criar, atualizar ou excluir documentos em `clubes` do prÃ³prio clube
- apenas **professor orientador** pode criar, atualizar ou excluir registros em `diario_bordo` quando o `projeto_id` pertencer ao mesmo `clube_id` do orientador
- as coleÃ§Ãµes `projetos`, `usuarios` e `unidades_escolares` ficam somente leitura

### Monitoramento automÃ¡tico do INPI via Netlify

- O frontend grava as buscas do usuÃ¡rio diretamente no documento `usuarios/{uid}`.
- A function agendada `netlify/functions/inpi-watch.js` usa Firebase Admin para ler apenas usuÃ¡rios com `inpi_tracking_monitoring_count > 0`.
- Quando a function encontra alteraÃ§Ã£o no conteÃºdo pÃºblico de um processo monitorado, ela acrescenta um item em `inpi_tracking_alerts`.
- Para a function rodar na Netlify, configure uma service account do Firebase Admin via `FIREBASE_SERVICE_ACCOUNT_JSON` ou variÃ¡veis equivalentes.

### ColeÃ§Ãµes do FÃ³rum (CafÃ© Digital)

O mÃ³dulo de fÃ³rum adiciona 5 coleÃ§Ãµes:

- **`forum_topicos`** â€” TÃ³picos de discussÃ£o vinculados a um clube
  - Campos: `clube_id`, `titulo`, `descricao`, `autor_id`, `autor_nome`, `createdAt`, `lastActivityAt`, `mensagens_count`, `pinned`, `locked`
  - CriaÃ§Ã£o: qualquer usuÃ¡rio autenticado (com `autor_id == uid`)
  - ModeraÃ§Ã£o (pin/lock/delete): orientadores/coorientadores do clube

- **`forum_mensagens`** â€” Mensagens dentro de um tÃ³pico
  - Campos: `topico_id`, `clube_id`, `autor_id`, `autor_nome`, `conteudo`, `createdAt`
  - CriaÃ§Ã£o: qualquer autenticado (com `autor_id == uid`)
  - ExclusÃ£o: autor da mensagem ou moderador do clube

- **`forum_solicitacoes`** â€” Pedidos de entrada de membros externos em fÃ³runs de outros clubes
  - Campos: `clube_id`, `solicitante_id`, `solicitante_nome`, `solicitante_clube_id`, `status` (pendente/aceito/recusado), `respondido_por`, `createdAt`, `respondidoAt`
  - CriaÃ§Ã£o: solicitante autenticado
  - AprovaÃ§Ã£o/RejeiÃ§Ã£o: mentor do clube alvo

- **`forum_membros_externos`** â€” Registro de membros aceitos em fÃ³runs de outros clubes
  - Campos: `clube_id`, `membro_id`, `membro_nome`, `aceito_por`, `createdAt`
  - CriaÃ§Ã£o/ExclusÃ£o: mentor do clube

- **`forum_moderation_alerts`** â€” Alertas automÃ¡ticos para orientadores/coorientadores quando aluno envia conteÃºdo bloqueado/suspeito
  - Campos: `clube_id`, `recipient_id`, `actor_id`, `actor_nome`, `decision`, `risk_score`, `reason`, `categories`, `excerpt`, `status`, `createdAt`
  - CriaÃ§Ã£o: Netlify Function `forum-moderate` (Firebase Admin)
  - Leitura/baixa: apenas destinatÃ¡rio do alerta

### Premissa de autenticaÃ§Ã£o

As regras assumem que o usuÃ¡rio autenticado no Firebase Auth possui `uid` igual ao ID do documento em `usuarios`.

Exemplo:

- se o documento do orientador em `usuarios` for `123456`, o `request.auth.uid` desse usuÃ¡rio tambÃ©m precisa ser `123456`

AlÃ©m disso, o documento em `usuarios` deve conter:

- `perfil: "orientador"`
- `clube_id: "clube_xxx"`

Se o seu Auth usar `uid` aleatÃ³rio, vocÃª terÃ¡ duas opÃ§Ãµes:

- gravar o `uid` real como ID do documento em `usuarios`
- ou adaptar as regras para consultar um campo alternativo via custom claims

### Publicar as regras

Com o Firebase CLI autenticado, publique com:

```powershell
firebase deploy --only firestore:rules
```

Se quiser forÃ§ar o projeto explicitamente:

```powershell
firebase deploy --only firestore:rules --project inovasecti-a3dea
```

---

## âœ… Onde comeÃ§ar no sistema de clubes de ciÃªncia

1. Garanta que `firestore_export.json` esteja gerado e atualizado.
2. Suba os dados para o Firestore com `upload_to_firestore.py`.
3. No seu sistema, consuma as coleÃ§Ãµes como `clubes`, `projetos`, `usuarios` e `unidades_escolares`.
4. Se precisar sincronizar dados (cadastros, atualizaÃ§Ãµes), foque em atualizar os documentos existentes sem apagar coleÃ§Ãµes inteiras.

---

Se quiser, posso tambÃ©m ajudar a criar exemplos de APIs (Flask/Express) ou componentes front-end que consumam essas coleÃ§Ãµes de forma organizada.
