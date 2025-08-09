-- Add Stripe subscription ID column to user_information table
ALTER TABLE user_information 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_information_stripe_subscription_id 
ON user_information(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN user_information.stripe_subscription_id IS 'Stripe subscription ID for tracking subscriptions'; 