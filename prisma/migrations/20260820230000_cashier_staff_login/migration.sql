-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_organizationId_userId_key" ON "StaffMember"("organizationId", "userId");
