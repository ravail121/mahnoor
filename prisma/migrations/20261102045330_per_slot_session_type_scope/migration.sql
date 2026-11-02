-- AlterTable
ALTER TABLE "availability" ADD COLUMN     "in_person_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "online_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Preserve current behavior for already-published slots: Friday/Saturday
-- in-person was closed by a hardcoded rule that this migration replaces
-- with per-slot control.
UPDATE "availability" SET "in_person_enabled" = false WHERE EXTRACT(DOW FROM "date") IN (5, 6);

-- AlterTable
-- Superseded by per-slot in_person_enabled/online_enabled above.
ALTER TABLE "doctors" DROP COLUMN "online_enabled",
DROP COLUMN "in_person_enabled";
