/**
 * 插入示例数据：node ./scripts/seed.js
 * 注意：会清空 supermarket 库中的相关集合后重新插入。
 * 默认账号：
 *   管理员 admin / admin123
 *   员工   staff / staff123
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Order = require('../models/Order');

const DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/supermarket';

const users = [
  { username: 'admin', password: 'admin123', name: '杨超然', phone: '13800000001', role: 'admin' },
  { username: 'staff', password: 'staff123', name: '收银员小李', phone: '13800000002', role: 'staff' },
];

// 商品：stock 低于 safetyStock（初始库存 20%）会触发库存预警
const products = [
  { name: '农夫山泉 550ml', category: '饮料', price: 2, cost: 1, stock: 120, unit: '瓶', supplier: '农夫山泉经销商', productionDate: '2023-11-01', expiryDate: '2024-11-01' },
  { name: '康师傅红烧牛肉面', category: '方便食品', price: 4.5, cost: 3.2, stock: 80, unit: '桶', supplier: '康师傅总代理', productionDate: '2023-10-10', expiryDate: '2024-04-10' },
  { name: '伊利纯牛奶 250ml', category: '乳制品', price: 3, cost: 2.1, stock: 60, unit: '盒', supplier: '伊利集团', productionDate: '2023-11-15', expiryDate: '2024-02-15' },
  { name: '奥利奥原味夹心饼干', category: '零食', price: 7.5, cost: 5.5, stock: 40, unit: '包', supplier: '亿滋商贸', productionDate: '2023-09-20', expiryDate: '2024-03-20' },
  { name: '乐事薯片 原味', category: '零食', price: 6, cost: 4.2, stock: 3, unit: '袋', supplier: '百事食品', productionDate: '2023-12-01', expiryDate: '2024-06-01' }, // 低库存预警
  { name: '维达抽纸 3 层', category: '日用品', price: 12.9, cost: 9.5, stock: 50, unit: '包', supplier: '维达纸业', productionDate: '2023-08-01', expiryDate: '2026-08-01' },
  { name: '可口可乐 330ml', category: '饮料', price: 3.5, cost: 2.4, stock: 2, unit: '罐', supplier: '中粮可口可乐', productionDate: '2023-12-05', expiryDate: '2024-12-05' }, // 低库存预警
  { name: '双汇火腿肠 30g', category: '肉制品', price: 1.5, cost: 1, stock: 100, unit: '根', supplier: '双汇集团', productionDate: '2023-11-20', expiryDate: '2024-05-20' },
];

async function main() {
  await mongoose.connect(DB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Order.deleteMany({}),
  ]);

  await User.insertMany(users);

  const docs = products.map((p) => ({
    ...p,
    // 乐事/可口可乐 为演示"低库存预警"：安全库存设为 5，使当前库存低于预警线
    safetyStock: p.name.includes('乐事') || p.name.includes('可口可乐')
      ? 5
      : Math.max(1, Math.round(p.stock * 0.2)),
  }));
  const inserted = await Product.insertMany(docs);

  const byName = {};
  inserted.forEach((p) => { byName[p.name] = p; });

  await PurchaseOrder.insertMany([
    {
      orderNo: 'CG20231120001',
      product: byName['乐事薯片 原味']._id,
      productName: '乐事薯片 原味',
      quantity: 50,
      cost: 4.2,
      supplier: '百事食品',
      date: '2023-11-20',
      remark: '补货',
      status: 'pending',
    },
    {
      orderNo: 'CG20231201001',
      product: byName['可口可乐 330ml']._id,
      productName: '可口可乐 330ml',
      quantity: 30,
      cost: 2.4,
      supplier: '中粮可口可乐',
      date: '2023-12-01',
      remark: '',
      status: 'received',
    },
  ]);

  await Order.insertMany([
    {
      orderNo: 'DD20231215001',
      customer: '张三',
      items: [
        { product: byName['农夫山泉 550ml']._id, name: '农夫山泉 550ml', price: 2, quantity: 2 },
        { product: byName['奥利奥原味夹心饼干']._id, name: '奥利奥原味夹心饼干', price: 7.5, quantity: 1 },
      ],
      totalAmount: 11.5,
      status: '已支付',
    },
    {
      orderNo: 'DD20231216001',
      customer: '李四',
      items: [{ product: byName['康师傅红烧牛肉面']._id, name: '康师傅红烧牛肉面', price: 4.5, quantity: 3 }],
      totalAmount: 13.5,
      status: '已支付',
    },
  ]);

  console.log('示例数据插入成功：用户 2 个、商品', inserted.length, '个、进货单 2 个、订单 2 个');
  console.log('默认账号：admin / admin123（管理员），staff / staff123（员工）');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('插入失败:', err.message);
  process.exit(1);
});
