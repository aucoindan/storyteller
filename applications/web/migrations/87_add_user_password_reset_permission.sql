ALTER TABLE user_permission
ADD COLUMN user_password_reset BOOLEAN NOT NULL DEFAULT 0;
