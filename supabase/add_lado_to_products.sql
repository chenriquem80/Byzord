-- Adiciona campo lado ao produto (D = Direito, E = Esquerdo, D/E = ambos)
ALTER TABLE products ADD COLUMN IF NOT EXISTS lado text;
