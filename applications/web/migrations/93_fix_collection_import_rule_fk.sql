PRAGMA foreign_keys = 0;

-- a dangling ref to a temp table was left behind when adding cascade fks in migration 88, so we need to rebuild the table
-- apparently this can be mitigated by setting PRAGMA legacy_alter_table = off in the future when doing such rebuilds
ALTER TABLE import_rule_to_collection
RENAME TO _temp_import_rule_to_collection;

CREATE TABLE import_rule_to_collection (
  import_rule_uuid text NOT NULL REFERENCES import_rule (uuid) ON DELETE CASCADE, -- this was referencing _temp_import_rule instead
  collection_uuid text NOT NULL REFERENCES collection (uuid) ON DELETE CASCADE,
  PRIMARY KEY (import_rule_uuid, collection_uuid)
);

INSERT INTO
  import_rule_to_collection
SELECT
  *
FROM
  _temp_import_rule_to_collection;

DROP TABLE _temp_import_rule_to_collection;

PRAGMA foreign_keys = 1;
