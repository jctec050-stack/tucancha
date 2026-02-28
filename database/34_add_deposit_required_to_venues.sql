-- Add deposit required and bank details to venues table
ALTER TABLE venues ADD COLUMN deposit_required BOOLEAN DEFAULT FALSE;
ALTER TABLE venues ADD COLUMN bank_name TEXT;
ALTER TABLE venues ADD COLUMN account_number TEXT;
ALTER TABLE venues ADD COLUMN account_name TEXT;
ALTER TABLE venues ADD COLUMN tax_id TEXT; -- RUC or C.I
ALTER TABLE venues ADD COLUMN alias TEXT;
