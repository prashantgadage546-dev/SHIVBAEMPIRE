-- =============================================================
-- SHIVBAEMPIRE — Database Migration 002
-- Seed Default Data (Roles, Admin User, Settings, Villages)
-- =============================================================

-- Insert default roles
INSERT IGNORE INTO `roles` (`name`, `description`) VALUES
  ('ADMIN', 'Full system access - Shivba Tarun Mitra Mandal'),
  ('COLLECTOR', 'Collection and donor management only');

-- Insert default settings
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`, `description`) VALUES
  ('app_name', 'SHIVBAEMPIRE', 'Application name'),
  ('org_name', 'Shivba Tarun Mitra Mandal', 'Organization name'),
  ('receipt_prefix', 'YAT', 'Receipt number prefix'),
  ('receipt_year', '2026', 'Receipt year'),
  ('currency_symbol', '₹', 'Currency symbol'),
  ('default_event_id', NULL, 'Currently active event ID'),
  ('contact_email', '', 'Contact email for receipts'),
  ('contact_phone', '', 'Contact phone for receipts'),
  ('address', '', 'Organization address');

-- Insert common Maharashtra villages (seed data)
INSERT IGNORE INTO `villages` (`name`, `taluka`, `district`) VALUES
  ('Pune', 'Pune City', 'Pune'),
  ('Mumbai', 'Mumbai City', 'Mumbai'),
  ('Nashik', 'Nashik', 'Nashik'),
  ('Aurangabad', 'Aurangabad', 'Aurangabad'),
  ('Nagpur', 'Nagpur', 'Nagpur'),
  ('Kolhapur', 'Kolhapur', 'Kolhapur'),
  ('Satara', 'Satara', 'Satara'),
  ('Solapur', 'Solapur', 'Solapur'),
  ('Ahmednagar', 'Ahmednagar', 'Ahmednagar'),
  ('Jalgaon', 'Jalgaon', 'Jalgaon'),
  ('Sangli', 'Sangli', 'Sangli'),
  ('Dhule', 'Dhule', 'Dhule'),
  ('Latur', 'Latur', 'Latur'),
  ('Ratnagiri', 'Ratnagiri', 'Ratnagiri'),
  ('Thane', 'Thane', 'Thane'),
  ('Navi Mumbai', 'Thane', 'Thane'),
  ('Kalyan', 'Kalyan', 'Thane'),
  ('Pimpri-Chinchwad', 'Pune', 'Pune'),
  ('Shirdi', 'Rahata', 'Ahmednagar'),
  ('Trimbakeshwar', 'Trimbak', 'Nashik');
