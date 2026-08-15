var express = require('express');
var router = express.Router();
var Product = require('../models/Product');
var PurchaseOrder = require('../models/PurchaseOrder');
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

/* 进货单列表 */
router.get('/purchases', auth.authRequired, async function (req, res, next) {
  try {
    var purchases = await PurchaseOrder.find().sort({ createdAt: -1 }).lean();
    res.render('purchases/list', { purchases: purchases });
  } catch (err) {
    next(err);
  }
});

/* 新建进货单页面 */
router.get('/purchases/create', auth.authRequired, async function (req, res, next) {
  try {
    var products = await Product.find().sort({ name: 1 }).lean();
    res.render('purchases/form', { products: products, error: null });
  } catch (err) {
    next(err);
  }
});

/* 新建进货单 */
router.post('/purchases/create', auth.authRequired, async function (req, res, next) {
  try {
    var productId = req.body.product;
    var quantity = Number(req.body.quantity);
    var cost = Number(req.body.cost);
    var date = (req.body.date || '').trim();
    var remark = (req.body.remark || '').trim();

    if (!productId) return res.status(400).send('请选择商品');
    if (isNaN(quantity) || quantity <= 0) return res.status(400).send('进货数量必须为正整数');
    if (isNaN(cost) || cost < 0) return res.status(400).send('进价必须为非负数字');
    if (!date) return res.status(400).send('进货日期不能为空');

    var product = await Product.findById(productId);
    if (!product) return res.status(400).send('商品不存在');

    await PurchaseOrder.create({
      orderNo: genOrderNo('CG'),
      product: product._id,
      productName: product.name,
      quantity: quantity,
      cost: cost,
      supplier: (req.body.supplier || '').trim() || product.supplier,
      date: date,
      remark: remark,
      status: 'pending',
    });
    res.redirect('/purchases');
  } catch (err) {
    next(err);
  }
});

/* 确认收货：进货单入库，库存增加（仅管理员） */
router.get('/purchases/:id/receive', auth.adminRequired, async function (req, res, next) {
  try {
    var purchase = await PurchaseOrder.findById(req.params.id);
    if (!purchase) return res.status(404).send('进货单不存在');
    if (purchase.status === 'received') return res.status(400).send('该进货单已入库');

    purchase.status = 'received';
    await purchase.save();

    await Product.findByIdAndUpdate(purchase.product, { $inc: { stock: purchase.quantity } });
    res.redirect('/purchases');
  } catch (err) {
    next(err);
  }
});

/* 删除进货单（仅管理员） */
router.get('/purchases/:id/delete', auth.adminRequired, async function (req, res, next) {
  try {
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.redirect('/purchases');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
