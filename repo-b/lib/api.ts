const API_URL = 'https://backend-production-da89.up.railway.app/api';

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

export const api = {
  // AUTH
  login: async (name: string, password: string) => {
    const res = await fetch(`${API_URL}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    return res.json();
  },
  loginCustomer: async (name: string, password: string) => {
    const res = await fetch(`${API_URL}/customers/login-customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    return res.json();
  },

  // EMPLOYEES
  getEmployee: async (id: string) => {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  updateEmployee: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // SUPPLIERS
  getSupplier: async (id: string) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },

  // CUSTOMERS
  getCustomer: async (id: string) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  updateCustomer: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // PRODUCTS
  getProducts: async () => {
    const res = await fetch(`${API_URL}/products`);
    return res.json();
  },
  getProduct: async (id: string) => {
    const res = await fetch(`${API_URL}/products/${id}`);
    return res.json();
  },

  // CART
  getCart: async (customerId: string) => {
    const res = await fetch(`${API_URL}/cart/${customerId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  addCartItem: async (customerId: string, productId: string, quantity: number) => {
    const res = await fetch(`${API_URL}/cart/${customerId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ productId, quantity })
    });
    return res.json();
  },
  updateCartItem: async (customerId: string, itemId: string, quantity: number) => {
    const res = await fetch(`${API_URL}/cart/${customerId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ quantity })
    });
    return res.json();
  },
  removeCartItem: async (customerId: string, itemId: string) => {
    const res = await fetch(`${API_URL}/cart/${customerId}/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  clearCart: async (customerId: string) => {
    const res = await fetch(`${API_URL}/cart/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
};