CREATE TABLE IF NOT EXISTS external_source (
  uuid text PRIMARY KEY NOT NULL DEFAULT (uuid ()),
  name text NOT NULL UNIQUE,
  kind text UNIQUE,
  logo text,
  color text,
  url text,
  rating_min real,
  rating_max real,
  rating_icon text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS external_source_update_trigger AFTER
UPDATE ON external_source FOR EACH ROW BEGIN
UPDATE external_source
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = OLD.uuid;

END;

INSERT
OR IGNORE INTO external_source (
  name,
  kind,
  url,
  color,
  rating_min,
  rating_max,
  rating_icon
)
VALUES
  (
    'Hardcover',
    'hardcover',
    'https://hardcover.app',
    '#7C3AED',
    0,
    5,
    'star'
  );

CREATE TABLE IF NOT EXISTS identifier_type (
  uuid text PRIMARY KEY NOT NULL DEFAULT (uuid ()),
  name text NOT NULL UNIQUE,
  kind text UNIQUE,
  url_template text,
  external_source_uuid text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (external_source_uuid) REFERENCES external_source (uuid) ON DELETE SET NULL
);

CREATE TRIGGER IF NOT EXISTS identifier_type_update_trigger AFTER
UPDATE ON identifier_type FOR EACH ROW BEGIN
UPDATE identifier_type
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = OLD.uuid;

END;

CREATE TABLE IF NOT EXISTS identifier (
  uuid text PRIMARY KEY NOT NULL DEFAULT (uuid ()),
  book_uuid text NOT NULL,
  identifier_type_uuid text NOT NULL,
  value text NOT NULL,
  ebook_uuid text,
  audiobook_uuid text,
  readaloud_uuid text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_uuid) REFERENCES book (uuid) ON DELETE CASCADE,
  FOREIGN KEY (identifier_type_uuid) REFERENCES identifier_type (uuid) ON DELETE CASCADE,
  FOREIGN KEY (ebook_uuid) REFERENCES ebook (uuid) ON DELETE CASCADE,
  FOREIGN KEY (audiobook_uuid) REFERENCES audiobook (uuid) ON DELETE CASCADE,
  FOREIGN KEY (readaloud_uuid) REFERENCES readaloud (uuid) ON DELETE CASCADE,
  CHECK (
    (ebook_uuid IS NOT NULL) + (audiobook_uuid IS NOT NULL) + (readaloud_uuid IS NOT NULL) <= 1
  )
);

CREATE TRIGGER IF NOT EXISTS identifier_update_trigger AFTER
UPDATE ON identifier FOR EACH ROW BEGIN
UPDATE identifier
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = OLD.uuid;

END;

INSERT
OR IGNORE INTO identifier_type (name, kind)
VALUES
  ('DOI', 'doi'),
  ('ASIN', 'asin'),
  ('ISBN-13', 'isbn-13'),
  ('Hardcover Edition ID', 'hardcover-edition-id'),
  ('Hardcover Book Slug', 'hardcover-book-slug');

UPDATE identifier_type
SET
  external_source_uuid = (
    SELECT
      uuid
    FROM
      external_source
    WHERE
      kind = 'hardcover'
  )
WHERE
  kind IN ('hardcover-edition-id', 'hardcover-book-slug');

CREATE TABLE IF NOT EXISTS external_data (
  uuid text PRIMARY KEY NOT NULL DEFAULT (uuid ()),
  identifier_uuid text NOT NULL,
  external_source_uuid text NOT NULL,
  rating real NOT NULL,
  fetched_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (identifier_uuid) REFERENCES identifier (uuid) ON DELETE CASCADE,
  FOREIGN KEY (external_source_uuid) REFERENCES external_source (uuid) ON DELETE CASCADE,
  UNIQUE (identifier_uuid, external_source_uuid)
);

CREATE TRIGGER IF NOT EXISTS external_data_update_trigger AFTER
UPDATE ON external_data FOR EACH ROW BEGIN
UPDATE external_data
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  uuid = OLD.uuid;

END;
