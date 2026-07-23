SELECT
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'authenticated'
  AND table_name LIKE 'dom_%'
  AND privilege_type = 'SELECT'
ORDER BY table_name