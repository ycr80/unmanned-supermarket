/**
 * D1 数据访问层：无人自助超市业务 SQL
 * 每个函数接收 Pages Functions 的 env.DB（D1 绑定）
 */

function genOrderNo(prefix) {
  const d = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return prefix + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}

/* ---------- 用户 ---------- */

export async function findUser(db, username, password, role) {
  return await db.prepare(
    'SELECT * FROM users WHERE username = ? AND password = ? AND role = ?'
  ).bind(username, password, role).first();
}

/* ---------- 商品 ---------- */

export async function listProducts(db, q) {
  if (q) {
    return (await db.prepare(
      "SELECT * FROM products WHERE name LIKE ? OR category LIKE ? OR supplier LIKE ? ORDER BY id DESC"
    ).bind('%' + q + '%', '%' + q + '%', '%' + q + '%').all()).results;
  }
  return (await db.prepare('SELECT * FROM products ORDER BY id DESC').all()).results;
}

export async function getProduct(db, id) {
  return await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
}

export async function createProduct(db, p) {
  const r = await db.prepare(
    `INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(p.name, p.category, p.price, p.cost, p.stock, p.safetyStock, p.unit, p.supplier, p.productionDate, p.expiryDate).run();
  return await getProduct(db, r.meta.last_row_id);
}

export async function updateProduct(db, id, p) {
  await db.prepare(
    `UPDATE products SET name=?, category=?, price=?, cost=?, stock=?, safety_stock=?, unit=?, supplier=?, production_date=?, expiry_date=? WHERE id=?`
  ).bind(p.name, p.category, p.price, p.cost, p.stock, p.safetyStock, p.unit, p.supplier, p.productionDate, p.expiryDate, id).run();
  return await getProduct(db, id);
}

export async function deleteProduct(db, id) {
  await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
}

/* ---------- 进货单 ---------- */

export async function listPurchases(db) {
  return (await db.prepare('SELECT * FROM purchase_orders ORDER BY id DESC').all()).results;
}

export async function createPurchase(db, data) {
  const r = await db.prepare(
    `INSERT INTO purchase_orders (order_no, product_id, product_name, quantity, cost, supplier, date, remark, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(genOrderNo('CG'), data.productId, data.productName, data.quantity, data.cost, data.supplier, data.date, data.remark).run();
  return r.meta.last_row_id;
}

/** 确认收货：置为已入库并增加商品库存（用事务保证一致性） */
export async function receivePurchase(db, id) {
  const purchase = await db.prepare('SELECT * FROM purchase_orders WHERE id = ?').bind(id).first();
  if (!purchase) return { error: '进货单不存在' };
  if (purchase.status === 'received') return { error: '该进货单已入库' };

  await db.batch([
    db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').bind('received', id),
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(purchase.quantity, purchase.product_id),
  ]);
  return { ok: true };
}

export async function deletePurchase(db, id) {
  await db.prepare('DELETE FROM purchase_orders WHERE id = ?').bind(id).run();
}

/* ---------- 订单 ---------- */

export async function listOrders(db) {
  return (await db.prepare('SELECT * FROM orders ORDER BY id DESC').all()).results;
}

/** 下单：校验库存 -> 扣减库存 -> 生成订单（事务） */
export async function createOrder(db, items, customer) {
  if (!items || items.length === 0) return { error: '请至少选择一件商品并填写购买数量' };

  let total = 0;
  const orderItems = [];

  // 逐项校验库存（先只读校验，再在事务里扣减，避免并发超卖）
  for (const it of items) {
    const p = await db.prepare('SELECT * FROM products WHERE id = ?').bind(it.productId).first();
    if (!p) return { error: '商品不存在' };
    const qty = Number(it.quantity);
    if (!qty || qty <= 0) return { error: '购买数量不合法' };
    if (p.stock < qty) return { error: '库存不足：「' + p.name + '」当前库存 ' + p.stock + '，购买数量 ' + qty };
    orderItems.push({ productId: p.id, name: p.name, price: p.price, quantity: qty });
    total += p.price * qty;
  }

  total = Math.round(total * 100) / 100;
  const orderNo = genOrderNo('DD');

  const statements = [
    db.prepare(
      `INSERT INTO orders (order_no, customer, items, total_amount, status) VALUES (?, ?, ?, ?, '已支付')`
    ).bind(orderNo, customer || '散客', JSON.stringify(orderItems), total),
  ];
  for (const it of orderItems) {
    statements.push(
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .bind(it.quantity, it.productId, it.quantity)
    );
  }
  await db.batch(statements);

  return { ok: true, orderNo, totalAmount: total, items: orderItems };
}

export async function deleteOrder(db, id) {
  await db.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
}

/* ---------- 统计 ---------- */

export async function stats(db) {
  const productCount = (await db.prepare('SELECT COUNT(*) AS c FROM products').first()).c;
  const lowStock = (await db.prepare('SELECT COUNT(*) AS c FROM products WHERE stock <= safety_stock').first()).c;
  const orderCount = (await db.prepare('SELECT COUNT(*) AS c FROM orders').first()).c;
  const sales = (await db.prepare('SELECT COALESCE(SUM(total_amount), 0) AS t FROM orders').first()).t;
  const pending = (await db.prepare("SELECT COUNT(*) AS c FROM purchase_orders WHERE status = 'pending'").first()).c;
  const lowStockProducts = (await db.prepare(
    'SELECT * FROM products WHERE stock <= safety_stock ORDER BY stock ASC LIMIT 5'
  ).all()).results;
  const recentOrders = (await db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5').all()).results;
  return { productCount, lowStockCount: lowStock, orderCount, totalSales: sales, pendingPurchases: pending, lowStockProducts, recentOrders };
}

/* ---------- 初始化（建表 + 示例数据，幂等） ---------- */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS products (
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
  )`,
  `CREATE TABLE IF NOT EXISTS purchase_orders (
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
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    customer TEXT NOT NULL DEFAULT '散客',
    items TEXT NOT NULL DEFAULT '[]',
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '已支付',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

export async function init(db) {
  // 建表（幂等）
  for (const sql of SCHEMA) {
    await db.prepare(sql).run();
  }
  // 已有数据则跳过种子
  const userCount = (await db.prepare('SELECT COUNT(*) AS c FROM users').first()).c;
  if (userCount > 0) return { ok: true, seeded: false };

  // 示例数据
  const stmts = [
    db.prepare("INSERT INTO users (username, password, name, phone, role) VALUES ('admin','admin123','杨超然','13800000001','admin')"),
    db.prepare("INSERT INTO users (username, password, name, phone, role) VALUES ('staff','staff123','收银员小李','13800000002','staff')"),
    db.prepare("INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date) VALUES ('农夫山泉 550ml','饮料',2,1,120,24,'瓶','农夫山泉经销商','2023-11-01','2024-11-01')"),
    db.prepare("INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date) VALUES ('康师傅红烧牛肉面','方便食品',4.5,3.2,80,16,'桶','康师傅总代理','2023-10-10','2024-04-10')"),
    db.prepare("INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date) VALUES ('伊利纯牛奶 250ml','乳制品',3,2.1,60,12,'盒','伊利集团','2023-11-15','2024-02-15')"),
    db.prepare("INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date) VALUES ('奥利奥原味夹心饼干','零食',7.5,5.5,40,8,'包','亿滋商贸','2023-09-20','2024-03-20')"),
    db.prepare("INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date) VALUES ('乐事薯片 原味','零食',6,4.2,3,5,'袋','百事食品','2023-12-01','2024-06-01')"),
    db.prepare("INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date) VALUES ('维达抽纸 3 层','日用品',12.9,9.5,50,10,'包','维达纸业','2023-08-01','2026-08-01')"),
    db.prepare("INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date) VALUES ('可口可乐 330ml','饮料',3.5,2.4,2,5,'罐','中粮可口可乐','2023-12-05','2024-12-05')"),
    db.prepare("INSERT INTO products (name, category, price, cost, stock, safety_stock, unit, supplier, production_date, expiry_date) VALUES ('双汇火腿肠 30g','肉制品',1.5,1,100,20,'根','双汇集团','2023-11-20','2024-05-20')"),
    db.prepare("INSERT INTO purchase_orders (order_no, product_id, product_name, quantity, cost, supplier, date, remark, status) VALUES ('CG20231120001', 5, '乐事薯片 原味', 50, 4.2, '百事食品', '2023-11-20', '补货', 'pending')"),
    db.prepare("INSERT INTO purchase_orders (order_no, product_id, product_name, quantity, cost, supplier, date, remark, status) VALUES ('CG20231201001', 7, '可口可乐 330ml', 30, 2.4, '中粮可口可乐', '2023-12-01', '', 'received')"),
    db.prepare("INSERT INTO orders (order_no, customer, items, total_amount, status) VALUES ('DD20231215001', '张三', '[{\"productId\":1,\"name\":\"农夫山泉 550ml\",\"price\":2,\"quantity\":2},{\"productId\":4,\"name\":\"奥利奥原味夹心饼干\",\"price\":7.5,\"quantity\":1}]', 11.5, '已支付')"),
    db.prepare("INSERT INTO orders (order_no, customer, items, total_amount, status) VALUES ('DD20231216001', '李四', '[{\"productId\":2,\"name\":\"康师傅红烧牛肉面\",\"price\":4.5,\"quantity\":3}]', 13.5, '已支付')"),
  ];
  await db.batch(stmts);
  return { ok: true, seeded: true };
}
