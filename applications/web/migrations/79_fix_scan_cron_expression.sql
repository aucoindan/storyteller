UPDATE settings
SET
  value = '"0 */24 * * *"'
WHERE
  name = 'scanCronExpression'
  AND value = '"0 */1440 * * *"';
