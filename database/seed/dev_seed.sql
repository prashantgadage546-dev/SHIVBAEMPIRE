-- =============================================================
-- SHIVBAEMPIRE — Development Seed Data
-- Run ONLY in development/staging environments
-- DO NOT run in production
-- =============================================================

-- NOTE: Admin password = 'admin@123' (bcrypt hash)
-- NOTE: Collector passwords = 'collector@123' (bcrypt hash)
-- These hashes are pre-computed with bcrypt rounds=12

SET @admin_role_id = (SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1);
SET @collector_role_id = (SELECT id FROM roles WHERE name = 'COLLECTOR' LIMIT 1);

-- Insert Admin user
INSERT IGNORE INTO `users` (`role_id`, `full_name`, `username`, `email`, `mobile`, `password_hash`, `status`) VALUES
  (@admin_role_id, 'Shivba Admin', 'admin', 'admin@shivbaempire.com', '9999000001',
   '$2b$10$eESg.vDnLHe9cc3KY8gjX.3IO33mXfiLejyomLW5z39sq1cprrtz6', 'ACTIVE');

-- Insert Collector users
INSERT IGNORE INTO `users` (`role_id`, `full_name`, `username`, `email`, `mobile`, `password_hash`, `status`) VALUES
  (@collector_role_id, 'Rajesh Patil', 'rajesh.patil', 'rajesh@shivbaempire.com', '9999000002',
   '$2b$10$HVlqaF8p8AFVhEjdvVRHTOhTFljfNxKecciUopO4EkhRO3MHQsZsi', 'ACTIVE'),
  (@collector_role_id, 'Sunita Desai', 'sunita.desai', 'sunita@shivbaempire.com', '9999000003',
   '$2b$10$HVlqaF8p8AFVhEjdvVRHTOhTFljfNxKecciUopO4EkhRO3MHQsZsi', 'ACTIVE');

-- Insert Yatra 2026 event
INSERT IGNORE INTO `events` (`name`, `description`, `event_date`, `end_date`, `location`, `status`, `is_active`, `created_by`) VALUES
  ('Yatra 2026', 'Annual Yatra 2026 - Shivba Tarun Mitra Mandal', '2026-11-15', '2026-11-17',
   'Trimbakeshwar, Nashik', 'ACTIVE', 1,
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1));

SET @event_id = (SELECT id FROM events WHERE name = 'Yatra 2026' LIMIT 1);
SET @admin_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1);
SET @rajesh_id = (SELECT id FROM users WHERE username = 'rajesh.patil' LIMIT 1);
SET @sunita_id = (SELECT id FROM users WHERE username = 'sunita.desai' LIMIT 1);

-- Update settings with default event
UPDATE settings SET setting_value = CAST(@event_id AS CHAR) WHERE setting_key = 'default_event_id';

-- Insert collection target
INSERT IGNORE INTO `targets` (`event_id`, `target_amount`, `start_date`, `end_date`, `description`, `created_by`) VALUES
  (@event_id, 500000.00, '2026-01-01', '2026-11-15', 'Total collection target for Yatra 2026', @admin_id);

-- Insert receipt sequence
INSERT IGNORE INTO `receipt_sequences` (`event_id`, `year`, `last_number`) VALUES
  (@event_id, 2026, 0);

-- Insert donors
INSERT IGNORE INTO `donors` (`donor_code`, `full_name`, `mobile`, `email`, `village_name`, `address`, `expected_donation`, `total_paid`, `status`, `event_id`, `created_by`) VALUES
  ('DON-0001', 'Ramesh Kumar Sharma', '9876543201', 'ramesh@email.com', 'Pune', 'Flat 101, Pune', 5000.00, 5000.00, 'PAID', @event_id, @rajesh_id),
  ('DON-0002', 'Suresh Babu Naik', '9876543202', NULL, 'Mumbai', 'Andheri West, Mumbai', 3000.00, 1500.00, 'PARTIALLY_PAID', @event_id, @rajesh_id),
  ('DON-0003', 'Meena Devi Patil', '9876543203', NULL, 'Nashik', 'Near Temple, Nashik', 2000.00, 0.00, 'PENDING', @event_id, @sunita_id),
  ('DON-0004', 'Vijay Ganesh More', '9876543204', NULL, 'Kolhapur', 'Main Road, Kolhapur', 10000.00, 10000.00, 'PAID', @event_id, @sunita_id),
  ('DON-0005', 'Priya Suresh Joshi', '9876543205', NULL, 'Satara', 'Satara City', 1500.00, 0.00, 'PENDING', @event_id, @rajesh_id),
  ('DON-0006', 'Anand Krishnarao Deshpande', '9876543206', NULL, 'Aurangabad', 'Aurangabad', 7500.00, 7500.00, 'PAID', @event_id, @admin_id),
  ('DON-0007', 'Kavita Rajendra Kulkarni', '9876543207', NULL, 'Pune', 'Kothrud, Pune', 2500.00, 1000.00, 'PARTIALLY_PAID', @event_id, @rajesh_id),
  ('DON-0008', 'Manoj Dattatray Shinde', '9876543208', NULL, 'Nagpur', 'Nagpur City', 4000.00, 4000.00, 'PAID', @event_id, @sunita_id),
  ('DON-0009', 'Sanjay Prakash Gaikwad', '9876543209', NULL, 'Solapur', 'Solapur City', 3500.00, 0.00, 'PENDING', @event_id, @admin_id),
  ('DON-0010', 'Rekha Vinayak Bhosale', '9876543210', NULL, 'Thane', 'Thane West', 6000.00, 3000.00, 'PARTIALLY_PAID', @event_id, @rajesh_id),
  ('DON-0011', 'Ganesh Trimbak Waghmare', '9876543211', NULL, 'Nashik', 'Nashik Road', 2000.00, 2000.00, 'PAID', @event_id, @sunita_id),
  ('DON-0012', 'Lata Shankar Pawar', '9876543212', NULL, 'Kalyan', 'Kalyan East', 1000.00, 0.00, 'PENDING', @event_id, @admin_id);

SET @donor1 = (SELECT id FROM donors WHERE donor_code = 'DON-0001' LIMIT 1);
SET @donor2 = (SELECT id FROM donors WHERE donor_code = 'DON-0002' LIMIT 1);
SET @donor4 = (SELECT id FROM donors WHERE donor_code = 'DON-0004' LIMIT 1);
SET @donor6 = (SELECT id FROM donors WHERE donor_code = 'DON-0006' LIMIT 1);
SET @donor7 = (SELECT id FROM donors WHERE donor_code = 'DON-0007' LIMIT 1);
SET @donor8 = (SELECT id FROM donors WHERE donor_code = 'DON-0008' LIMIT 1);
SET @donor10 = (SELECT id FROM donors WHERE donor_code = 'DON-0010' LIMIT 1);
SET @donor11 = (SELECT id FROM donors WHERE donor_code = 'DON-0011' LIMIT 1);

-- Update receipt sequence counter
UPDATE receipt_sequences SET last_number = 8 WHERE event_id = @event_id AND year = 2026;

-- Insert receipts
INSERT IGNORE INTO `receipts` (`receipt_number`, `event_id`, `donor_id`, `amount`, `amount_in_words`, `payment_mode`, `collection_date`, `collector_id`) VALUES
  ('YAT-2026-000001', @event_id, @donor1, 5000.00, 'Five Thousand Rupees Only', 'UPI', '2026-01-15', @rajesh_id),
  ('YAT-2026-000002', @event_id, @donor2, 1500.00, 'One Thousand Five Hundred Rupees Only', 'CASH', '2026-01-20', @rajesh_id),
  ('YAT-2026-000003', @event_id, @donor4, 10000.00, 'Ten Thousand Rupees Only', 'BANK_TRANSFER', '2026-02-01', @sunita_id),
  ('YAT-2026-000004', @event_id, @donor6, 7500.00, 'Seven Thousand Five Hundred Rupees Only', 'UPI', '2026-02-10', @admin_id),
  ('YAT-2026-000005', @event_id, @donor7, 1000.00, 'One Thousand Rupees Only', 'CASH', '2026-02-15', @rajesh_id),
  ('YAT-2026-000006', @event_id, @donor8, 4000.00, 'Four Thousand Rupees Only', 'UPI', '2026-03-01', @sunita_id),
  ('YAT-2026-000007', @event_id, @donor10, 3000.00, 'Three Thousand Rupees Only', 'CASH', '2026-03-10', @rajesh_id),
  ('YAT-2026-000008', @event_id, @donor11, 2000.00, 'Two Thousand Rupees Only', 'UPI', '2026-03-15', @sunita_id);

-- Insert collections linked to receipts
INSERT IGNORE INTO `collections` (`receipt_id`, `donor_id`, `event_id`, `amount`, `payment_mode`, `collection_date`, `collector_id`) VALUES
  ((SELECT id FROM receipts WHERE receipt_number = 'YAT-2026-000001'), @donor1, @event_id, 5000.00, 'UPI', '2026-01-15', @rajesh_id),
  ((SELECT id FROM receipts WHERE receipt_number = 'YAT-2026-000002'), @donor2, @event_id, 1500.00, 'CASH', '2026-01-20', @rajesh_id),
  ((SELECT id FROM receipts WHERE receipt_number = 'YAT-2026-000003'), @donor4, @event_id, 10000.00, 'BANK_TRANSFER', '2026-02-01', @sunita_id),
  ((SELECT id FROM receipts WHERE receipt_number = 'YAT-2026-000004'), @donor6, @event_id, 7500.00, 'UPI', '2026-02-10', @admin_id),
  ((SELECT id FROM receipts WHERE receipt_number = 'YAT-2026-000005'), @donor7, @event_id, 1000.00, 'CASH', '2026-02-15', @rajesh_id),
  ((SELECT id FROM receipts WHERE receipt_number = 'YAT-2026-000006'), @donor8, @event_id, 4000.00, 'UPI', '2026-03-01', @sunita_id),
  ((SELECT id FROM receipts WHERE receipt_number = 'YAT-2026-000007'), @donor10, @event_id, 3000.00, 'CASH', '2026-03-10', @rajesh_id),
  ((SELECT id FROM receipts WHERE receipt_number = 'YAT-2026-000008'), @donor11, @event_id, 2000.00, 'UPI', '2026-03-15', @sunita_id);

-- Insert expenses
INSERT IGNORE INTO `expenses` (`event_id`, `category`, `description`, `amount`, `payment_mode`, `expense_date`, `paid_to`, `bill_number`, `created_by`) VALUES
  (@event_id, 'DECORATION', 'Mandap decoration and flower arrangement', 15000.00, 'CASH', '2026-01-10', 'Shri Flowers', 'BILL-001', @admin_id),
  (@event_id, 'SOUND_DJ', 'Sound system and DJ for 3 days', 25000.00, 'BANK_TRANSFER', '2026-01-12', 'Harmony Sound', 'BILL-002', @admin_id),
  (@event_id, 'TENT', 'Pandal and tent setup', 18000.00, 'CASH', '2026-01-13', 'Shree Tent House', 'BILL-003', @admin_id),
  (@event_id, 'PRASAD', 'Prasad distribution for all 3 days', 8000.00, 'CASH', '2026-01-14', 'Local Supplier', 'BILL-004', @admin_id),
  (@event_id, 'TRANSPORTATION', 'Bus for yatra participants', 12000.00, 'CASH', '2026-01-15', 'Rajesh Travels', 'BILL-005', @admin_id),
  (@event_id, 'PRINTING', 'Banners, posters and invitations', 3500.00, 'UPI', '2026-01-08', 'Quick Print', 'BILL-006', @admin_id);

-- Audit log for seed data
INSERT INTO `activity_logs` (`user_id`, `user_name`, `action`, `module`, `record_id`, `created_at`) VALUES
  (@admin_id, 'Shivba Admin', 'SEED_DATA_LOADED', 'SYSTEM', NULL, NOW());
