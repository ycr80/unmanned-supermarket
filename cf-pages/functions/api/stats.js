import { getSessionUser, json } from '../_lib/auth.js';
import * as db from '../_lib/db.js';

/** GET /api/stats  首页运营统计 */
export async function onRequestGet(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  try {
    const data = await db.stats(context.env.DB);
    return json({ code: 0, data });
  } catch (err) {
    return json({ code: 1, message: '统计失败: ' + err.message }, 500);
  }
}
