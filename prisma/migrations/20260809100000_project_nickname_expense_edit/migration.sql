-- Project nickname + expense edit tracking
ALTER TABLE "Project" ADD COLUMN "nickname" TEXT;

ALTER TABLE "Expense" ADD COLUMN "isEdited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Expense" ADD COLUMN "editedAt" DATETIME;
ALTER TABLE "Expense" ADD COLUMN "editedById" TEXT;
ALTER TABLE "Expense" ADD COLUMN "originalAmountPaise" BIGINT;
