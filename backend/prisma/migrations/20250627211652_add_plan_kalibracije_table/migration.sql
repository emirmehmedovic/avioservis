-- CreateTable
CREATE TABLE "plan_kalibracije" (
    "id" SERIAL NOT NULL,
    "naziv_opreme" TEXT NOT NULL,
    "vlasnik_opreme" TEXT NOT NULL,
    "mjesto_koristenja_opreme" TEXT NOT NULL,
    "identifikacijski_broj" TEXT NOT NULL,
    "volumetar_kalibracija_od" TIMESTAMP(3),
    "volumetar_kalibracija_do" TIMESTAMP(3),
    "glavni_volumetar_kalibracija_od" TIMESTAMP(3),
    "glavni_volumetar_kalibracija_do" TIMESTAMP(3),
    "manometri_kalibracija_od" TIMESTAMP(3),
    "manometri_kalibracija_do" TIMESTAMP(3),
    "crijevo_punjenje_kalibracija_od" TIMESTAMP(3),
    "crijevo_punjenje_kalibracija_do" TIMESTAMP(3),
    "glavni_manometar_kalibracija_od" TIMESTAMP(3),
    "glavni_manometar_kalibracija_do" TIMESTAMP(3),
    "termometar_kalibracija_od" TIMESTAMP(3),
    "termometar_kalibracija_do" TIMESTAMP(3),
    "hidrometar_kalibracija_od" TIMESTAMP(3),
    "hidrometar_kalibracija_do" TIMESTAMP(3),
    "elektricni_denziometar_kalibracija_od" TIMESTAMP(3),
    "elektricni_denziometar_kalibracija_do" TIMESTAMP(3),
    "mjerac_provodljivosti_kalibracija_od" TIMESTAMP(3),
    "mjerac_provodljivosti_kalibracija_do" TIMESTAMP(3),
    "mjerac_otpora_provoda_kalibracija_od" TIMESTAMP(3),
    "mjerac_otpora_provoda_kalibracija_do" TIMESTAMP(3),
    "moment_kljuc_kalibracija_od" TIMESTAMP(3),
    "moment_kljuc_kalibracija_do" TIMESTAMP(3),
    "shal_detector_kalibracija_od" TIMESTAMP(3),
    "shal_detector_kalibracija_do" TIMESTAMP(3),
    "napomene" TEXT,
    "dokumenti_url" TEXT,
    "kreiran" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "azuriran" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_kalibracije_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_kalibracije_identifikacijski_broj_key" ON "plan_kalibracije"("identifikacijski_broj");
