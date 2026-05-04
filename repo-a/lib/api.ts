const API_URL = 'https://backend-production-740c.up.railway.app/api';

const getToken = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) return token;
  }
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  if (!tokenCookie) return '';
  return tokenCookie.trim().slice('token='.length);
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export const api = {
  // ── AUTH ────────────────────────────────────────────────────────────────────
  login: async (name: string, password: string) => {
    const res = await fetch(`${API_URL}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });
    return res.json();
  },
  loginAdmin: async (name: string, password: string) => {
    const res = await fetch(`${API_URL}/employees/login-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw { response: { data: err } };
    }
    return res.json();
  },

  // ── EMPLOYEES ───────────────────────────────────────────────────────────────
  getEmployees: async () => {
    const res = await fetch(`${API_URL}/employees`, { headers: authHeaders() });
    return res.json();
  },
  getEmployee: async (id: string) => {
    const res = await fetch(`${API_URL}/employees/${id}`, { headers: authHeaders() });
    return res.json();
  },
  createEmployee: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateEmployee: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteEmployee: async (id: string) => {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.json();
  },

  // ── SUPPLIERS ───────────────────────────────────────────────────────────────
  getSuppliers: async () => {
    const res = await fetch(`${API_URL}/suppliers`, { headers: authHeaders() });
    return res.json();
  },
  getSupplier: async (id: string) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, { headers: authHeaders() });
    return res.json();
  },
  createSupplier: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateSupplier: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteSupplier: async (id: string) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.json();
  },

  // ── CUSTOMERS ───────────────────────────────────────────────────────────────
  getCustomers: async () => {
    const res = await fetch(`${API_URL}/customers`, { headers: authHeaders() });
    return res.json();
  },
  getCustomer: async (id: string) => {
    const res = await fetch(`${API_URL}/customers/${id}`, { headers: authHeaders() });
    return res.json();
  },
  createCustomer: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateCustomer: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteCustomer: async (id: string) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.json();
  },

  // ── PRODUCTS ────────────────────────────────────────────────────────────────
  getProducts: async () => {
    const res = await fetch(`${API_URL}/products`);
    return res.json();
  },
  getProduct: async (id: string) => {
    const res = await fetch(`${API_URL}/products/${id}`);
    return res.json();
  },
  createProduct: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateProduct: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteProduct: async (id: string) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.json();
  },

  // ── DELIVERIES ──────────────────────────────────────────────────────────────
  getDeliveries: async () => {
    const res = await fetch(`${API_URL}/deliveries`, { headers: authHeaders() });
    return res.json();
  },
  getDelivery: async (id: string) => {
    const res = await fetch(`${API_URL}/deliveries/${id}`, { headers: authHeaders() });
    return res.json();
  },
  createDelivery: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/deliveries`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateDelivery: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/deliveries/${id}`, {
      method: 'PATCH',                                        // FIX: was PUT, backend uses PATCH
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  receiveDelivery: async (
    id: string,
    employeeId: string,
    items: { deliveryItemId: string; receivedQty: number }[]
  ) => {
    const res = await fetch(`${API_URL}/deliveries/${id}/receive`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ employeeId, items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to receive delivery');
    return data;
  },
  deleteDelivery: async (id: string) => {
    const res = await fetch(`${API_URL}/deliveries/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.json();
  },

  // ── PROMOS ──────────────────────────────────────────────────────────────────
  getActivePromos: async () => {
    const res = await fetch(`${API_URL}/promos/active`);
    if (!res.ok) throw new Error('Failed to fetch active promos');
    return res.json();
  },
  getPromos: async () => {
    const res = await fetch(`${API_URL}/promos`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch promos');
    return res.json();
  },
  getPromo: async (id: string) => {
    const res = await fetch(`${API_URL}/promos/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch promo');
    return res.json();
  },
  createPromo: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/promos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create promo');
    return res.json();
  },
  updatePromo: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/promos/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update promo');
    return res.json();
  },
  togglePromo: async (id: string) => {
    const res = await fetch(`${API_URL}/promos/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle promo');
    return res.json();
  },
  deletePromo: async (id: string) => {
    const res = await fetch(`${API_URL}/promos/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete promo');
    return res.json();
  },

  // ── ORDERS ──────────────────────────────────────────────────────────────────
  getActiveOrders: async () => {
    const res = await fetch(`${API_URL}/orders/active`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch active orders');
    return res.json();
  },
  getCompletedOrders: async () => {
    const res = await fetch(`${API_URL}/orders/completed`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch completed orders');
    return res.json();
  },
  updateOrderStatus: async (id: string, status: string) => {
    const res = await fetch(`${API_URL}/orders/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update order status');
    return res.json();
  },

  // ── RETURNS ─────────────────────────────────────────────────────────────────
  processReturn: async (
    orderId: string,
    items: { orderLineId: string; returnQty: number }[]
  ) => {
    const res = await fetch(`${API_URL}/orders/${orderId}/returns`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to process return');
    }
    return res.json();
  },
  getOrderReturns: async (orderId: string) => {
    const res = await fetch(`${API_URL}/orders/${orderId}/returns`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch return summary');
    return res.json();
  },

  // ── LOSS REPORTS ────────────────────────────────────────────────────────────
  fileLossReport: async (data: {
    productId:  string;
    quantity:   number;
    lossReason: 'EXPIRED' | 'DAMAGED' | 'THEFT' | 'COUNT_ERROR' | 'OTHER';
    reason?:    string;
  }) => {
    const res = await fetch(`${API_URL}/loss-reports`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to file loss report');
    }
    return res.json();
  },
  getLossReports: async (params?: {
    lossReason?: string;
    productId?:  string;
    from?:       string;
    to?:         string;
    page?:       number;
    limit?:      number;
  }) => {
    const query = new URLSearchParams();
    if (params?.lossReason) query.set('lossReason', params.lossReason);
    if (params?.productId)  query.set('productId',  params.productId);
    if (params?.from)       query.set('from',        params.from);
    if (params?.to)         query.set('to',          params.to);
    if (params?.page)       query.set('page',        String(params.page));
    if (params?.limit)      query.set('limit',       String(params.limit));
    const res = await fetch(`${API_URL}/loss-reports?${query.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch loss reports');
    return res.json();
  },
  getLossReportSummary: async (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to)   query.set('to',   params.to);
    const res = await fetch(`${API_URL}/loss-reports/summary?${query.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch loss report summary');
    return res.json();
  },

  // ── INVENTORY LOGS ──────────────────────────────────────────────────────────
  getInventoryLogs: async (params?: {
    page?:       number;
    limit?:      number;
    type?:       string;
    product?:    string;
    lossReason?: string;              // NEW: filter by loss reason
  }) => {
    const query = new URLSearchParams();
    if (params?.page)       query.set('page',       String(params.page));
    if (params?.limit)      query.set('limit',      String(params.limit));
    if (params?.type)       query.set('type',       params.type);
    if (params?.product)    query.set('product',    params.product);
    if (params?.lossReason) query.set('lossReason', params.lossReason);
    const res = await fetch(`${API_URL}/inventory/logs?${query.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch inventory logs');
    return res.json();
  },
};