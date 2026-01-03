-- Check organization_members policies
SELECT 
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname='public' 
AND tablename='organization_members'
ORDER BY policyname;
