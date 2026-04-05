"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊" },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦" },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤", active: true },
  { label: "Purchase Order", icon: "📋" },
  { label: "Promo Management", icon: "🎁", path: "/promo" },
];

type Employee = {
  id: string;
  name: string;
  phone: string;
  role: string;
  userStatus: string;
  createdAt: string;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  userStatus: string;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500 text-white",
  INACTIVE: "bg-gray-400 text-white",
  SUSPENDED: "bg-orange-400 text-white",
};

const emptyEmployee = { name: "", phone: "", password: "", role: "CASHIER", userStatus: "ACTIVE" };
const emptyCustomer = { name: "", email: "", phone: "", address: "", password: "", userStatus: "ACTIVE" };
const ROWS_OPTIONS = [5, 10, 20];

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(1)} disabled={page === 1} className="px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
      {Array.from({ length: Math.min(total, 5) }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onChange(p)} className={`px-3 py-1 rounded text-sm font-medium ${page === p ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{p}</button>
      ))}
      {total > 5 && <><span className="text-gray-400">...</span><button onClick={() => onChange(total)} className={`px-3 py-1 rounded text-sm font-medium ${page === total ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{total}</button></>}
      <button onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total} className="px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
      <button onClick={() => onChange(total)} disabled={page === total} className="px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
    </div>
  );
}

export default function AccountManagementPage() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Toast states
  const [empSuccess, setEmpSuccess] = useState("");
  const [empError, setEmpError] = useState("");
  const [cusSuccess, setCusSuccess] = useState("");
  const [cusError, setCusError] = useState("");

  // Employee state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [empSearch, setEmpSearch] = useState("");
  const [empPage, setEmpPage] = useState(1);
  const [empRows, setEmpRows] = useState(10);
  const [empSelected, setEmpSelected] = useState<string[]>([]);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState(emptyEmployee);
  const [empEditingId, setEmpEditingId] = useState<string | null>(null);
  const [showEmpDelete, setShowEmpDelete] = useState(false);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCus, setLoadingCus] = useState(true);
  const [cusSearch, setCusSearch] = useState("");
  const [cusPage, setCusPage] = useState(1);
  const [cusRows, setCusRows] = useState(10);
  const [cusSelected, setCusSelected] = useState<string[]>([]);
  const [showCusModal, setShowCusModal] = useState(false);
  const [cusForm, setCusForm] = useState(emptyCustomer);
  const [cusEditingId, setCusEditingId] = useState<string | null>(null);
  const [showCusDelete, setShowCusDelete] = useState(false);

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoadingEmp(true);
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoadingEmp(false);
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoadingCus(true);
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoadingCus(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchCustomers();
  }, []);

  const navigate = (label: string) => {
    if (label === "Dashboard") router.push("/dashboard");
    if (label === "Inventory Maintenance") router.push("/inventory");
    if (label === "Supplier Maintenance") router.push("/supplier");
    if (label === "Sales Reports") router.push("/sales");
    if (label === "Transaction Logs") router.push("/transaction");
    if (label === "Product Management") router.push("/product");
    if (label === "Account Management") router.push("/account");
    if (label === "Purchase Order") router.push("/purchase-order");
    if (label === "Promo Management") router.push("/promo");
    setShowMobileMenu(false);
  };

  // Employee helpers
  const filteredEmp = employees.filter((e) =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.phone.toLowerCase().includes(empSearch.toLowerCase())
  );
  const totalEmpPages = Math.max(1, Math.ceil(filteredEmp.length / empRows));
  const paginatedEmp = filteredEmp.slice((empPage - 1) * empRows, empPage * empRows);
  const toggleEmp = (id: string) => setEmpSelected((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  const toggleAllEmp = () => empSelected.length === paginatedEmp.length ? setEmpSelected([]) : setEmpSelected(paginatedEmp.map((e) => e.id));

  const openAddEmp = () => {
    setEmpForm(emptyEmployee);
    setEmpEditingId(null);
    setEmpError("");
    setShowEmpModal(true);
  };

  const openEditEmp = (emp: Employee) => {
    setEmpForm({ name: emp.name, phone: emp.phone, password: "", role: emp.role, userStatus: emp.userStatus });
    setEmpEditingId(emp.id);
    setEmpError("");
    setShowEmpModal(true);
  };

  const saveEmp = async () => {
    if (!empForm.name) { alert("Full name is required."); return; }
    try {
      if (empEditingId !== null) {
        const res = await api.updateEmployee(empEditingId, empForm);
        if (res.message && !res.id) {
          setEmpError(res.message || "Failed to update employee");
          return;
        }
        setEmpSuccess("Employee updated successfully!");
      } else {
        const res = await api.createEmployee(empForm);
        if (res.message && !res.id) {
          setEmpError(res.message || "Failed to create employee");
          return;
        }
        setEmpSuccess("Employee created successfully!");
      }
      await fetchEmployees();
      setShowEmpModal(false);
      setEmpSelected([]);
      setTimeout(() => setEmpSuccess(""), 3000);
    } catch (err) {
      setEmpError("Something went wrong. Please try again.");
    }
  };

  const deleteEmp = async () => {
    try {
      await Promise.all(empSelected.map((id) => api.deleteEmployee(id)));
      await fetchEmployees();
      setEmpSelected([]);
      setShowEmpDelete(false);
      setEmpSuccess("Employee deleted successfully!");
      setTimeout(() => setEmpSuccess(""), 3000);
    } catch (err) {
      setEmpError("Failed to delete employee.");
    }
  };

  const exportEmp = () => {
    const headers = ["ID", "Full Name", "Phone", "Role", "Status", "Created At"];
    const rows = employees.map((e) => [e.id, e.name, e.phone, e.role, e.userStatus, e.createdAt]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "employees.csv"; a.click(); URL.revokeObjectURL(url);
  };

  // Customer helpers
  const filteredCus = customers.filter((c) =>
    c.name.toLowerCase().includes(cusSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(cusSearch.toLowerCase()))
  );
  const totalCusPages = Math.max(1, Math.ceil(filteredCus.length / cusRows));
  const paginatedCus = filteredCus.slice((cusPage - 1) * cusRows, cusPage * cusRows);
  const toggleCus = (id: string) => setCusSelected((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  const toggleAllCus = () => cusSelected.length === paginatedCus.length ? setCusSelected([]) : setCusSelected(paginatedCus.map((c) => c.id));

  const openAddCus = () => {
    setCusForm(emptyCustomer);
    setCusEditingId(null);
    setCusError("");
    setShowCusModal(true);
  };

  const openEditCus = (cus: Customer) => {
    setCusForm({ name: cus.name, email: cus.email || "", phone: cus.phone || "", address: cus.address || "", password: "", userStatus: cus.userStatus });
    setCusEditingId(cus.id);
    setCusError("");
    setShowCusModal(true);
  };

  const saveCus = async () => {
    if (!cusForm.name) { alert("Full name is required."); return; }
    try {
      if (cusEditingId !== null) {
        const res = await api.updateCustomer(cusEditingId, cusForm);
        if (res.message && !res.id) {
          setCusError(res.message || "Failed to update customer");
          return;
        }
        setCusSuccess("Customer updated successfully!");
      } else {
        const res = await api.createCustomer(cusForm);
        if (res.message && !res.id) {
          setCusError(res.message || "Failed to create customer");
          return;
        }
        setCusSuccess("Customer created successfully!");
      }
      await fetchCustomers();
      setShowCusModal(false);
      setCusSelected([]);
      setTimeout(() => setCusSuccess(""), 3000);
    } catch (err) {
      setCusError("Something went wrong. Please try again.");
    }
  };

  const deleteCus = async () => {
    try {
      await Promise.all(cusSelected.map((id) => api.deleteCustomer(id)));
      await fetchCustomers();
      setCusSelected([]);
      setShowCusDelete(false);
      setCusSuccess("Customer deleted successfully!");
      setTimeout(() => setCusSuccess(""), 3000);
    } catch (err) {
      setCusError("Failed to delete customer.");
    }
  };

  const exportCus = () => {
    const headers = ["ID", "Full Name", "Email", "Phone", "Address", "Status", "Created At"];
    const rows = customers.map((c) => [c.id, c.name, c.email, c.phone, c.address, c.userStatus, c.createdAt]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "customers.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    document.cookie = 'token=; path=/; max-age=0';
    localStorage.removeItem('employee');
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10"><p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p></div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <div key={item.label} onClick={() => navigate(item.label)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${item.active ? "text-indigo-700 font-semibold" : "text-gray-400 hover:text-gray-600"}`}>
              <div className="relative flex items-center gap-2 w-full">
                <span>{item.icon}</span><span>{item.label}</span>
                {item.active && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Account Management</h1>
          <div className="flex items-center gap-2">
            <div className="relative"><span className="text-xl">🔔</span><div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" /></div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                <div className="hidden md:block text-left"><p className="text-sm font-semibold text-gray-800">Ray Teodoro</p><p className="text-xs text-green-500">Admin</p></div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
            {navItems.map((item) => (
              <div key={item.label} onClick={() => navigate(item.label)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${item.active ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                <span>{item.icon}</span><span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 p-3 md:p-4 bg-green-50 flex flex-col gap-4">

          {/* EMPLOYEE LIST */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-gray-800">Employee List</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40">
                  <span className="text-gray-400 text-sm">🔍</span>
                  <input type="text" placeholder="Search" value={empSearch} onChange={(e) => { setEmpSearch(e.target.value); setEmpPage(1); }} className="outline-none text-sm text-gray-700 w-full" />
                </div>
                <button onClick={exportEmp} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📤 Export</button>
                {empSelected.length > 0 && <button onClick={() => setShowEmpDelete(true)} className="flex items-center gap-1 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>}
                <button onClick={openAddEmp} className="flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-sm text-white hover:bg-gray-700">+ Add Employee</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left w-8"><input type="checkbox" onChange={toggleAllEmp} checked={empSelected.length === paginatedEmp.length && paginatedEmp.length > 0} /></th>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Full Name</th>
                    <th className="p-3 text-left">Phone</th>
                    <th className="p-3 text-left">Role</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Created At</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingEmp ? (
                    <tr><td colSpan={8} className="p-6 text-center text-gray-400">Loading employees...</td></tr>
                  ) : paginatedEmp.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center text-gray-400">No employees found.</td></tr>
                  ) : (
                    paginatedEmp.map((emp) => (
                      <tr key={emp.id} className={`border-b border-gray-100 hover:bg-gray-50 ${empSelected.includes(emp.id) ? "bg-indigo-50" : ""}`}>
                        <td className="p-3"><input type="checkbox" checked={empSelected.includes(emp.id)} onChange={() => toggleEmp(emp.id)} /></td>
                        <td className="p-3 text-gray-500 text-xs">{emp.id}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-700">{emp.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-500">{emp.phone}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.role === "CASHIER" ? "bg-blue-100 text-blue-600" : emp.role === "STOCK_MANAGER" ? "bg-purple-100 text-purple-600" : "bg-red-100 text-red-600"}`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[emp.userStatus] || "bg-gray-200 text-gray-600"}`}>
                            {emp.userStatus}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">{new Date(emp.createdAt).toLocaleDateString()}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditEmp(emp)} className="text-gray-400 hover:text-indigo-600">✏️</button>
                            <button onClick={() => { setEmpSelected([emp.id]); setShowEmpDelete(true); }} className="text-gray-400 hover:text-red-500">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                Rows per page
                <select value={empRows} onChange={(e) => { setEmpRows(Number(e.target.value)); setEmpPage(1); }} className="border border-gray-200 rounded px-2 py-1 text-sm outline-none">
                  {ROWS_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <span>of {filteredEmp.length} rows</span>
              </div>
              <Pagination page={empPage} total={totalEmpPages} onChange={setEmpPage} />
            </div>
          </div>

          {/* CUSTOMER LIST */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-gray-800">Customer List</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40">
                  <span className="text-gray-400 text-sm">🔍</span>
                  <input type="text" placeholder="Search" value={cusSearch} onChange={(e) => { setCusSearch(e.target.value); setCusPage(1); }} className="outline-none text-sm text-gray-700 w-full" />
                </div>
                <button onClick={exportCus} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📤 Export</button>
                {cusSelected.length > 0 && <button onClick={() => setShowCusDelete(true)} className="flex items-center gap-1 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>}
                <button onClick={openAddCus} className="flex items-center gap-1 bg-gray-900 rounded-lg px-3 py-2 text-sm text-white hover:bg-gray-700">+ Add Customer</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left w-8"><input type="checkbox" onChange={toggleAllCus} checked={cusSelected.length === paginatedCus.length && paginatedCus.length > 0} /></th>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Full Name</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Phone</th>
                    <th className="p-3 text-left">Address</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Created At</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCus ? (
                    <tr><td colSpan={9} className="p-6 text-center text-gray-400">Loading customers...</td></tr>
                  ) : paginatedCus.length === 0 ? (
                    <tr><td colSpan={9} className="p-6 text-center text-gray-400">No customers found.</td></tr>
                  ) : (
                    paginatedCus.map((cus) => (
                      <tr key={cus.id} className={`border-b border-gray-100 hover:bg-gray-50 ${cusSelected.includes(cus.id) ? "bg-indigo-50" : ""}`}>
                        <td className="p-3"><input type="checkbox" checked={cusSelected.includes(cus.id)} onChange={() => toggleCus(cus.id)} /></td>
                        <td className="p-3 text-gray-500 text-xs">{cus.id}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                              {cus.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-700">{cus.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-500">{cus.email ?? "-"}</td>
                        <td className="p-3 text-gray-500">{cus.phone ?? "-"}</td>
                        <td className="p-3 text-gray-500">{cus.address ?? "-"}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[cus.userStatus] || "bg-gray-200 text-gray-600"}`}>
                            {cus.userStatus}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">{new Date(cus.createdAt).toLocaleDateString()}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditCus(cus)} className="text-gray-400 hover:text-indigo-600">✏️</button>
                            <button onClick={() => { setCusSelected([cus.id]); setShowCusDelete(true); }} className="text-gray-400 hover:text-red-500">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                Rows per page
                <select value={cusRows} onChange={(e) => { setCusRows(Number(e.target.value)); setCusPage(1); }} className="border border-gray-200 rounded px-2 py-1 text-sm outline-none">
                  {ROWS_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <span>of {filteredCus.length} rows</span>
              </div>
              <Pagination page={cusPage} total={totalCusPages} onChange={setCusPage} />
            </div>
          </div>
        </div>
      </main>

      {/* EMPLOYEE MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{empEditingId !== null ? "Edit Employee" : "Add New Employee"}</h2>

            {/* Error message inside modal */}
            {empError && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{empError}</span>
                <button onClick={() => setEmpError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Full Name</label><input value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Phone</label><input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              {empEditingId === null && (
                <div><label className="text-xs font-medium text-gray-600">Password <span className="text-red-400">(min 8 characters)</span></label>
                  <input type="password" value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                </div>
              )}
              <div><label className="text-xs font-medium text-gray-600">Role</label>
                <select value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="CASHIER">CASHIER</option>
                  <option value="STOCK_MANAGER">STOCK_MANAGER</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Status</label>
                <select value={empForm.userStatus} onChange={(e) => setEmpForm({ ...empForm, userStatus: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowEmpModal(false); setEmpError(""); }} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveEmp} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">{empEditingId !== null ? "Save Changes" : "Add Employee"}</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER MODAL */}
      {showCusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{cusEditingId !== null ? "Edit Customer" : "Add New Customer"}</h2>

            {/* Error message inside modal */}
            {cusError && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{cusError}</span>
                <button onClick={() => setCusError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Full Name</label><input value={cusForm.name} onChange={(e) => setCusForm({ ...cusForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Email</label><input value={cusForm.email} onChange={(e) => setCusForm({ ...cusForm, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Phone</label><input value={cusForm.phone} onChange={(e) => setCusForm({ ...cusForm, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Address</label><input value={cusForm.address} onChange={(e) => setCusForm({ ...cusForm, address: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              {cusEditingId === null && (
                <div><label className="text-xs font-medium text-gray-600">Password <span className="text-red-400">(min 8 characters)</span></label>
                  <input type="password" value={cusForm.password} onChange={(e) => setCusForm({ ...cusForm, password: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
                </div>
              )}
              <div><label className="text-xs font-medium text-gray-600">Status</label>
                <select value={cusForm.userStatus} onChange={(e) => setCusForm({ ...cusForm, userStatus: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowCusModal(false); setCusError(""); }} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveCus} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">{cusEditingId !== null ? "Save Changes" : "Add Customer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE DELETE */}
      {showEmpDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Employee?</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete {empSelected.length} employee(s)?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEmpDelete(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={deleteEmp} className="flex-1 bg-red-500 rounded-lg py-2 text-sm text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER DELETE */}
      {showCusDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Customer?</h2>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to delete {cusSelected.length} customer(s)?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCusDelete(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={deleteCus} className="flex-1 bg-red-500 rounded-lg py-2 text-sm text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SUCCESS TOASTS */}
      {empSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✅</span>
          <span className="text-sm font-medium">{empSuccess}</span>
        </div>
      )}
      {cusSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✅</span>
          <span className="text-sm font-medium">{cusSuccess}</span>
        </div>
      )}

      {/* ❌ ERROR TOASTS */}
      {empError && !showEmpModal && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>❌</span>
          <span className="text-sm font-medium">{empError}</span>
          <button onClick={() => setEmpError("")} className="ml-2 hover:text-red-200">✕</button>
        </div>
      )}
      {cusError && !showCusModal && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>❌</span>
          <span className="text-sm font-medium">{cusError}</span>
          <button onClick={() => setCusError("")} className="ml-2 hover:text-red-200">✕</button>
        </div>
      )}
    </div>
  );
}