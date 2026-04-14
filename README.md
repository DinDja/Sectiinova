# SECTI - Sistema de CiÃªncia e InovaÃ§Ã£o Escolar

**Propriedade:** Secretaria de CiÃªncia, Tecnologia e InovaÃ§Ã£o da Bahia (SECTI-BA)

**Finalidade:** plataforma para apoiar a gestÃ£o e visibilidade de projetos cientÃ­ficos nas escolas da rede pÃºblica estadual, fortalecendo a pesquisa, a mentoria e a colaboraÃ§Ã£o entre clubes de ciÃªncia.

**O que faz:**
- cadastro, pesquisa e navegaÃ§Ã£o por projetos de inovaÃ§Ã£o
- registro de diÃ¡rios de bordo por projeto
- dashboard de clube com membros, orientadores e projetos vinculados
- fluxo de cadastro de projeto para o clube do usuÃ¡rio
- gestÃ£o de participaÃ§Ã£o (usuÃ¡rios, times e evoluÃ§Ã£o de atividades)

## VisÃ£o geral
- Feed de projetos com pesquisa, paginaÃ§Ã£o infinita e estados de loading/empty
- Perfil de clube com lista de projetos, membros, orientadores e diÃ¡rio de bordo
- AutenticaÃ§Ã£o com Firebase (login/cadastro)
- CriaÃ§Ã£o de projeto por clube
- Suporte a fluxo de diÃ¡rio de bordo por projeto

## Estrutura
- `src/App.jsx` - main controller + roteamento de views (Projetos / DiÃ¡rio / Clube / INPI)
- `src/components/TopBar.jsx` - barra superior de busca e logout
- `src/components/ProjectFeed.jsx` - feed de projetos com skeleton, empty e loading mais controle infinito
- `src/components/INPI.jsx` - interface de mentoria INPI e suporte Ã  proteÃ§Ã£o intelectual de projetos
- `src/components/ClubBoard.jsx` - exibe clube selecionado e projeto do clube + form de criar projeto
- `src/components/DiaryBoard.jsx` - diÃ¡rio de bordo do projeto
- `src/hooks/useAppController.js` - estado global e lÃ³gica de carregamento, busca, CRUD de projetos e diÃ¡rio
- `src/services/projectService.js` - util helpers para dados de projetos e equipe

## DependÃªncias principais
- React 19
- Vite
- Firebase (Firestore/Auth)
- Tailwind CSS
- Lucide para Ã­cones

## ConfiguraÃ§Ã£o local
1. `npm install`
2. Copie ou configure `firebase.js` com suas credenciais do Firebase
3. `npm run dev`

## Scripts
- `npm run dev` - ambiente de desenvolvimento
- `npm run build` - build de produÃ§Ã£o
- `npm run preview` - preview do build local
- `npm run test` - executa vitest

## Comportamento de busca
- Busca ativada por botÃ£o ou Enter (sem auto-disparos a cada digitaÃ§Ã£o)
- PÃ¡gina ainda usa carga inicial com skeleton
- Empty state diferente para "nenhum projeto no clube" vs "nenhuma busca"
- Infinite scroll Ã© desabilitado durante pesquisa

## Cadastre um novo projeto no clube
- VÃ¡ para a vista `Clube`
- Clique em `Registrar novo projeto`
- Preencha tÃ­tulo + campos e crie
- Novo projeto Ã© persistido em `projetos` no Firestore e aparece no clube

## ObservaÃ§Ãµes
- O projeto jÃ¡ tem suporte a carregamento de clube do usuÃ¡rio conectado e ajuste automÃ¡tico de clube pelo `loggedUser.clubes_ids` / `escolas_ids` (com fallback para `clube_id` / `escola_id`).
- Personalize estilos em `src/style.css`, `tailwind.config.js` e `PostCSS`.
- A consulta pÃºblica do agente INPI depende do endpoint local `/api/inpi/process`, exposto pelo servidor do Vite em desenvolvimento e preview. Em hospedagem estÃ¡tica, Ã© preciso publicar um backend equivalente.
- O acompanhamento automÃ¡tico do INPI usa duas Netlify Functions: `inpi-process` para a consulta pontual e `inpi-watch` para a varredura periÃ³dica das buscas monitoradas salvas em `usuarios` no Firestore.

## Monitoramento automÃ¡tico do INPI
- Buscas bem-sucedidas do rastreador INPI sÃ£o salvas no documento `usuarios/{uid}`.
- O campo `inpi_saved_searches` guarda as consultas salvas e `inpi_tracking_alerts` recebe alertas quando a function detectar mudanÃ§a no conteÃºdo pÃºblico do processo.
- O campo `inpi_tracking_monitoring_count` Ã© usado pela function agendada para filtrar apenas usuÃ¡rios com monitoramento ativo.
- A function `netlify/functions/inpi-watch.js` roda a cada 6 horas e tambÃ©m pode ser executada manualmente.

### VariÃ¡veis de ambiente da Netlify
- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`: obrigatÃ³rias para notificaÃ§Ãµes do fÃ³rum e monitoramento/alertas do INPI (sem dependÃªncia de JSON/Base64).
- `INPI_WATCH_RUN_TOKEN`: opcional. Se definido, protege a execuÃ§Ã£o manual da function `inpi-watch`.
- `TEACHER_MATRICULA_PORTAL_URL`: opcional. URL Ãºnica para sobrescrever o portal padrÃ£o de matrÃ­cula, com placeholder `{matricula}` e, se necessÃ¡rio, `{cpf}`. Sem placeholder, a function monta query string automaticamente (`?matricula=` e `&cpf=` quando informado).
- `TEACHER_MATRICULA_PORTAL_URLS`: opcional. Lista (separada por vÃ­rgula, ponto e vÃ­rgula ou quebra de linha) de mÃºltiplos portais de matrÃ­cula para fallback.
- Se nenhuma variÃ¡vel for definida, a function usa fallback automÃ¡tico para o endpoint oficial pÃºblico de consulta (`gsuite-email/email/consulta`) com tentativa em `idTipoConta=2` e `idTipoConta=1`.
- O endpoint `/api/teacher/verify` valida docentes consultando apenas portais externos (Lattes + matrÃ­cula), sem leitura de projetos para essa validaÃ§Ã£o.
- No cadastro de orientador/coorientador, o CPF Ã© usado somente para consulta nos portais oficiais de validaÃ§Ã£o e nÃ£o Ã© salvo no perfil do usuÃ¡rio.
- ModeraÃ§Ã£o do fÃ³rum (`/api/forum/moderate`) usa Perspective + OpenRouter em conjunto.
- As chaves estÃ£o embutidas em `netlify/functions/forum-moderate.js` nas constantes `PERSPECTIVE_API_KEY_HARDCODED` e `OPENROUTER_API_KEY_HARDCODED`.
- `PERSPECTIVE_REVIEW_THRESHOLD`: opcional. Limiar (0-1) para reter conteÃºdo em revisÃ£o. PadrÃ£o: `0.35`.
- `PERSPECTIVE_BLOCK_THRESHOLD`: opcional. Limiar (0-1) para bloquear conteÃºdo automaticamente. PadrÃ£o: `0.78`.

## PrÃ³ximos passos sugeridos
- Adicionar validaÃ§Ã£o de campos avanÃ§ada no registro de projeto
- Adicionar histÃ³rico de alteraÃ§Ãµes de projeto
- Adicionar estados de erro visual no dashboard
- Adicionar testes automÃ¡ticos para ClubBoard/ProjectFeed

