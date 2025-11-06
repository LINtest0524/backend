-- Manually add missing social media columns to user table
-- Execute these one by one to ensure success

-- Add telegram column
ALTER TABLE "user" ADD COLUMN telegram VARCHAR(255);

-- Add line column  
ALTER TABLE "user" ADD COLUMN line VARCHAR(255);

-- Add qq column
ALTER TABLE "user" ADD COLUMN qq VARCHAR(255);

-- Add note column
ALTER TABLE "user" ADD COLUMN note TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user' 
AND column_name IN ('telegram', 'line', 'qq', 'note')
ORDER BY column_name;

-- Show final result
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user' 
AND column_name IN ('phone', 'email', 'telegram', 'line', 'qq', 'note')
ORDER BY column_name;