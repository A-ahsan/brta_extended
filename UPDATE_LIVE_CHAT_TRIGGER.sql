-- Run this SQL in Supabase to disable auto-assign and keep chats in pending state
-- This allows admins to manually accept chats and receive notifications

-- Update the auto-assign function to be disabled
CREATE OR REPLACE FUNCTION auto_assign_chat()
RETURNS TRIGGER AS $$
BEGIN
    -- Disabled: Keep chats in pending for manual admin acceptance
    -- This ensures admins get notifications and can choose to accept
    -- Chats will stay in 'pending' status until admin manually accepts
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger is already attached, this just updates the function logic
-- Chats will now remain in 'pending' status instead of auto-assigning
