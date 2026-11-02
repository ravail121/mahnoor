-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "online_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "in_person_enabled" BOOLEAN NOT NULL DEFAULT true;
