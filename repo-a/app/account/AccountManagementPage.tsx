"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", icon: "🏠" },
  { label: "Inventory Maintenance", icon: "🛒" },
  { label: "Supplier Maintenance", icon: "📊" },
  { label: "Sales Reports", icon: "🌐" },
  { label: "Transaction Logs", icon: "▦" },
  { label: "Product Management", icon: "🗒️" },
  { label: "Account Management", icon: "👤", active: true },
];

type Employee = {
  id: number; name: string; email: string; username: string;
  status: string; role: string; joinedDate: string; lastActive: string;
};

type Customer = {
  id: number; name: string; storeName: string; email: string;
  status: string; joinedDate: string; username: string; address: string;
};

const statusColors: Record<string, string> = {
  Active: "bg-green-500 text-white",
  Inactive: "bg-gray-400 text-white",
  Banned: "bg-red-500 text-white",
  Pending: "bg-indigo-900 text-white",
  Suspended: "bg-orange-400 text-white",
};

const initialEmployees: Employee[] = [
  { id: 1, name: "Ken Masilungan", email: "john.smith@gmail.com", username: "jonny77", status: "Active", role: "Inventory Manager", joinedDate: "March 12, 2023", lastActive: "1 minute ago" },
  { id: 2, name: "Olivia Bennett", email: "ollyben@gmail.com", username: "olly659", status: "Inactive", role: "Inventory", joinedDate: "June 27, 2022", lastActive: "1 month ago" },
  { id: 3, name: "Daniel Warren", email: "dwarren3@gmail.com", username: "dwarren3", status: "Banned", role: "Cashier", joinedDate: "January 8, 2024", lastActive: "4 days ago" },
  { id: 4, name: "Chloe Hayes", email: "chloehhye@gmail.com", username: "chloehh", status: "Pending", role: "Guest", joinedDate: "October 5, 2021", lastActive: "10 days ago" },
  { id: 5, name: "Marcus Reed", email: "reeds777@gmail.com", username: "reeds7", status: "Suspended", role: "Cashier", joinedDate: "February 19, 2023", lastActive: "3 months ago" },
];

const initialCustomers: Customer[] = [
  { id: 1, name: "Ray Teodoro", storeName: "Teodoro Store", email: "john.smith@gmail.com", status: "Active", joinedDate: "March 12, 2023", username: "jonny77", address: "Meow meow street" },
  { id: 2, name: "Olivia Bennett", storeName: "Olivas Store", email: "ollyben@gmail.com", status: "Inactive", joinedDate: "June 27, 2022", username: "olly659", address: "Meow meow street" },
  { id: 3, name: "Daniel Warren", storeName: "Minimili Store", email: "dwarren3@gmail.com", status: "Banned", joinedDate: "January 8, 2024", username: "dwarren3", address: "Meow meow street" },
  { id: 4, name: "Chloe Hayes", storeName: "Chlo Store", email: "chloehhye@gmail.com", status: "Pending", joinedDate: "October 5, 2021", username: "chloehh", address: "Meow meow street" },
  { id: 5, name: "Marcus Reed", storeName: "Marcus Store", email: "reeds777@gmail.com", status: "Suspended", joinedDate: "February 19, 2023", username: "reeds7", address: "Meow meow street" },
];

const emptyEmployee = { name: "", email: "", username: "", status: "Active", role: "Cashier", joinedDate: "", lastActive: "Just now" };
const emptyCustomer = { name: "", storeName: "", email: "", status: "Active", joinedDate: "", username: "", address: "" };
const ROWS_OPTIONS = [5, 10, 20];

// Pagination component OUTSIDE main component to fix ESLint error
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

  // Employee state
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [empSearch, setEmpSearch] = useState("");
  const [empPage, setEmpPage] = useState(1);
  const [empRows, setEmpRows] = useState(10);
  const [empSelected, setEmpSelected] = useState<number[]>([]);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState(emptyEmployee);
  const [empEditingId, setEmpEditingId] = useState<number | null>(null);
  const [showEmpDelete, setShowEmpDelete] = useState(false);

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [cusSearch, setCusSearch] = useState("");
  const [cusPage, setCusPage] = useState(1);
  const [cusRows, setCusRows] = useState(10);
  const [cusSelected, setCusSelected] = useState<number[]>([]);
  const [showCusModal, setShowCusModal] = useState(false);
  const [cusForm, setCusForm] = useState(emptyCustomer);
  const [cusEditingId, setCusEditingId] = useState<number | null>(null);
  const [showCusDelete, setShowCusDelete] = useState(false);

  const navigate = (label: string) => {
    if (label === "Dashboard") router.push("/dashboard");
    if (label === "Inventory Maintenance") router.push("/inventory");
    if (label === "Supplier Maintenance") router.push("/supplier");
    if (label === "Sales Reports") router.push("/sales");
    if (label === "Transaction Logs") router.push("/transaction");
    if (label === "Product Management") router.push("/product");
    if (label === "Account Management") router.push("/account");
    setShowMobileMenu(false);
  };

  // Employee helpers
  const filteredEmp = employees.filter((e) => e.name.toLowerCase().includes(empSearch.toLowerCase()) || e.email.toLowerCase().includes(empSearch.toLowerCase()));
  const totalEmpPages = Math.max(1, Math.ceil(filteredEmp.length / empRows));
  const paginatedEmp = filteredEmp.slice((empPage - 1) * empRows, empPage * empRows);
  const toggleEmp = (id: number) => setEmpSelected((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  const toggleAllEmp = () => empSelected.length === paginatedEmp.length ? setEmpSelected([]) : setEmpSelected(paginatedEmp.map((e) => e.id));
  const openAddEmp = () => { setEmpForm(emptyEmployee); setEmpEditingId(null); setShowEmpModal(true); };
  const openEditEmp = (emp: Employee) => { setEmpForm({ name: emp.name, email: emp.email, username: emp.username, status: emp.status, role: emp.role, joinedDate: emp.joinedDate, lastActive: emp.lastActive }); setEmpEditingId(emp.id); setShowEmpModal(true); };
  const saveEmp = () => {
    if (!empForm.name) { alert("Full name is required."); return; }
    if (empEditingId !== null) { setEmployees((p) => p.map((e) => e.id === empEditingId ? { ...e, ...empForm } : e)); }
    else { setEmployees((p) => [...p, { id: Date.now(), ...empForm }]); }
    setShowEmpModal(false);
  };
  const deleteEmp = () => { setEmployees((p) => p.filter((e) => !empSelected.includes(e.id))); setEmpSelected([]); setShowEmpDelete(false); };
  const exportEmp = () => {
    const headers = ["Full Name", "Email", "Username", "Status", "Role", "Joined Date", "Last Active"];
    const rows = employees.map((e) => [e.name, e.email, e.username, e.status, e.role, e.joinedDate, e.lastActive]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "employees.csv"; a.click(); URL.revokeObjectURL(url);
  };

  // Customer helpers
  const filteredCus = customers.filter((c) => c.name.toLowerCase().includes(cusSearch.toLowerCase()) || c.email.toLowerCase().includes(cusSearch.toLowerCase()));
  const totalCusPages = Math.max(1, Math.ceil(filteredCus.length / cusRows));
  const paginatedCus = filteredCus.slice((cusPage - 1) * cusRows, cusPage * cusRows);
  const toggleCus = (id: number) => setCusSelected((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  const toggleAllCus = () => cusSelected.length === paginatedCus.length ? setCusSelected([]) : setCusSelected(paginatedCus.map((c) => c.id));
  const openAddCus = () => { setCusForm(emptyCustomer); setCusEditingId(null); setShowCusModal(true); };
  const openEditCus = (cus: Customer) => { setCusForm({ name: cus.name, storeName: cus.storeName, email: cus.email, status: cus.status, joinedDate: cus.joinedDate, username: cus.username, address: cus.address }); setCusEditingId(cus.id); setShowCusModal(true); };
  const saveCus = () => {
    if (!cusForm.name) { alert("Full name is required."); return; }
    if (cusEditingId !== null) { setCustomers((p) => p.map((c) => c.id === cusEditingId ? { ...c, ...cusForm } : c)); }
    else { setCustomers((p) => [...p, { id: Date.now(), ...cusForm }]); }
    setShowCusModal(false);
  };
  const deleteCus = () => { setCustomers((p) => p.filter((c) => !cusSelected.includes(c.id))); setCusSelected([]); setShowCusDelete(false); };
  const exportCus = () => {
    const headers = ["Full Name", "Store Name", "Email", "Status", "Joined Date", "Username", "Address"];
    const rows = customers.map((c) => [c.name, c.storeName, c.email, c.status, c.joinedDate, c.username, c.address]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "customers.csv"; a.click(); URL.revokeObjectURL(url);
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
          <button
            className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
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
                  <button onClick={() => router.push("/")} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
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
                <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">👤 Role ▾</button>
                <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">🔖 Status ▾</button>
                <button className="hidden md:flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📅 Date ▾</button>
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
                    <th className="p-3 text-left">Full Name ↕</th><th className="p-3 text-left">Email ↕</th>
                    <th className="p-3 text-left">Username ↕</th><th className="p-3 text-left">Status ↕</th>
                    <th className="p-3 text-left">Role ↕</th><th className="p-3 text-left">Joined Date ↕</th>
                    <th className="p-3 text-left">Last Active ↕</th><th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmp.map((emp) => (
                    <tr key={emp.id} className={`border-b border-gray-100 hover:bg-gray-50 ${empSelected.includes(emp.id) ? "bg-indigo-50" : ""}`}>
                      <td className="p-3"><input type="checkbox" checked={empSelected.includes(emp.id)} onChange={() => toggleEmp(emp.id)} /></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`https://i.pravatar.cc/28?u=${emp.id}`} alt={emp.name} className="w-7 h-7 rounded-full" />
                          <span className="text-gray-700">{emp.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-gray-500">{emp.email}</td>
                      <td className="p-3 text-gray-500">{emp.username}</td>
                      <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[emp.status] || "bg-gray-200 text-gray-600"}`}>{emp.status}</span></td>
                      <td className="p-3 text-gray-700">{emp.role}</td>
                      <td className="p-3 text-gray-500">{emp.joinedDate}</td>
                      <td className="p-3 text-gray-500">{emp.lastActive}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditEmp(emp)} className="text-gray-400 hover:text-indigo-600">✏️</button>
                          <button onClick={() => { setEmpSelected([emp.id]); setShowEmpDelete(true); }} className="text-gray-400 hover:text-red-500">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">👤 Role ▾</button>
                <button className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">🔖 Status ▾</button>
                <button className="hidden md:flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">📅 Date ▾</button>
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
                    <th className="p-3 text-left">Full Name ↕</th><th className="p-3 text-left">Store Name ↕</th>
                    <th className="p-3 text-left">Email ↕</th><th className="p-3 text-left">Status ↕</th>
                    <th className="p-3 text-left">Joined Date ↕</th><th className="p-3 text-left">Username ↕</th>
                    <th className="p-3 text-left">Address ↕</th><th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCus.map((cus) => (
                    <tr key={cus.id} className={`border-b border-gray-100 hover:bg-gray-50 ${cusSelected.includes(cus.id) ? "bg-indigo-50" : ""}`}>
                      <td className="p-3"><input type="checkbox" checked={cusSelected.includes(cus.id)} onChange={() => toggleCus(cus.id)} /></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`https://i.pravatar.cc/28?u=c${cus.id}`} alt={cus.name} className="w-7 h-7 rounded-full" />
                          <span className="text-gray-700">{cus.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-gray-500">{cus.storeName}</td>
                      <td className="p-3 text-gray-500">{cus.email}</td>
                      <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[cus.status] || "bg-gray-200 text-gray-600"}`}>{cus.status}</span></td>
                      <td className="p-3 text-gray-500">{cus.joinedDate}</td>
                      <td className="p-3 text-gray-500">{cus.username}</td>
                      <td className="p-3 text-gray-500">{cus.address}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditCus(cus)} className="text-gray-400 hover:text-indigo-600">✏️</button>
                          <button onClick={() => { setCusSelected([cus.id]); setShowCusDelete(true); }} className="text-gray-400 hover:text-red-500">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Full Name</label><input value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Email</label><input value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Username</label><input value={empForm.username} onChange={(e) => setEmpForm({ ...empForm, username: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Role</label>
                <select value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {["Cashier", "Inventory Manager", "Inventory", "Guest"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Status</label>
                <select value={empForm.status} onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {["Active", "Inactive", "Banned", "Pending", "Suspended"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Joined Date</label><input value={empForm.joinedDate} onChange={(e) => setEmpForm({ ...empForm, joinedDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. March 12, 2023" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowEmpModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
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
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-medium text-gray-600">Full Name</label><input value={cusForm.name} onChange={(e) => setCusForm({ ...cusForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Store Name</label><input value={cusForm.storeName} onChange={(e) => setCusForm({ ...cusForm, storeName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Email</label><input value={cusForm.email} onChange={(e) => setCusForm({ ...cusForm, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Username</label><input value={cusForm.username} onChange={(e) => setCusForm({ ...cusForm, username: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Address</label><input value={cusForm.address} onChange={(e) => setCusForm({ ...cusForm, address: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" /></div>
              <div><label className="text-xs font-medium text-gray-600">Status</label>
                <select value={cusForm.status} onChange={(e) => setCusForm({ ...cusForm, status: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                  {["Active", "Inactive", "Banned", "Pending", "Suspended"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Joined Date</label><input value={cusForm.joinedDate} onChange={(e) => setCusForm({ ...cusForm, joinedDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" placeholder="e.g. March 12, 2023" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCusModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
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
    </div>
  );
}