# Migration `20250602_add_login_attempt_tracking`

This migration has been created manually at 2025-06-02 19:26:00.

## Description

Dodaje polja za praćenje pokušaja prijave u User model:
- failedLoginAttempts: Broj neuspješnih pokušaja prijave
- lockUntil: Vremenski period do kada je korisnički račun zaključan

## Changes

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockUntil" TIMESTAMP;
```
