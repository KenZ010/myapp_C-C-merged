"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, ShoppingCart, Users, BarChart3, 
  FileText, Package, User, ClipboardList, RotateCcw, AlertTriangle, Gift, Bell
} from "lucide-react";

type Employee = {
  id: string;
  name: string;
  role: string;
  userStatus: string;
  phone: string;
};

type Supplier = {
  id: string;
  supplierName: string;
  contactNo: string;
  lastOrdered: number | null;
  status: string;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userStatus: string;
};

type Product = {
  id: string;
  productName: string;
  price: number;
  image: string | null;
  category: string;
};

type OrderLine = {
  productName: string; category: string;
  quantity: number; price: number; subtotal: number;
};

type Transaction = {
  id: string; customer: string; customerId: string | null;
  cashier: string; total: number; paymentMethod: string;
  createdAt: string; orderLines: OrderLine[];
};

function normalizeTransaction(o: Record<string, unknown>): Transaction {
  const customer = o.customer as Record<string, unknown> | null;
  const employee = o.employee as Record<string, unknown> | null;
  const payment  = o.payment  as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];
  return {
    id:            String(o.id ?? ""),
    customer:      customer ? String(customer.name ?? "Guest") : "Walk-in",
    customerId:    customer ? String(customer.id ?? "") : null,
    cashier:       employee ? String(employee.name ?? "—") : "—",
    total:         Number(o.totalAmount ?? 0),
    paymentMethod: payment ? String(payment.method ?? "CASH") : "CASH",
    createdAt:     String(o.createdAt ?? o.saleDate ?? ""),
    orderLines:    rawLines.map(l => {
      const product = l.product as Record<string, unknown> | null;
      return {
        productName: product ? String(product.productName ?? "Item") : "Item",
        category:    product ? String(product.category ?? "")     : "",
        quantity:    Number(l.quantity ?? 0),
        price:       Number(l.price    ?? 0),
        subtotal:    Number(l.subtotal ?? 0),
      };
    }),
  };
}

function getPeriodKey(dateStr: string): "Today" | "Week" | "Month" | "Older" {
  if (!dateStr) return "Older";
  const date = new Date(dateStr);
  const now  = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const days = (now.getTime() - date.getTime()) / 86400000;
  if (days <= 7)  return "Week";
  if (days <= 30) return "Month";
  return "Older";
}

const inventoryData = [
  { name: "Soft Drinks", value: 47, color: "#60a5fa" },
  { name: "Beer", value: 27, color: "#7c3aed" },
  { name: "Energy Drink", value: 13, color: "#f59e0b" },
  { name: "Water", value: 7, color: "#f97316" },
  { name: "Juice", value: 6, color: "#22c55e" },
];

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Inventory Maintenance", icon: ShoppingCart, path: "/inventory" },
  { label: "Supplier Maintenance", icon: Users, path: "/supplier" },
  { label: "Sales Reports", icon: BarChart3, path: "/sales" },
  { label: "Transaction Logs", icon: FileText, path: "/transaction" },
  { label: "Product Management", icon: Package, path: "/product" },
  { label: "Account Management", icon: User, path: "/account" },
  { label: "Purchase Order", icon: ClipboardList, path: "/purchase-order" },
  { label: "Loss Report", icon: AlertTriangle, path: "/loss-report" },
  { label: "Promo Management", icon: Gift, path: "/promo" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: any) => {
  const { name, value, x, y, cx } = props;
  return (
    <text x={x} y={y} fill="#555" fontSize={11} textAnchor={x > cx ? "start" : "end"}>
      {`${name}: ${value}%`}
    </text>
  );
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("Daily");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);


  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // ✅ Fix hydration error — start null, only set on client
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Guard with optional chaining to avoid crash when null
  const formattedTime = now?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) ?? "";
  const formattedDate = now?.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) ?? "";

  const router = useRouter();
  const pathname = usePathname();

  // ✅ Fetch employees with Array guard
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const data = await api.getEmployees();
        const filtered = Array.isArray(data)
          ? data.filter((emp: Employee) => emp.role === "CASHIER" || emp.role === "STOCK_MANAGER")
          : [];
        setEmployees(filtered);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // ✅ Fetch suppliers with Array guard
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const data = await api.getSuppliers();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch suppliers:", err);
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // ✅ Fetch customers with Array guard
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const data = await api.getCustomers();
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);
  
  useEffect(() => {
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await api.getProducts(); // make sure this exists
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  fetchProducts();
}, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoadingTransactions(true);
        const data = await api.getCompletedOrders();
        setTransactions((Array.isArray(data) ? data : []).map(normalizeTransaction));
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        setTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    };
    fetchTransactions();
  }, []);

  const handleLogout = () => {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.removeItem("token");
    localStorage.removeItem("employee");
    router.push("/");
  };

  const navigate = (path: string) => {
    router.push(path);
    setShowMobileMenu(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {/* Sidebar */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-0 relative">
            <Image src="/logo-new.png" alt="Logo" fill className="object-cover" sizes="96px" />
          </div>
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide mt-3">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isActive ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
                <div className="relative flex items-center gap-2 w-full">
<item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isActive && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">

        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button
            className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold text-indigo-900">Dashboard</h1>
            {/* ✅ suppressHydrationWarning prevents SSR/client mismatch crash */}
            <p suppressHydrationWarning className="text-xs text-gray-400 hidden md:block">
              {formattedDate} &nbsp;·&nbsp; {formattedTime}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
            </div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-gray-800">Ray Teodoro</p>
                  <p className="text-xs text-green-500">Admin</p>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <div key={item.label} onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${isActive ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                  <item.icon className="w-4 h-4" /><span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 p-3 md:p-4 bg-green-50">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">

            {/* Sales Report */}
            <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Sales Report</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-800">3,781</span>
                    <span className="text-xs text-green-500">+11.01% ↗</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Ongoing Orders</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-800">1,219</span>
                    <span className="text-xs text-red-400">-0.03% ↘</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Product Sold</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-800">316</span>
                    <span className="text-xs text-green-500">+6.08% ↗</span>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Return Items</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-800">₱695</span>
                    <span className="text-xs text-green-500">+15.03% ↗</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Management */}
            <div className="md:col-span-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Account Management</h2>
                <span className="text-xs text-gray-400">{employees.length} staff</span>
              </div>
              {loadingEmployees ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading employees...</p>
              ) : employees.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No employees found.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {employees.slice(0, 5).map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.role === "CASHIER" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                          {emp.role}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${emp.userStatus === "ACTIVE" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                          {emp.userStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                  {employees.length > 5 && (
                    <button onClick={() => router.push("/account")} className="text-xs text-indigo-600 hover:underline mt-1 text-left">
                      See all {employees.length} employees →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Customer List */}
            <div className="md:col-span-3 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Customer List</h2>
                <span className="text-xs text-gray-400">{customers.length} total</span>
              </div>
              {loadingCustomers ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading...</p>
              ) : customers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No customers found.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {customers.slice(0, 6).map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">{c.email ?? c.phone ?? "-"}</p>
                      </div>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs shrink-0 ${c.userStatus === "ACTIVE" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                        {c.userStatus}
                      </span>
                    </div>
                  ))}
                  {customers.length > 6 && (
                    <button onClick={() => router.push("/account")} className="text-xs text-indigo-600 hover:underline mt-1 text-left">
                      See all {customers.length} customers →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">

            {/* Supplier Information */}
            <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Supplier Information</h2>
                <span className="text-xs text-gray-400">{suppliers.length} total</span>
              </div>
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="text-gray-400 text-xs border-b">
                    <th className="text-left pb-2">#</th>
                    <th className="text-left pb-2">Supplier Name</th>
                    <th className="text-right pb-2">Last Ordered</th>
                    <th className="text-right pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSuppliers ? (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-xs">Loading...</td></tr>
                  ) : suppliers.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-xs">No suppliers found.</td></tr>
                  ) : (
                    suppliers.slice(0, 5).map((row, i) => (
                      <tr key={row.id} className="border-b last:border-0 text-gray-600">
                        <td className="py-2 text-gray-400">{i + 1}</td>
                        <td className="py-2">{row.supplierName}</td>
                        <td className="py-2 text-right">{row.lastOrdered ?? "-"}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === "ACTIVE" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {suppliers.length > 5 && (
                <button onClick={() => router.push("/supplier")} className="mt-3 text-xs text-indigo-600 hover:underline">
                  See all {suppliers.length} suppliers →
                </button>
              )}
            </div>

            {/* Inventory Pie Chart */}
            <div className="md:col-span-7 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-green-500 mb-3">Inventory Maintenances</h2>
              <div className="flex justify-center overflow-x-auto">
                <PieChart width={320} height={220}>
                  <Pie data={inventoryData} cx={155} cy={100} outerRadius={90} dataKey="value" label={renderLabel} labelLine={true}>
                    {inventoryData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">Product Maintenance</h2>

              {loadingProducts ? (
                <p className="text-sm text-gray-400">Loading products...</p>
              ) : products.length === 0 ? (
                <p className="text-sm text-gray-400">No products found.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-gray-50 rounded-xl p-3 hover:shadow-md transition"
                    >
                      <div className="w-full h-28 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                        {product.image
                          ? <img src={product.image} alt={product.productName} className="w-full h-full object-cover rounded-lg" />
                          : <Package className="w-8 h-8 text-gray-400" />}
                      </div>

                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {product.productName}
                      </p>

                      <p className="text-xs text-gray-500">
                        ₱{product.price}
                      </p>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </div>
            <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Transaction Logs</h2>
                <button
                  onClick={() => router.push("/transaction")}
                  className="text-xs border border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  See more
                </button>
              </div>
              <div className="flex gap-2">
                {["Daily", "Weekly", "Monthly"].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {loadingTransactions ? (
                  <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No transactions to show</p>
                ) : (
                  (() => {
                    const periodMap: Record<string, string> = { Daily: "Today", Weekly: "Week", Monthly: "Month" };
                    const key = periodMap[activeTab] ?? "Today";
                    const filtered = transactions.filter(t => getPeriodKey(t.createdAt) === key);
                    if (filtered.length === 0) return <p className="text-sm text-gray-400 text-center py-6">No transactions for this period</p>;
                    return filtered.slice(0, 10).map((t) => (
                      <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800 truncate">{t.customer}</p>
                          <p className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <p className="text-xs font-semibold text-gray-700 ml-2">₱{t.total.toFixed(2)}</p>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
