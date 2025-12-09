import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://acjeeeznvndbkvgapzgj.supabase.co";      // DÁN URL CỦA ANH VÀO ĐÂY
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjamVlZXpudm5kYmt2Z2FwemdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTYxMzQsImV4cCI6MjA4MDQzMjEzNH0.E7ecPL3ghxDK1bajOVZE59Txz_CHOjrjjx5f-WfR44s"; // DÁN ANON KEY VÀO ĐÂY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
