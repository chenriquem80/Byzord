alter table services add column if not exists store_id uuid references stores(id);
