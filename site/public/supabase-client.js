// Supabase Configuration
if (typeof SUPABASE_URL === 'undefined') {
    var SUPABASE_URL = 'https://fnvuftqldwwzwghshjhb.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudnVmdHFsZHd3endnaHNoamhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTY5MzcsImV4cCI6MjA4NjM5MjkzN30.4jTBfX-E1RuEfQ7bzf3VVqtmmfkozOqxP5qGyO5C8d4';
}

if (typeof supabase !== 'undefined') {
    if (!window.supabase) {
        window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}
