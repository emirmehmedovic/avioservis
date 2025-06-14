# Migration `20250602_add_work_order_type`

This migration has been created manually at 2025-06-02 19:26:30.

## Description

Dodaje WORK_ORDER u ServiceItemType enum za podršku radnim nalozima u servisnim zapisima.

## Changes

```sql
ALTER TYPE "ServiceItemType" ADD VALUE IF NOT EXISTS 'WORK_ORDER';
```
