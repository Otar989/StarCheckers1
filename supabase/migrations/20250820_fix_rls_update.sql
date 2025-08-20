-- Fix RLS for UPDATE on rooms: add WITH CHECK so updates are allowed
DO $$ BEGIN
  -- If policy exists, alter it; else create a permissive policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms' AND policyname = 'Anyone can update rooms'
  ) THEN
    EXECUTE 'ALTER POLICY "Anyone can update rooms" ON public.rooms USING (true) WITH CHECK (true)';
  ELSE
    EXECUTE 'CREATE POLICY "Anyone can update rooms" ON public.rooms FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Ensure realtime is enabled for tables (idempotent)
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.moves;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
