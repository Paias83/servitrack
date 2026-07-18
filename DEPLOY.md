# Deploy do ServiTrack

Este guia coloca o backend e o frontend no ar, acessíveis pela internet (não só no seu computador). O banco de dados e o storage de fotos já estão na nuvem (Supabase), então não precisam de nenhum passo extra aqui.

**Visão geral:**
- Código no **GitHub** (os dois serviços abaixo puxam o deploy de lá)
- **Backend** → [Railway](https://railway.com) (gratuito para começar)
- **Frontend** → [Vercel](https://vercel.com) (gratuito, feito para projetos Vite/React)

---

## 1. Colocar o projeto no GitHub

Se o projeto ainda não é um repositório Git:

```bash
cd servitrack-projeto   # a pasta que contém backend/ e frontend/
git init
git add .
git commit -m "Projeto ServiTrack"
```

Crie um repositório vazio no GitHub (botão **New repository** em [github.com/new](https://github.com/new), sem marcar nenhuma opção de inicialização) e depois:

```bash
git remote add origin https://github.com/SEU-USUARIO/servitrack.git
git branch -M main
git push -u origin main
```

> Os arquivos `.env` **não** vão junto (estão no `.gitignore` de propósito — são segredos). Você vai preencher as variáveis de ambiente direto no painel do Railway e da Vercel, no passo a passo abaixo.

---

## 2. Deploy do backend (Railway)

1. Acesse [railway.com](https://railway.com) e entre com sua conta do GitHub.
2. **New Project → Deploy from GitHub repo** → selecione o repositório `servitrack`.
3. O Railway vai perguntar (ou você ajusta depois em **Settings**) qual pasta usar como raiz do serviço: defina **Root Directory** como `backend`.
4. Em **Settings → Deploy**, confirme:
   - **Build command**: deixe em branco (o Railway roda `npm install` sozinho, que já dispara o `postinstall` que gera o Prisma Client)
   - **Start command**: `npm start`
5. Em **Variables**, adicione as mesmas variáveis do seu `.env` local:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET`
   - `CORS_ORIGIN` → deixe em branco por enquanto, você volta aqui no passo 4
6. Clique em **Deploy**. Depois de subir, o Railway te dá uma URL pública — algo como `https://servitrack-backend-production.up.railway.app`. Se não aparecer automaticamente, vá em **Settings → Networking → Generate Domain**.
7. Teste abrindo `<sua-url>/api/health` no navegador — deve responder `{"status":"ok"}`.

---

## 3. Deploy do frontend (Vercel)

1. Acesse [vercel.com](https://vercel.com) e entre com sua conta do GitHub.
2. **Add New → Project** → selecione o mesmo repositório `servitrack`.
3. Em **Root Directory**, escolha `frontend`. A Vercel detecta automaticamente que é um projeto Vite (build command `vite build`, output `dist`) — não precisa mudar nada aí.
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL` → `https://<sua-url-do-railway>/api` (a URL que você pegou no passo 2.6, com `/api` no final)
5. Clique em **Deploy**. Em ~1 minuto você tem uma URL tipo `https://servitrack.vercel.app`.

---

## 4. Conectar as pontas (CORS)

Volte no Railway, em **Variables**, e preencha:

```
CORS_ORIGIN=https://servitrack.vercel.app
```

(a URL que a Vercel te deu no passo anterior — sem barra `/` no final). Isso faz o backend só aceitar requisições vindas do seu frontend em produção. Salve; o Railway reinicia o serviço sozinho.

---

## 5. Testar

Abra a URL da Vercel no navegador, crie uma conta e teste o fluxo completo (cliente → equipamento → manutenção → foto). Agora funciona de qualquer lugar, não só na sua máquina.

---

## Atualizando depois de mudanças no código

Sempre que você mexer no código local:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

Tanto o Railway quanto a Vercel ficam "escutando" o repositório e fazem o redeploy automaticamente a cada push na branch `main`.

Se a mudança incluir alteração no `prisma/schema.prisma`, rode a migration primeiro (do seu computador, apontando pro banco do Supabase, como você já vem fazendo):

```bash
cd backend
npx prisma migrate dev --name nome_da_mudanca
```

## Continuar rodando localmente também

Nada muda no seu fluxo local — o `.env` de cada pasta continua valendo para quando você rodar `npm run dev` na sua máquina. Deploy e ambiente local são independentes.
