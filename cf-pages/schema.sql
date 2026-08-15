-- Cloudflare D1 表结构（部署后访问 /api/init 会自动执行本脚本并插入示例数据）
-- 也可手动执行：npx wrangler d1 execute <database> --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '其他',
  price REAL NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  safety_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '件',
  supplier TEXT NOT NULL DEFAULT '',
  production_date TEXT NOT NULL DEFAULT '',
  expiry_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost REAL NOT NULL,
  supplier TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  remark TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  customer TEXT NOT NULL DEFAULT '散客',
  items TEXT NOT NULL DEFAULT '[]',
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '已支付',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
