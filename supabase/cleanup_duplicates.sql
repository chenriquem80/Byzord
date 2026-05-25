SELECT internal_code, name, COUNT(*) as total
FROM products
GROUP BY internal_code, name
HAVING COUNT(*) > 1;
