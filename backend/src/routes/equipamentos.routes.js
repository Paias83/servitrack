const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");

const router = Router();

const equipamentoUpdateSchema = z.object({
  tipo: z.string().min(1).optional(),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  numeroSerie: z.string().optional().nullable(),
  dataInstalacao: z.coerce.date().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  fotoUrl: z.string().optional().nullable(),
});

const manutencaoSchema = z.object({
  data: z.coerce.date(),
  tipoServico: z.string().min(1, "Informe o tipo de serviço."),
  descricao: z.string().optional().nullable(),
  pecas: z.array(z.string()).optional().default([]),
  fotos: z.array(z.string()).optional().default([]),
  tecnico: z.string().optional().nullable(),
});

// Detalhe de um equipamento, já com o nome do cliente
router.get("/:id", async (req, res) => {
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: req.params.id },
    include: { cliente: { select: { id: true, nome: true } } },
  });
  if (!equipamento) return res.status(404).json({ erro: "Equipamento não encontrado." });
  res.json(equipamento);
});

// Atualiza dados do equipamento
router.put("/:id", async (req, res) => {
  const parsed = equipamentoUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: parsed.error.issues[0].message });
  }
  try {
    const equipamento = await prisma.equipamento.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(equipamento);
  } catch (err) {
    res.status(404).json({ erro: "Equipamento não encontrado." });
  }
});

// Remove um equipamento (e seu histórico de manutenções, em cascata)
router.delete("/:id", async (req, res) => {
  try {
    await prisma.equipamento.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ erro: "Equipamento não encontrado." });
  }
});

// Histórico completo de manutenções, mais recente primeiro
router.get("/:id/manutencoes", async (req, res) => {
  const manutencoes = await prisma.manutencao.findMany({
    where: { equipamentoId: req.params.id },
    orderBy: { data: "desc" },
  });
  res.json(manutencoes);
});

// Atalho: apenas a última intervenção registrada
router.get("/:id/ultima-manutencao", async (req, res) => {
  const ultima = await prisma.manutencao.findFirst({
    where: { equipamentoId: req.params.id },
    orderBy: { data: "desc" },
  });
  res.json(ultima || null);
});

// Registra uma nova manutenção para o equipamento
router.post("/:id/manutencoes", async (req, res) => {
  const equipamento = await prisma.equipamento.findUnique({ where: { id: req.params.id } });
  if (!equipamento) return res.status(404).json({ erro: "Equipamento não encontrado." });

  const parsed = manutencaoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: parsed.error.issues[0].message });
  }

  const manutencao = await prisma.manutencao.create({
    data: {
      ...parsed.data,
      equipamentoId: equipamento.id,
      usuarioId: req.usuario ? req.usuario.id : null,
    },
  });
  res.status(201).json(manutencao);
});

module.exports = router;
