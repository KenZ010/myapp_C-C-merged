const API_URL = 'https://backend-production-da89.up.railway.app/api';

const getToken = () => {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  return tokenCookie ? tokenCookie.split('=')[1].trim() : '';
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

  // EMPLOYEES
  getEmployees: async () => {
    const res = await fetch(`${API_URL}/employees`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  getEmployee: async (id: string) => {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  createEmployee: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
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
  deleteEmployee: async (id: string) => {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },

  // SUPPLIERS
  getSuppliers: async () => {
    const res = await fetch(`${API_URL}/suppliers`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  getSupplier: async (id: string) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  createSupplier: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateSupplier: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteSupplier: async (id: string) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },

  // CUSTOMERS
  getCustomers: async () => {
    const res = await fetch(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  getCustomer: async (id: string) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  createCustomer: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
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
  deleteCustomer: async (id: string) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
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
  createProduct: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateProduct: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteProduct: async (id: string) => {
    const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // DELIVERIES (replaces purchase-orders)
  getDeliveries: async () => {
    const res = await fetch(`${API_URL}/deliveries`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  getDelivery: async (id: string) => {
    const res = await fetch(`${API_URL}/deliveries/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
  createDelivery: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/deliveries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateDelivery: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/deliveries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({ employeeId, items })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to receive delivery"); // 👈 IMPORTANT
  }

  return data;
},
  deleteDelivery: async (id: string) => {
    const res = await fetch(`${API_URL}/deliveries/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },
};