-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'EXPIRED');

-- AlterTable
ALTER TABLE "XmlInvoiceDispatch" ADD COLUMN     "paymentNote" TEXT,
ADD COLUMN     "paymentReceivedAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
