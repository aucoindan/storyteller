CREATE TABLE IF NOT EXISTS user_book_rating (
  uuid TEXT PRIMARY KEY NOT NULL DEFAULT (uuid ()),
  user_id TEXT NOT NULL,
  book_uuid TEXT NOT NULL,
  rating REAL,
  review TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user (id),
  FOREIGN KEY (book_uuid) REFERENCES book (uuid),
  UNIQUE (user_id, book_uuid),
  CHECK (
    rating IS NOT NULL
    OR review IS NOT NULL
  )
);

CREATE TRIGGER IF NOT EXISTS user_book_rating_update_trigger AFTER
UPDATE ON user_book_rating FOR EACH ROW BEGIN
UPDATE user_book_rating
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = OLD.uuid;

END;
