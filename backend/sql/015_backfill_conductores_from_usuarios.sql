CREATE SCHEMA IF NOT EXISTS ego;

INSERT INTO ego.conductor (user_id)
SELECT u.id
FROM ego.usuari u
LEFT JOIN ego.conductor c ON c.user_id = u.id
WHERE c.user_id IS NULL;
