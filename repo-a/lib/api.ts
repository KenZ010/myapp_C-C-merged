const API_URL = 'https://backend-production-740c.up.railway.app/api';

  // ─── Cookie helpers ───────────────────────────────────────────────────────────
  function setCookie(name: string, value: string) {
    const isProduction = window.location.protocol === 'https:';
    document.cookie = `${name}=${value}; path=/; SameSite=Lax${isProduction ? '; Secure' : ''}`;
  }

  function deleteCookie(name: string) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  // ─── Token helpers ────────────────────────────────────────────────────────────
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

  function persistSession(token: string) {
    localStorage.setItem('token', token);
    setCookie('token', token);
    setCookie('active_token', token);
  }

  export function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    deleteCookie('token');
    deleteCookie('active_token');
  }

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
      const data = await res.json();
      if (data.token) persistSession(data.token);
      return data;
    },
    loginCustomer: async (name: string, password: string) => {
      const res = await fetch(`${API_URL}/customers/login-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (data.token) persistSession(data.token);
      return data;
    },
    loginAdmin: async (name: string, password: string) => {
      const res = await fetch(`${API_URL}/employees/login-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (data.token) persistSession(data.token);
      return data;
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
      if (!res.ok) throw new Error('Delete failed');
    },

    // ── CART ────────────────────────────────────────────────────────────────────
    getCart: async (customerId: string) => {
      const res = await fetch(`${API_URL}/cart/${customerId}`, { headers: authHeaders() });
      return res.json();
    },
    addCartItem: async (customerId: string, productId: string, quantity: number) => {
      const res = await fetch(`${API_URL}/cart/${customerId}/items`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ productId, quantity }),
      });
      return res.json();
    },
    updateCartItem: async (customerId: string, itemId: string, quantity: number) => {
      const res = await fetch(`${API_URL}/cart/${customerId}/items/${itemId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ quantity }),
      });
      return res.json();
    },
    removeCartItem: async (customerId: string, itemId: string) => {
      const res = await fetch(`${API_URL}/cart/${customerId}/items/${itemId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      return res.json();
    },
    clearCart: async (customerId: string) => {
      const res = await fetch(`${API_URL}/cart/${customerId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      return res.json();
    },

    // ── ORDERS ──────────────────────────────────────────────────────────────────
    placeOrder: async (payload: {
      customerId:    string;
      paymentMethod: 'cod' | 'gcash';
      gcashRef?:     string;
      note?:         string;
      items: {
        productId: string;
        quantity:  number;
        price:     number;
      }[];
    }) => {
      const res = await fetch(`${API_URL}/orders`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to place order');
      return data;
    },
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
    getCustomerOrders: async (customerId: string) => {
      const res = await fetch(`${API_URL}/orders/customer/${customerId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch customer orders');
      return res.json();
    },
    updateOrderStatus: async (orderId: string, status: string) => {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method:  'PATCH',
        headers: authHeaders(),
        body:    JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order status');
      return data;
    },

   // ── RETURNS ─────────────────────────────────────────────────────────────────
// CUSTOMER: submit a return request
submitReturnRequest: async (payload: {
  saleId:  string;
  reason:  'WRONG_ITEM_SENT' | 'DAMAGED' | 'EXPIRED' | 'OTHER';
  items:   { orderLineId: string; returnQty: number }[];
}) => {
  const res = await fetch(`${API_URL}/returns`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit return request');
  return data;
},

// EMPLOYEE: approve or reject a return request
reviewReturnRequest: async (
  returnRequestId: string,
  action:          'APPROVE' | 'REJECT',
  reviewNote?:     string,
) => {
  const res = await fetch(`${API_URL}/returns/${returnRequestId}`, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify({ action, reviewNote }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to review return request');
  return data;
},

// ALL STAFF + CUSTOMER: list return requests with optional filters
getReturnRequests: async (params?: {
  status?:      string;
  customerId?:  string;
  saleId?:      string;
  from?:        string;
  to?:          string;
  page?:        number;
  limit?:       number;
}) => {
  const query = new URLSearchParams();
  if (params?.status)     query.set('status',     params.status);
  if (params?.customerId) query.set('customerId', params.customerId);
  if (params?.saleId)     query.set('saleId',     params.saleId);
  if (params?.from)       query.set('from',       params.from);
  if (params?.to)         query.set('to',         params.to);
  if (params?.page)       query.set('page',       String(params.page));
  if (params?.limit)      query.set('limit',      String(params.limit));
  const res = await fetch(`${API_URL}/returns?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch return requests');
  return res.json();
},

// ALL STAFF + CUSTOMER: get a single return request by ID
getReturnRequestById: async (returnRequestId: string) => {
  const res = await fetch(`${API_URL}/returns/${returnRequestId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch return request');
  return res.json();
},

    // ── LOSS REPORTS ────────────────────────────────────────────────────────────
    // STOCK MANAGER: file a loss report
    fileLossReport: async (data: {
      productId:  string;
      quantity:   number;
      lossReason: 'EXPIRED' | 'DAMAGED' | 'THEFT' | 'COUNT_ERROR' | 'OTHER';
      reason?:    string;
    }) => {
      const res = await fetch(`${API_URL}/loss-reports`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to file loss report');
      return result;
    },
    // STOCK MANAGER: view loss reports with optional filters
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
    // STOCK MANAGER: summary grouped by loss reason
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
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    receiveDelivery: async (
      id: string,
      employeeId: string,
      items: { deliveryItemId: string; receivedQty: number; expiryDate: string }[] // ← added expiryDate
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

    // ── PROMOS ──────────────────────────────────────────────────────────────────
    getActivePromos: async () => {
      const res = await fetch(`${API_URL}/promos/active`);
      return res.json();
    },
    getPromos: async () => {
      const res = await fetch(`${API_URL}/promos`, { headers: authHeaders() });
      return res.json();
    },
    createPromo: async (data: Record<string, unknown>) => {
      const res = await fetch(`${API_URL}/promos`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updatePromo: async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`${API_URL}/promos/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    deletePromo: async (id: string) => {
      const res = await fetch(`${API_URL}/promos/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      return res.json();
    },
    togglePromo: async (id: string) => {
      const res = await fetch(`${API_URL}/promos/${id}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      return res.json();
    },

    // ── INVENTORY LOGS ──────────────────────────────────────────────────────────
    // STOCK MANAGER: view full inventory movement log
    getInventoryLogs: async (params?: {
      page?:       number;
      limit?:      number;
      type?:       string;
      product?:    string;
      lossReason?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.page)       query.set('page',       String(params.page));
      if (params?.limit)      query.set('limit',      String(params.limit));
      if (params?.type)       query.set('type',       params.type);
      if (params?.product)    query.set('product',    params.product);
      if (params?.lossReason) query.set('lossReason', params.lossReason);
      const res = await fetch(`${API_URL}/inventory-logs?${query.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch inventory logs');
      return res.json();
    },

  adjustStock: async (data: { productId: string; quantity: number; reason: string; employeeId: string }) => {
  const res = await fetch(`${API_URL}/products/${data.productId}/adjust-stock`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ quantity: data.quantity, reason: data.reason, employeeId: data.employeeId }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || 'Failed to adjust stock');
  return result;
},

// ── UPLOAD ──────────────────────────────────────────────────────────────────
uploadProductImage: async (productId: string, file: File) => {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_URL}/upload/product/${productId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}` }, // NO Content-Type — browser sets it with boundary
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Image upload failed");
  return data;
},
};