# Uso do Banco de Dados (Firestore) para o Sistema de Clubes de Ciência

Este repositório contém scripts e dados para importar o conteúdo de um Excel (`TODOS OS PROJETOS.xlsx`) para o **Firestore**, criando as coleções usadas pelo sistema de clubes de ciência e seus projetos.

---

## 🗂️ Estrutura do Banco de Dados (coleções)

A exportação padrão gera as seguintes coleções no Firestore:

- **`unidades_escolares`**
  - Documento por escola
  - ID do documento: código da escola (`codigo` extraído do Excel)
  - Campos principais: `nome`, `nte`

- **`clubes_ciencia`**
  - Documento por clube (um por escola)
  - ID do documento: `clube_{escola_id}`
  - Campos principais: `escola_id`, `nome`

- **`usuarios`**
  - Documento por usuário (orientadores, coorientadores e estudantes)
  - ID do documento: número de matrícula (string)
  - Campos principais: `nome`, `email`, `telefone`, `perfil`, `escola_id`, `clube_id`

- **`projetos`**
  - Documento por projeto
  - ID do documento: UUID gerado automaticamente (`uuid4`)
  - Campos principais:
    - `clube_id` (liga o projeto ao clube/escola)
    - `titulo`, `tipo`, `status`
    - `membros`: lista de `matricula` dos usuários envolvidos
    - `descricao`, `introducao`, `objetivo`, `etapas`, `custos`, `referencias`, `area_tematica`
    - `pdf_links`: links dos PDFs submetidos (quando existirem)

---

## ▶️ Como gerar os dados (de Excel para JSON)

1. Instale dependências (assumindo que você já ativou o venv em `./.venv`):

```powershell
# No terminal PowerShell dentro da pasta do projeto
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

> 💡 Se não existir `requirements.txt`, instale ao menos `pandas`:
>
> ```powershell
> python -m pip install pandas
> ```

2. Execute o conversor:

```powershell
python convert_todos_to_firestore.py
```

Isso criará ou atualizará o arquivo `firestore_export.json` com as coleções descritas acima.

---

## ▶️ Como enviar os dados para o Firestore

### 1) Preparar o serviço (service account)

O script usa o arquivo `adminSDK.json` como **credencial de serviço** do Firebase (Firestore).

- Coloque o JSON do service account em `adminSDK.json`.
- O arquivo deve ser o `serviceAccountKey.json` baixado do Firebase Console.

### 2) Enviar todas as coleções para o Firestore

```powershell
python upload_to_firestore.py
```

Isso fará _overwrite_ (sobrescreverá) documentos que existam com os mesmos IDs.

### 3) Enviar apenas os projetos (quando precisar atualizar só projetos)

```powershell
python upload_projetos_only.py
```

---

## 🧩 Como usar no seu sistema (exemplos de consulta)

### 🔎 Carregar a lista de clubes de ciência

Coleção: `clubes_ciencia`

Exemplo (JavaScript / Node.js com Firebase Web SDK):

```js
import { getFirestore, collection, getDocs } from "firebase/firestore";

const db = getFirestore();
const clubesCol = collection(db, "clubes_ciencia");
const snapshot = await getDocs(clubesCol);
const clubes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
```

### 🔎 Carregar projetos de um clube

Coleção: `projetos`, filtro por `clube_id`.

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

### 👥 Carregar membros de um clube

A coleção `usuarios` contém `escola_id` e `clube_id`:

```js
const q = query(
  collection(db, "usuarios"),
  where("clube_id", "==", "clube_1178115")
);
```

---

## 🧠 Dicas de uso / boas práticas

- **IDs previsíveis**: `unidades_escolares` e `usuarios` usam IDs previsíveis (código da escola e matrícula), o que facilita buscas e links.
- **Relacionamentos**: não há `subcoleções`; os relacionamentos são feitos via campos (`clube_id`, `escola_id`, `membros`).
- **Atualização incremental**: para atualizar apenas projetos (sem tocar em usuários/clubes), use `upload_projetos_only.py`.
- **Cuidado com quotas**: Firestore impõe limites de escrita; `upload_projetos_only.py` faz pausa entre gravações para evitar erros de `RESOURCE_EXHAUSTED`.

---

## 🔐 Regras do Firestore

O projeto agora inclui o arquivo `firestore.rules` com a seguinte política:

- qualquer pessoa pode ler `clubes_ciencia`, `projetos`, `usuarios`, `unidades_escolares` e `diario_bordo`
- apenas **professor orientador** pode criar, atualizar ou excluir documentos em `clubes_ciencia` do próprio clube
- apenas **professor orientador** pode criar, atualizar ou excluir registros em `diario_bordo` quando o `projeto_id` pertencer ao mesmo `clube_id` do orientador
- as coleções `projetos`, `usuarios` e `unidades_escolares` ficam somente leitura

### Premissa de autenticação

As regras assumem que o usuário autenticado no Firebase Auth possui `uid` igual ao ID do documento em `usuarios`.

Exemplo:

- se o documento do orientador em `usuarios` for `123456`, o `request.auth.uid` desse usuário também precisa ser `123456`

Além disso, o documento em `usuarios` deve conter:

- `perfil: "orientador"`
- `clube_id: "clube_xxx"`

Se o seu Auth usar `uid` aleatório, você terá duas opções:

- gravar o `uid` real como ID do documento em `usuarios`
- ou adaptar as regras para consultar um campo alternativo via custom claims

### Publicar as regras

Com o Firebase CLI autenticado, publique com:

```powershell
firebase deploy --only firestore:rules
```

Se quiser forçar o projeto explicitamente:

```powershell
firebase deploy --only firestore:rules --project inovasecti-a3dea
```

---

## ✅ Onde começar no sistema de clubes de ciência

1. Garanta que `firestore_export.json` esteja gerado e atualizado.
2. Suba os dados para o Firestore com `upload_to_firestore.py`.
3. No seu sistema, consuma as coleções como `clubes_ciencia`, `projetos`, `usuarios` e `unidades_escolares`.
4. Se precisar sincronizar dados (cadastros, atualizações), foque em atualizar os documentos existentes sem apagar coleções inteiras.

---

Se quiser, posso também ajudar a criar exemplos de APIs (Flask/Express) ou componentes front-end que consumam essas coleções de forma organizada.