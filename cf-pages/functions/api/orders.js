import { getSessionUser, json } from '../_lib/auth.js';
import * as db from '../_lib/db.js';

/** GET /api/orders  订单列表 */
export async function onRequestGet(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  try {
    const orders = await db.listOrders(context.env.DB);
    // items 字段为 JSON 字符串，转成对象返回
    orders.forEach((o) => {
      try { o.items = JSON.parse(o.items); } catch (e) { o.items = []; }
    });
    return json({ code: 0, data: orders });
  } catch (err) {
    return json({ code: 1, message: '查询失败: ' + err.message }, 500);
  }
}

/** POST /api/orders  下单 { customer, items: [{productId, quantity}] } */
export async function onRequestPost(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  try {
    const b = await context.request.json();
    const result = await db.createOrder(context.env.DB, b.items || [], (b.customer || '').trim());
    if (result.error) return json({ code: 1, message: result.error }, 400);
    return json({ code: 0, data: { orderNo: result.orderNo, totalAmount: result.totalAmount, items: result.items } }, 201);
  } catch (err) {
    return json({ code: 1, message: '下单失败: ' + err.message }, 500);
  }
}
