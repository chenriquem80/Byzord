alter table product_store_inventory
  add column if not exists special_condition text default null;
