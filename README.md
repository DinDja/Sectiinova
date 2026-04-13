# SECTI - Sistema de Ciência e Inovação Escolar

**Propriedade:** Secretaria de Ciência, Tecnologia e Inovação da Bahia (SECTI-BA)

**Finalidade:** plataforma para apoiar a gestão e visibilidade de projetos científicos nas escolas da rede pública estadual, fortalecendo a pesquisa, a mentoria e a colaboração entre clubes de ciência.

**O que faz:**
- cadastro, pesquisa e navegação por projetos de inovação
- registro de diários de bordo por projeto
- dashboard de clube com membros, orientadores e projetos vinculados
- fluxo de cadastro de projeto para o clube do usuário
- gestão de participação (usuários, times e evolução de atividades)

## Visão geral
- Feed de projetos com pesquisa, paginação infinita e estados de loading/empty
- Perfil de clube com lista de projetos, membros, orientadores e diário de bordo
- Autenticação com Firebase (login/cadastro)
- Criação de projeto por clube
- Suporte a fluxo de diário de bordo por projeto

## Estrutura
- `src/App.jsx` - main controller + roteamento de views (Projetos / Diário / Clube / INPI)
- `src/components/TopBar.jsx` - barra superior de busca e logout
- `src/components/ProjectFeed.jsx` - feed de projetos com skeleton, empty e loading mais controle infinito
- `src/components/INPI.jsx` - interface de mentoria INPI e suporte à proteção intelectual de projetos
- `src/components/ClubBoard.jsx` - exibe clube selecionado e projeto do clube + form de criar projeto
- `src/components/DiaryBoard.jsx` - diário de bordo do projeto
- `src/hooks/useAppController.js` - estado global e lógica de carregamento, busca, CRUD de projetos e diário
- `src/services/projectService.js` - util helpers para dados de projetos e equipe

## Dependências principais
- React 19
- Vite
- Firebase (Firestore/Auth)
- Tailwind CSS
- Lucide para ícones

## Configuração local
1. `npm install`
2. Copie ou configure `firebase.js` com suas credenciais do Firebase
3. `npm run dev`

## Scripts
- `npm run dev` - ambiente de desenvolvimento
- `npm run build` - build de produção
- `npm run preview` - preview do build local
- `npm run test` - executa vitest

## Comportamento de busca
- Busca ativada por botão ou Enter (sem auto-disparos a cada digitação)
- Página ainda usa carga inicial com skeleton
- Empty state diferente para "nenhum projeto no clube" vs "nenhuma busca"
- Infinite scroll é desabilitado durante pesquisa

## Cadastre um novo projeto no clube
- Vá para a vista `Clube`
- Clique em `Registrar novo projeto`
- Preencha título + campos e crie
- Novo projeto é persistido em `projetos` no Firestore e aparece no clube

## Observações
- O projeto já tem suporte a carregamento de clube do usuário conectado e ajuste automático de clube pelo `loggedUser.clube_id` / `escola_id`.
- Personalize estilos em `src/style.css`, `tailwind.config.js` e `PostCSS`.
- A consulta pública do agente INPI depende do endpoint local `/api/inpi/process`, exposto pelo servidor do Vite em desenvolvimento e preview. Em hospedagem estática, é preciso publicar um backend equivalente.
- O acompanhamento automático do INPI usa duas Netlify Functions: `inpi-process` para a consulta pontual e `inpi-watch` para a varredura periódica das buscas monitoradas salvas em `usuarios` no Firestore.

## Monitoramento automático do INPI
- Buscas bem-sucedidas do rastreador INPI são salvas no documento `usuarios/{uid}`.
- O campo `inpi_saved_searches` guarda as consultas salvas e `inpi_tracking_alerts` recebe alertas quando a function detectar mudança no conteúdo público do processo.
- O campo `inpi_tracking_monitoring_count` é usado pela function agendada para filtrar apenas usuários com monitoramento ativo.
- A function `netlify/functions/inpi-watch.js` roda a cada 6 horas e também pode ser executada manualmente.

### Variáveis de ambiente da Netlify
- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`: obrigatórias para notificações do fórum e monitoramento/alertas do INPI (sem dependência de JSON/Base64).
- `INPI_WATCH_RUN_TOKEN`: opcional. Se definido, protege a execução manual da function `inpi-watch`.
- `TEACHER_MATRICULA_PORTAL_URL`: opcional. URL única para sobrescrever o portal padrão de matrícula, com placeholder `{matricula}` e, se necessário, `{cpf}`. Sem placeholder, a function monta query string automaticamente (`?matricula=` e `&cpf=` quando informado).
- `TEACHER_MATRICULA_PORTAL_URLS`: opcional. Lista (separada por vírgula, ponto e vírgula ou quebra de linha) de múltiplos portais de matrícula para fallback.
- Se nenhuma variável for definida, a function usa fallback automático para o endpoint oficial público de consulta (`gsuite-email/email/consulta`) com tentativa em `idTipoConta=2` e `idTipoConta=1`.
- O endpoint `/api/teacher/verify` valida docentes consultando apenas portais externos (Lattes + matrícula), sem leitura de projetos para essa validação.
- No cadastro de orientador/coorientador, o CPF é usado somente para consulta nos portais oficiais de validação e não é salvo no perfil do usuário.
- Moderação do fórum (`/api/forum/moderate`) usa Perspective + OpenRouter em conjunto.
- As chaves estão embutidas em `netlify/functions/forum-moderate.js` nas constantes `PERSPECTIVE_API_KEY_HARDCODED` e `OPENROUTER_API_KEY_HARDCODED`.
- `PERSPECTIVE_REVIEW_THRESHOLD`: opcional. Limiar (0-1) para reter conteúdo em revisão. Padrão: `0.35`.
- `PERSPECTIVE_BLOCK_THRESHOLD`: opcional. Limiar (0-1) para bloquear conteúdo automaticamente. Padrão: `0.78`.

## Próximos passos sugeridos
- Adicionar validação de campos avançada no registro de projeto
- Adicionar histórico de alterações de projeto
- Adicionar estados de erro visual no dashboard
- Adicionar testes automáticos para ClubBoard/ProjectFeed
