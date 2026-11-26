-- Retire obsolete tables verified empty and unreferenced by the current app.
-- Production checks found no stored routine, view, trigger, or incoming foreign
-- key dependencies. The tables had zero rows and no recorded writes.
DROP TABLE IF EXISTS public.generated_pages;
DROP TABLE IF EXISTS public.section_templates;
DROP TABLE IF EXISTS public.local_seo_locations;
DROP TABLE IF EXISTS public.app_error_logs;
DROP TABLE IF EXISTS public.website_error_logs;
