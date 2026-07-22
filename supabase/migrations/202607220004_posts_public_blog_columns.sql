-- Public blog route support.
-- Adds the columns used by BlogCMS, LandingPage, and PublicBlogPostPage.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS image_url text;

UPDATE public.posts
SET slug = lower(
  regexp_replace(
    regexp_replace(coalesce(nullif(trim(title), ''), id::text), '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  )
) || '-' || left(id::text, 8)
WHERE slug IS NULL OR trim(slug) = '';

CREATE INDEX IF NOT EXISTS idx_posts_slug_lookup
  ON public.posts (slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_platform_slug_unique
  ON public.posts (slug)
  WHERE is_platform_post = true AND slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_platform_slug_published
  ON public.posts (is_platform_post, status, slug)
  WHERE is_platform_post = true AND status = 'published' AND slug IS NOT NULL;

NOTIFY pgrst, 'reload schema';
