/*
  Warnings:

  - You are about to drop the column `dataset_name` on the `segment` table. All the data in the column will be lost.
  - You are about to drop the column `node_set` on the `segment` table. All the data in the column will be lost.
  - Added the required column `document_id` to the `segment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "segment" DROP COLUMN "dataset_name",
DROP COLUMN "node_set",
ADD COLUMN     "document_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "node_set" TEXT[],
    "dataset_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_name_key" ON "document"("name");

-- AddForeignKey
ALTER TABLE "segment" ADD CONSTRAINT "segment_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
