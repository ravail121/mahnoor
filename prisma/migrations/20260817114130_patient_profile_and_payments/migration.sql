-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" VARCHAR(500);

-- CreateTable
CREATE TABLE "saved_payment_methods" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "method" "payments_method" NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "account_hint" VARCHAR(80),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_saved_payment_methods_user" ON "saved_payment_methods"("user_id");

-- AddForeignKey
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "fk_saved_payment_methods_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
