const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const conteudos = {
  home: "Seu conteúdo aqui em string",
  sobre: "Outro conteúdo aqui"
};

async function main() {
  for (const chave in conteudos) {
    const valor = conteudos[chave];
    await prisma.conteudo.upsert({
      where: { chave },
      update: { valor },
      create: { chave, valor }
    });
  }
  console.log("✅ Conteúdo inserido com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
