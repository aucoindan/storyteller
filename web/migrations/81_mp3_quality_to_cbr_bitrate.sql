-- MP3 export now uses constant bitrate. Convert any stored libmp3lame `-q:a`
-- quality value (0-9) to the nearest CBR `-b:a` bitrate (see LAME -V tiers).
UPDATE settings
SET
  value = CASE value
    WHEN '"0"' THEN '"256k"'
    WHEN '"1"' THEN '"224k"'
    WHEN '"2"' THEN '"192k"'
    WHEN '"3"' THEN '"160k"'
    WHEN '"4"' THEN '"160k"'
    WHEN '"5"' THEN '"128k"'
    WHEN '"6"' THEN '"112k"'
    WHEN '"7"' THEN '"96k"'
    WHEN '"8"' THEN '"80k"'
    WHEN '"9"' THEN '"64k"'
    ELSE value
  END
WHERE
  name = 'bitrate'
  AND (
    SELECT
      value
    FROM
      settings
    WHERE
      name = 'codec'
  ) = '"libmp3lame"';
