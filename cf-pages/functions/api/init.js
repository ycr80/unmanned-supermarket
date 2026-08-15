import { json } from '../_lib/auth.js';
import * as db from '../_lib/db.js';

/**
 * GET /api/init
 * 初始化数据库（建表 + 示例数据，幂等）。
 * 部署完成后在浏览器打开一次本地址即可，例如 https://xxx.pages.dev/api/init
 */
export async function onRequestGet(context) {
  try {
    const result = await db.init(context.env.DB);
    return json({ code: 0, data: result });
  } catch (err) {
    return json({ code: 1, message: '初始化失败: ' + err.message }, 500);
  }
}
