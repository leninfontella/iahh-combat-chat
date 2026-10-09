# IA.AHH! Combat Chat

Chatbot satírico em português brasileiro com diferentes personas, desafios, duelos, debates, roleta de respostas, confessionário e gerador de roast. A interface usa Supabase para autenticação e funções de backend, enquanto as respostas são geradas pela API do Google Gemini.

## Tecnologias

- React 18 e TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS e shadcn/ui
- Supabase Auth e Edge Functions
- Google Gemini API
- Vitest

## Requisitos

- Node.js 20 ou superior
- npm
- Um projeto no Supabase
- Uma chave da API Gemini

## Instalação

```bash
npm install
```

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_PROJECT_ID=seu_project_id
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

Inicie o ambiente local:

```bash
npm run dev
```

## Funções do Supabase

As funções estão em `supabase/functions`:

- `chat`: conversa principal, desafios e duelos
- `confessor`: conselhos curtos por persona
- `debate`: debate entre duas personas
- `roast`: análise satírica estruturada
- `roulette`: eventos aleatórios e personas especiais

Cadastre a chave do Gemini como segredo do Supabase:

```bash
supabase secrets set GEMINI_API_KEY=sua_chave
```

Depois publique as funções:

```bash
supabase functions deploy chat
supabase functions deploy confessor
supabase functions deploy debate
supabase functions deploy roast
supabase functions deploy roulette
```

Nunca coloque `GEMINI_API_KEY` no `.env` do frontend nem use o prefixo `VITE_`, pois isso exporia a chave no navegador.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a aplicação para produção |
| `npm run preview` | Visualiza localmente a build |
| `npm run lint` | Executa o ESLint |
| `npm test` | Executa os testes uma vez |
| `npm run test:watch` | Executa os testes em modo contínuo |

## Publicação na Vercel

Conecte o repositório à Vercel e cadastre as três variáveis `VITE_SUPABASE_*` do frontend. O arquivo `vercel.json` mantém o fallback do React Router para que URLs acessadas diretamente não retornem 404.

As Edge Functions continuam sendo publicadas no Supabase, não na Vercel.
