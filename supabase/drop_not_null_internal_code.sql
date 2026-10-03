ALTER TABLE products ALTER COLUMN internal_code DROP NOT NULL;
ALTER TABLE products ALTER COLUMN internal_code SET DEFAULT '';
