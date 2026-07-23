SELECT
  n.nspname AS schemaname,
  c.relname AS tablename,
  c.relrowsecurity,
  c.relforcerowsecurity
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname = 'public'
ORDER BY c.relname