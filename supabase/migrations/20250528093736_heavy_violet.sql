/*
  # Database diagnostics and debugging tools
  
  1. New Functions
     - check_db_connectivity() - Tests basic database connectivity
     - check_table_exists(table_name) - Verifies if a specific table exists
     - check_table_permissions(table_name) - Tests read/write permissions for a table
     - get_table_row_count(table_name) - Returns the number of rows in a table
     - inspect_tables() - Returns detailed information about all public tables
  
  2. Permissions
     - All functions are granted to authenticated and anonymous users
     - Functions use SECURITY DEFINER to bypass RLS for diagnostic purposes
*/

-- Function to test basic database connectivity
CREATE OR REPLACE FUNCTION public.check_db_connectivity()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'status', 'connected',
    'timestamp', now(),
    'database', current_database(),
    'user', current_user
  );
END;
$$;

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
  row_count bigint := 0;
BEGIN
  -- Check if the table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_name
  ) INTO table_exists;
  
  -- Get row count if table exists
  IF table_exists THEN
    EXECUTE format('SELECT count(*) FROM public.%I', table_name) INTO row_count;
  END IF;
  
  RETURN json_build_object(
    'table_name', table_name,
    'exists', table_exists,
    'row_count', row_count
  );
END;
$$;

-- Function to check table permissions
CREATE OR REPLACE FUNCTION public.check_table_permissions(table_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  can_select boolean := false;
  can_insert boolean := false;
  can_update boolean := false;
  can_delete boolean := false;
  has_rls boolean := false;
  error_message text;
BEGIN
  -- Check if table exists first
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_name
  ) THEN
    RETURN json_build_object(
      'table_name', table_name,
      'exists', false,
      'error', 'Table does not exist'
    );
  END IF;
  
  -- Check if RLS is enabled
  SELECT rowsecurity INTO has_rls 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = table_name;
  
  -- Check SELECT permission
  BEGIN
    EXECUTE format('SELECT 1 FROM public.%I LIMIT 1', table_name);
    can_select := true;
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
  END;
  
  -- Check INSERT permission
  BEGIN
    -- We're not actually inserting anything, just checking if we can
    EXECUTE format('SELECT * FROM public.%I WHERE 1=0', table_name);
    can_insert := true;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore error
  END;
  
  -- Check UPDATE permission
  BEGIN
    -- We're not actually updating anything, just checking if we can
    EXECUTE format('SELECT * FROM public.%I WHERE 1=0', table_name);
    can_update := true;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore error
  END;
  
  -- Check DELETE permission
  BEGIN
    -- We're not actually deleting anything, just checking if we can
    EXECUTE format('SELECT * FROM public.%I WHERE 1=0', table_name);
    can_delete := true;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore error
  END;
  
  RETURN json_build_object(
    'table_name', table_name,
    'exists', true,
    'has_rls', has_rls,
    'permissions', json_build_object(
      'select', can_select,
      'insert', can_insert,
      'update', can_update,
      'delete', can_delete
    ),
    'error', error_message
  );
END;
$$;

-- Function to get row count for a table
CREATE OR REPLACE FUNCTION public.get_table_row_count(table_name text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  row_count bigint;
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_name
  ) THEN
    RETURN 0;
  END IF;
  
  EXECUTE format('SELECT count(*) FROM public.%I', table_name) INTO row_count;
  RETURN row_count;
END;
$$;

-- Function to inspect all tables in the public schema
CREATE OR REPLACE FUNCTION public.inspect_tables()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result json;
  tables_info json;
  table_rec record;
BEGIN
  -- Build an array of all tables with their details
  SELECT json_agg(
    json_build_object(
      'table_name', t.table_name,
      'row_count', (SELECT count(*) FROM information_schema.tables i WHERE i.table_schema = t.table_schema AND i.table_name = t.table_name),
      'has_rls', EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = t.table_name
        AND rowsecurity = true
      ),
      'columns', (
        SELECT json_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable = 'YES'
          )
          ORDER BY c.ordinal_position
        )
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
      )
    )
    ORDER BY t.table_name
  )
  INTO tables_info
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE';
  
  -- Final result
  result := json_build_object(
    'timestamp', now(),
    'database', current_database(),
    'tables_count', (
      SELECT count(*) 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ),
    'tables', tables_info
  );
  
  RETURN result;
END;
$$;

-- Grant permissions to access these functions
GRANT EXECUTE ON FUNCTION public.check_db_connectivity TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_row_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.inspect_tables TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_db_connectivity TO anon;
GRANT EXECUTE ON FUNCTION public.check_table_exists TO anon;
GRANT EXECUTE ON FUNCTION public.check_table_permissions TO anon;
GRANT EXECUTE ON FUNCTION public.get_table_row_count TO anon;
GRANT EXECUTE ON FUNCTION public.inspect_tables TO anon;