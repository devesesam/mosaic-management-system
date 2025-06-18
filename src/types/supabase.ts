export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          address: string
          customer_name: string | null
          quote_number: string | null
          fascia_colour: string | null
          spouting_colour: string | null
          spouting_profile: string | null
          roof_colour: string | null
          roof_profile: string | null
          downpipe_size: string | null
          downpipe_colour: string | null
          notes: string | null
          worker_id: string | null
          start_date: string | null
          end_date: string | null
          status: string
          tile_color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          address: string
          customer_name?: string | null
          quote_number?: string | null
          fascia_colour?: string | null
          spouting_colour?: string | null
          spouting_profile?: string | null
          roof_colour?: string | null
          roof_profile?: string | null
          downpipe_size?: string | null
          downpipe_colour?: string | null
          notes?: string | null
          worker_id?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          tile_color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          address?: string
          customer_name?: string | null
          quote_number?: string | null
          fascia_colour?: string | null
          spouting_colour?: string | null
          spouting_profile?: string | null
          roof_colour?: string | null
          roof_profile?: string | null
          downpipe_size?: string | null
          downpipe_colour?: string | null
          notes?: string | null
          worker_id?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          tile_color?: string | null
          created_at?: string
        }
      }
      workers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          role?: string | null
          created_at?: string
        }
      }
      job_secondary_workers: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          worker_id: string
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string
          created_at?: string
        }
      }
    }
    Functions: {
      test_connection: {
        Args: {}
        Returns: string
      }
    }
  }
}