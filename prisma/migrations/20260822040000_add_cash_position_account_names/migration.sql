-- Persist tenant-configured Cash/Bank names on the cash-position snapshot.
ALTER TABLE "cash_position_state" ADD COLUMN "cashAccountName" TEXT NOT NULL DEFAULT 'Cash';
ALTER TABLE "cash_position_state" ADD COLUMN "bankAccountName" TEXT NOT NULL DEFAULT 'Bank';
