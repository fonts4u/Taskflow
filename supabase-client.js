// Supabase Configuration
// Replace these with your actual Supabase project URL and public anon key
const SUPABASE_URL = 'https://fnvuftqldwwzwghshjhb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudnVmdHFsZHd3endnaHNoamhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTY5MzcsImV4cCI6MjA4NjM5MjkzN30.4jTBfX-E1RuEfQ7bzf3VVqtmmfkozOqxP5qGyO5C8d4';

// Initialize the Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Export for global use
window.supabase = supabaseClient;
