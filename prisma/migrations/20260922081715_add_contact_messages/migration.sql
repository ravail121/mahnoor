-- CreateEnum
CREATE TYPE "contact_messages_status" AS ENUM ('new', 'read', 'replied');

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "contact_messages_status" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_contact_messages_status" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "idx_contact_messages_created_at" ON "contact_messages"("created_at");
