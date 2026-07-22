-- Growth feature support: client/app error logs for the System Status panel.

CREATE TABLE IF NOT EXISTS app_error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'error' CHECK (level IN ('error', 'warn', 'info')),
  route TEXT,
  source TEXT,
  message TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins can view app errors" ON app_error_logs;
DROP POLICY IF EXISTS "Users can insert own app errors" ON app_error_logs;

CREATE POLICY "Super Admins can view app errors" ON app_error_logs
  FOR SELECT USING (is_super_admin());

CREATE POLICY "Users can insert own app errors" ON app_error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

NOTIFY pgrst, 'reload schema';
