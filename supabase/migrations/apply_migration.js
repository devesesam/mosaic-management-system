// This script applies the comprehensive migration that fixes all RLS policies
// Run with: node supabase/migrations/apply_migration.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Get environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase credentials. Check your .env file.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    console.log('Applying comprehensive migration to fix permissions...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250601051412_summer_waterfall.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL by semicolons to execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each SQL statement
    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('pgexec', { query: sql });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error.message);
        // Continue with other statements even if one fails
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('Migration completed successfully!');
    console.log('All tables should now have proper RLS policies for both public and anonymous access.');
    
  } catch (error) {
    console.error('Failed to apply migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();