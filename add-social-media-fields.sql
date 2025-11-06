-- Add social media contact fields to user table
-- Date: 2025-11-05
-- Description: Add Telegram, LINE, QQ and note fields for agent management system

ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS telegram VARCHAR(255),
ADD COLUMN IF NOT EXISTS line VARCHAR(255),
ADD COLUMN IF NOT EXISTS qq VARCHAR(255),
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add comments for new columns
COMMENT ON COLUMN "user".telegram IS 'Agent Telegram account';
COMMENT ON COLUMN "user".line IS 'Agent LINE ID';
COMMENT ON COLUMN "user".qq IS 'Agent QQ number';
COMMENT ON COLUMN "user".note IS 'Agent note information';

-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user' 
AND column_name IN ('telegram', 'line', 'qq', 'note')
ORDER BY column_name;