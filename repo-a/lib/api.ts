const API_URL = 'http://localhost:5000/api';

// ✅ Get token from cookie automatically
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
  getEmployees: async () => {  // ← removed token parameter
    const res = await fetch(`${API_URL}/employees`, {
      headers: { Authorization: `Bearer ${getToken()}` }  // ← uses getToken()
    });
    return res.json();
  },

  getEmployee: async (id: string) => {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },

  createEmployee: async (data: any) => {  // ← removed token parameter
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateEmployee: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
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

  createSupplier: async (data: any) => {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateSupplier: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
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

  createCustomer: async (data: any) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateCustomer: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
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
};