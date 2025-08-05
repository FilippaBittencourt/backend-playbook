-- CreateTable
CREATE TABLE "public"."Conteudo" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Conteudo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conteudo_chave_key" ON "public"."Conteudo"("chave");
