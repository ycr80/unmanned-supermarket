var express = require('express');
var router = express.Router();
var Product = require('../models/Product');
var Order = require('../models/Order');
var auth = require('./index');

function genOrderNo(prefix) {
  var d = new Date();
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  return (
    prefix +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/* 订单列表 */
router.get('/orders', auth.authRequired, async function (req, res, next) {
  try {
    var orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.render('orders/list', { orders: orders });
  } catch (err) {
    next(err);
  }
});

/* 选购页（下单） */
router.get('/orders/create', auth.authRequired, async function (req, res, next) {
  try {
    var products = await Product.find().sort({ name: 1 }).lean();
    res.render('orders/create', { products: products, error: null });
  } catch (err) {
    next(err);
  }
});

/* 提交订单：校验库存 -> 扣减库存 -> 生成订单 */
router.post('/orders/create', auth.authRequired, async function (req, res, next) {
  try {
    var productIds = Array.isArray(req.body.productId) ? req.body.productId : [req.body.productId];
    var quantities = Array.isArray(req.body.quantity) ? req.body.quantity : [req.body.quantity];
    var customer = (req.body.customer || '散客').trim();

    var items = [];
    var total = 0;
    for (var i = 0; i < productIds.length; i++) {
      var pid = productIds[i];
      var qty = Number(quantities[i]);
      if (!pid || isNaN(qty) || qty <= 0) continue;

      var product = await Product.findById(pid);
      if (!product) return res.status(400).send('商品不存在: ' + pid);
      if (product.stock < qty) {
        return res.status(400).send('库存不足：「' + product.name + '」当前库存 ' + product.stock + '，购买数量 ' + qty);
      }
      items.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: qty,
      });
      total += product.price * qty;
    }

    if (items.length === 0) {
      return res.status(400).send('请至少选择一件商品并填写购买数量');
    }

    // 扣减库存
    for (var j = 0; j < items.length; j++) {
      await Product.findByIdAndUpdate(items[j].product, { $inc: { stock: -items[j].quantity } });
    }

    var order = await Order.create({
      orderNo: genOrderNo('DD'),
      customer: customer,
      items: items,
      totalAmount: Math.round(total * 100) / 100,
      status: '已支付',
    });
    res.redirect('/orders');
  } catch (err) {
    next(err);
  }
});

/* 删除订单（仅管理员） */
router.get('/orders/:id/delete', auth.adminRequired, async function (req, res, next) {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.redirect('/orders');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
