"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/app/providers";

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderStatus =
  | "Pending"
  | "Processing"
  | "Out for Delivery"
  | "Completed"
  | "Cancelled";

type OrderItem = { name: string; qty: number; price: number };

type Order = {
  id: string;
  date: string;
  customer: string;
  address: string;
  total: number;
  status: OrderStatus;
  isOnline: boolean;
  items: OrderItem[];
  cashReceived?: number;
  changeDue?: number;
};

// ── SVG Icons (same style as the Transaction page) ────────────────────────────
const svgProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = {
  orders: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps} strokeWidth={1.8}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>),
  refresh: (<svg width="15" height="15" viewBox="0 0 24 24" {...svgProps}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>),
  warning: (<svg width="16" height="16" viewBox="0 0 24 24" {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  user: (<svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  pin: (<svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  clock: (<svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  box: (<svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>),
  creditCard: (<svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>),
  check: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>),
  x: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  truck: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  hourglass: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/></svg>),
  gear: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  truckLg: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  chevronDown: (<svg width="11" height="11" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>),
  chevronUp: (<svg width="11" height="11" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><polyline points="18 15 12 9 6 15"/></svg>),
  emptyState: (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>),
};

// ── Status config ─────────────────────────────────────────────────────────────
const statusStyle: Record<OrderStatus, { bg: string; color: string; border: string }> = {
  Pending:            { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  Processing:         { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" },
  "Out for Delivery": { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  Completed:          { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  Cancelled:          { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

const statusIcon: Record<OrderStatus, React.ReactNode> = {
  Pending:            Icon.clock,
  Processing:         <svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  "Out for Delivery": Icon.truck,
  Completed:          Icon.check,
  Cancelled:          Icon.x,
};

const statusMap: Record<string, OrderStatus> = {
  PENDING:          "Pending",
  PROCESSING:       "Processing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  COMPLETED:        "Completed",
  CANCELLED:        "Cancelled",
  CANCELED:         "Cancelled",
};

const backendStatus: Record<OrderStatus, string> = {
  Pending:            "PENDING",
  Processing:         "PROCESSING",
  "Out for Delivery": "OUT_FOR_DELIVERY",
  Completed:          "COMPLETED",
  Cancelled:          "CANCELLED",
};

const ACTIVE_STATUSES: OrderStatus[] = ["Pending", "Processing", "Out for Delivery"];

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Peso amount with 2 decimals, e.g. 12493.6 -> "12,493.60" */
const peso = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function normalizeOrder(o: Record<string, unknown>): Order {
  const rawStatus = String(o.status ?? "PENDING").toUpperCase();
  const status: OrderStatus = statusMap[rawStatus] ?? "Pending";
  const customer = o.customer as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];

  const payment = o.payment as Record<string, unknown> | null;
  const cashReceived = payment?.cashReceived ?? payment?.amountReceived ?? payment?.tendered;
  const changeRaw    = payment?.change ?? payment?.changeAmount ?? payment?.changeDue;

  return {
    id: String(o.id ?? ""),
    date: o.createdAt
      ? new Date(String(o.createdAt)).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : "—",
    customer: customer ? String(customer.name ?? "Walk-in") : "Walk-in",
    address:  customer ? String((customer.address as string) ?? "—") : "—",
    total:    Number(o.totalAmount ?? 0),
    status,
    isOnline: !!customer,
    items: rawLines.map((l) => {
      const product = l.product as Record<string, unknown> | null;
      return {
        name:  product ? String(product.productName ?? "Item") : "Item",
        qty:   Number(l.quantity ?? 0),
        price: Number(l.price ?? 0),
      };
    }),
    cashReceived:
      cashReceived !== undefined && cashReceived !== null ? Number(cashReceived) : undefined,
    changeDue:
      changeRaw !== undefined && changeRaw !== null ? Number(changeRaw) : undefined,
  };
}

type FilterTab = "All Orders" | OrderStatus;
const filterTabs: FilterTab[] = ["All Orders", "Pending", "Processing", "Out for Delivery"];

// ── Skeletons ─────────────────────────────────────────────────────────────────
const shimmerBg: React.CSSProperties = {
  background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};

function SkeletonStatCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "20px 22px" }}>
      <div style={{ ...shimmerBg, height: "11px", width: "80px", borderRadius: "6px", marginBottom: "12px" }} />
      <div style={{ ...shimmerBg, height: "28px", width: "60px", borderRadius: "6px" }} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ ...shimmerBg, width: "110px", height: "13px", borderRadius: "6px" }} />
          <div style={{ ...shimmerBg, width: "80px", height: "11px", borderRadius: "6px" }} />
        </div>
        <div style={{ ...shimmerBg, width: "80px", height: "24px", borderRadius: "20px" }} />
      </div>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {[100, 140, 60].map((w, i) => (
          <div key={i} style={{ ...shimmerBg, width: `${w}px`, height: "13px", borderRadius: "6px" }} />
        ))}
        <div style={{ ...shimmerBg, height: "38px", borderRadius: "8px" }} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PendingPage() {
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<FilterTab>("All Orders");
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const socket = useSocket();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await api.getActiveOrders();
      if (data?.message) { setError(data.message); setOrders([]); return; }
      const raw: Record<string, unknown>[] = Array.isArray(data) ? data : [];
      const activeOrders = raw
        .map(normalizeOrder)
        .filter((o) => ACTIVE_STATUSES.includes(o.status));
      setOrders(activeOrders);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Poll every 10 seconds as fallback — DISABLED for testing
  // useEffect(() => {
  //   pollingRef.current = setInterval(() => fetchOrders(true), 10_000);
  //   return () => {
  //     if (pollingRef.current) clearInterval(pollingRef.current);
  //   };
  // }, [fetchOrders]);

  // Socket: refetch on new order + when socket (re)connects
  useEffect(() => {
    if (!socket) return;

    // Fetch immediately when socket connects (catches missed events during refresh)
    fetchOrders(true);

    // Use a named handler so cleanup removes ONLY this page's listener.
    // socket.off("event") with no handler removes every listener for that event,
    // including the cashier layout's toast listener.
    const refresh = () => fetchOrders(true);

    socket.on("order:new",       refresh);
    socket.on("order:completed", refresh);
    socket.on("order:status",    refresh);

    return () => {
      socket.off("order:new",       refresh);
      socket.off("order:completed", refresh);
      socket.off("order:status",    refresh);
    };
  }, [socket, fetchOrders]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdatingId(id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await api.updateOrderStatus(id, backendStatus[status]);
      if (status === "Completed" || status === "Cancelled") {
        setTimeout(() => setOrders((prev) => prev.filter((o) => o.id !== id)), 1500);
      }
    } catch {
      // keep optimistic state
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = activeTab === "All Orders" ? orders : orders.filter((o) => o.status === activeTab);
  const tabCount = (tab: FilterTab) =>
    tab === "All Orders" ? orders.length : orders.filter((o) => o.status === tab).length;

  const statCards = [
    { label: "Pending",     status: "Pending"          as OrderStatus, icon: Icon.hourglass, accent: "#d97706", light: "#fffbeb" },
    { label: "Processing",  status: "Processing"       as OrderStatus, icon: Icon.gear,      accent: "#4f46e5", light: "#eef2ff" },
    { label: "In Transit",  status: "Out for Delivery" as OrderStatus, icon: Icon.truckLg,   accent: "#ea580c", light: "#fff7ed" },
  ];

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .btn-outline:hover { background: #f8fafc !important; }
        .order-card { transition: box-shadow 0.15s, border-color 0.15s; }
        .order-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.06); border-color: #dfe3f0 !important; }
        .link-btn:hover { color: #3730a3 !important; }
      `}</style>

      <div style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>{Icon.orders}</div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Active Orders</h1>
            </div>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Monitor and update the status of incoming customer orders</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {lastUpdated && (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Updated {lastUpdated.toLocaleTimeString("en-PH", { timeStyle: "short" })}
              </span>
            )}
            <button onClick={() => fetchOrders()} className="btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", transition: "background 0.15s" }}>
              <span style={{ color: "#64748b", display: "flex" }}>{Icon.refresh}</span> Refresh
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px", marginBottom: "24px" }}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)
            : statCards.map((s) => (
                <div key={s.label} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: s.light, display: "flex", alignItems: "center", justifyContent: "center", color: s.accent }}>{s.icon}</div>
                  </div>
                  <p style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                    {orders.filter((o) => o.status === s.status).length}
                  </p>
                </div>
              ))}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "2px", marginBottom: "24px", background: "#f1f5f9", borderRadius: "10px", padding: "3px", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
          {filterTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", background: isActive ? "#fff" : "transparent", color: isActive ? "#1e1b4b" : "#64748b", boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px" }}>
                {tab}
                <span style={{ background: isActive ? "#eef2ff" : "#e2e8f0", color: isActive ? "#4f46e5" : "#64748b", padding: "1px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
                  {loading ? "…" : tabCount(tab)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", borderRadius: "10px", padding: "13px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #fecaca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c" }}>
              {Icon.warning}
              <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{error}</p>
            </div>
            <button onClick={() => fetchOrders()} style={{ background: "#b91c1c", color: "#fff", border: "none", borderRadius: "7px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "60px", textAlign: "center", border: "1px solid #eaecf4" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              {Icon.emptyState}
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#334155", margin: 0 }}>No active orders</p>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                {activeTab === "All Orders" ? "All orders are completed or cancelled." : `No orders with status "${activeTab}".`}
              </p>
            </div>
          </div>
        )}

        {/* Orders Grid */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", alignItems: "start" }}>
            {filtered.map((order) => {
              const s          = statusStyle[order.status];
              const isExpanded = expandedId === order.id;
              const isUpdating = updatingId === order.id;

              const sub = order.items.reduce((acc, i) => acc + i.price * i.qty, 0);
              const vat = sub * 0.12;

              return (
                <div key={order.id} className="order-card" style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eaecf4", overflow: "hidden" }}>

                  {/* Card header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                    <div style={{ minWidth: 0 }}>
                      <span title={order.id} style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "#4f46e5", background: "#eef2ff", padding: "3px 8px", borderRadius: "5px", display: "inline-block" }}>
                        {order.id.slice(0, 12)}…
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", color: "#94a3b8" }}>
                        {Icon.clock}
                        <span style={{ fontSize: "12px", color: "#64748b" }}>{order.date}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", flexShrink: 0 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                        {statusIcon[order.status]} {order.status}
                      </span>
                      {order.isOnline && (
                        <span style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "10.5px", fontWeight: 600, background: "#eff6ff", color: "#2563eb" }}>Online</span>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
                      {[
                        { icon: Icon.user, label: "Customer", value: order.customer },
                        { icon: Icon.pin,  label: "Address",  value: order.address  },
                      ].map((row) => (
                        <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                          <span style={{ color: "#94a3b8", marginTop: "3px", display: "flex" }}>{row.icon}</span>
                          <div>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</p>
                            <p style={{ fontSize: "13px", fontWeight: 500, color: "#0f172a", margin: "2px 0 0" }}>{row.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Amount breakdown */}
                    <div style={{ background: "#f8fafc", borderRadius: "10px", border: "1px solid #eaecf4", padding: "12px 14px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", marginBottom: "8px" }}>
                        {Icon.creditCard}
                        <p style={{ fontSize: "11px", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount breakdown</p>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b", padding: "2px 0" }}>
                        <span>Subtotal</span>
                        <span>₱{peso(sub)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b", padding: "2px 0" }}>
                        <span>VAT (12%)</span>
                        <span>₱{peso(vat)}</span>
                      </div>
                      <div style={{ borderTop: "1px solid #e2e8f0", margin: "8px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>Total</span>
                        <span style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>₱{peso(sub + vat)}</span>
                      </div>
                      {order.cashReceived !== undefined && (
                        <>
                          <div style={{ borderTop: "1px dashed #d5dbe7", margin: "8px 0" }} />
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b", padding: "2px 0" }}>
                            <span>Cash</span>
                            <span>₱{peso(order.cashReceived)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#059669", fontWeight: 600, padding: "2px 0" }}>
                            <span>Change</span>
                            <span>₱{peso(order.changeDue ?? order.cashReceived - order.total)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Items toggle */}
                    <button className="link-btn" onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "12.5px", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", transition: "color 0.12s" }}>
                      <span style={{ display: "flex", color: "#94a3b8" }}>{Icon.box}</span>
                      {isExpanded ? "Hide items" : `View items (${order.items.length})`}
                      {isExpanded ? Icon.chevronUp : Icon.chevronDown}
                    </button>

                    {isExpanded && (
                      <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #eaecf4", marginBottom: "14px", overflow: "hidden" }}>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: i < order.items.length - 1 ? "1px solid #f1f5f9" : "none", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                            <span style={{ fontSize: "13px", color: "#374151", wordBreak: "break-word" }}>
                              {item.name} <span style={{ color: "#94a3b8" }}>× {item.qty}</span>
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>₱{peso(item.price * item.qty)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {order.status === "Pending" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => updateStatus(order.id, "Processing")} disabled={isUpdating}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", borderRadius: "8px", border: "none", background: "#4f46e5", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isUpdating ? "not-allowed" : "pointer", opacity: isUpdating ? 0.6 : 1, boxShadow: "0 1px 3px rgba(79,70,229,0.3)" }}>
                            {Icon.check} Approve
                          </button>
                          <button onClick={() => updateStatus(order.id, "Cancelled")} disabled={isUpdating}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: "13px", fontWeight: 600, cursor: isUpdating ? "not-allowed" : "pointer", opacity: isUpdating ? 0.6 : 1 }}>
                            {Icon.x} Cancel
                          </button>
                        </div>
                      )}
                      {order.status === "Processing" && (
                        <button onClick={() => updateStatus(order.id, "Out for Delivery")} disabled={isUpdating}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px", borderRadius: "8px", border: "none", background: "#d97706", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isUpdating ? "not-allowed" : "pointer", opacity: isUpdating ? 0.6 : 1, boxShadow: "0 1px 3px rgba(217,119,6,0.3)" }}>
                          {Icon.truck} Out for Delivery
                        </button>
                      )}
                      {order.status === "Out for Delivery" && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px", borderRadius: "8px", background: "#fff7ed", border: "1px solid #fed7aa", fontSize: "13px", fontWeight: 600, color: "#ea580c" }}>
                          {Icon.truck} Awaiting customer confirmation
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}