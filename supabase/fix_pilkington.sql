-- Corrige grafia "Pilcington" → "Pilkington" em todos os registros de fabricantes
UPDATE product_manufacturers
SET manufacturer = 'Pilkington'
WHERE manufacturer = 'Pilcington';
