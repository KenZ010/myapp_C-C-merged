"use client";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { api } from "@/lib/api";
import {
  PERIOD_TABS,
  earliestOf,
  getReportWindow,
  withinRange,
  type PeriodTab,
  type DatedRecord,
  type DateRange,
} from "@/lib/periodWindow";
import { 
  LayoutDashboard, ShoppingCart, Users, BarChart3, 
  Package, User, ClipboardList, RotateCcw, AlertTriangle, Gift, Bell, Calendar
} from "lucide-react";

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
  stock: number;
  stockUnit: string;
};

// Stock arrives under either key depending on the endpoint, so both are accepted.
function normalizeProduct(p: Record<string, unknown>): Product {
  return {
    id: String(p.id ?? ""),
    productName: String(p.productName ?? ""),
    price: Number(p.price ?? 0),
    image: p.image ? String(p.image) : null,
    category: String(p.category ?? ""),
    stock: Number(p.stockQuantity ?? p.stock ?? 0) || 0,
    stockUnit: String(p.stockUnit ?? "btl"),
  };
}

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

function buildTopSelling(txs: Transaction[]) {
  const map: Record<string, { name: string; category: string; units: number; revenue: number }> = {};
  txs.forEach(tx => tx.orderLines.forEach(line => {
    if (!map[line.productName]) map[line.productName] = { name: line.productName, category: line.category, units: 0, revenue: 0 };
    map[line.productName].units   += line.quantity;
    map[line.productName].revenue += line.subtotal;
  }));
  return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 3);
}

type ReturnRequest = DatedRecord & { id: string; amount: number; status: string | null };

function summarizeOrders(txs: Transaction[], range: DateRange) {
  const scoped = withinRange(txs, range);
  const names = new Set<string>();
  let sales = 0;
  let units = 0;
  scoped.forEach(t => {
    sales += t.total;
    t.orderLines.forEach(line => {
      units += line.quantity;
      names.add(line.productName);
    });
  });
  return { sales, orders: scoped.length, units, products: names.size };
}

function unwrapList(payload: unknown): Record<string, unknown>[] {
  let node: unknown = payload;
  for (let depth = 0; depth < 3 && node && !Array.isArray(node); depth++) {
    const obj = node as Record<string, unknown>;
    node = obj.data ?? obj.returnRequests ?? obj.orders ?? obj.items;
  }
  return Array.isArray(node) ? (node as Record<string, unknown>[]) : [];
}

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

function pickAmount(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = Number(source[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function normalizeActiveOrders(payload: unknown): DatedRecord[] {
  return unwrapList(payload).map((raw, i) => ({
    id: pickString(raw, ["id", "orderId"]) || `active-${i}`,
    createdAt: pickString(raw, ["createdAt", "orderDate", "date"]),
  }));
}

function normalizeReturns(payload: unknown): ReturnRequest[] {
  return unwrapList(payload).map((raw, i) => ({
    id: pickString(raw, ["id", "returnRequestId"]) || `return-${i}`,
    createdAt: pickString(raw, ["createdAt", "requestedAt", "returnDate", "date"]),
    amount: pickAmount(raw, ["refundAmount", "totalRefund", "refundTotal", "totalAmount", "amount", "total"]),
    status: pickString(raw, ["status"]) || null,
  }));
}

function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const rankColors = ["bg-amber-400 text-amber-900", "bg-gray-300 text-gray-700", "bg-orange-300 text-orange-900"];

// Real category values come from the API in these keys; the chart shows readable
// names. Order here is the order slices appear in, biggest or not.
const STOCK_CATEGORIES = [
  { key: "SOFTDRINKS",  name: "Soft Drinks",  color: "#60a5fa" },
  { key: "BEER",         name: "Beer",         color: "#7c3aed" },
  { key: "ENERGY_DRINK", name: "Energy Drink", color: "#f59e0b" },
  { key: "WATER",        name: "Water",        color: "#f97316" },
  { key: "JUICE",        name: "Juice",        color: "#22c55e" },
  { key: "OTHER",        name: "Other",        color: "#9ca3af" },
];

// Stock is held in mixed units, so everything is converted to bottles before it is
// compared. A case of 24 counts as 24 bottles, not as 1. Mirrors the CASE_UNITS
// table on the inventory page.
const BOTTLES_PER_UNIT: Record<string, number> = {
  case_24: 24,
  case_12: 12,
  case_6: 6,
  btl: 1,
  pcs: 1,
};

type StockSlice = { name: string; bottles: number; pct: number; color: string };

function buildStockByCategory(products: Product[]): { slices: StockSlice[]; total: number } {
  const totals = new Map<string, number>();
  let total = 0;

  products.forEach(p => {
    const bottles = p.stock * (BOTTLES_PER_UNIT[p.stockUnit] ?? 1);
    if (bottles <= 0) return;
    const key = p.category ? p.category.toUpperCase() : "OTHER";
    totals.set(key, (totals.get(key) ?? 0) + bottles);
    total += bottles;
  });

  const known = STOCK_CATEGORIES.filter(c => (totals.get(c.key) ?? 0) > 0);

  // Anything the API sends that isn't in the table still has to appear, otherwise
  // the slices would silently not add up to the stock on hand.
  const unknownKeys = [...totals.keys()].filter(
    k => !STOCK_CATEGORIES.some(c => c.key === k) && (totals.get(k) ?? 0) > 0,
  );

  const slices = [
    ...known.map(c => ({ name: c.name, color: c.color, bottles: totals.get(c.key) ?? 0 })),
    ...unknownKeys.map(k => ({ name: titleCase(k), color: "#9ca3af", bottles: totals.get(k) ?? 0 })),
  ]
    .sort((a, b) => b.bottles - a.bottles)
    .map(s => ({ ...s, pct: total > 0 ? (s.bottles / total) * 100 : 0 }));

  return { slices, total };
}

function titleCase(key: string): string {
  return key
    .toLowerCase()
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Inventory Maintenance", icon: ShoppingCart, path: "/inventory" },
  { label: "Supplier Maintenance", icon: Users, path: "/supplier" },
  { label: "Sales Reports", icon: BarChart3, path: "/sales" },
  { label: "Product Management", icon: Package, path: "/product" },
  { label: "Account Management", icon: User, path: "/account" },
  { label: "Purchase Order", icon: ClipboardList, path: "/purchase-order" },
  { label: "Loss Report", icon: AlertTriangle, path: "/loss-report" },
  { label: "Promo Management", icon: Gift, path: "/promo" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: any) => {
  const { name, pct, x, y, cx } = props;
  return (
    <text x={x} y={y} fill="#555" fontSize={11} textAnchor={x > cx ? "start" : "end"}>
      {`${name}: ${pct.toFixed(1)}%`}
    </text>
  );
};

const METRIC_TONES = { blue: "bg-blue-50", gray: "bg-gray-50" } as const;

function SalesMetric({
  label, value, detail, current, previous, unit, goodDirection, comparison, noComparison, tooltip, loading, tone,
}: {
  label: string;
  value: string;
  detail: string;
  current: number;
  previous: number | null;
  /** Money reads better as a percentage; small counts read better as a count. */
  unit: "money" | "count";
  /** Which way round is good news. Returns invert this, so a rise reads as bad. */
  goodDirection: "up" | "down";
  comparison: string;
  noComparison: string;
  tooltip: string;
  loading: boolean;
  tone: keyof typeof METRIC_TONES;
}) {
  // previous is null on the "All" tab, which has no window to compare against.
  const before = previous ?? 0;
  const change = current - before;
  const rising = change > 0;
  const comparable = previous !== null && (unit === "money" ? before > 0 : before > 0 || current > 0);

  let sentence = noComparison;
  if (comparable) {
    if (change === 0) sentence = `no change from ${comparison}`;
    else if (unit === "money") sentence = `${Math.abs((change / before) * 100).toFixed(0)}% ${rising ? "more" : "fewer"} than ${comparison}`;
    else sentence = `${Math.abs(change)} ${rising ? "more" : "fewer"} than ${comparison}`;
  }

  // No movement is neutral — neither green nor red — and so is having nothing to
  // compare against. Only real movement takes a good or bad colour.
  const good = !comparable || change === 0 ? null : goodDirection === "up" ? rising : !rising;
  const toneClass = good === null ? "text-gray-400" : good ? "text-green-600" : "text-red-500";
  const arrow = !comparable || change === 0 ? "" : rising ? "↑" : "↓";

  return (
    <div className={`${METRIC_TONES[tone]} rounded-xl p-3`}>
      <p className="text-xs text-gray-500">{label}</p>
      {loading ? (
        <>
          <div className="h-7 mt-1 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 mt-2 w-24 rounded bg-gray-200 animate-pulse" />
        </>
      ) : (
        <>
          <p className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{value}</p>
          <p title={tooltip} className={`text-xs mt-1 flex items-start gap-1 ${toneClass}`}>
            {arrow && <span aria-hidden="true" className="leading-none">{arrow}</span>}
            <span>{sentence}</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">{detail}</p>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<PeriodTab>("Daily");
  const [salesTab, setSalesTab] = useState<(typeof PERIOD_TABS)[number]>("Daily");
  const [reportTab, setReportTab] = useState<PeriodTab>("Daily");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);


  // Data states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [activeOrders, setActiveOrders] = useState<DatedRecord[]>([]);
  const [loadingActiveOrders, setLoadingActiveOrders] = useState(true);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(true);
  // Timestamp of the last sales refresh; advances the rolling period window and
  // records when the server last became unreachable.
  const [salesRefreshedAt, setSalesRefreshedAt] = useState(0);
  const [salesStaleAt, setSalesStaleAt] = useState<number | null>(null);
  // One shared guard across every focus-triggered refresh, so a single tab switch
  // starts one round of requests rather than two overlapping ones.
  const refreshInFlight = useRef(false);
  const lastRefresh = useRef(0);

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
  
  // ✅ Products back both the stock pie and the Product Maintenance list, so they
  // refresh with the same tab-focus rule as sales. `withSpinner` is false on
  // background refreshes so the pie never blanks out to its loading state.
  const fetchProducts = useCallback(async (withSpinner: boolean) => {
    try {
      if (withSpinner) setLoadingProducts(true);
      const data = await api.getProducts();
      const list = Array.isArray(data) ? data : [];
      setProducts(list.map((p) => normalizeProduct(p as Record<string, unknown>)));
      return true;
    } catch (err) {
      console.error("Failed to fetch products:", err);
      return false;
    } finally {
      if (withSpinner) setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { fetchProducts(true); }, [fetchProducts]);

  // ✅ All three sales endpoints are fetched together so the Sales Report, Top 3
  // Selling Items and Transaction Logs cards stay consistent with each other.
  // `withSpinner` is false on background refreshes, so returning to the tab never
  // blanks out figures that are already on screen.
  const fetchSalesData = useCallback(async (withSpinner: boolean) => {
    if (withSpinner) {
      setLoadingTransactions(true);
      setLoadingActiveOrders(true);
      setLoadingReturns(true);
    }

    // getActiveOrders and getReturnRequests have never been consumed by this app,
    // so their payloads are unwrapped defensively instead of trusted as arrays.
    const [completedOk, activeOk, returnsOk] = await Promise.all([
      (async () => {
        try {
          const data = await api.getCompletedOrders();
          setTransactions((Array.isArray(data) ? data : []).map(normalizeTransaction));
          return true;
        } catch (err) {
          console.error("Failed to fetch completed orders:", err);
          return false;
        }
      })(),
      (async () => {
        try {
          const data = await api.getActiveOrders();
          setActiveOrders(normalizeActiveOrders(data));
          return true;
        } catch (err) {
          console.error("Failed to fetch active orders:", err);
          return false;
        }
      })(),
      (async () => {
        try {
          const data = await api.getReturnRequests({ limit: 200 });
          setReturns(normalizeReturns(data));
          return true;
        } catch (err) {
          console.error("Failed to fetch return requests:", err);
          return false;
        }
      })(),
    ]);

    if (withSpinner) {
      setLoadingTransactions(false);
      setLoadingActiveOrders(false);
      setLoadingReturns(false);
    }

    const stamp = Date.now();
    // Only flag the card when nothing at all could be reached, so one failing
    // endpoint does not discard the figures the other two returned. The window
    // only advances on a load that actually reached the server.
    if (completedOk || activeOk || returnsOk) {
      setSalesRefreshedAt(stamp);
      setSalesStaleAt(null);
    } else {
      setSalesStaleAt(stamp);
    }
    return stamp;
  }, []);

  useEffect(() => { fetchSalesData(true); }, [fetchSalesData]);

  // ✅ Orders and stock both change outside this app (api.placeOrder has no
  // caller), so the only signal available here is the user coming back to the tab.
  // Returning to the window fires both focus and visibilitychange, hence the shared
  // in-flight flag and cooldown — one tab switch must not fire two rounds of requests.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (refreshInFlight.current) return;
      if (Date.now() - lastRefresh.current < 3000) return;
      refreshInFlight.current = true;
      Promise.allSettled([fetchSalesData(false), fetchProducts(false)])
        .then(() => { lastRefresh.current = Date.now(); })
        .finally(() => { refreshInFlight.current = false; });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchSalesData, fetchProducts]);

  // Oldest completed order, used as the starting point of the "All" window.
  const earliestOrder = useMemo(() => earliestOf(transactions), [transactions]);

  const stockBreakdown = useMemo(() => buildStockByCategory(products), [products]);

  // The counted window ends at the moment the figures were loaded, so the range
  // labels always describe the data actually on screen.
  const reportWindow = useMemo(
    () => getReportWindow(reportTab, earliestOrder, new Date(salesRefreshedAt || Date.now())),
    [reportTab, earliestOrder, salesRefreshedAt],
  );
  const salesWindow = useMemo(
    () => getReportWindow(salesTab, earliestOrder, new Date(salesRefreshedAt || Date.now())),
    [salesTab, earliestOrder, salesRefreshedAt],
  );
  const logWindow = useMemo(
    () => getReportWindow(activeTab, earliestOrder, new Date(salesRefreshedAt || Date.now())),
    [activeTab, earliestOrder, salesRefreshedAt],
  );
  const logTransactions = useMemo(
    () => withinRange(transactions, logWindow.current),
    [transactions, logWindow],
  );
  const logCount = logTransactions.length;

  const topSelling = buildTopSelling(withinRange(transactions, salesWindow.current));

  const currentOrders = useMemo(
    () => summarizeOrders(transactions, reportWindow.current),
    [transactions, reportWindow],
  );
  const previousOrders = useMemo(
    () => (reportWindow.previous ? summarizeOrders(transactions, reportWindow.previous) : null),
    [transactions, reportWindow],
  );

  const activeCurrent = useMemo(
    () => withinRange(activeOrders, reportWindow.current).length,
    [activeOrders, reportWindow],
  );
  const activePrevious = useMemo(
    () => (reportWindow.previous ? withinRange(activeOrders, reportWindow.previous).length : null),
    [activeOrders, reportWindow],
  );

  const currentReturns = useMemo(
    () => withinRange(returns, reportWindow.current),
    [returns, reportWindow],
  );
  const previousReturns = useMemo(
    () => (reportWindow.previous ? withinRange(returns, reportWindow.previous) : null),
    [returns, reportWindow],
  );
  const refundedTotal = currentReturns.reduce((sum, r) => sum + r.amount, 0);

  // Plain words for the comparison, keyed off the tab the user just clicked rather
  // than raw dates. The exact ranges stay in the description line and the tooltip.
  const comparison = reportTab === "Daily"
    ? "yesterday"
    : reportTab === "Weekly"
      ? "the 7 days before"
      : reportTab === "Monthly"
        ? "the same days last month"
        : "an earlier period";
  const noComparison = reportTab === "All" ? "no earlier period to compare" : "nothing to compare yet";
  const rangeTooltip = reportWindow.compareLabel
    ? `Counted ${reportWindow.rangeLabel}, compared with ${reportWindow.compareLabel}.`
    : `Counted every completed order since ${reportWindow.rangeLabel}.`;

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
            <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Sales Report</h2>
                <button onClick={() => router.push("/sales")}
                  className="flex items-center gap-1 text-xs border border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  <BarChart3 className="w-3 h-3" /> Details
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Period:
                </span>
                {PERIOD_TABS.map((tab) => (
                  <button key={tab} onClick={() => setReportTab(tab)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${reportTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {tab}
                  </button>
                ))}
              </div>

              <p className="text-xs leading-relaxed text-gray-400 mb-3">
                {reportWindow.compareLabel && reportWindow.comparePhrase ? (
                  <>These figures cover completed orders from <span className="font-medium text-gray-500">{reportWindow.rangeLabel}</span>.
                    {" "}Each line below compares that with {reportWindow.comparePhrase}
                    {" "}(<span className="font-medium text-gray-500">{reportWindow.compareLabel}</span>).</>
                ) : (
                  <>These figures cover every completed order since <span className="font-medium text-gray-500">{reportWindow.rangeLabel}</span>.
                    {" "}There is no earlier period of the same length, so there is nothing to compare against.</>
                )}
              </p>

              {salesStaleAt !== null && (
                <p className="text-xs leading-relaxed text-amber-600 mb-3">
                  Couldn&apos;t reach the server, so these figures may be out of date. Last successful load{" "}
                  <span className="font-medium">
                    {new Date(salesRefreshedAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {" "}— switching away from this tab and back will retry.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <SalesMetric
                  label="Total Sales"
                  value={formatPeso(currentOrders.sales)}
                  detail={currentOrders.orders === 0
                    ? "no orders in this period"
                    : `${currentOrders.orders} ${currentOrders.orders === 1 ? "order" : "orders"}`}
                  current={currentOrders.sales}
                  previous={previousOrders?.sales ?? null}
                  unit="money"
                  goodDirection="up"
                  comparison={comparison}
                  noComparison={noComparison}
                  tooltip={rangeTooltip}
                  loading={loadingTransactions}
                  tone="blue"
                />
                <SalesMetric
                  label="Ongoing Orders"
                  value={String(activeCurrent)}
                  detail={`${activeOrders.length} open in total`}
                  current={activeCurrent}
                  previous={activePrevious}
                  unit="count"
                  goodDirection="up"
                  comparison={comparison}
                  noComparison={noComparison}
                  tooltip={rangeTooltip}
                  loading={loadingActiveOrders}
                  tone="gray"
                />
                <SalesMetric
                  label="Product Sold"
                  value={String(currentOrders.units)}
                  detail={`${currentOrders.units} units across ${currentOrders.products} ${currentOrders.products === 1 ? "product" : "products"}`}
                  current={currentOrders.units}
                  previous={previousOrders?.units ?? null}
                  unit="count"
                  goodDirection="up"
                  comparison={comparison}
                  noComparison={noComparison}
                  tooltip={rangeTooltip}
                  loading={loadingTransactions}
                  tone="gray"
                />
                <SalesMetric
                  label="Return Items"
                  value={String(currentReturns.length)}
                  detail={refundedTotal > 0 ? `${formatPeso(refundedTotal)} refunded` : "refund amount unavailable"}
                  current={currentReturns.length}
                  previous={previousReturns?.length ?? null}
                  unit="count"
                  goodDirection="down"
                  comparison={comparison}
                  noComparison={noComparison}
                  tooltip={rangeTooltip}
                  loading={loadingReturns}
                  tone="blue"
                />
              </div>
            </div>

            {/* Top 3 Selling Items */}
            <div className="md:col-span-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Top 3 Selling Items</h2>
                <button onClick={() => router.push("/inventory")}
                  className="flex items-center gap-1 text-xs border border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  <ShoppingCart className="w-3 h-3" /> View Inventory
                </button>
              </div>
              <div className="flex gap-1.5 mb-2">
                {PERIOD_TABS.map((tab) => (
                  <button key={tab} onClick={() => setSalesTab(tab)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${salesTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Items sold {salesWindow.rangeLabel}
              </p>
              {loadingTransactions ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading sales...</p>
              ) : topSelling.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  {transactions.length === 0 ? "No sales recorded yet." : `No items sold between ${salesWindow.rangeLabel}.`}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topSelling.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${rankColors[i]}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.units} sold</p>
                      </div>
                      <p className="text-sm font-semibold text-green-600 shrink-0">₱{item.revenue.toLocaleString()}</p>
                    </div>
                  ))}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{suppliers.length} total</span>
                  <button onClick={() => router.push("/supplier")}
                    className="text-xs border border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                    See more
                  </button>
                </div>
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

            {/* Stock by Category */}
            <div className="md:col-span-7 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-bold text-green-500">Stock by Category</h2>
                <span className="text-xs text-gray-400">
                  {stockBreakdown.total > 0
                    ? `${stockBreakdown.total.toLocaleString()} bottles on hand`
                    : "No stock recorded"}
                </span>
              </div>
              {loadingProducts ? (
                <p className="text-sm text-gray-400 text-center py-10">Loading stock...</p>
              ) : stockBreakdown.slices.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">
                  No stock to chart yet. Add stock to a product and it will appear here.
                </p>
              ) : (
                <div className="flex justify-center items-start gap-4 flex-wrap">
                  <PieChart width={320} height={220}>
                    <Pie data={stockBreakdown.slices} cx={155} cy={100} outerRadius={90} dataKey="bottles" label={renderLabel} labelLine={true}>
                      {stockBreakdown.slices.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const slice = item?.payload as StockSlice | undefined;
                        const bottles = Number(value);
                        return [`${bottles.toLocaleString()} bottles (${((bottles / stockBreakdown.total) * 100).toFixed(1)}%)`, slice?.name ?? ""];
                      }}
                    />
                  </PieChart>
                  <div className="flex flex-col items-start gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    {stockBreakdown.slices.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2 whitespace-nowrap">
                        <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: entry.color, border: "1px solid rgba(0,0,0,0.1)" }} />
                        <span className="text-sm font-medium text-gray-700">{entry.name} {entry.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Share of stock on hand, with cases converted to bottles so they can be compared.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">Product Maintenance</h2>
                <button onClick={() => router.push("/product")}
                  className="text-xs border border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  See more
                </button>
              </div>

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
                  onClick={() => router.push("/sales")}
                  className="text-xs border border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  See more
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                {PERIOD_TABS.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {logWindow.rangeLabel}
                <span className="text-gray-300">· {logCount} {logCount === 1 ? "order" : "orders"}</span>
              </p>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {loadingTransactions ? (
                  <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No transactions to show</p>
                ) : (
                  (() => {
                    if (logCount === 0) return <p className="text-sm text-gray-400 text-center py-6">No transactions between {logWindow.rangeLabel}</p>;
                    return logTransactions.slice(0, 10).map((t) => (
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
