-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "period1_start" TIMESTAMP(3) NOT NULL,
    "period1_end" TIMESTAMP(3) NOT NULL,
    "period2_start" TIMESTAMP(3),
    "period2_end" TIMESTAMP(3),
    "generated_by" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_token" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAccess" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,

    CONSTRAINT "ReportAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_access_token_key" ON "Report"("access_token");

-- CreateIndex
CREATE INDEX "Report_generated_by_idx" ON "Report"("generated_by");

-- CreateIndex
CREATE INDEX "Report_access_token_idx" ON "Report"("access_token");

-- CreateIndex
CREATE INDEX "ReportAccess_report_id_idx" ON "ReportAccess"("report_id");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAccess" ADD CONSTRAINT "ReportAccess_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAccess" ADD CONSTRAINT "ReportAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


