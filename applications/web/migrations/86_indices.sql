CREATE INDEX IF NOT EXISTS idx_book_to_collection_book ON book_to_collection (book_uuid);

CREATE INDEX IF NOT EXISTS idx_book_to_creator_book_role ON book_to_creator (book_uuid, role);

CREATE INDEX IF NOT EXISTS idx_book_to_creator_creator ON book_to_creator (creator_uuid);

CREATE INDEX IF NOT EXISTS idx_collection_to_user_collection ON collection_to_user (collection_uuid);

ANALYZE;
