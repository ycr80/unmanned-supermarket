/**
 * 公共工具：API 请求封装、导航渲染、登录守卫
 * 所有页面（除登录页 index.html）需在 <body> 中放 <div id="nav"></div> 并调用 renderNav()
 */

const API = {
  async request(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* 非 JSON 响应 */ }
    if (res.status === 401) {
      location.href = 'index.html';
      throw new Error('未登录');
    }
    if (!res.ok || (data && data.code !== 0)) {
      throw new Error((data && data.message) || ('请求失败 ' + res.status));
    }
    return data ? data.data : null;
  },
  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body }); },
  put(path, body) { return this.request(path, { method: 'PUT', body }); },
  del(path) { return this.request(path, { method: 'DELETE' }); },
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmt(n) { return Number(n || 0).toFixed(2); }

/** 渲染顶部导航；当前登录用户存入 window.currentUser */
async function renderNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  try {
    const user = await API.get('/api/me');
    window.currentUser = user;
    const links = [
      { href: 'dashboard.html', key: 'dashboard', label: '首页统计' },
      { href: 'products.html', key: 'products', label: '商品管理' },
      { href: 'purchases.html', key: 'purchases', label: '进货管理' },
      { href: 'orders.html', key: 'orders', label: '订单管理' },
    ];
    nav.innerHTML = `
      <nav class="navbar navbar-inverse navbar-static-top">
        <div class="container">
          <div class="navbar-header">
            <a class="navbar-brand" href="dashboard.html">🛒 无人自助超市</a>
          </div>
          <ul class="nav navbar-nav">
            ${links.map((l) => `<li class="${window.PAGE === l.key ? 'active' : ''}"><a href="${l.href}">${l.label}</a></li>`).join('')}
          </ul>
          <ul class="nav navbar-nav navbar-right">
            <li><a><span class="label ${user.role === 'admin' ? 'label-warning' : 'label-info'}">${user.role === 'admin' ? '管理员' : '员工'}</span> ${esc(user.name)}</a></li>
            <li><a href="#" id="logoutBtn">退出</a></li>
          </ul>
        </div>
      </nav>`;
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
      e.preventDefault();
      await API.post('/api/logout');
      location.href = 'index.html';
    });
  } catch (e) {
    // 401 已由 request 内部跳转登录页
  }
}
