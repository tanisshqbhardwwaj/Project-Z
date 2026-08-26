-- Platform ops: org last-active tracking for inactive-org KPIs.
ALTER TABLE "Organization" ADD COLUMN "lastActiveAt" DATETIME;
