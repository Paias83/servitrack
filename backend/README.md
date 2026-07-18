# ServiTrack — Backend

API REST em Node.js + Express + PostgreSQL (via Prisma) para o sistema de gestão de clientes, equipamentos e histórico de manutenções.

## 1. Pré-requisitos

- Node.js 18+
- Uma conta gratuita no [Supabase](https://supabase.com)

## 2. Criar o banco no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com) e faça login (pode ser com GitHub).
2. Clique em **New project**, dê um nome (ex: `servitrack`), defina uma senha para o banco (guarde-a) e escolha uma região.
3. Aguarde ~2 minutos enquanto o Supabase provisiona o projeto.
4. Com o projeto aberto, clique no botão **Connect** (no topo da página).
5. Na aba **ORM**, selecione **Prisma**. O Supabase mostra duas strings de conexão prontas:
   - Uma para `DATABASE_URL` (porta **6543**, com `pgbouncer=true`) — usada pela aplicação.
   - Uma para `DIRECT_URL` (porta **5432**) — usada só pelas migrations.
6. Copie as duas e substitua `[SUA-SENHA]` pela senha que você definiu no passo 2.

## 3. Instalação

```bash
cd backend
npm install
cp .env.example .env
```

Abra o `.env` e cole as duas strings de conexão do Supabase em `DATABASE_URL` e `DIRECT_URL`. Troque também `JWT_SECRET` por um valor aleatório (qualquer string longa serve).

## 4. Criar as tabelas no banco

```bash
npx prisma migrate dev --name init
```

Isso cria as tabelas `Usuario`, `Cliente`, `Equipamento` e `Manutencao` de acordo com `prisma/schema.prisma`. Você pode conferir as tabelas criadas no painel do Supabase, em **Table Editor**.

## 5. Rodar a API

```bash
npm run dev
```

A API sobe em `http://localhost:3333`.

## 6. Autenticação

Todas as rotas de `clientes`, `equipamentos` e `manutencoes` exigem um token JWT no header:

```
Authorization: Bearer <token>
```

O token é obtido em `/api/auth/register` ou `/api/auth/login`.

## 7. Referência da API

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cria um usuário/técnico `{ nome, email, senha }` |
| POST | `/api/auth/login` | Login `{ email, senha }` → retorna `{ token, usuario }` |
| GET | `/api/auth/me` | Retorna o usuário autenticado |

### Clientes
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/clientes?busca=texto` | Lista clientes (busca opcional por nome) |
| POST | `/api/clientes` | Cria cliente `{ nome, telefone?, email?, endereco? }` |
| GET | `/api/clientes/:id` | Detalhe de um cliente |
| PUT | `/api/clientes/:id` | Atualiza cliente |
| DELETE | `/api/clientes/:id` | Remove cliente (e seus equipamentos, em cascata) |
| GET | `/api/clientes/:id/equipamentos` | Lista equipamentos do cliente |
| POST | `/api/clientes/:id/equipamentos` | Cadastra equipamento para o cliente |

### Equipamentos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/equipamentos/:id` | Detalhe do equipamento (com dados do cliente) |
| PUT | `/api/equipamentos/:id` | Atualiza equipamento |
| DELETE | `/api/equipamentos/:id` | Remove equipamento (e seu histórico) |
| GET | `/api/equipamentos/:id/manutencoes` | Histórico completo, mais recente primeiro |
| GET | `/api/equipamentos/:id/ultima-manutencao` | Apenas a última intervenção |
| POST | `/api/equipamentos/:id/manutencoes` | Registra manutenção `{ data, tipoServico, descricao?, pecas?, tecnico? }` |

### Manutenções
| Método | Rota | Descrição |
|---|---|---|
| PUT | `/api/manutencoes/:id` | Edita uma manutenção específica |
| DELETE | `/api/manutencoes/:id` | Remove uma manutenção |

## 8. Próximos passos sugeridos

- Conectar o front-end (protótipo React) a estas rotas, trocando o `window.storage` por chamadas `fetch` autenticadas.
- Adicionar paginação nas listagens quando o volume de dados crescer.
- Adicionar upload de foto (ex: peça substituída) — o próprio Supabase tem um recurso de **Storage** (buckets), que evita precisar de outro serviço.
- Deploy da API: Railway, Render ou Fly.io funcionam bem para hospedar o Node.js (o banco já fica no Supabase).
