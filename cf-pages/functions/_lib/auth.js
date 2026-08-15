/**
 * 无状态会话（HMAC 签名 Cookie），适配 Cloudflare Pages 边缘环境
 * 说明：Pages Functions 无持久内存，不能用 express-session 这类服务端会话，
 * 这里把用户信息签名后写入 Cookie，服务端每次校验签名。
 */

async function hmacSign(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** 生成会话 Token */
export async function createSessionToken(user, secret) {
  const payload = b64urlEncode(JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 小时
  }));
  const sig = await hmacSign(payload, secret);
  return payload + '.' + sig;
}

/** 校验会话 Token，返回用户信息或 null */
export async function verifySessionToken(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expect = await hmacSign(payload, secret);
  if (expect !== sig) return null;
  try {
    const data = JSON.parse(b64urlDecode(payload));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/** 从请求 Cookie 中读取当前登录用户 */
export async function getSessionUser(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!m) return null;
  return await verifySessionToken(decodeURIComponent(m[1]), env.AUTH_SECRET);
}

/** 生成 Set-Cookie 响应头 */
export function sessionCookie(token, clear = false) {
  const value = clear ? '' : encodeURIComponent(token);
  const maxAge = clear ? 0 : 60 * 60 * 12;
  return `session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
