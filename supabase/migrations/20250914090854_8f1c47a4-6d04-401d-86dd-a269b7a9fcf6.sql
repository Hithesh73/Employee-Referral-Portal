-- Hash any remaining plaintext passwords safely
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Only hash values that are not already bcrypt (which starts with $2a$, $2b$, or $2y$)
UPDATE public.employees
SET password = extensions.crypt(password, extensions.gen_salt('bf'))
WHERE password IS NOT NULL
  AND (password NOT LIKE '$2a$%' AND password NOT LIKE '$2b$%' AND password NOT LIKE '$2y$%');