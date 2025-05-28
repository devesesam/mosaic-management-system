/*
# Add database helper functions for debugging

1. New Functions
   - `list_tables`: Lists all tables in the database
   - `get_table_columns`: Gets column information for a table
   - `check_tables_exist`: Checks if specified tables exist and have rows
   - `get_table_info`: Gets detailed information about a table
*/

-- Function to list all tables in the database
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS TABLE (
  table_name text,
  table_schema text,
  row_count bigint
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    t.table_schema::text,
    (SELECT count(*) FROM information_schema.tables i WHERE i.table_schema = t.table_schema AND i.table_name = t.table_name)::bigint AS row_count
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$$;

-- Function to get column information for a table
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES')::boolean,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
  AND c.table_name = table_name
  ORDER BY c.ordinal_position;
END;
$$;

-- Function to check if specified tables exist and have rows
CREATE OR REPLACE FUNCTION public.check_tables_exist(table_names text[])
RETURNS TABLE (
  table_name text,
  exists boolean,
  row_count bigint
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  t text;
  exists_val boolean;
  count_val bigint;
BEGIN
  FOREACH t IN ARRAY table_names
  LOOP
    -- Check if table exists
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t
    ) INTO exists_val;
    
    -- Get row count if table exists
    IF exists_val THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO count_val;
    ELSE
      count_val := 0;
    END IF;
    
    -- Return result
    table_name := t;
    exists := exists_val;
    row_count := count_val;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Function to get detailed information about a table
CREATE OR REPLACE FUNCTION public.get_table_info(table_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'table_name', t.table_name,
    'exists', true,
    'columns', (
      SELECT json_agg(json_build_object(
        'name', c.column_name,
        'type', c.data_type,
        'nullable', c.is_nullable = 'YES',
        'default', c.column_default
      ))
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = t.table_name
      ORDER BY c.ordinal_position
    ),
    'row_count', (
      SELECT count(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    ),
    'has_rls', EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = t.table_name
      AND rowsecurity = true
    )
  ) INTO result
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_name = table_name
  LIMIT 1;
  
  -- If table doesn't exist, return appropriate message
  IF result IS NULL THEN
    result := json_build_object(
      'table_name', table_name,
      'exists', false,
      'message', 'Table does not exist'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Grant permissions to access these functions
GRANT EXECUTE ON FUNCTION public.list_tables TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_columns TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_tables_exist TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_tables TO anon;
GRANT EXECUTE ON FUNCTION public.get_table_columns TO anon;
GRANT EXECUTE ON FUNCTION public.check_tables_exist TO anon;
GRANT EXECUTE ON FUNCTION public.get_table_info TO anon;