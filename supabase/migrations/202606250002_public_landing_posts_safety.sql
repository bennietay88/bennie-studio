-- Public landing safety defaults.
-- This migration is safe to run repeatedly and does not overwrite existing content.

INSERT INTO public.settings (id, content, updated_at)
VALUES ('landing_page', '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.posts') IS NOT NULL THEN
    IF NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'posts'
         AND column_name = 'is_platform_post'
     ) THEN
      ALTER TABLE public.posts
        ADD COLUMN is_platform_post boolean NOT NULL DEFAULT false;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_posts_platform_published_created
      ON public.posts (is_platform_post, status, created_at DESC)
      WHERE is_platform_post = true;
  END IF;
END $$;
