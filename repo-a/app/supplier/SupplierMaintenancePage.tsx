"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, ShoppingCart, Users, LineChart, 
  FileText, Package, User, ClipboardList, RotateCcw, AlertTriangle, Gift,
  Calendar, Search
} from "lucide-react";

type ProductItem = {
  id: string;
  productName: string;
  size: string | null;
  price: number;
  category: string;
  stockQuantity: number;
  stockUnit: string;
  status: string;
};

type SupplierItem = {
  id: string;
  supplierName: string;
  contactNo: string;
  address: string | null;
  agentName: string | null;
  socials: string | null;
  lastOrdered: number | null;
  status: string;
  products?: ProductItem[];
};

const navItems = [
  { label: "Dashboard",             icon: LayoutDashboard, path: "/dashboard" },
  { label: "Inventory Maintenance", icon: ShoppingCart, path: "/inventory" },
  { label: "Supplier Maintenance",  icon: Users, path: "/supplier", active: true },
  { label: "Sales Reports",         icon: LineChart, path: "/sales" },
  { label: "Transaction Logs",      icon: FileText, path: "/transaction" },
  { label: "Product Management",    icon: Package, path: "/product" },
  { label: "Account Management",    icon: User, path: "/account" },
  { label: "Purchase Order",        icon: ClipboardList, path: "/purchase-order" },
  { label: "Loss Report",               icon: AlertTriangle, path: "/loss-report" },
  { label: "Promo Management",      icon: Gift, path: "/promo" },
];

const emptyForm = {
  supplierName: "",
  contactNo: "",
  address: "",
  agentName: "",
  socials: "",
  lastOrdered: "" as string | number,
  status: "ACTIVE",
};

// ── Phone input — numbers only, +63 prefix ─────────────────────────────────
function PhoneInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const digits = value.startsWith("+63") ? value.slice(3) : value.replace(/^\+63/, "");
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange("+63" + raw);
  };
  return (
    <div className="flex mt-1">
      <span className="flex items-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-600 font-medium select-none">
        🇵🇭 +63
      </span>
      <input
        type="tel"
        inputMode="numeric"
        value={digits}
        onChange={handleChange}
        placeholder="9XXXXXXXXX"
        maxLength={10}
        className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 text-gray-900"
      />
    </div>
  );
}

// ── In-app Alert / Confirm ─────────────────────────────────────────────────
function AlertModal({ open, type = "alert", title, message, danger, onConfirm, onCancel }: {
  open: boolean; type?: "alert" | "confirm"; title?: string; message: string;
  danger?: boolean; onConfirm: () => void; onCancel?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl text-center">
        <p className="text-2xl mb-2">{danger ? "⚠️" : type === "confirm" ? "❓" : "ℹ️"}</p>
        {title && <h2 className="text-base font-bold text-gray-800 mb-1">{title}</h2>}
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-3">
          {type === "confirm" && (
            <button onClick={onCancel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          )}
          <button onClick={onConfirm}
            className={`flex-1 rounded-lg py-2 text-sm text-white font-medium ${danger ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {type === "confirm" ? (danger ? "Delete" : "Confirm") : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DatePicker — portal-based, never clipped by modal scroll ───────────────
function DatePicker({ value, onChange, label }: { value: string; onChange: (val: string) => void; label?: string }) {
  const [show, setShow] = useState(false);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });
  const buttonRef  = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const [viewYear,  setViewYear]  = useState(() => value ? parseInt(value.split("-")[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split("-")[1]) - 1 : today.getMonth());

  const openCalendar = () => {
    setViewYear(value  ? parseInt(value.split("-")[0])     : today.getFullYear());
    setViewMonth(value ? parseInt(value.split("-")[1]) - 1 : today.getMonth());
    if (buttonRef.current) {
      const rect  = buttonRef.current.getBoundingClientRect();
      const calW  = 280;
      const calH  = 320;
      let top  = rect.bottom + 6;
      let left = rect.left;
      if (window.innerHeight - rect.bottom < calH && rect.top > calH) top = rect.top - calH - 6;
      if (left + calW > window.innerWidth - 12) left = window.innerWidth - calW - 12;
      setCalendarPos({ top, left });
    }
    setShow(true);
  };

  useEffect(() => {
    if (!show) return;
    const h = (e: MouseEvent) => {
      if (calendarRef.current  && !calendarRef.current.contains(e.target as Node) &&
          buttonRef.current    && !buttonRef.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const h = () => setShow(false);
    window.addEventListener("scroll", h, true);
    return () => window.removeEventListener("scroll", h, true);
  }, [show]);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const selectDate = (day: number) => {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
    setShow(false);
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const selDay   = value ? parseInt(value.split("-")[2]) : null;
  const selMonth = value ? parseInt(value.split("-")[1]) - 1 : null;
  const selYear  = value ? parseInt(value.split("-")[0]) : null;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const calendar = show ? (
    <div ref={calendarRef}
      style={{ position: "fixed", top: calendarPos.top, left: calendarPos.left, width: 280, zIndex: 99999 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-medium">‹</button>
        <div className="flex items-center gap-1">
          <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}
            className="text-sm font-semibold text-gray-800 border-none outline-none bg-transparent cursor-pointer">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <input type="number" value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}
            className="w-16 text-sm font-semibold text-gray-800 border border-gray-200 rounded px-1 text-center outline-none focus:border-indigo-400" />
        </div>
        <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-medium">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSel  = day === selDay   && viewMonth === selMonth  && viewYear === selYear;
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          return (
            <button key={day} type="button" onClick={() => selectDate(day)}
              className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs transition-colors
                ${isSel ? "bg-indigo-600 text-white font-semibold" : isToday ? "border border-indigo-400 text-indigo-600 font-semibold" : "text-gray-700 hover:bg-indigo-50"}`}>
              {day}
            </button>
          );
        })}
      </div>
      <button type="button"
        onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDate(today.getDate()); }}
        className="w-full mt-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
        Today
      </button>
    </div>
  ) : null;

  return (
    <div className="relative">
      {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
      <button ref={buttonRef} type="button" onClick={openCalendar}
        className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 text-left hover:border-indigo-400 transition-colors focus:outline-none focus:border-indigo-400 bg-white">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className={`flex-1 truncate ${displayValue ? "text-gray-900" : "text-gray-400"}`}>
          {displayValue || "Select date"}
        </span>
        {value && (
          <span role="button" onClick={(e) => { e.stopPropagation(); onChange(""); setShow(false); }}
            className="ml-auto text-gray-300 hover:text-gray-500 text-xs leading-none">✕</span>
        )}
      </button>
      {typeof document !== "undefined" && calendar ? createPortal(calendar, document.body) : null}
    </div>
  );
}

export default function SupplierMaintenancePage() {
  const router = useRouter();
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search,         setSearch]         = useState("");
  const [items,          setItems]          = useState<SupplierItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selected,       setSelected]       = useState<string[]>([]);
  const [showModal,      setShowModal]      = useState(false);
  const [form,           setForm]           = useState(emptyForm);
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [viewItem,       setViewItem]       = useState<SupplierItem | null>(null);
  const [viewProducts,   setViewProducts]   = useState<ProductItem[]>([]);
  const [editProducts,   setEditProducts]   = useState<ProductItem[]>([]);
  const [savingPrice,    setSavingPrice]    = useState<string | null>(null);
  const [success,        setSuccess]        = useState("");
  const [error,          setError]          = useState("");

  // ✅ Status filter state
  const [statusFilter, setStatusFilter] = useState("All");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusRef  = useRef<HTMLDivElement>(null);

  const [alertModal, setAlertModal] = useState<{
    open: boolean; type?: "alert" | "confirm"; title?: string;
    message: string; danger?: boolean; onConfirm: () => void; onCancel?: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  const showAlert = (message: string, title?: string) =>
    setAlertModal({ open: true, type: "alert", title, message, onConfirm: () => setAlertModal(a => ({ ...a, open: false })) });

  const showConfirm = (message: string, onConfirm: () => void, title?: string, danger = false) =>
    setAlertModal({ open: true, type: "confirm", title, message, danger,
      onConfirm: () => { setAlertModal(a => ({ ...a, open: false })); onConfirm(); },
      onCancel:  () => setAlertModal(a => ({ ...a, open: false })),
    });

  const showToast = (msg: string, isError = false) => {
    if (isError) { setError(msg);   setTimeout(() => setError(""),   3000); }
    else         { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusRef.current  && !statusRef.current.contains(e.target as Node))  setShowStatusDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const filtered = items.filter((row) => {
    const matchSearch  = row.supplierName.toLowerCase().includes(search.toLowerCase()) ||
                         row.id.toLowerCase().includes(search.toLowerCase()) ||
                         row.contactNo.toLowerCase().includes(search.toLowerCase());
    const matchStatus  = statusFilter === "All" || row.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll    = () => selected.length === filtered.length ? setSelected([]) : setSelected(filtered.map(r => r.id));

  const openAddModal = () => { setForm(emptyForm); setEditingId(null); setEditProducts([]); setShowModal(true); };

  const loadSupplierProducts = async (supplierId: string) => {
    const allProducts = await api.getProducts();
    return (Array.isArray(allProducts) ? allProducts : [])
      .filter((p: { supplierId?: string; supplier?: string }) =>
        (p.supplierId || p.supplier) === supplierId
      )
      .map((p: Record<string, unknown>) => ({
        id: (p.id as string) || "",
        productName: (p.productName as string) || "",
        size: (p.size as string) || null,
        price: Number(p.price) || 0,
        category: (p.category as string) || "OTHER",
        stockQuantity: Number(p.stockQuantity) || 0,
        stockUnit: (p.stockUnit as string) || "case_24",
        status: (p.status as string) || "ACTIVE",
      }));
  };

  const openEditModal = async () => {
    if (selected.length !== 1) { showAlert("Please select exactly one item to edit.", "Selection Required"); return; }
    const item = items.find(i => i.id === selected[0]);
    if (!item) return;
    setForm({
      supplierName: item.supplierName, contactNo: item.contactNo,
      address: item.address || "", agentName: item.agentName || "",
      socials: item.socials || "",
      lastOrdered: item.lastOrdered ?? "",
      status: item.status,
    });
    setEditingId(item.id);
    const products = await loadSupplierProducts(item.id);
    setEditProducts(products);
    setShowModal(true);
  };

  const openEditFromView = async (item: SupplierItem) => {
    setViewItem(null);
    setForm({
      supplierName: item.supplierName, contactNo: item.contactNo,
      address: item.address || "", agentName: item.agentName || "",
      socials: item.socials || "",
      lastOrdered: item.lastOrdered ?? "",
      status: item.status,
    });
    setSelected([item.id]);
    setEditingId(item.id);
    const products = await loadSupplierProducts(item.id);
    setEditProducts(products);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.supplierName) { showAlert("Supplier Name is required.", "Missing Field"); return; }
    try {
      const saveData = { ...form, lastOrdered: form.lastOrdered === "" ? 0 : Number(form.lastOrdered), socials: form.socials || null };
      if (editingId !== null) {
        await api.updateSupplier(editingId, saveData);
        await Promise.all(editProducts.map(p => api.updateProduct(p.id, { price: p.price })));
        showToast("Supplier updated successfully!");
      } else {
        await api.createSupplier(saveData);
        showToast("Supplier added successfully!");
      }
      await fetchSuppliers();
      setShowModal(false);
      setSelected([]);
    } catch (err) { showToast("Failed to save supplier.", true); console.error(err); }
  };

  // ✅ Toggle status directly from table
  const handleToggleStatus = async (item: SupplierItem) => {
    const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.updateSupplier(item.id, { status: newStatus });
      await fetchSuppliers();
      showToast(`Supplier ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully!`);
    } catch (err) { showToast("Failed to update status.", true); console.error(err); }
  };

  const openViewModal = async (supplierId: string) => {
    const supplier = await api.getSupplier(supplierId);
    setViewItem(supplier);
    const allProducts = await api.getProducts();
    const supplierProducts = (Array.isArray(allProducts) ? allProducts : [])
      .filter((p: { supplierId?: string; supplier?: string }) =>
        (p.supplierId || p.supplier) === supplierId
      )
      .map((p: Record<string, unknown>) => ({
        id: (p.id as string) || "",
        productName: (p.productName as string) || "",
        size: (p.size as string) || null,
        price: Number(p.price) || 0,
        category: (p.category as string) || "OTHER",
        stockQuantity: Number(p.stockQuantity) || 0,
        stockUnit: (p.stockUnit as string) || "case_24",
        status: (p.status as string) || "ACTIVE",
      }));
    setViewProducts(supplierProducts);
  };

  const handleUpdatePrice = async (productId: string, newPrice: number) => {
    setSavingPrice(productId);
    try {
      await api.updateProduct(productId, { price: newPrice });
      setViewProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice } : p));
      showToast(`Price updated for ${viewProducts.find(p => p.id === productId)?.productName}!`);
    } catch {
      showToast("Failed to update price.", true);
    } finally {
      setSavingPrice(null);
    }
  };

  const handleDelete = () => {
    if (selected.length === 0) { showAlert("Please select at least one item to delete.", "No Selection"); return; }
    showConfirm(`Are you sure you want to delete ${selected.length} supplier(s)? This action cannot be undone.`,
      confirmDelete, "Delete Suppliers", true);
  };

  const confirmDelete = async () => {
    try {
      await Promise.all(selected.map(id => api.deleteSupplier(id)));
      await fetchSuppliers();
      setSelected([]);
      showToast("Supplier(s) deleted successfully!");
    } catch { showToast("Failed to delete supplier(s).", true); }
  };

  const handleExport = () => {
    const headers = ["ID","Company Name","Contact No","Address","Agent Name","Last Ordered","Status"];
    const rows    = items.map(item => [item.id, item.supplierName, item.contactNo, item.address, item.agentName, item.lastOrdered, item.status]);
    const csv     = [headers, ...rows].map(row => row.join(",")).join("\n");
    const a       = document.createElement("a");
    a.href        = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download    = "suppliers.csv"; a.click();
  };

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("employee"); router.push("/"); };

  const navigate = (label: string) => {
    const routes: Record<string, string> = {
      "Dashboard": "/dashboard", "Inventory Maintenance": "/inventory",
      "Supplier Maintenance": "/supplier", "Sales Reports": "/sales",
      "Transaction Logs": "/transaction", "Product Management": "/product",
      "Account Management": "/account", "Purchase Order": "/purchase-order",
      "Loss Report": "/loss-report", "Promo Management": "/promo",
    };
    if (routes[label]) router.push(routes[label]);
    setShowMobileMenu(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <AlertModal {...alertModal} />

      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-0 relative">
            <Image src="/logo-new.png" alt="Logo" fill className="object-cover" sizes="96px" />
          </div>
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide mt-3">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(item => (
            <div key={item.label} onClick={() => navigate(item.label)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${item.active ? "text-indigo-700 font-semibold" : "text-gray-400 hover:text-gray-600"}`}>
              <div className="relative flex items-center gap-2 w-full">
                <item.icon className="w-4 h-4" /><span>{item.label}</span>
                {item.active && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2 transition-transform duration-300"
            style={{ transform: showMobileMenu ? "rotate(90deg)" : "rotate(0deg)" }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Supplier Maintenance</h1>
          <div className="flex items-center gap-2">
            <div className="relative"><span className="text-xl">🔔</span><div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" /></div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                <div className="hidden md:block text-left"><p className="text-sm font-semibold text-gray-800">Ray Teodoro</p><p className="text-xs text-green-500">Admin</p></div>
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

        {showMobileMenu && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex flex-col gap-1 z-40">
            {navItems.map(item => (
              <div key={item.label} onClick={() => navigate(item.label)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm ${item.active ? "text-indigo-700 font-semibold" : "text-gray-500"}`}>
                <item.icon className="w-4 h-4" /><span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 p-3 md:p-4 bg-green-50">
          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm">

            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-4 flex-wrap justify-end">
              <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:bg-gray-50">📤 Export</button>
              <button onClick={handleDelete} className="flex items-center gap-1 border border-red-200 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
              <button onClick={openEditModal} className="flex items-center gap-1 border border-gray-800 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-gray-800 hover:bg-gray-100">✏️ Edit</button>
              <button onClick={openAddModal} className="flex items-center gap-1 bg-gray-900 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm text-white hover:bg-gray-700">+ Add Supplier</button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-40 md:w-48">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)}
                  className="outline-none text-sm text-gray-700 w-full" />
              </div>

              {/* ✅ Functional Status filter */}
              <div className="relative" ref={statusRef}>
                <button onClick={() => { setShowStatusDropdown(!showStatusDropdown); }}
                  className={`flex items-center gap-1 border rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm transition-colors
                    ${statusFilter !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  🔖 {statusFilter === "All" ? "Status" : statusFilter} ▾
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-36">
                    {["All", "ACTIVE", "INACTIVE"].map(opt => (
                      <button key={opt} onClick={() => { setStatusFilter(opt); setShowStatusDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                        {opt === "All" ? "All Status" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(statusFilter !== "All") && (
                <button onClick={() => { setStatusFilter("All"); }}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-indigo-900 text-white text-xs">
                    <th className="p-3 text-left w-8"><input type="checkbox" onChange={toggleAll} checked={selected.length === filtered.length && filtered.length > 0} /></th>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Company Name</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-400">Loading suppliers...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-400">No suppliers found.</td></tr>
                  ) : (
                    filtered.map(row => (
                      <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(row.id) ? "bg-indigo-50" : ""}`}>
                        <td className="p-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                        <td className="p-3 text-gray-500 text-xs">{row.id}</td>
                        <td className="p-3"><span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs">{row.supplierName}</span></td>
                        <td className="p-3">
                          {/* ✅ Clickable status badge toggles Active/Inactive */}
                          <button
                            onClick={() => handleToggleStatus(row)}
                            title="Click to toggle status"
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer
                              ${row.status === "ACTIVE"
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-yellow-400 text-black hover:bg-yellow-500"}`}>
                            {row.status}
                          </button>
                        </td>
                        <td className="p-3">
                          <button onClick={() => openViewModal(row.id)}
                            className="flex items-center gap-1 border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-3 py-1 text-xs font-medium transition-colors">
                            👁️ View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* View Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{viewItem.supplierName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Supplier ID: {viewItem.id}</p>
              </div>
              {/* ✅ Clickable status in view modal too */}
              <button onClick={() => handleToggleStatus(viewItem)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer
                  ${viewItem.status === "ACTIVE" ? "bg-green-500 text-white hover:bg-green-600" : "bg-yellow-400 text-black hover:bg-yellow-500"}`}>
                {viewItem.status} (click to toggle)
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Contact No.</p>
                  <p className="text-sm font-medium text-gray-800">{viewItem.contactNo || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Agent Name</p>
                  <p className="text-sm font-medium text-gray-800 break-all">{viewItem.agentName || "—"}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Address</p>
                <p className="text-sm font-medium text-gray-800">{viewItem.address || "—"}</p>
              </div>
              {viewItem.socials && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Socials</p>
                  <p className="text-sm font-medium text-gray-800">{viewItem.socials}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Last Ordered</p>
                  <p className="text-sm font-medium text-gray-800">{viewItem.lastOrdered ?? "—"}</p>
                </div>
              </div>
<div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Products &amp; Prices</p>
                {viewProducts.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {viewProducts.map(product => (
                      <div key={product.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{product.productName}{product.size ? ` ${product.size}` : ""}</p>
                          <p className="text-xs text-gray-400">{product.category}</p>
                        </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                           <span className="text-xs text-gray-400">₱</span>
                           <input
                             type="number"
                             inputMode="numeric"
                             min="0"
                             value={product.price}
                             onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }}
                             onChange={e => {
                               const val = e.target.value.replace(/[^0-9]/g, "");
                               setViewProducts(prev => prev.map(p => p.id === product.id ? { ...p, price: val === "" ? 0 : Number(val) } : p));
                             }}
                             className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right outline-none focus:border-indigo-400 text-gray-900"
                           />
                           <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Wholesale</span>
                           <button
                             onClick={() => handleUpdatePrice(product.id, product.price)}
                             disabled={savingPrice === product.id}
                             className="bg-indigo-600 text-white rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 shrink-0">
                             {savingPrice === product.id ? "..." : "Save"}
                           </button>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-400 text-center">No products found</div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setViewItem(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
              <button onClick={() => openEditFromView(viewItem)} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">✏️ Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingId !== null ? "Edit Supplier" : "Add New Supplier"}
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Company Name</label>
                <input value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Agent Name</label>
                <input value={form.agentName} onChange={e => setForm({ ...form, agentName: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Contact No.</label>
                <PhoneInput value={form.contactNo} onChange={val => setForm({ ...form, contactNo: val })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Socials <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.socials} onChange={e => setForm({ ...form, socials: e.target.value })}
                  placeholder="Facebook, Instagram, etc."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900" />
              </div>

<div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Last Ordered</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.lastOrdered}
                    onKeyDown={(e) => {
                      if (["e","E","+","-","."].includes(e.key)) e.preventDefault();
                    }}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setForm({ ...form, lastOrdered: val === "" ? "" : Number(val) });
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-indigo-400 text-gray-900">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {editingId !== null && editProducts.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Products &amp; Prices</label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 mt-1 bg-gray-50 rounded-lg p-2">
                    {editProducts.map(product => (
                      <div key={product.id} className="flex items-center justify-between gap-2 bg-white rounded-lg p-2 border border-gray-100">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-800 truncate">{product.productName}{product.size ? ` ${product.size}` : ""}</p>
                        </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                           <span className="text-xs text-gray-400">₱</span>
                           <input
                             type="number"
                             inputMode="numeric"
                             min="0"
                             value={product.price}
                             onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }}
                             onChange={e => {
                               const val = e.target.value.replace(/[^0-9]/g, "");
                               setEditProducts(prev => prev.map(p => p.id === product.id ? { ...p, price: val === "" ? 0 : Number(val) } : p));
                             }}
                             className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right outline-none focus:border-indigo-400 text-gray-900"
                           />
                           <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Wholesale</span>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="flex-1 bg-indigo-600 rounded-lg py-2 text-sm text-white hover:bg-indigo-700">
                  {editingId !== null ? "Save Changes" : "Add Supplier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"><span>✅</span><span className="text-sm font-medium">{success}</span></div>}
      {error   && <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"><span>❌</span><span className="text-sm font-medium">{error}</span></div>}
    </div>
  );
}