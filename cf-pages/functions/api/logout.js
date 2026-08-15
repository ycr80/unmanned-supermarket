import { sessionCookie, json } from '../_lib/auth.js';

/** POST /api/logout  清除会话 Cookie */
export async function onRequestPost(context) {
  return new Response(JSON.stringify({ code: 0, message: '已退出' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': sessionCookie('', true),
    },
  });
}
