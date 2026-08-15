var express = require('express');
var router = express.Router();
var Product = require('../models/Product');
var Order = require('../models/Order');
var PurchaseOrder = require('../models/PurchaseOrder');
var auth = require('./index');

/* GET /api/products 商品列表（JSON） */
router.get('/api/products', auth.authRequired, async function (req, res, next) {
  try {
    var products = await Product.find().sort({ createdAt: -1 }).lean();
    res.json({ code: 0, data: products });
  } catch (err) {
    next(err);
  }
});

/* GET /api/orders 订单列表（JSON） */
router.get('/api/orders', auth.authRequired, async function (req, res, next) {
  try {
    var orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json({ code: 0, data: orders });
  } catch (err) {
    next(err);
  }
});

/* POST /api/orders 下单（JSON，扣减库存） */
router.post('/api/orders', auth.authRequired, async function (req, res, next) {
  try {
    var body = req.body;
    var items = Array.isArray(body.items) ? body.items : [];
    var total = 0;
    var orderItems = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var product = await Product.findById(it.productId);
      if (!product) return res.status(400).json({ code: 1, message: '商品不存在' });
      var qty = Number(it.quantity);
      if (isNaN(qty) || qty <= 0) return res.status(400).json({ code: 1, message: '数量不合法' });
      if (product.stock < qty) {
        return res.status(400).json({ code: 1, message: '库存不足：' + product.name + ' 仅剩 ' + product.stock });
      }
      orderItems.push({ product: product._id, name: product.name, price: product.price, quantity: qty });
      total += product.price * qty;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ code: 1, message: '请至少购买一件商品' });
    }

    for (var j = 0; j < orderItems.length; j++) {
      await Product.findByIdAndUpdate(orderItems[j].product, { $inc: { stock: -orderItems[j].quantity } });
    }

    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    var order = await Order.create({
      orderNo: 'DD' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()),
      customer: body.customer || '散客',
      items: orderItems,
      totalAmount: Math.round(total * 100) / 100,
      status: '已支付',
    });
    res.json({ code: 0, data: order });
  } catch (err) {
    next(err);
  }
});

/* GET /api/stats 运营统计（JSON） */
router.get('/api/stats', auth.authRequired, async function (req, res, next) {
  try {
    var productCount = await Product.countDocuments();
    var lowStockCount = await Product.countDocuments({ $expr: { $lte: ['$stock', '$safetyStock'] } });
    var orderCount = await Order.countDocuments();
    var sales = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    res.json({
      code: 0,
      data: {
        productCount: productCount,
        lowStockCount: lowStockCount,
        orderCount: orderCount,
        totalSales: sales.length ? sales[0].total : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
