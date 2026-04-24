CREATE TABLE import_skip_path (
  book_uuid TEXT REFERENCES book (uuid),
  filepath TEXT PRIMARY KEY
);
