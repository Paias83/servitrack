const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não informado." });
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, nome: payload.nome, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

module.exports = { autenticar };
