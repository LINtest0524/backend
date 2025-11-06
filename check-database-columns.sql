-- Check if the social media columns exist in user table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user' 
AND column_name IN ('phone', 'email', 'telegram', 'line', 'qq', 'note')
ORDER BY column_name;

-- Show all columns in user table for verification
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'user'
ORDER BY ordinal_position;