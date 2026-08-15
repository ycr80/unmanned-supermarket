# 无人自助超市管理系统（Cloudflare Pages 版）

本目录是部署到 **Cloudflare Pages** 的版本（静态页面 + Pages Functions + D1 数据库），
**长期免费、无需服务器**。主项目（Express + MongoDB）在仓库根目录，本目录是它的云端演示版。

## 技术栈（云端版）

- Cloudflare Pages（全球边缘静态托管）
- Cloudflare Pages Functions（边缘函数，替代 Express 路由）
- Cloudflare D1（内置免费 SQLite，替代 MongoDB）
- 无状态会话：HMAC 签名 Cookie（边缘环境无内存会话）

## 部署步骤（只需 Cloudflare 一个账号，约 10 分钟）

### 1. 创建 Pages 项目

1. 登录 https://dash.cloudflare.com → 左侧 **Workers & Pages → Create → Pages → Connect to Git**
2. 选择仓库 `ycr80/unmanned-supermarket`，配置：
   - **Root directory（根目录）**: `cf-pages`
   - **Build command**: 留空
   - **Build output directory**: `public`
   - 点 **Save and Deploy**，等待构建完成

### 2. 创建并绑定 D1 数据库

1. 左侧 **D1 → Create database**，名称填 `unmanned-supermarket`
2. 回到 Pages 项目 → **Settings → Functions → D1 database bindings → Add binding**：
   - **Variable name**: `DB`
   - **D1 database**: 选择刚创建的 `unmanned-supermarket`

### 3. 配置环境变量

Pages 项目 → **Settings → Environment variables → Add**：

| 名称 | 值 |
| ---- | ---- |
| `AUTH_SECRET` | 任意长随机字符串（登录 Cookie 签名密钥，例如 `openssl rand -hex 32` 生成） |

### 4. 初始化数据

部署并绑定完成后，浏览器打开一次：

```
https://你的项目名.pages.dev/api/init
```

返回 `{"code":0,...}` 即建表并插入示例数据成功（幂等，可重复访问）。

### 5. 访问

- 首页：`https://你的项目名.pages.dev`（登录页）
- 账号：`admin / admin123`（管理员）、`staff / staff123`（员工）

## 本地预览

> 注意：仓库中**不包含 wrangler.toml**。若在 `cf-pages/` 放一个 wrangler.toml，
> Cloudflare Pages 构建时会自动执行 `npx wrangler deploy` 导致部署失败。
> 本地预览请直接用命令行参数传入绑定：

```bash
cd cf-pages
npx wrangler pages dev public --d1 DB=local --binding AUTH_SECRET=dev-secret-123456
# 打开 http://127.0.0.1:8788 ，先访问 http://127.0.0.1:8788/api/init
```

## 目录结构

```
cf-pages
├── public/                # 静态页面 + 资源（登录/看板/商品/进货/订单）
├── functions/             # Pages Functions（API 路由）
│   ├── _lib/auth.js       # HMAC Cookie 会话
│   ├── _lib/db.js         # D1 SQL 数据访问层（含建表与示例数据）
│   └── api/               # login/logout/me/stats/init + 商品/进货/订单 CRUD
└── schema.sql             # D1 表结构（/api/init 会自动执行）
```

## 说明

- 登录角色、库存预警（安全库存 20%）、进货入库加库存、下单扣库存、管理员权限等业务逻辑与主项目（Express + MongoDB 版）一致
- D1 免费额度：5GB 存储、500 万次读/天、10 万次写/天，个人演示绰绰有余
