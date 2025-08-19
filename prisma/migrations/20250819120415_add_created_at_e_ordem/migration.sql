-- AlterTable
ALTER TABLE "public"."Conteudo" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Conteudo_pai_createdAt_idx" ON "public"."Conteudo"("pai", "createdAt");

-- CreateIndex
CREATE INDEX "Conteudo_pai_ordem_idx" ON "public"."Conteudo"("pai", "ordem");
