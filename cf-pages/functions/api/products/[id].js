import { getSessionUser, json } from '../../_lib/auth.js';
import * as db from '../../_lib/db.js';

/** GET /api/products/:id  单个商品（编辑页回显用） */
export async function onRequestGet(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  try {
    const product = await db.getProduct(context.env.DB, context.params.id);
    if (!product) return json({ code: 1, message: '商品不存在' }, 404);
    return json({ code: 0, data: product });
  } catch (err) {
    return json({ code: 1, message: '查询失败: ' + err.message }, 500);
  }
}

/** PUT /api/products/:id  编辑商品 */
export async function onRequestPut(context) {
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

    const product = await db.updateProduct(context.env.DB, context.params.id, {
      name,
      category: (b.category || '其他').trim(),
      price,
      cost: Number(b.cost || 0),
      stock,
      safetyStock: Number(b.safetyStock || 0),
      unit: (b.unit || '件').trim(),
      supplier: (b.supplier || '').trim(),
      productionDate: (b.productionDate || '').trim(),
      expiryDate: (b.expiryDate || '').trim(),
    });
    return json({ code: 0, data: product });
  } catch (err) {
    return json({ code: 1, message: '保存失败: ' + err.message }, 500);
  }
}

/** DELETE /api/products/:id  删除商品（仅管理员） */
export async function onRequestDelete(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  if (user.role !== 'admin') return json({ code: 1, message: '403 无权限：仅管理员可执行该操作' }, 403);
  try {
    await db.deleteProduct(context.env.DB, context.params.id);
    return json({ code: 0, message: '删除成功' });
  } catch (err) {
    return json({ code: 1, message: '删除失败: ' + err.message }, 500);
  }
}
