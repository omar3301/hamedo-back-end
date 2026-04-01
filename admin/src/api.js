const BASE = '/api';
const getToken = () => localStorage.getItem('hs_admin_token');
const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});
const handle = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
};

export const api = {
  // Auth
  login: (email, password) =>
    fetch(`${BASE}/auth/login`, { method:'POST', headers:headers(), body:JSON.stringify({email,password}) }).then(handle),
  me: () =>
    fetch(`${BASE}/auth/me`, { headers:headers() }).then(handle),

  // Orders
  getOrders: (params={}) =>
    fetch(`${BASE}/orders?${new URLSearchParams(params)}`, { headers:headers() }).then(handle),
  createOrder: (data) =>
    fetch(`${BASE}/orders`, { method:'POST', headers:headers(), body:JSON.stringify(data) }).then(handle),
  updateOrder: (id, data) =>
    fetch(`${BASE}/orders/${id}`, { method:'PATCH', headers:headers(), body:JSON.stringify(data) }).then(handle),
  deleteOrder: (id) =>
    fetch(`${BASE}/orders/${id}`, { method:'DELETE', headers:headers() }).then(handle),
  getStats: () =>
    fetch(`${BASE}/orders/meta/stats`, { headers:headers() }).then(handle),

  // Products
  getProducts: (params={}) =>
    fetch(`${BASE}/products/admin/all?${new URLSearchParams(params)}`, { headers:headers() })
      .then(handle)
      .then(d => d.products || d),   // unwrap paginated response → plain array
  getProduct: (id) =>
    fetch(`${BASE}/products/admin/${id}`, { headers:headers() }).then(handle),
  createProduct: (data) =>
    fetch(`${BASE}/products`, { method:'POST', headers:headers(), body:JSON.stringify(data) }).then(handle),
  updateProduct: (id, data) =>
    fetch(`${BASE}/products/${id}`, { method:'PUT', headers:headers(), body:JSON.stringify(data) }).then(handle),
  deleteProduct: (id) =>
    fetch(`${BASE}/products/${id}`, { method:'DELETE', headers:headers() }).then(handle),
  toggleProduct: (id) =>
    fetch(`${BASE}/products/${id}/toggle`, { method:'PATCH', headers:headers() }).then(handle),
  reorderProducts: (items) =>
    fetch(`${BASE}/products/reorder`, { method:'PATCH', headers:headers(), body:JSON.stringify(items) }).then(handle),

  // Visits
  getVisitStats: () =>
    fetch(`${BASE}/visits/stats`, { headers:headers() }).then(handle),

  // Settings
  getAdminSettings: () =>
    fetch(`${BASE}/settings/admin`, { headers:headers() }).then(handle),
  updateSetting: (key, value) =>
    fetch(`${BASE}/settings/${key}`, { method:'PUT', headers:headers(), body:JSON.stringify({value}) }).then(handle),
};