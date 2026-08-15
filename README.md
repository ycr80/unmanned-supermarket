# 无人自助超市管理系统（Unmanned Supermarket Management System）

基于 **Node.js + Express + MongoDB** 的无人零售管理系统，完整覆盖"商品管理 → 库存监控 → 进货补货 → 顾客选购 → 订单支付"业务闭环，软件工程综合实践项目。

## 功能特性

- 🔐 **分角色登录鉴权**：管理员 / 员工两种角色（`express-session` 会话），删除商品、确认进货入库等敏感操作仅管理员可执行
- 📦 **商品管理**：商品的增删改查、按名称/分类/供应商搜索，支持生产日期、过期时间、供应商、计件方式等字段
- ⚠️ **库存预警**：安全库存阈值（默认取初始库存 20%），库存低于预警线自动标记并展示在首页统计
- 📥 **进货管理闭环**：新建进货单 → 供应商发货 → 管理员确认收货自动入库增加库存，与"库存低于安全线自动补货"联动
- 🛒 **订单/选购**：顾客选购商品下单，服务端按数据库售价计算总价、校验库存并**自动扣减库存**，防止超卖
- 📊 **首页统计看板**：商品总数、库存预警数、今日订单、销售总额、最近订单
- 🔌 **JSON API**：`/api/products`、`/api/orders`、`/api/stats`

## 技术栈

| 分层 | 技术 |
| ---- | ---- |
| 后端 | Node.js + Express 4（MVC） |
| 数据库 | MongoDB + Mongoose（ODM） |
| 会话 | express-session |
| 前端 | EJS 模板 + Bootstrap 3 + jQuery + bootstrap-datepicker |

## 快速开始

### 1. 环境要求

- Node.js ≥ 16.20
- MongoDB（本机 27017 端口，或通过环境变量 `DB_URI` 指定连接串）

### 2. 启动 MongoDB

```bash
mongod --dbpath ./mongodata --port 27017
```

### 3. 安装依赖、插入示例数据并启动

```bash
npm install
npm run seed     # 插入示例数据（账号见下方）
npm start        # 访问 http://localhost:3000
```

### 4. 默认账号

| 角色 | 账号 | 密码 |
| ---- | ---- | ---- |
| 管理员 | admin | admin123 |
| 员工 | staff | staff123 |

## 目录结构

```
unmanned-supermarket
├── app.js               # Express 应用入口（中间件、会话、路由、错误处理）
├── bin/www              # HTTP 服务启动脚本
├── config/db.js         # MongoDB 连接配置
├── models/              # Mongoose 模型：User / Product / PurchaseOrder / Order
├── routes/              # 业务路由：登录统计 / 商品 / 进货 / 订单 / JSON API
├── views/               # EJS 模板（登录、统计看板、各模块列表与表单）
├── public/              # 静态资源（bootstrap、jquery、datepicker、app.css）
└── scripts/seed.js      # 示例数据脚本
```

## 接口说明

| 方法 | 路径 | 说明 | 权限 |
| ---- | ---- | ---- | ---- |
| GET/POST | `/login`、`/logout` | 登录 / 退出 | - |
| GET | `/dashboard` | 首页统计看板 | 登录 |
| GET/POST | `/products`、`/products/create` | 商品列表 / 新增 | 登录 |
| GET/POST | `/products/:id/edit` | 编辑商品 | 登录 |
| GET | `/products/:id/delete` | 删除商品 | 管理员 |
| GET/POST | `/purchases`、`/purchases/create` | 进货单列表 / 新建 | 登录 |
| GET | `/purchases/:id/receive` | 确认收货入库（增加库存） | 管理员 |
| GET | `/purchases/:id/delete` | 删除进货单 | 管理员 |
| GET/POST | `/orders`、`/orders/create` | 订单列表 / 选购下单（扣库存） | 登录 |
| GET | `/orders/:id/delete` | 删除订单 | 管理员 |
| GET | `/api/products`、`/api/orders`、`/api/stats` | JSON 数据接口 | 登录 |
| POST | `/api/orders` | JSON 下单 | 登录 |

## 部署上线（免费方案：Render + MongoDB Atlas，约 10 分钟）

> 代码已内置 `render.yaml`（Render Blueprint），连接 GitHub 仓库即可自动部署。

**1. MongoDB Atlas（免费云数据库）**
- 注册 https://www.mongodb.com/cloud/atlas → 创建免费 M0 集群
- Database Access 创建数据库用户；Network Access 允许 `0.0.0.0/0`
- 获取连接串（格式 `mongodb+srv://用户:密码@cluster0.xxxx.mongodb.net/supermarket`）

**2. Render（免费托管）**
- 注册 https://render.com → **New → Blueprint**
- 选择本仓库 `ycr80/unmanned-supermarket`（`render.yaml` 已配置好构建/启动/种子数据/健康检查）
- 按提示填写环境变量：`DB_URI`（上面的连接串）、`SESSION_SECRET`（任意长随机串）

**3. 访问**
- 构建完成后打开 `https://unmanned-supermarket.onrender.com`（免费实例闲置 15 分钟会休眠，首次访问冷启动约 1 分钟）
- 登录：`admin / admin123`

## 在线演示（Cloudflare Pages 版）

`cf-pages/` 目录是部署到 **Cloudflare Pages** 的版本（静态页面 + Pages Functions + D1 数据库），
**长期免费、无需服务器**，业务逻辑与主项目一致。部署步骤见 [`cf-pages/README.md`](cf-pages/README.md)：

1. Cloudflare → Pages → Connect to Git → 选择本仓库，Root directory 填 `cf-pages`，Build 留空，输出目录 `public`
2. 创建 D1 数据库并绑定（变量名 `DB`），设置环境变量 `AUTH_SECRET`
3. 部署后访问一次 `https://你的项目名.pages.dev/api/init` 初始化数据
4. 访问 `https://你的项目名.pages.dev`，账号 `admin / admin123`

## 说明

- 密码为课程演示项目的明文存储，生产环境请使用 bcrypt 等哈希方案
- 会话使用 express-session 默认内存存储，多实例部署请改用 MongoDB/Redis 存储

## License

MIT
