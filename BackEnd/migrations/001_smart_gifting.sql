-- Deployment migration for installations created before the smart-gifting release.
-- New local development databases receive these tables through SQLAlchemy metadata.
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  contact_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  address VARCHAR(300) NOT NULL,
  delivery_zone VARCHAR(20) NOT NULL,
  note TEXT,
  card_style VARCHAR(20),
  subtotal_minor INTEGER NOT NULL,
  delivery_minor INTEGER NOT NULL,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL,
  loyalty_level VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'request',
  created_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(150) NOT NULL,
  unit_price_minor INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items(order_id);
CREATE TABLE IF NOT EXISTS loyalty_events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  previous_level VARCHAR(20),
  new_level VARCHAR(20) NOT NULL,
  reason VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_loyalty_events_user_id ON loyalty_events(user_id);
