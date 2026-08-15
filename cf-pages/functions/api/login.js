import { createSessionToken, sessionCookie, json } from '../_lib/auth.js';
import * as db from '../_lib/db.js';

/**
 * POST /api/login  { username, password, role }
 * 成功：Set-Cookie session=xxx 并返回用户信息
 */
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const username = (body.username || '').trim();
    const password = body.password || '';
    const role = body.role === 'admin' ? 'admin' : 'staff';

    const user = await db.findUser(context.env.DB, username, password, role);
    if (!user) {
      return json({ code: 1, message: '账号或密码错误，或所选角色不匹配' }, 401);
    }

    const token = await createSessionToken(user, context.env.AUTH_SECRET);
    return new Response(JSON.stringify({
      code: 0,
      data: { id: user.id, username: user.username, name: user.name, role: user.role },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': sessionCookie(token),
      },
    });
  } catch (err) {
    return json({ code: 1, message: '登录失败: ' + err.message }, 500);
  }
}
