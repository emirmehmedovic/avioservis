-- Dodavanje WORK_ORDER u ServiceItemType enum
ALTER TYPE "ServiceItemType" ADD VALUE IF NOT EXISTS 'WORK_ORDER';
