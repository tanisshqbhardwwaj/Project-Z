CREATE TABLE "BetaTestEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BetaTestEmail_email_key" UNIQUE ("email"),
    CONSTRAINT "BetaTestEmail_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "BetaTestEmail_email_idx" ON "BetaTestEmail"("email");
