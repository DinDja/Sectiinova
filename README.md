# SECTI - Sistema de Ciencia e Inovacao Escolar

**Propriedade:** Secretaria de Ciencia, Tecnologia e Inovacao da Bahia (SECTI-BA)

**Finalidade:** Plataforma para apoiar a gestao e visibilidade de projetos cientificos nas escolas da rede publica estadual, fortalecendo pesquisa, mentoria e colaboracao entre clubes de ciencia.

## Visao geral
- Feed de projetos com pesquisa, paginacao infinita e estados de loading/empty.
- Perfil de clube com lista de projetos, membros, orientadores e diario de bordo.
- Autenticacao com Firebase (login/cadastro).
- Criacao de projeto por clube.
- Suporte ao fluxo INPI.

## Estrutura principal
- `app/layout.jsx` - layout global do Next.js e metadados da aplicacao.
- `app/page.jsx` - pagina raiz que carrega a aplicacao React.
- `app/api/**/route.js` - endpoints de API consumidos pelo frontend.
- `src/App.jsx` - controlador principal de views (Projetos / Diario / Clube / INPI / Forum / Trilha).
- `src/hooks/useAppController.js` - estado global e logica de dados.
- `netlify/functions/*.js` - funcoes reutilizadas pelos handlers de API no Next e pela Netlify.

## Dependencias principais
- Next.js
- React 19
- Firebase (Firestore/Auth)
- Tailwind CSS
- Lucide React

## Configuracao local
1. `npm install`
2. Configure o arquivo `.env.local` quando necessario (ex.: chaves `NEXT_PUBLIC_*` no frontend).
3. `npm run dev`

## Scripts
- `npm run dev` - ambiente de desenvolvimento (Next.js)
- `npm run build` - build de producao (Next.js)
- `npm run start` - servidor de producao local apos build
- `npm run test` - executa Vitest

## API interna (Next.js)
Os endpoints abaixo estao em `app/api` e reutilizam as regras existentes de `netlify/functions`:
- `/api/inpi/process`
- `/api/inpi/watch`
- `/api/forum/moderate`
- `/api/forum/alerts`
- `/api/lattes/extract`
- `/api/teacher/verify` (retorna `501` ate a function ser implementada)

## Monitoramento automatico do INPI
- Buscas bem-sucedidas do rastreador INPI sao salvas no documento `usuarios/{uid}`.
- `inpi_saved_searches` guarda consultas monitoradas.
- `inpi_tracking_alerts` recebe alertas quando houver mudanca no conteudo publico do processo.
- `inpi_tracking_monitoring_count` filtra usuarios com monitoramento ativo.
- A function `netlify/functions/inpi-watch.js` roda via agendamento na Netlify e tambem pode ser executada manualmente.

## Variaveis de ambiente (Netlify / backend)
- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`
- `INPI_WATCH_RUN_TOKEN` (opcional)
- `TEACHER_MATRICULA_PORTAL_URL` (opcional)
- `TEACHER_MATRICULA_PORTAL_URLS` (opcional)
- `PERSPECTIVE_REVIEW_THRESHOLD` (opcional)
- `PERSPECTIVE_BLOCK_THRESHOLD` (opcional)

## Observacoes
- O frontend usa rotas `/api/...` locais do Next.js, sem depender de proxy do Vite.
- O arquivo `firebase.js` foi adaptado para variaveis `NEXT_PUBLIC_*`.
- Personalizacoes visuais continuam em `src/style.css` e `tailwind.config.js`.
