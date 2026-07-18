const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");

const router = Router();

const clienteSchema = z.object({
  nome: z.string().min(1, "Informe o nome do cliente."),
  apelido: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido.").optional().nullable().or(z.literal("")),
  endereco: z.string().optional().nullable(),
});

// Lista clientes, com busca opcional por nome (?busca=texto)
router.get("/", async (req, res) => {
  const { busca } = req.query;

  const clientes = await prisma.cliente.findMany({
    where: busca
      ? {
          OR: [
            { nome: { contains: String(busca), mode: "insensitive" } },
            { apelido: { contains: String(busca), mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
    include: { _count: { select: { equipamentos: true } } },
  });

  res.json(clientes);
});

// Detalhe de um cliente
router.get("/:id", async (req, res) => {
  const cliente = await prisma.cliente.findUnique({ where: { id: req.params.id } });
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });
  res.json(cliente);
});

// Cria um novo cliente
router.post("/", async (req, res) => {
  const parsed = clienteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: parsed.error.issues[0].message });
  }
  const cliente = await prisma.cliente.create({ data: parsed.data });
  res.status(201).json(cliente);
});

// Atualiza um cliente
router.put("/:id", async (req, res) => {
  const parsed = clienteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: parsed.error.issues[0].message });
  }
  try {
    const cliente = await prisma.cliente.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(cliente);
  } catch (err) {
    res.status(404).json({ erro: "Cliente não encontrado." });
  }
});

// Remove um cliente (e em cascata, seus equipamentos e manutenções)
router.delete("/:id", async (req, res) => {
  try {
    await prisma.cliente.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ erro: "Cliente não encontrado." });
  }
});

// Lista os equipamentos de um cliente
router.get("/:id/equipamentos", async (req, res) => {
  const equipamentos = await prisma.equipamento.findMany({
    where: { clienteId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(equipamentos);
});

// Cria um equipamento vinculado a um cliente
router.post("/:id/equipamentos", async (req, res) => {
  const cliente = await prisma.cliente.findUnique({ where: { id: req.params.id } });
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });

  const equipamentoSchema = z.object({
    tipo: z.string().min(1, "Informe o tipo/nome do equipamento."),
    marca: z.string().optional().nullable(),
    modelo: z.string().optional().nullable(),
    numeroSerie: z.string().optional().nullable(),
    dataInstalacao: z.coerce.date().optional().nullable(),
    observacoes: z.string().optional().nullable(),
    fotoUrl: z.string().optional().nullable(),
  });

  const parsed = equipamentoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: parsed.error.issues[0].message });
  }

  const equipamento = await prisma.equipamento.create({
    data: { ...parsed.data, clienteId: cliente.id },
  });
  res.status(201).json(equipamento);
});

module.exports = router;
