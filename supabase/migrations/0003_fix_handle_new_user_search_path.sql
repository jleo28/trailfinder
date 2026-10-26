-- Sign-up was failing with "relation profiles does not exist": the trigger runs
-- as Supabase's auth role, whose search_path doesn't include public. Pin it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    'user_' || substring(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Hiker')
  );
  RETURN NEW;
END;
$$;
