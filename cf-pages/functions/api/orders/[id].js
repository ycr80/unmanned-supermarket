import { getSessionUser, json } from '../../_lib/auth.js';
import * as db from '../../_lib/db.js';

/** DELETE /api/orders/:id  删除订单（仅管理员） */
export async function onRequestDelete(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  if (user.role !== 'admin') return json({ code: 1, message: '403 无权限：仅管理员可执行该操作' }, 403);
  try {
    await db.deleteOrder(context.env.DB, context.params.id);
    return json({ code: 0, message: '删除成功' });
  } catch (err) {
    return json({ code: 1, message: '删除失败: ' + err.message }, 500);
  }
}
