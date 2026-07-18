require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { autenticar } = require("./middleware/auth");
const authRoutes = require("./routes/auth.routes");
const clientesRoutes = require("./routes/clientes.routes");
const equipamentosRoutes = require("./routes/equipamentos.routes");
const manutencoesRoutes = require("./routes/manutencoes.routes");
const uploadsRoutes = require("./routes/uploads.routes");
const { ensureBucket } = require("./lib/supabase");

const app = express();

// Em produção, defina CORS_ORIGIN com a URL do frontend (separadas por vírgula se houver mais de uma).
// Sem essa variável, libera qualquer origem — bom para desenvolvimento local, não recomendado em produção.
const origensPermitidas = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origensPermitidas.length === 0 || origensPermitidas.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Origem não permitida pelo CORS."));
    },
  })
);
app.use(express.json());

// Rota pública de verificação
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Rotas de autenticação (públicas: registro e login)
app.use("/api/auth", authRoutes);

// Todas as rotas abaixo exigem um token JWT válido
app.use("/api/clientes", autenticar, clientesRoutes);
app.use("/api/equipamentos", autenticar, equipamentosRoutes);
app.use("/api/manutencoes", autenticar, manutencoesRoutes);
app.use("/api/uploads", autenticar, uploadsRoutes);

// Tratamento de erros não previstos
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, async () => {
  console.log(`ServiTrack API rodando em http://localhost:${PORT}`);
  await ensureBucket();
});
