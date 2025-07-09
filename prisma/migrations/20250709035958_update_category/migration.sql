/*
  Warnings:

  - The values [ACTIVE,INACTIVE] on the enum `CategoryStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CategoryStatus_new" AS ENUM ('VISIBLE', 'HIDDEN');
ALTER TABLE "Category" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Category" ALTER COLUMN "status" TYPE "CategoryStatus_new" USING ("status"::text::"CategoryStatus_new");
ALTER TYPE "CategoryStatus" RENAME TO "CategoryStatus_old";
ALTER TYPE "CategoryStatus_new" RENAME TO "CategoryStatus";
DROP TYPE "CategoryStatus_old";
ALTER TABLE "Category" ALTER COLUMN "status" SET DEFAULT 'VISIBLE';
COMMIT;

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "status" SET DEFAULT 'VISIBLE';
