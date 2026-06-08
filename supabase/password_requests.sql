CREATE TABLE IF NOT EXISTS public.password_requests (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  username TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn off RLS for this table to allow unauthenticated users to insert rows (since they forgot their password)
ALTER TABLE public.password_requests DISABLE ROW LEVEL SECURITY;
