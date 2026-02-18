-- Add is_hidden_for_player column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_hidden_for_player BOOLEAN DEFAULT FALSE;

-- Update RLS policies to allow players to update their own bookings (to hide them)
-- Current policies might restrict updates to Owners or specific status changes.
-- We need to ensure players can update 'is_hidden_for_player' for their own bookings.

DROP POLICY IF EXISTS "Players can hide their own bookings" ON bookings;

CREATE POLICY "Players can hide their own bookings"
ON bookings FOR UPDATE
TO authenticated
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);

-- Ensure public visibility for availability check (Fixes "hours not disabled" issue)
DROP POLICY IF EXISTS "Bookings are viewable by everyone" ON bookings;

CREATE POLICY "Bookings are viewable by everyone" 
ON bookings FOR SELECT 
USING (true);
