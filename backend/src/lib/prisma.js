const { PrismaClient } = require("@prisma/client");

// Reaproveita uma única instância do Prisma Client em toda a aplicação
const prisma = new PrismaClient();

module.exports = prisma;
