import { getSessionUser, json } from '../_lib/auth.js';
import * as db from '../_lib/db.js';

/** GET /api/purchases  进货单列表 */
export async function onRequestGet(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  try {
    const purchases = await db.listPurchases(context.env.DB);
    return json({ code: 0, data: purchases });
  } catch (err) {
    return json({ code: 1, message: '查询失败: ' + err.message }, 500);
  }
}

/** POST /api/purchases  新建进货单 { productId, quantity, cost, supplier, date, remark } */
export async function onRequestPost(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  try {
    const b = await context.request.json();
    const quantity = Number(b.quantity);
    const cost = Number(b.cost);
    const date = (b.date || '').trim();
    if (!b.productId) return json({ code: 1, message: '请选择商品' }, 400);
    if (isNaN(quantity) || quantity <= 0) return json({ code: 1, message: '进货数量必须为正整数' }, 400);
    if (isNaN(cost) || cost < 0) return json({ code: 1, message: '进价必须为非负数字' }, 400);
    if (!date) return json({ code: 1, message: '进货日期不能为空' }, 400);

    const product = await db.getProduct(context.env.DB, b.productId);
    if (!product) return json({ code: 1, message: '商品不存在' }, 400);

    const id = await db.createPurchase(context.env.DB, {
      productId: product.id,
      productName: product.name,
      quantity,
      cost,
      supplier: (b.supplier || '').trim() || product.supplier,
      date,
      remark: (b.remark || '').trim(),
    });
    return json({ code: 0, data: { id } }, 201);
  } catch (err) {
    return json({ code: 1, message: '新建失败: ' + err.message }, 500);
  }
}
