PRAGMA foreign_keys = 0;

ALTER TABLE book_to_creator
RENAME TO _temp_book_to_creator;

CREATE TABLE book_to_creator (
  uuid text PRIMARY KEY NOT NULL DEFAULT (uuid ()),
  book_uuid text NOT NULL,
  creator_uuid text NOT NULL,
  role TEXT,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- cascade! for real!
  FOREIGN KEY (book_uuid) REFERENCES book (uuid) ON DELETE CASCADE,
  -- this is more rare, but still possible
  FOREIGN KEY (creator_uuid) REFERENCES "creator" (uuid) ON DELETE CASCADE
);

-- just in case some other columns were added to the table
INSERT INTO
  book_to_creator (
    uuid,
    book_uuid,
    creator_uuid,
    role,
    created_at,
    updated_at
  )
SELECT
  uuid,
  book_uuid,
  creator_uuid,
  ROLE,
  created_at,
  updated_at
FROM
  _temp_book_to_creator;

DROP TABLE _temp_book_to_creator;

CREATE TRIGGER IF NOT EXISTS book_to_creator_update_trigger AFTER
UPDATE ON book_to_creator FOR EACH ROW BEGIN
UPDATE book_to_creator
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = OLD.uuid;

END;

CREATE INDEX IF NOT EXISTS idx_book_to_creator_book_role ON book_to_creator (book_uuid, ROLE);

CREATE INDEX IF NOT EXISTS idx_book_to_creator_creator ON book_to_creator (creator_uuid);

PRAGMA foreign_keys = 1;
