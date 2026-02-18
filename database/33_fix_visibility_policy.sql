-- Ensure public visibility for availability check
-- This is critical so players can see booked slots from other players

-- 1. Drop the policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Bookings are viewable by everyone" ON bookings;

-- 2. Re-create the policy allowing SELECT for everyone
CREATE POLICY "Bookings are viewable by everyone" 
ON bookings FOR SELECT 
USING (true);

-- 3. Ensure RLS is enabled on the table (just in case)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
