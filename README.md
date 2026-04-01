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

## Próximos passos sugeridos
- Adicionar validação de campos avançada no registro de projeto
- Adicionar histórico de alterações de projeto
- Adicionar estados de erro visual no dashboard
- Adicionar testes automáticos para ClubBoard/ProjectFeed
