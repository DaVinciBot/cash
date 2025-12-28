
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://lxilsopqfrtwsitzalkm.supabase.co/";
export const supabaseKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4aWxzb3BxZnJ0d3NpdHphbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njk0NzUyNDUsImV4cCI6MTk4NTA1MTI0NX0.8TLXDbdJDIrDONJlqE639jvExH-kdBUIkJhtBFwhMCo`;

// @ts-ignore
export const supabase = createClient(supabaseUrl, supabaseKey);
