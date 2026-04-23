"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { 
  LayoutDashboard, ShoppingCart, Users, LineChart, 
  FileText, Package, User, ClipboardList, RotateCcw, Gift,
  Building2, Box, Clock, CheckCircle, Calendar, Inbox, Search
} from "lucide-react";

// ─── CASE UNIT SYSTEM ────────────────────────────────────────────────────────
type CaseUnit = "case_24" | "case_12" | "case_6" | "btl" | "pcs";

const CASE_UNITS: { value: CaseUnit; label: string; short: string; bottlesPerCase: number | null; detail: string }[] = [
  { value: "case_24", label: "Case (24 pcs)", short: "24-cs", bottlesPerCase: 24, detail: "1 case = 24 bottles" },
  { value: "case_12", label: "Case (12 pcs)", short: "12-cs", bottlesPerCase: 12, detail: "1 case = 12 bottles" },
  { value: "case_6",  label: "Case (6 pcs)",  short: "6-cs",  bottlesPerCase: 6,  detail: "1 case = 6 bottles"  },
  { value: "btl",     label: "Bottles",        short: "btl",   bottlesPerCase: null, detail: "Individual bottle" },
  { value: "pcs",     label: "Pieces",         short: "pcs",   bottlesPerCase: null, detail: "Single piece"      },
];

const getUnit      = (u?: string) => CASE_UNITS.find((x) => x.value === u) ?? CASE_UNITS[0];
const getUnitShort = (u?: string) => getUnit(u).short;

function getCaseBreakdown(qty: number, unit?: string): string | null {
  const u = getUnit(unit);
  if (!u.bottlesPerCase) return null;
  return `${qty} × ${u.bottlesPerCase} = ${qty * u.bottlesPerCase} btl`;
}

function UnitPill({ unit, qty }: { unit?: string; qty?: number }) {
  const u = getUnit(unit);
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">
      {qty != null && <span className="text-gray-700 font-semibold">{qty}</span>}
      <span>{u.short}</span>
    </span>
  );
}

// ─── CUSTOM SUPPLIER DROPDOWN ─────────────────────────────────────────────────
function SupplierSelect({
  value, onChange, suppliers, hint, lowStockCount,
}: {
  value: string;
  onChange: (id: string) => void;
  suppliers: { id: string; supplierName: string }[];
  hint?: string;
  lowStockCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = suppliers.find((s) => s.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-sm transition-colors bg-white text-left
          ${open ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200"}`}
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
              {selected.supplierName.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-gray-800">{selected.supplierName}</span>
          </div>
        ) : (
          <span className="text-gray-400">Select a supplier...</span>
        )}
        <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden">
          {suppliers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">No suppliers found</div>
          ) : (
            suppliers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onChange(s.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-indigo-50
                  ${value === s.id ? "bg-indigo-50" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${value === s.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {s.supplierName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${value === s.id ? "text-indigo-700" : "text-gray-700"}`}>
                    {s.supplierName}
                  </span>
                  {value === s.id && lowStockCount != null && lowStockCount > 0 && (
                    <span className="ml-2 text-xs text-red-500 font-medium">⚠️ {lowStockCount} low stock</span>
                  )}
                </div>
                {value === s.id && <span className="ml-auto text-indigo-600 text-xs">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
      {hint && <p className="text-xs mt-1.5 text-indigo-500">{hint}</p>}
    </div>
  );
}

// ─── CUSTOM DATE PICKER ───────────────────────────────────────────────────────
function DateField({
  value, onChange, label,
}: {
  value: string; onChange: (v: string) => void; label?: string;
}) {
  const [show, setShow] = useState(false);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.split("-")[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split("-")[1]) - 1 : today.getMonth());

  const openCalendar = () => {
    setViewYear(value ? parseInt(value.split("-")[0]) : today.getFullYear());
    setViewMonth(value ? parseInt(value.split("-")[1]) - 1 : today.getMonth());
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const calH = 320;
      let top = rect.bottom + 6;
      const left = rect.left;
      if (window.innerHeight - rect.bottom < calH && rect.top > calH) top = rect.top - calH - 6;
      setCalendarPos({ top, left });
    }
    setShow(true);
  };

  useEffect(() => {
    if (!show) return;
    const h = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)) setShow(false);
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

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const selectDate = (day: number) => {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setShow(false);
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const selDay = value ? parseInt(value.split("-")[2]) : null;
  const selMonth = value ? parseInt(value.split("-")[1]) - 1 : null;
  const selYear = value ? parseInt(value.split("-")[0]) : null;

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
          const isSel = day === selDay && viewMonth === selMonth && viewYear === selYear;
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
      {label && <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>}
      <button ref={buttonRef} type="button" onClick={openCalendar}
        className="w-full flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 text-sm text-left bg-white focus:outline-none focus:border-indigo-400">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className={`flex-1 truncate ${displayValue ? "text-gray-800 font-medium" : "text-gray-400"}`}>
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

// ─── TYPES ───────────────────────────────────────────────────────────────────
type DeliveryItem = {
  id: string; productId: string;
  orderedQty: number; receivedQty: number; returnedQty: number;
  costPrice: number; unit?: string;
  product?: { id: string; productName: string; price: number; stockUnit?: string; size?: string | null };
};

type Delivery = {
  id: string; supplierId: string; deliveryDate: string;
  status: "PENDING" | "PARTIALLY_RECEIVED" | "DELIVERED" | "CANCELLED";
  totalItems: number; notes?: string; createdAt: string;
  supplier?: { id: string; supplierName: string };
  items: DeliveryItem[];
};

type LineItem = {
  productId: string; productName: string;
  quantity: number | string; unitPrice: number | string;
  unit: CaseUnit;
};

type DeliveryForm = { supplierId: string; deliveryDate: string; lineItems: LineItem[]; notes: string };
type Supplier    = { id: string; supplierName: string };
type Product     = { id: string; productName: string; price: number; supplierId: string; status?: string; stockUnit?: string; stockQuantity?: number; size?: string | null };
type ReceiveQty  = { deliveryItemId: string; receivedQty: number };

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING:            { bg: "bg-yellow-100", text: "text-yellow-800" },
  PARTIALLY_RECEIVED: { bg: "bg-blue-100",   text: "text-blue-800"   },
  DELIVERED:          { bg: "bg-green-100",  text: "text-green-800"  },
  CANCELLED:          { bg: "bg-red-100",    text: "text-red-700"    },
};

const navItems = [
  { label: "Dashboard",             icon: LayoutDashboard, path: "/dashboard"      },
  { label: "Inventory Maintenance", icon: ShoppingCart, path: "/inventory"      },
  { label: "Supplier Maintenance",  icon: Users, path: "/supplier"       },
  { label: "Sales Reports",         icon: LineChart, path: "/sales"          },
  { label: "Transaction Logs",      icon: FileText, path: "/transaction"    },
  { label: "Product Management",    icon: Package, path: "/product"        },
  { label: "Account Management",    icon: User, path: "/account"        },
  { label: "Purchase Order",        icon: ClipboardList, path: "/purchase-order" },
  { label: "Return",               icon: RotateCcw, path: "/return"         },
  { label: "Promo Management",      icon: Gift, path: "/promo"          },
];

const ITEMS_PER_PAGE = 8;
const emptyLineItem  = (): LineItem => ({ productId: "", productName: "", quantity: 1, unitPrice: 0, unit: "case_24" });
const makeEmptyForm  = (): DeliveryForm => ({
  supplierId: "", deliveryDate: new Date().toISOString().split("T")[0],
  lineItems: [emptyLineItem()],
  notes: "",
});

type Tab = "create" | "receiving" | "history";

// ─── PRODUCT DROPDOWN (custom, no native select) ──────────────────────────────
function ProductSelect({
  value, onChange, products, usedIds,
}: {
  value: string;
  onChange: (id: string) => void;
  products: Product[];
  usedIds: string[];
  idx: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = products.find((p) => p.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between border rounded-lg px-2.5 py-1.5 text-sm transition-colors bg-white text-left
          ${open ? "border-indigo-400" : "border-gray-200"}`}
      >
        {selected ? (
          <span className="text-gray-800 text-xs truncate">
            {selected.productName}{selected.size ? ` ${selected.size}` : ""}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">Select product</span>
        )}
        <svg className="w-3 h-3 text-gray-400 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] max-h-48 overflow-y-auto">
          {products.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">No products</div>
          ) : (
            products.map((p) => {
              const isUsed     = usedIds.includes(p.id) && p.id !== value;
              const stockLabel = p.stockQuantity != null ? `${p.stockQuantity} ${getUnitShort(p.stockUnit)} left` : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isUsed}
                  onClick={() => { if (!isUsed) { onChange(p.id); setOpen(false); } }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors
                    ${isUsed ? "opacity-40 cursor-not-allowed" : "hover:bg-indigo-50"}
                    ${value === p.id ? "bg-indigo-50" : ""}`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${value === p.id ? "text-indigo-700" : "text-gray-800"}`}>
                      {p.productName}
                      {p.size && <span className="text-gray-400 font-normal ml-1">{p.size}</span>}
                    </p>
                    {stockLabel && <p className="text-xs text-gray-400 mt-0.5">{stockLabel}</p>}
                  </div>
                  {value === p.id && <span className="text-indigo-600 text-xs ml-2 shrink-0">✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [activeTab,      setActiveTab]      = useState<Tab>("create");
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [deliveries,     setDeliveries]     = useState<Delivery[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [suppliers,      setSuppliers]      = useState<Supplier[]>([]);
  const [allProducts,    setAllProducts]    = useState<Product[]>([]);
  const [form,           setForm]           = useState<DeliveryForm>(makeEmptyForm());
  const [saving,         setSaving]         = useState(false);

  const [confirmModal,  setConfirmModal]  = useState<{ show: boolean; message: string; onConfirm: () => void }>({ show: false, message: "", onConfirm: () => {} });
  const [createError,   setCreateError]   = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [receiveError,  setReceiveError]  = useState("");

  const showConfirm = (msg: string, fn: () => void) => setConfirmModal({ show: true, message: msg, onConfirm: fn });

  const [historySearch,         setHistorySearch]         = useState("");
  const [historyStatus,         setHistoryStatus]         = useState("All");
  const [historyPage,           setHistoryPage]           = useState(1);
  const [viewDelivery,          setViewDelivery]          = useState<Delivery | null>(null);
  const [showHistoryStatusDrop, setShowHistoryStatusDrop] = useState(false);
  const historyStatusRef = useRef<HTMLDivElement>(null);

  const [receivingSearch,   setReceivingSearch]   = useState("");
  const [receivePage,       setReceivePage]       = useState(1);
  const [receivingDelivery, setReceivingDelivery] = useState<Delivery | null>(null);
  const [receiveQtys,       setReceiveQtys]       = useState<ReceiveQty[]>([]);
  const [receiving,         setReceiving]         = useState(false);

  const supplierProducts = form.supplierId
    ? allProducts.filter((p) => p.supplierId === form.supplierId && p.status !== "INACTIVE")
    : [];

  const lowStockCount = form.supplierId
    ? supplierProducts.filter((p) => p.stockQuantity != null && p.stockQuantity <= 10).length
    : 0;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (historyStatusRef.current && !historyStatusRef.current.contains(e.target as Node)) setShowHistoryStatusDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [d, s, p] = await Promise.all([api.getDeliveries(), api.getSuppliers(), api.getProducts()]);
      setDeliveries(Array.isArray(d) ? d : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setAllProducts(Array.isArray(p) ? p : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSupplierChange = (supplierId: string) => {
    setForm({ ...form, supplierId, lineItems: [emptyLineItem()] });
  };

  const calculateTotal = (items: LineItem[]) =>
    items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);

  const validLineItems = form.lineItems.filter((i) => i.productId);

  const handleSave = async () => {
    if (!form.supplierId) { setCreateError("Please select a supplier."); return; }
    if (validLineItems.length === 0) { setCreateError("Please add at least one product."); return; }
    try {
      setSaving(true); setCreateError("");
      const res = await api.createDelivery({
        supplierId: form.supplierId, deliveryDate: form.deliveryDate,
        totalItems: validLineItems.reduce((s, i) => s + Number(i.quantity), 0),
        notes: form.notes || "",
        items: validLineItems.map((i) => ({
          productId: i.productId, quantity: Number(i.quantity) || 1,
          costPrice: Number(i.unitPrice) || 0, unit: i.unit || "case_24",
        })),
      });
      if (res?.error || res?.message?.toLowerCase().includes("error")) {
        setCreateError(res.message || "Failed to create delivery."); return;
      }
      setForm(makeEmptyForm()); await fetchAll();
      setCreateSuccess("Delivery created successfully!");
      setTimeout(() => setCreateSuccess(""), 3000);
    } catch (e) { console.error(e); setCreateError("Failed to create delivery. Please try again."); }
    finally { setSaving(false); }
  };

  const addLineItem    = () => {
    if (!form.supplierId) { setCreateError("Please select a supplier first."); return; }
    setForm({ ...form, lineItems: [...form.lineItems, emptyLineItem()] });
  };
  const removeLineItem = (idx: number) => setForm({ ...form, lineItems: form.lineItems.filter((_, i) => i !== idx) });

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const items = [...form.lineItems];
    if (field === "productId") {
      const p = supplierProducts.find((p) => p.id === value);
      items[idx] = { ...items[idx], productId: String(value), productName: p?.productName || "", unitPrice: p?.price || 0, unit: (p?.stockUnit as CaseUnit) || "case_24" };
    } else {
      items[idx] = { ...items[idx], [field]: value };
    }
    setForm({ ...form, lineItems: items });
  };

  const pendingDeliveries  = deliveries.filter((d) => d.status === "PENDING" || d.status === "PARTIALLY_RECEIVED");
  const filteredReceiving  = pendingDeliveries.filter((d) =>
    d.id.toLowerCase().includes(receivingSearch.toLowerCase()) ||
    (d.supplier?.supplierName || "").toLowerCase().includes(receivingSearch.toLowerCase())
  );
  const receiveTotalPages  = Math.ceil(filteredReceiving.length / ITEMS_PER_PAGE);
  const paginatedReceiving = filteredReceiving.slice((receivePage - 1) * ITEMS_PER_PAGE, receivePage * ITEMS_PER_PAGE);

  const openReceiveModal = (delivery: Delivery) => {
    setReceivingDelivery(delivery); setReceiveError("");
    setReceiveQtys(delivery.items.map((item) => ({ deliveryItemId: item.id, receivedQty: item.orderedQty - item.receivedQty })));
  };

  const handleReceive = async () => {
    if (!receivingDelivery) return;
    const employee = JSON.parse(localStorage.getItem("employee") || "{}");
    if (!employee?.id) { setReceiveError("Employee not found. Please log in again."); return; }
    try {
      setReceiving(true); setReceiveError("");
      await api.receiveDelivery(receivingDelivery.id, employee.id, receiveQtys.filter((r) => r.receivedQty > 0));
      setReceivingDelivery(null); await fetchAll();
      setCreateSuccess("Items received and stock updated!");
      setTimeout(() => setCreateSuccess(""), 3000);
    } catch (e: unknown) { setReceiveError((e as Error).message || "Failed to receive items."); }
    finally { setReceiving(false); }
  };

  const handleCancel = (id: string) => showConfirm("Cancel this delivery?", async () => {
    try { await api.updateDelivery(id, { status: "CANCELLED" }); await fetchAll(); setConfirmModal({ show: false, message: "", onConfirm: () => {} }); }
    catch (e) { console.error(e); }
  });

  const filteredHistory = deliveries.filter((d) =>
    (d.id.toLowerCase().includes(historySearch.toLowerCase()) || (d.supplier?.supplierName || "").toLowerCase().includes(historySearch.toLowerCase()))
    && (historyStatus === "All" || d.status === historyStatus)
  );
  const historyTotalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory  = filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

  const handleExport = () => {
    const headers = ["ID","Supplier","Delivery Date","Total Items","Status","Notes"];
    const rows    = deliveries.map((d) => [d.id, d.supplier?.supplierName || d.supplierId, new Date(d.deliveryDate).toLocaleDateString(), d.totalItems, d.status, d.notes || ""]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[headers, ...rows].map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "deliveries.csv"; a.click();
  };

  const handleLogout = () => { document.cookie = "token=; path=/; max-age=0"; localStorage.removeItem("token"); localStorage.removeItem("employee"); router.push("/"); };
  const navigate     = (path: string) => { router.push(path); setShowMobileMenu(false); };
  const selectedSupplierName = suppliers.find((s) => s.id === form.supplierId)?.supplierName;

  const PaginationBar = ({ page, totalPages, setPage, total, label }: {
    page: number; totalPages: number; setPage: (p: number) => void; total: number; label: string;
  }) => totalPages <= 1 ? null : (
    <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
      <p className="text-xs text-gray-400">Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total} {label}</p>
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => setPage(p)}
            className={`px-3 py-1 rounded-lg text-sm border ${page === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{p}</button>
        ))}
        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="px-3 py-1 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next →</button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">

      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-sm text-gray-700 mb-5">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({ show: false, message: "", onConfirm: () => {} })}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmModal.onConfirm}
                className="flex-1 bg-red-500 rounded-lg py-2 text-sm text-white hover:bg-red-600">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-52 bg-white flex-col py-6 px-4 border-r border-gray-100 shrink-0">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold text-indigo-900 leading-tight tracking-wide">JULIETA SOFTDRINKS<br />STORE</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <div key={item.label} onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isActive ? "text-indigo-700 font-semibold bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
                <div className="relative flex items-center gap-2 w-full">
                  <item.icon className="w-4 h-4" /><span>{item.label}</span>
                  {isActive && <div className="absolute -right-4 w-1 h-6 bg-green-500 rounded-full" />}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
          <button className="md:hidden text-gray-600 text-xl mr-2" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            {showMobileMenu ? "✕" : "☰"}
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Purchase Order</h1>
            <p className="text-xs text-gray-400 hidden md:block">Create and manage deliveries from suppliers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Online</span>
            </div>
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ${showUserMenu ? "bg-indigo-50 ring-2 ring-indigo-300" : "hover:bg-gray-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://i.pravatar.cc/40?img=8" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800">Ray Teodoro</p>
                  <p className="text-xs text-green-500">Admin</p>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Mobile nav ── */}
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

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-6">
          <div className="flex">
            {([
              { key: "create",    label: "Create Order", icon: ClipboardList },
              { key: "receiving", label: "Receiving",    icon: Box },
              { key: "history",   label: "PO History",   icon: Clock },
            ] as { key: Tab; label: string; icon: typeof ClipboardList }[]).map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-indigo-600 text-indigo-700 bg-indigo-50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}>
                <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
                {tab.key === "receiving" && pendingDeliveries.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none ml-1">{pendingDeliveries.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-3 md:p-5 bg-green-50">

          {/* ══ CREATE ══ */}
          {activeTab === "create" && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-4">

                {/* Step 1 — Supplier + Date */}
                <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</div>
                    <h2 className="text-sm font-bold text-gray-700">Select Supplier &amp; Date</h2>
                  </div>

                  {createError && (
                    <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                      <span>⚠️</span><span>{createError}</span>
                      <button onClick={() => setCreateError("")} className="ml-auto">✕</button>
                    </div>
                  )}
                  {createSuccess && (
                    <div className="mb-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                      <span>✅</span><span>{createSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ✅ Custom supplier picker — no native select, no dashes */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Supplier <span className="text-red-400">*</span>
                      </label>
                      <SupplierSelect
                        value={form.supplierId}
                        onChange={handleSupplierChange}
                        suppliers={suppliers}
                        lowStockCount={lowStockCount}
                        hint={form.supplierId
                          ? supplierProducts.length > 0
                            ? `${supplierProducts.length} product${supplierProducts.length > 1 ? "s" : ""} available from ${selectedSupplierName}`
                            : `⚠️ No active products found for ${selectedSupplierName}`
                          : undefined}
                      />
                    </div>

                    {/* ✅ Custom date field — calendar icon, readable date */}
                    <DateField
                      label="Delivery Date"
                      value={form.deliveryDate}
                      onChange={(v) => setForm({ ...form, deliveryDate: v })}
                    />
                  </div>
                </div>

                {/* Step 2 — Products */}
                <div className={`bg-white rounded-2xl p-4 md:p-5 shadow-sm transition-opacity ${!form.supplierId ? "opacity-50 pointer-events-none" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ${form.supplierId ? "bg-indigo-600" : "bg-gray-300"}`}>2</div>
                      <h2 className="text-sm font-bold text-gray-700">
                        Select Products
                        {form.supplierId && selectedSupplierName && (
                          <span className="ml-2 text-xs font-normal text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">from {selectedSupplierName}</span>
                        )}
                      </h2>
                    </div>
                    <button onClick={addLineItem} disabled={!form.supplierId || supplierProducts.length === 0}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      + Add Item
                    </button>
                  </div>

                  {!form.supplierId && (
                    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                      <Building2 className="w-10 h-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400 font-medium">Select a supplier first</p>
                    </div>
                  )}

                  {form.supplierId && supplierProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-yellow-200 rounded-xl bg-yellow-50">
                      <Box className="w-10 h-10 text-yellow-300 mb-2" />
                      <p className="text-sm text-yellow-700 font-medium">No products found for this supplier</p>
                    </div>
                  )}

                  {form.supplierId && supplierProducts.length > 0 && (
                    <div className="space-y-2">
                      <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
                        <div className="col-span-4">Product</div>
                        <div className="col-span-3 text-center">Cases</div>
                        <div className="col-span-2">Cost (₱)</div>
                        <div className="col-span-3 text-right">Sub</div>
                      </div>

                      {form.lineItems.map((item, idx) => {
                        const breakdown  = getCaseBreakdown(Number(item.quantity), item.unit);
                        const usedIds    = form.lineItems.filter((_, i) => i !== idx).map((li) => li.productId).filter(Boolean);
                        return (
                          <div key={idx} className="bg-gray-50 rounded-xl p-2.5">
                            <div className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
                              {/* ✅ Custom product dropdown — no native select placeholder issues */}
                              <div className="col-span-2 md:col-span-4">
                                <label className="text-xs text-gray-400 md:hidden">Product</label>
                                <ProductSelect
                                  value={item.productId}
                                  onChange={(id) => updateLineItem(idx, "productId", id)}
                                  products={supplierProducts}
                                  usedIds={usedIds}
                                  idx={idx}
                                />
                              </div>
                              <div className="col-span-1 md:col-span-3">
                                <label className="text-xs text-gray-400 md:hidden">Cases</label>
                                <input type="number" min="1" value={item.quantity}
                                  onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 text-center text-gray-900 bg-white" />
                              </div>
                              <div className="col-span-1 md:col-span-2">
                                <label className="text-xs text-gray-400 md:hidden">Cost (₱)</label>
                                <input type="number" min="0" step="0.01" value={item.unitPrice}
                                  onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white" placeholder="₱0" />
                              </div>
                              <div className="col-span-1 md:col-span-3 flex items-center justify-end gap-1">
                                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                  ₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                                </span>
                                {form.lineItems.length > 1 && (
                                  <button onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-600 ml-1 text-sm shrink-0">✕</button>
                                )}
                              </div>
                            </div>
                            {breakdown && item.productId && (
                              <p className="text-xs text-indigo-500 font-medium mt-1.5 pl-1 flex items-center gap-1">
                                <Box className="w-3 h-3" /> {item.quantity} {getUnitShort(item.unit)} = {breakdown.split("= ")[1]}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 3 — Notes */}
                <div className={`bg-white rounded-2xl p-4 md:p-5 shadow-sm transition-opacity ${!form.supplierId ? "opacity-50 pointer-events-none" : ""}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ${form.supplierId ? "bg-indigo-600" : "bg-gray-300"}`}>3</div>
                    <h2 className="text-sm font-bold text-gray-700">Notes (Optional)</h2>
                  </div>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 text-gray-900 bg-white resize-none"
                    placeholder="Optional notes about this delivery..." />
                </div>
              </div>

              {/* Order Summary sidebar */}
              <div className="w-full lg:w-72 shrink-0">
                <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                    Order Summary</h2>
                  {form.supplierId ? (
                    <div className="mb-4 flex items-center gap-2 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-xs text-indigo-400">Supplier</p>
                        <p className="text-sm font-semibold text-indigo-800">{selectedSupplierName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                      <p className="text-xs text-gray-400">No supplier selected</p>
                    </div>
                  )}

                  {form.deliveryDate && (
                    <div className="mb-4 flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Delivery Date</p>
                        <p className="text-xs font-semibold text-gray-700">
                          {new Date(form.deliveryDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}

                  {validLineItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ClipboardList className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-xs text-gray-400">No items yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {validLineItems.map((item, idx) => {
                        const breakdown = getCaseBreakdown(Number(item.quantity), item.unit);
                        return (
                          <div key={idx} className="py-2 border-b border-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-800 text-xs">{item.productName}</p>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  <UnitPill unit={item.unit} qty={Number(item.quantity)} />
                                  <span className="text-xs text-gray-400">× ₱{Number(item.unitPrice).toLocaleString()}</span>
                                </div>
                                {breakdown && <p className="text-xs text-indigo-500 font-medium mt-0.5">{breakdown}</p>}
                              </div>
                              <span className="text-xs font-semibold text-indigo-700 ml-2 shrink-0">
                                ₱{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-600">Total</span>
                        <span className="text-base font-bold text-indigo-900">₱{calculateTotal(validLineItems).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <button onClick={handleSave} disabled={saving || validLineItems.length === 0 || !form.supplierId}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    {saving ? <><span className="animate-spin inline-block">⏳</span> Submitting...</> : <><span>📤</span> Submit Delivery</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ RECEIVING ══ */}
          {activeTab === "receiving" && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600" />
                    Pending Deliveries — Ready to Receive</h2>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-44">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input type="text" placeholder="Search..." value={receivingSearch}
                        onChange={(e) => { setReceivingSearch(e.target.value); setReceivePage(1); }}
                        className="outline-none text-sm text-gray-700 w-full bg-transparent" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-max">
                      <thead>
                        <tr className="bg-indigo-900 text-white text-xs">
                          <th className="p-3 text-left">Delivery ID</th>
                          <th className="p-3 text-left">Supplier</th>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Items</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={6} className="p-6 text-center text-gray-400">Loading...</td></tr>
                        ) : paginatedReceiving.length === 0 ? (
                          <tr><td colSpan={6} className="p-10 text-center"><div className="flex flex-col items-center gap-2"><Inbox className="w-8 h-8 text-gray-300" /><p className="text-gray-400 text-sm">No pending deliveries.</p></div></td></tr>
                        ) : paginatedReceiving.map((row) => (
                          <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${receivingDelivery?.id === row.id ? "bg-indigo-50" : ""}`}>
                            <td className="p-3"><span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{row.id.slice(0, 8)}...</span></td>
                            <td className="p-3 text-gray-700">{row.supplier?.supplierName || row.supplierId}</td>
                            <td className="p-3 text-gray-500 text-xs">{new Date(row.deliveryDate).toLocaleDateString()}</td>
                            <td className="p-3 text-center text-gray-700">{row.items?.length || 0}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[row.status]?.bg} ${STATUS_CONFIG[row.status]?.text}`}>{row.status}</span></td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <button onClick={() => openReceiveModal(row)} className="border border-green-300 text-green-600 hover:bg-green-50 rounded-lg px-2 py-1 text-xs font-medium">✓ Receive</button>
                                <button onClick={() => handleCancel(row.id)} className="border border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-medium">Cancel</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar page={receivePage} totalPages={receiveTotalPages} setPage={setReceivePage} total={filteredReceiving.length} label="deliveries" />
                </div>
              </div>

              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Receive Items</h2>
                  {!receivingDelivery ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <span className="text-3xl mb-2">👆</span>
                      <p className="text-xs text-gray-400">Click Receive on a delivery to confirm quantities</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {receiveError && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                          <span>⚠️</span><span>{receiveError}</span>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Supplier</p>
                        <p className="text-sm font-medium text-gray-800">{receivingDelivery.supplier?.supplierName}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-2">Items — enter received quantities</p>
                        <div className="space-y-3">
                          {receivingDelivery.items.map((item, i) => {
                            const rq        = receiveQtys.find((r) => r.deliveryItemId === item.id);
                            const remaining = item.orderedQty - item.receivedQty;
                            const unitInfo  = getUnit(item.unit || item.product?.stockUnit);
                            const receivedBtl = rq?.receivedQty && unitInfo.bottlesPerCase
                              ? rq.receivedQty * unitInfo.bottlesPerCase : null;
                            return (
                              <div key={i} className="py-1.5 border-b border-gray-100 last:border-0">
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  {item.product?.productName || item.productId}
                                  {item.product?.size && <span className="text-gray-400 ml-1">{item.product.size}</span>}
                                </p>
                                <p className="text-xs text-gray-400 mb-1.5">
                                  Ordered: <span className="font-medium">{item.orderedQty} {unitInfo.short}</span> ·
                                  Received: <span className="font-medium">{item.receivedQty} {unitInfo.short}</span> ·
                                  Remaining: <span className="font-medium text-indigo-600">{remaining} {unitInfo.short}</span>
                                </p>
                                <div className="flex items-center gap-2">
                                  <input type="number" min="0" max={remaining} value={rq?.receivedQty ?? 0}
                                    onChange={(e) => setReceiveQtys((prev) =>
                                      prev.map((r) => r.deliveryItemId === item.id ? { ...r, receivedQty: Math.min(Number(e.target.value), remaining) } : r)
                                    )}
                                    className="w-16 border border-gray-200 rounded-lg px-1.5 py-1 text-sm text-center outline-none focus:border-indigo-400" />
                                  <span className="text-xs text-gray-500 font-medium">{unitInfo.short}</span>
                                  {receivedBtl !== null && receivedBtl > 0 && (
                                    <span className="text-xs text-indigo-500 font-medium">= {receivedBtl} btl</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <button onClick={handleReceive} disabled={receiving}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2">
                        {receiving ? <><span className="animate-spin">⏳</span> Processing...</> : "✓ Confirm Receipt"}
                      </button>
                      <button onClick={() => setReceivingDelivery(null)} className="w-full border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50">Close</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ HISTORY ══ */}
          {activeTab === "history" && (
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  Delivery History</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-44">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search..." value={historySearch}
                      onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                      className="outline-none text-sm text-gray-700 w-full bg-transparent" />
                  </div>
                  <div className="relative" ref={historyStatusRef}>
                    <button onClick={() => setShowHistoryStatusDrop(!showHistoryStatusDrop)}
                      className={`flex items-center gap-1 border rounded-lg px-3 py-2 text-xs transition-colors ${historyStatus !== "All" ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      🔖 {historyStatus === "All" ? "All Status" : historyStatus} ▾
                    </button>
                    {showHistoryStatusDrop && (
                      <div className="absolute top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-48">
                        {["All","PENDING","PARTIALLY_RECEIVED","DELIVERED","CANCELLED"].map((opt) => (
                          <button key={opt} onClick={() => { setHistoryStatus(opt); setHistoryPage(1); setShowHistoryStatusDrop(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${historyStatus === opt ? "text-indigo-600 font-semibold" : "text-gray-600"}`}>
                            {opt === "All" ? "All Status" : opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {historyStatus !== "All" && (
                    <button onClick={() => { setHistoryStatus("All"); setHistoryPage(1); }} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-2">✕ Clear</button>
                  )}
                  <button onClick={handleExport} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">📤 Export</button>
                </div>
              </div>

              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { label: "Total",     count: deliveries.length,                                              color: "bg-indigo-100 text-indigo-700" },
                  { label: "Pending",   count: deliveries.filter(d => d.status==="PENDING").length,            color: "bg-yellow-100 text-yellow-800" },
                  { label: "Partial",   count: deliveries.filter(d => d.status==="PARTIALLY_RECEIVED").length, color: "bg-blue-100 text-blue-800"     },
                  { label: "Delivered", count: deliveries.filter(d => d.status==="DELIVERED").length,          color: "bg-green-100 text-green-800"   },
                  { label: "Cancelled", count: deliveries.filter(d => d.status==="CANCELLED").length,          color: "bg-red-100 text-red-700"       },
                ].map((s) => <span key={s.label} className={`${s.color} rounded-full px-3 py-1 text-xs font-semibold`}>{s.label}: {s.count}</span>)}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-indigo-900 text-white text-xs">
                      <th className="p-3 text-left">ID</th>
                      <th className="p-3 text-left">Supplier</th>
                      <th className="p-3 text-left">Delivery Date</th>
                      <th className="p-3 text-left">Items</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="p-6 text-center text-gray-400">Loading...</td></tr>
                    ) : paginatedHistory.length === 0 ? (
                      <tr><td colSpan={6} className="p-10 text-center"><div className="flex flex-col items-center gap-2"><Inbox className="w-8 h-8 text-gray-300" /><p className="text-gray-400 text-sm">No deliveries found.</p></div></td></tr>
                    ) : paginatedHistory.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3"><span className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-mono">{row.id.slice(0, 8)}...</span></td>
                        <td className="p-3 text-gray-700">{row.supplier?.supplierName || row.supplierId}</td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(row.deliveryDate).toLocaleDateString()}</td>
                        <td className="p-3 text-center text-gray-700">{row.items?.length || 0}</td>
                        <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[row.status]?.bg} ${STATUS_CONFIG[row.status]?.text}`}>{row.status}</span></td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewDelivery(row)} className="border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 text-xs font-medium">View</button>
                            {row.status !== "DELIVERED" && row.status !== "CANCELLED" && (
                              <button onClick={() => handleCancel(row.id)} className="border border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-medium">Cancel</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={historyPage} totalPages={historyTotalPages} setPage={setHistoryPage} total={filteredHistory.length} label="deliveries" />
            </div>
          )}
        </div>
      </main>

      {/* VIEW DELIVERY MODAL */}
      {viewDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Delivery Details</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{viewDelivery.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[viewDelivery.status]?.bg} ${STATUS_CONFIG[viewDelivery.status]?.text}`}>{viewDelivery.status}</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Supplier</p>
                <p className="text-sm font-medium text-gray-800">{viewDelivery.supplier?.supplierName || viewDelivery.supplierId}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Delivery Date</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(viewDelivery.deliveryDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Total Items</p>
                  <p className="text-sm font-medium text-gray-800">{viewDelivery.totalItems}</p>
                </div>
              </div>
              {viewDelivery.notes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{viewDelivery.notes}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-2">Items</p>
                <div className="space-y-3">
                  {viewDelivery.items?.map((item, idx) => {
                    const unitInfo    = getUnit(item.unit || item.product?.stockUnit);
                    const orderedBtl  = unitInfo.bottlesPerCase ? item.orderedQty  * unitInfo.bottlesPerCase : null;
                    const receivedBtl = unitInfo.bottlesPerCase ? item.receivedQty * unitInfo.bottlesPerCase : null;
                    return (
                      <div key={idx} className="py-2 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">
                              {item.product?.productName || item.productId}
                              {item.product?.size && <span className="text-gray-500 font-normal ml-1">{item.product.size}</span>}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <UnitPill unit={item.unit || item.product?.stockUnit} />
                              <span className="text-xs text-gray-400">{unitInfo.label}</span>
                            </div>
                            <div className="mt-1.5 space-y-0.5">
                              <p className="text-xs text-gray-500">
                                Ordered: <span className="font-medium text-gray-700">{item.orderedQty} {unitInfo.short}</span>
                                {orderedBtl !== null && <span className="text-indigo-500 ml-1">= {orderedBtl} btl</span>}
                              </p>
                              <p className="text-xs text-gray-500">
                                Received: <span className="font-medium text-green-600">{item.receivedQty} {unitInfo.short}</span>
                                {receivedBtl !== null && <span className="text-green-500 ml-1">= {receivedBtl} btl</span>}
                              </p>
                              <p className="text-xs text-gray-500">
                                Returned: <span className="font-medium text-red-500">{item.returnedQty} {unitInfo.short}</span>
                              </p>
                            </div>
                          </div>
                          <span className="text-gray-500 text-xs ml-3 shrink-0">₱{item.costPrice}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <button onClick={() => setViewDelivery(null)} className="w-full mt-5 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
          </div>
        </div>
      )}

      {createSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✅</span><span className="text-sm font-medium">{createSuccess}</span>
        </div>
      )}
    </div>
  );
}