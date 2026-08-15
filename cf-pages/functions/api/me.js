import { getSessionUser, json } from '../_lib/auth.js';

/** GET /api/me  返回当前登录用户（未登录返回 401） */
export async function onRequestGet(context) {
  const user = await getSessionUser(context.request, context.env);
  if (!user) return json({ code: 1, message: '未登录' }, 401);
  return json({ code: 0, data: user });
}
