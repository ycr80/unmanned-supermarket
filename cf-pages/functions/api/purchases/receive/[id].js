import { getSessionUser, json } from '../../../_lib/auth.js';
import * as db from '../../../_lib/db.js';

/** POST /api/purchases/receive/:id  确认收货入库（库存增加，仅管理员） */
export async function onRequestPost(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  if (user.role !== 'admin') return json({ code: 1, message: '403 无权限：仅管理员可执行该操作' }, 403);
  try {
    const result = await db.receivePurchase(context.env.DB, context.params.id);
    if (result.error) return json({ code: 1, message: result.error }, 400);
    return json({ code: 0, message: '已入库，库存已增加' });
  } catch (err) {
    return json({ code: 1, message: '操作失败: ' + err.message }, 500);
  }
}
