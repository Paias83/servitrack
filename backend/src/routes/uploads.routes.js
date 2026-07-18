const { Router } = require("express");
const multer = require("multer");
const { randomUUID } = require("crypto");
const { supabase, BUCKET } = require("../lib/supabase");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

const router = Router();

router.post("/", upload.single("foto"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: "Nenhum arquivo enviado." });
  }
  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({ erro: "Apenas imagens são permitidas." });
  }

  const extensao = (req.file.originalname.split(".").pop() || "jpg").toLowerCase();
  const caminho = `${randomUUID()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false,
  });

  if (error) {
    return res.status(500).json({ erro: `Falha ao enviar imagem: ${error.message}` });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  res.status(201).json({ url: data.publicUrl });
});

module.exports = router;
