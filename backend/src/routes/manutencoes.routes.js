const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");

const router = Router();

const manutencaoUpdateSchema = z.object({
  data: z.coerce.date().optional(),
  tipoServico: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  pecas: z.array(z.string()).optional(),
  fotos: z.array(z.string()).optional(),
  tecnico: z.string().optional().nullable(),
});

router.put("/:id", async (req, res) => {
  const parsed = manutencaoUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: parsed.error.issues[0].message });
  }
  try {
    const manutencao = await prisma.manutencao.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(manutencao);
  } catch (err) {
    res.status(404).json({ erro: "Manutenção não encontrada." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.manutencao.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ erro: "Manutenção não encontrada." });
  }
});

module.exports = router;
