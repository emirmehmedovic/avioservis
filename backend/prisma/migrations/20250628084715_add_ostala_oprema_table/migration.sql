-- CreateTable
CREATE TABLE "OstalaOprema" (
    "id" SERIAL NOT NULL,
    "naziv" TEXT NOT NULL,
    "mesto_koristenja" TEXT,
    "vlasnik" TEXT,
    "standard_opreme" TEXT,
    "snaga" TEXT,
    "protok_kapacitet" TEXT,
    "sigurnosne_sklopke" TEXT,
    "prinudno_zaustavljanje" TEXT,
    "napomena" TEXT,
    "dokument_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OstalaOprema_pkey" PRIMARY KEY ("id")
);
