var express = require('express');
var router = express.Router();
var createError = require('http-errors');
var Product = require('../models/Product');
var auth = require('./index');

/* 商品列表（支持按名称/分类搜索） */
router.get('/products', auth.authRequired, async function (req, res, next) {
  try {
    var q = (req.query.q || '').trim();
    var filter = {};
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { category: new RegExp(q, 'i') },
        { supplier: new RegExp(q, 'i') },
      ];
    }
    var products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    products.forEach(function (p) {
      p.isLow = p.stock <= p.safetyStock;
    });
    res.render('products/list', { products: products, q: q });
  } catch (err) {
    next(err);
  }
});

/* 新增商品页面 */
router.get('/products/create', auth.authRequired, function (req, res) {
  res.render('products/form', { product: null, error: null });
});

/* 新增商品 */
router.post('/products/create', auth.authRequired, async function (req, res, next) {
  try {
    var name = (req.body.name || '').trim();
    var price = Number(req.body.price);
    var cost = Number(req.body.cost || 0);
    var stock = Number(req.body.stock || 0);
    var safetyStock = req.body.safetyStock !== '' && req.body.safetyStock != null
      ? Number(req.body.safetyStock)
      : Math.max(1, Math.round(stock * 0.2)); // 默认安全库存 = 初始库存的 20%
    var category = (req.body.category || '其他').trim();
    var unit = (req.body.unit || '件').trim();
    var supplier = (req.body.supplier || '').trim();
    var productionDate = (req.body.productionDate || '').trim();
    var expiryDate = (req.body.expiryDate || '').trim();

    if (!name) return res.status(400).render('products/form', { product: null, error: '商品名称不能为空' });
    if (isNaN(price) || price < 0) return res.status(400).render('products/form', { product: null, error: '售价必须为非负数字' });
    if (isNaN(stock) || stock < 0) return res.status(400).render('products/form', { product: null, error: '库存必须为非负数字' });

    await Product.create({
      name: name,
      category: category,
      price: price,
      cost: cost,
      stock: stock,
      safetyStock: safetyStock,
      unit: unit,
      supplier: supplier,
      productionDate: productionDate,
      expiryDate: expiryDate,
    });
    res.redirect('/products');
  } catch (err) {
    next(err);
  }
});

/* 编辑商品页面 */
router.get('/products/:id/edit', auth.authRequired, async function (req, res, next) {
  try {
    var product = await Product.findById(req.params.id).lean();
    if (!product) return next(createError(404));
    res.render('products/form', { product: product, error: null });
  } catch (err) {
    next(err);
  }
});

/* 编辑商品 */
router.post('/products/:id/edit', auth.authRequired, async function (req, res, next) {
  try {
    var update = {
      name: (req.body.name || '').trim(),
      category: (req.body.category || '其他').trim(),
      price: Number(req.body.price),
      cost: Number(req.body.cost || 0),
      stock: Number(req.body.stock || 0),
      safetyStock: Number(req.body.safetyStock || 0),
      unit: (req.body.unit || '件').trim(),
      supplier: (req.body.supplier || '').trim(),
      productionDate: (req.body.productionDate || '').trim(),
      expiryDate: (req.body.expiryDate || '').trim(),
    };
    if (!update.name) return res.status(400).send('商品名称不能为空');
    if (isNaN(update.price) || update.price < 0) return res.status(400).send('售价必须为非负数字');
    if (isNaN(update.stock) || update.stock < 0) return res.status(400).send('库存必须为非负数字');

    await Product.findByIdAndUpdate(req.params.id, update);
    res.redirect('/products');
  } catch (err) {
    next(err);
  }
});

/* 删除商品（仅管理员） */
router.get('/products/:id/delete', auth.adminRequired, async function (req, res, next) {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/products');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
