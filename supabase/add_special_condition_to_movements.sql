-- ============================================================
-- Adiciona coluna special_condition à tabela stock_movements
-- para registrar a condição (B, R, BR) nos logs de movimentação
-- ============================================================

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS special_condition TEXT DEFAULT NULL;

-- Comentário: valores possíveis: 'B', 'R', 'BR' ou NULL (regular)
