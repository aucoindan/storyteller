-- you gotta trust me on this one
DELETE FROM import_rule
WHERE
  uuid NOT IN (
    SELECT
      uuid
    FROM
      (
        SELECT
          uuid,
          ROW_NUMBER() OVER (
            PARTITION BY
              path
            ORDER BY
              (kind = 'watch') DESC,
              uuid
          ) AS rn
        FROM
          import_rule
      )
    WHERE
      rn = 1
  );

DROP INDEX IF EXISTS idx_import_rule_path;

CREATE UNIQUE INDEX idx_import_rule_path ON import_rule (path);
