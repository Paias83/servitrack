const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { autenticar } = require("../middleware/auth");

const router = Router();

const registroSchema = z.object({
  nome: z.string().min(1, "Informe o nome."),
  email: z.string().email("E-mail inválido."),
  senha: z.string().min(6, "A senha deve ter ao menos 6 caracteres."),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

function gerarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, nome: usuario.nome, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Cadastro de um novo técnico/usuário do sistema
router.post("/register", async (req, res) => {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: parsed.error.issues[0].message });
  }
  const { nome, email, senha } = parsed.data;

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return res.status(409).json({ erro: "Já existe um usuário com este e-mail." });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.create({
    data: { nome, email, senhaHash },
  });

  const token = gerarToken(usuario);
  res.status(201).json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

// Login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: parsed.error.issues[0].message });
  }
  const { email, senha } = parsed.data;

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  }

  const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaConfere) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  }

  const token = gerarToken(usuario);
  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

// Retorna os dados do usuário autenticado (útil para o front validar o token)
router.get("/me", autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;
