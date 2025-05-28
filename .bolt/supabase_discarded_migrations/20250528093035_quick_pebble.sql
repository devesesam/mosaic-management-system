/*
  # Add helper functions for debugging database issues
  
  1. Functions
    - `list_tables`: Lists all tables in the public schema
    - `get_table_columns`: Gets column information for a specific table
    - `check_tables_exist`: Checks if specified tables exist
    - `get_table_info`: Gets detailed information about a table
*/

-- Function to list all tables in the public schema
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS TABLE (table_name text, has_rows boolean) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.tablename LIMIT 1)) AS has_rows
  FROM 
    pg_tables t
  WHERE 
    t.schemaname = 'public'
  ORDER BY 
    t.tablename;
END;
$$;

-- Grant access to the function for all users
ALTER FUNCTION public.list_tables() SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.list_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_tables() TO anon;
GRANT EXECUTE ON FUNCTION public.list_tables() TO service_role;

-- Function to get column information for a table
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES') AS is_nullable,
    c.column_default::text
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public' 
    AND c.table_name = table_name
  ORDER BY 
    c.ordinal_position;
END;
$$;

-- Grant access to the function for all users
ALTER FUNCTION public.get_table_columns(text) SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO service_role;

-- Function to check if tables exist
CREATE OR REPLACE FUNCTION public.check_tables_exist(table_names text[])
RETURNS TABLE (
  table_name text,
  exists boolean,
  row_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t::text AS table_name,
    EXISTS(
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) AS exists,
    CASE 
      WHEN EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t
      ) THEN (
        SELECT count(*) FROM (
          SELECT 1 FROM public.users LIMIT 10000
        ) AS sub
      )
      ELSE 0
    END AS row_count
  FROM 
    unnest(table_names) AS t;
END;
$$;

-- Grant access to the function for all users
ALTER FUNCTION public.check_tables_exist(text[]) SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.check_tables_exist(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_tables_exist(text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.check_tables_exist(text[]) TO service_role;

-- Function to get detailed table information
CREATE OR REPLACE FUNCTION public.get_table_info(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'table_exists', EXISTS(
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = get_table_info.table_name
    ),
    'row_count', (
      SELECT count(*) FROM (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = get_table_info.table_name
      ) AS sub
    ),
    'columns', (
      SELECT json_agg(json_build_object(
        'name', column_name,
        'type', data_type,
        'nullable', is_nullable = 'YES',
        'default', column_default
      ))
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = get_table_info.table_name
    ),
    'constraints', (
      SELECT json_agg(json_build_object(
        'name', constraint_name,
        'type', constraint_type
      ))
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = get_table_info.table_name
    ),
    'rls_enabled', (
      SELECT obj_description(oid, 'pg_class')::json->>'rls_enabled'
      FROM pg_class
      WHERE relname = get_table_info.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ),
    'policies', (
      SELECT json_agg(
        json_build_object(
          'name', policyname,
          'roles', regexp_split_to_array(roles, ','),
          'cmd', cmd,
          'permissive', permissive
        )
      )
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = get_table_info.table_name
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant access to the function for all users
ALTER FUNCTION public.get_table_info(text) SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.get_table_info(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_info(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_table_info(text) TO service_role;