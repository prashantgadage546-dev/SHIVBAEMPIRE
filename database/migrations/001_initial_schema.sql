-- =============================================================
-- SHIVBAEMPIRE — Database Migration 001
-- Initial Schema Creation
-- Organization: Shivba Tarun Mitra Mandal
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------
-- Table: roles
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` ENUM('ADMIN', 'COLLECTOR') NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `mobile` VARCHAR(15) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_id` (`role_id`),
  KEY `idx_users_status` (`status`),
  CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: events (Yatra events)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `event_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  `is_active` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Currently selected active event',
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_status` (`status`),
  KEY `idx_events_is_active` (`is_active`),
  CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: villages
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `villages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `taluka` VARCHAR(100) DEFAULT NULL,
  `district` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT 'Maharashtra',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_villages_name_taluka` (`name`, `taluka`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: donors
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `donors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `donor_code` VARCHAR(20) NOT NULL COMMENT 'System generated donor ID e.g. DON-0001',
  `full_name` VARCHAR(100) NOT NULL,
  `mobile` VARCHAR(15) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `village_id` INT UNSIGNED DEFAULT NULL,
  `village_name` VARCHAR(100) DEFAULT NULL COMMENT 'Fallback if village not in master',
  `address` TEXT DEFAULT NULL,
  `expected_donation` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `pending_amount` DECIMAL(12,2) GENERATED ALWAYS AS (`expected_donation` - `total_paid`) STORED,
  `status` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID') NOT NULL DEFAULT 'PENDING',
  `notes` TEXT DEFAULT NULL,
  `event_id` INT UNSIGNED DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_donors_donor_code` (`donor_code`),
  UNIQUE KEY `uq_donors_mobile_event` (`mobile`, `event_id`),
  KEY `idx_donors_mobile` (`mobile`),
  KEY `idx_donors_status` (`status`),
  KEY `idx_donors_village_id` (`village_id`),
  KEY `idx_donors_event_id` (`event_id`),
  KEY `idx_donors_created_by` (`created_by`),
  KEY `idx_donors_search` (`full_name`),
  CONSTRAINT `fk_donors_village_id` FOREIGN KEY (`village_id`) REFERENCES `villages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_donors_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_donors_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: receipts
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `receipts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `receipt_number` VARCHAR(30) NOT NULL COMMENT 'e.g. YAT-2026-000001',
  `event_id` INT UNSIGNED DEFAULT NULL,
  `donor_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `amount_in_words` VARCHAR(500) DEFAULT NULL,
  `payment_mode` VARCHAR(30) NOT NULL DEFAULT 'CASH',
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `collection_date` DATE NOT NULL,
  `collector_id` INT UNSIGNED DEFAULT NULL,
  `qr_code_data` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `is_cancelled` TINYINT(1) NOT NULL DEFAULT 0,
  `cancelled_at` TIMESTAMP NULL DEFAULT NULL,
  `cancelled_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_receipts_receipt_number` (`receipt_number`),
  KEY `idx_receipts_donor_id` (`donor_id`),
  KEY `idx_receipts_event_id` (`event_id`),
  KEY `idx_receipts_collector_id` (`collector_id`),
  KEY `idx_receipts_collection_date` (`collection_date`),
  CONSTRAINT `fk_receipts_donor_id` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_receipts_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_receipts_collector_id` FOREIGN KEY (`collector_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_receipts_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: collections
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `collections` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `receipt_id` INT UNSIGNED NOT NULL,
  `donor_id` INT UNSIGNED NOT NULL,
  `event_id` INT UNSIGNED DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_mode` ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER') NOT NULL DEFAULT 'CASH',
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `collection_date` DATE NOT NULL,
  `collector_id` INT UNSIGNED DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `is_cancelled` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_collections_donor_id` (`donor_id`),
  KEY `idx_collections_event_id` (`event_id`),
  KEY `idx_collections_collector_id` (`collector_id`),
  KEY `idx_collections_collection_date` (`collection_date`),
  KEY `idx_collections_payment_mode` (`payment_mode`),
  KEY `idx_collections_receipt_id` (`receipt_id`),
  CONSTRAINT `fk_collections_receipt_id` FOREIGN KEY (`receipt_id`) REFERENCES `receipts` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collections_donor_id` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collections_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_collections_collector_id` FOREIGN KEY (`collector_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_collections_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: expenses
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `category` ENUM(
    'DECORATION', 'SOUND_DJ', 'TENT', 'PRASAD', 'PUJA_MATERIAL',
    'TRANSPORTATION', 'ELECTRICITY', 'ADVERTISEMENT', 'PRINTING',
    'FOOD', 'SECURITY', 'MISCELLANEOUS'
  ) NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_mode` ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER') NOT NULL DEFAULT 'CASH',
  `expense_date` DATE NOT NULL,
  `paid_to` VARCHAR(150) DEFAULT NULL,
  `bill_number` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_event_id` (`event_id`),
  KEY `idx_expenses_category` (`category`),
  KEY `idx_expenses_expense_date` (`expense_date`),
  KEY `idx_expenses_created_by` (`created_by`),
  CONSTRAINT `fk_expenses_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_expenses_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_expenses_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: targets
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `targets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `target_amount` DECIMAL(12,2) NOT NULL,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_targets_event_id` (`event_id`),
  CONSTRAINT `fk_targets_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_targets_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: activity_logs (Audit Trail)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `user_name` VARCHAR(100) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL COMMENT 'e.g. DONOR_CREATED, COLLECTION_DELETED',
  `module` VARCHAR(50) NOT NULL COMMENT 'e.g. DONOR, COLLECTION, EXPENSE',
  `record_id` VARCHAR(50) DEFAULT NULL,
  `old_data` JSON DEFAULT NULL,
  `new_data` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_logs_user_id` (`user_id`),
  KEY `idx_activity_logs_action` (`action`),
  KEY `idx_activity_logs_module` (`module`),
  KEY `idx_activity_logs_created_at` (`created_at`),
  CONSTRAINT `fk_activity_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Table: settings
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_by` INT UNSIGNED DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_key` (`setting_key`),
  CONSTRAINT `fk_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- Sequence table for receipt number generation
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `receipt_sequences` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `year` YEAR NOT NULL,
  `last_number` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_receipt_seq_event_year` (`event_id`, `year`),
  CONSTRAINT `fk_receipt_seq_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
