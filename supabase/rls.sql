-- registrations: anyone can sign up, only admins can read the list
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_own" ON registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admin_select" ON registrations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt()->>'email'));

-- admins: authenticated users can read (for the admin button check), nobody can write from client
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all" ON admins
  FOR SELECT TO authenticated USING (true);

-- page_content: public read, only admins can write
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON page_content
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_write" ON page_content
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt()->>'email'))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt()->>'email'));
