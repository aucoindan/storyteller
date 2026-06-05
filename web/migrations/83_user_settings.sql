CREATE TABLE IF NOT EXISTS user_settings (
  uuid TEXT PRIMARY KEY NOT NULL DEFAULT (uuid ()),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user (id),
  UNIQUE (user_id, name)
);

CREATE TRIGGER IF NOT EXISTS user_settings_update_trigger AFTER
UPDATE ON user_settings FOR EACH ROW BEGIN
UPDATE user_settings
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = OLD.uuid;

END;
