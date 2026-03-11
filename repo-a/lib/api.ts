const API_URL = 'http://localhost:5000/api';

export const api = {
  // ==================
  // AUTH
  // ==================
  login: async (name: string, password: string) => {
    const res = await fetch(`${API_URL}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    return res.json();
  },

  // ==================
  // EMPLOYEES
  // ==================
  getEmployees: async (token: string) => {
    const res = await fetch(`${API_URL}/employees`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },

  createEmployee: async (data: any, token: string) => {
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ==================
  // SUPPLIERS
  // ==================
  getSuppliers: async () => {
    const res = await fetch(`${API_URL}/suppliers`);
    return res.json();
  },

  createSupplier: async (data: any) => {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateSupplier: async (code: string, data: any) => {
    const res = await fetch(`${API_URL}/suppliers/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteSupplier: async (code: string) => {
    const res = await fetch(`${API_URL}/suppliers/${code}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  getSupplier: async (code: string) => {
    const res = await fetch(`${API_URL}/suppliers/${code}`);
    return res.json();
  },
};