# ServiTrack — Frontend

App em React (Vite) para o sistema de gestão de clientes, equipamentos e histórico de manutenções. Consome a API do `backend`.

## 1. Pré-requisitos

- Node.js 18+
- O backend já rodando (veja o README da pasta `backend`) em `http://localhost:3333`

## 2. Instalação

```bash
cd frontend
npm install
cp .env.example .env
```

O `.env` já vem apontando para `http://localhost:3333/api`, que é o padrão do backend. Só precisa mudar se você rodar a API em outra porta.

## 3. Rodar o frontend

```bash
npm run dev
```

O app abre em `http://localhost:5173`. Como os dois projetos rodam na sua própria máquina (`localhost`), o navegador consegue fazer as chamadas para a API sem bloqueios — diferente de rodar o front dentro do preview do Claude, que fica isolado e não alcança seu `localhost`.

## 4. Primeiro uso

1. Abra `http://localhost:5173`
2. Clique em **Criar conta**, preencha nome, e-mail e senha
3. Você é logado automaticamente e cai na tela de clientes
4. Cadastre um cliente → entre nele → cadastre um equipamento → entre nele → registre uma manutenção

O login fica salvo no navegador (não precisa entrar de novo a cada vez que abrir).

## 5. Build de produção (opcional, mais pra frente)

```bash
npm run build
```

Gera os arquivos estáticos em `dist/`, prontos pra hospedar em qualquer serviço (Vercel, Netlify, Cloudflare Pages etc.). Lembre de configurar a `VITE_API_URL` de produção antes do build.
