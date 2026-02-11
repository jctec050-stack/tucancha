-- SECURITY UPDATE: RLS for push_subscriptions

-- 1. Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Policies

-- Users can insert their own subscription
CREATE POLICY "Users can insert own subscription"
    ON push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can delete their own subscription
CREATE POLICY "Users can delete own subscription"
    ON push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- Service Role (implicit full access, but good to be explicit for admins if needed via API)
-- No explicit policy needed for service_role as it bypasses RLS by default.
