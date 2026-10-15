-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('LAUNCHING', 'LIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'EDITOR');

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SiteStatus" NOT NULL DEFAULT 'LAUNCHING',
    "url" TEXT,
    "repo" TEXT,
    "coolifyUuid" TEXT,
    "editPath" TEXT NOT NULL DEFAULT '/admin/',
    "matomoInstance" TEXT,
    "matomoSiteId" INTEGER,
    "authentikApp" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMember" (
    "siteId" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "username" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'EDITOR',

    CONSTRAINT "SiteMember_pkey" PRIMARY KEY ("siteId","uid")
);

-- CreateTable
CREATE TABLE "Launch" (
    "siteId" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Launch_pkey" PRIMARY KEY ("siteId")
);

-- CreateIndex
CREATE INDEX "SiteMember_uid_idx" ON "SiteMember"("uid");

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Launch" ADD CONSTRAINT "Launch_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
