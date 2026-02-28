-- Add deposit amount to venues table
ALTER TABLE venues ADD COLUMN deposit_amount INTEGER DEFAULT 0;
