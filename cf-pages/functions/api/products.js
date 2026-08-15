import { getSessionUser, json } from '../_lib/auth.js';
import * as db from '../_lib/db.js';

/** GET /api/products?q=  商品列表（搜索） */
export async function onRequestGet(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  try {
    const url = new URL(context.request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const products = await db.listProducts(context.env.DB, q);
    return json({ code: 0, data: products });
  } catch (err) {
    return json({ code: 1, message: '查询失败: ' + err.message }, 500);
  }
}

/** POST /api/products  新增商品 */
export async function onRequestPost(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  try {
    const b = await context.request.json();
    const name = (b.name || '').trim();
    const price = Number(b.price);
    const stock = Number(b.stock || 0);
    if (!name) return json({ code: 1, message: '商品名称不能为空' }, 400);
    if (isNaN(price) || price < 0) return json({ code: 1, message: '售价必须为非负数字' }, 400);
    if (isNaN(stock) || stock < 0) return json({ code: 1, message: '库存必须为非负数字' }, 400);

    const safetyStock = b.safetyStock !== '' && b.safetyStock != null
      ? Number(b.safetyStock)
      : Math.max(1, Math.round(stock * 0.2));

    const product = await db.createProduct(context.env.DB, {
      name,
      category: (b.category || '其他').trim(),
      price,
      cost: Number(b.cost || 0),
      stock,
      safetyStock,
      unit: (b.unit || '件').trim(),
      supplier: (b.supplier || '').trim(),
      productionDate: (b.productionDate || '').trim(),
      expiryDate: (b.expiryDate || '').trim(),
    });
    return json({ code: 0, data: product }, 201);
  } catch (err) {
    return json({ code: 1, message: '新增失败: ' + err.message }, 500);
  }
}
