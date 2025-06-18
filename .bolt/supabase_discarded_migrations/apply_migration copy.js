// Script to apply the migration to Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for required environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Starting migration application process...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250602_users_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
      console.log(`${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      try {
        // Execute the SQL statement using Supabase's rpc function
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`Error executing statement ${i + 1}: ${error.message}`);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`Exception executing statement ${i + 1}: ${err.message}`);
      }
    }
    
    console.log('\nMigration process completed');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();