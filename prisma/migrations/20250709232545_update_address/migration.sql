-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('COMMERCIAL', 'RESIDENTIAL');

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "name" TEXT,
ADD COLUMN     "type" "AddressType",
ALTER COLUMN "neighborhood" DROP NOT NULL;
