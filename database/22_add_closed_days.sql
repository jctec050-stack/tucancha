DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'closed_days') THEN
        ALTER TABLE venues ADD COLUMN closed_days INTEGER[] DEFAULT ARRAY[]::INTEGER[];
    END IF;
END $$;
