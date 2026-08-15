var express = require('express');
var router = express.Router();
var User = require('../models/User');
var Product = require('../models/Product');
var PurchaseOrder = require('../models/PurchaseOrder');
var Order = require('../models/Order');

/* ---------- 鉴权中间件 ---------- */

// 需登录
function authRequired(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// 需管理员
function adminRequired(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role !== 'admin') {
    return res.status(403).send('403 无权限：仅管理员可执行该操作');
  }
  next();
}

/* ---------- 登录 / 退出 ---------- */

router.get('/login', function (req, res) {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login', async function (req, res, next) {
  try {
    var username = (req.body.username || '').trim();
    var password = req.body.password || '';
    var role = req.body.role === 'admin' ? 'admin' : 'staff';

    var user = await User.findOne({ username: username, password: password, role: role });
    if (!user) {
      return res.status(401).render('login', { error: '账号或密码错误，或所选角色不匹配' });
    }
    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.get('/logout', function (req, res) {
  req.session.destroy(function () {
    res.redirect('/login');
  });
});

/* ---------- 首页：重定向 / 统计看板 ---------- */

router.get('/', authRequired, function (req, res) {
  res.redirect('/dashboard');
});

router.get('/dashboard', authRequired, async function (req, res, next) {
  try {
    var productCount = await Product.countDocuments();
    var lowStockProducts = await Product.find({ $expr: { $lte: ['$stock', '$safetyStock'] } })
      .sort({ stock: 1 })
      .limit(5)
      .lean();
    var pendingPurchases = await PurchaseOrder.countDocuments({ status: 'pending' });
    var todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    var todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStart } });
    var totalSales = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    var recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).lean();

    res.render('dashboard', {
      productCount: productCount,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts,
      pendingPurchases: pendingPurchases,
      todayOrders: todayOrders,
      totalSales: totalSales.length ? totalSales[0].total : 0,
      recentOrders: recentOrders,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.authRequired = authRequired;
module.exports.adminRequired = adminRequired;
