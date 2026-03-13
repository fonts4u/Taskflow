-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Create Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active',
  color TEXT DEFAULT 'teal',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  project TEXT, -- Links to project name
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  column_id TEXT DEFAULT 'backlog',
  status TEXT DEFAULT 'Backlog',
  due TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  job_title TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Events Table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  color TEXT DEFAULT 'teal',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 6. Create Policies
CREATE POLICY "Users can only see their own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only see their own events" ON events FOR ALL USING (auth.uid() = user_id);

-- 7. Trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data->>'full_name', 'User') || '&background=0D9488&color=fff'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
