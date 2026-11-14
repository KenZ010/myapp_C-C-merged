"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/app/providers";

// ── Theme ─────────────────────────────────────────────────────────────────────
const GREEN        = "#2e7d3e"; // primary
const GREEN_DARK   = "#1f5f2d"; // hover / emphasis
const GREEN_MID    = "#3f9a52"; // lighter accent
const GREEN_LIGHT  = "#e8f5ea"; // soft fills
const GREEN_TINT   = "#f4faf5"; // panels / card headers
const GREEN_BORDER = "#d6e8d9"; // borders
const INK          = "#14301b"; // headings (green-tinted near-black)
const MUTED        = "#5f7a66"; // secondary text
const FAINT        = "#8fa596"; // labels / icons
const PURPLE       = "#6d28d9"; // "Received" status

// ── Types ─────────────────────────────────────────────────────────────────────
type OrderStatus =
  | "Pending"
  | "Processing"
  | "Out for Delivery"
  | "Received"
  | "Completed"
  | "Cancelled";

type PaymentMethod = "Cash" | "GCash";

type OrderItem = { name: string; qty: number; price: number };

type Driver = { id: string; name: string; phone?: string };

type Order = {
  id: string;
  date: string;
  createdAt: number; // epoch ms — used to sort oldest → newest
  customer: string;
  address: string;
  total: number;
  status: OrderStatus;
  isOnline: boolean;
  isWalkIn: boolean;
  items: OrderItem[];
  paymentMethod?: PaymentMethod;
  cashReceived?: number;
  changeDue?: number;
  gcashRef?: string;
  proofUrl?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
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
  user: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  pin: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  clock: (<svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  box: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  wallet: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>),
  walletLg: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>),
  check: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>),
  x: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  truck: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  truckLg: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  hourglass: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/></svg>),
  gear: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>),
  layers: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  chevronDown: (<svg width="11" height="11" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>),
  chevronUp: (<svg width="11" height="11" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.5}><polyline points="18 15 12 9 6 15"/></svg>),
  image: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>),
  hash: (<svg width="14" height="14" viewBox="0 0 24 24" {...svgProps}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>),
  received: (<svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="8.5 12 11 14.5 15.5 9.5"/></svg>),
  receivedLg: (<svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="8.5 12 11 14.5 15.5 9.5"/></svg>),
  emptyState: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a9d3b1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 12"/></svg>),
};

// ── Status config ─────────────────────────────────────────────────────────────
// Green is reserved for the brand / success actions. Statuses use colours that
// sit well next to it: warm amber, calm blue, orange and violet.
const statusStyle: Record<OrderStatus, { bg: string; color: string; border: string }> = {
  Pending:            { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  Processing:         { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Out for Delivery": { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  Received:           { bg: "#f5f3ff", color: PURPLE,    border: "#ddd6fe" },
  Completed:          { bg: GREEN_LIGHT, color: GREEN,  border: "#b7dcbd" },
  Cancelled:          { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

const statusIcon: Record<OrderStatus, React.ReactNode> = {
  Pending:            Icon.clock,
  Processing:         <svg width="13" height="13" viewBox="0 0 24 24" {...svgProps}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  "Out for Delivery": Icon.truck,
  Received:           Icon.received,
  Completed:          Icon.check,
  Cancelled:          Icon.x,
};

const statusMap: Record<string, OrderStatus> = {
  PENDING:          "Pending",
  PROCESSING:       "Processing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  RECEIVED:         "Received",
  COMPLETED:        "Completed",
  CANCELLED:        "Cancelled",
  CANCELED:         "Cancelled",
};

const backendStatus: Record<OrderStatus, string> = {
  Pending:            "PENDING",
  Processing:         "PROCESSING",
  "Out for Delivery": "OUT_FOR_DELIVERY",
  Received:           "RECEIVED",
  Completed:          "COMPLETED",
  Cancelled:          "CANCELLED",
};

const ACTIVE_STATUSES: OrderStatus[] = ["Pending", "Processing", "Out for Delivery", "Received"];

// Payment method badge colours
const methodStyle: Record<PaymentMethod, { bg: string; color: string; border: string }> = {
  Cash:  { bg: GREEN_LIGHT, color: GREEN,     border: "#b7dcbd" },
  GCash: { bg: "#eff6ff",   color: "#1d4ed8", border: "#bfdbfe" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Peso amount with 2 decimals, e.g. 12493.6 -> "12,493.60" */
const peso = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function normalizeOrder(o: Record<string, unknown>): Order {
  const rawStatus = String(o.status ?? "PENDING").toUpperCase();
  const status: OrderStatus = statusMap[rawStatus] ?? "Pending";
  const customer = o.customer as Record<string, unknown> | null;
  const rawLines = (o.orderLines ?? []) as Record<string, unknown>[];

  // Cashier-placed orders carry the name/address typed at checkout
  const walkInName    = o.walkInName ? String(o.walkInName) : "";
  const walkInAddress = o.walkInAddress ? String(o.walkInAddress) : "";

  // ── Payment (matches the Prisma Payment model) ─────────────────────────────
  const payment = o.payment as Record<string, unknown> | null;
  const cashReceived = payment?.amountTendered;
  const changeRaw    = payment?.change;

  const methodRaw = String(payment?.method ?? "").toUpperCase();

  const paymentMethod: PaymentMethod | undefined =
    methodRaw === "GCASH" ? "GCash" :
    methodRaw === "CASH"  ? "Cash"  :
    undefined;

  const gcashRef = payment?.referenceNo;
  const proofUrl = payment?.receiptImage;

  // ── Driver (assigned when the order goes out for delivery) ─────────────────
  const driver = o.driver as Record<string, unknown> | null;

  // Raw timestamp for sorting (orders with no/invalid date go to the bottom)
  const createdMs = o.createdAt ? new Date(String(o.createdAt)).getTime() : NaN;

  return {
    id: String(o.id ?? ""),
    date: o.createdAt
      ? new Date(String(o.createdAt)).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : "—",
    createdAt: Number.isNaN(createdMs) ? Number.MAX_SAFE_INTEGER : createdMs,
    customer: customer
      ? String(customer.name ?? (walkInName || "Walk-in"))
      : (walkInName || "Walk-in"),
    address:  walkInAddress || (customer ? String((customer.address as string) ?? "—") : "—"),
    total:    Number(o.totalAmount ?? 0),
    status,
    // No account → the cashier completes it. Has an account → the customer completes it.
    isWalkIn: !o.customerId,
    isOnline: !!o.customerId,
    items: rawLines.map((l) => {
      const product = l.product as Record<string, unknown> | null;
      return {
        name:  product ? String(product.productName ?? "Item") : "Item",
        qty:   Number(l.quantity ?? 0),
        price: Number(l.price ?? 0),
      };
    }),
    paymentMethod,
    cashReceived:
      cashReceived !== undefined && cashReceived !== null ? Number(cashReceived) : undefined,
    changeDue:
      changeRaw !== undefined && changeRaw !== null ? Number(changeRaw) : undefined,
    gcashRef: gcashRef ? String(gcashRef) : undefined,
    proofUrl: proofUrl ? String(proofUrl) : undefined,
    driverId:    o.driverId ? String(o.driverId) : undefined,
    driverName:  driver?.name  ? String(driver.name)  : undefined,
    driverPhone: driver?.phone ? String(driver.phone) : undefined,
  };
}

/** First come, first served: oldest order first. */
const byOldestFirst = (a: Order, b: Order) =>
  a.createdAt - b.createdAt || a.id.localeCompare(b.id);

type FilterTab = "All Orders" | OrderStatus;
const filterTabs: FilterTab[] = ["All Orders", "Pending", "Processing", "Out for Delivery", "Received"];

// ── Skeletons ─────────────────────────────────────────────────────────────────
const shimmerBg: React.CSSProperties = {
  background: "linear-gradient(90deg,#eef5ef 25%,#dfeae2 50%,#eef5ef 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
};

function SkeletonStatCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, padding: "20px 22px" }}>
      <div style={{ ...shimmerBg, height: "11px", width: "80px", borderRadius: "6px", marginBottom: "12px" }} />
      <div style={{ ...shimmerBg, height: "28px", width: "60px", borderRadius: "6px" }} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, overflow: "hidden" }}>
      <div className="oc-grid">
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className="oc-col" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ ...shimmerBg, width: "110px", height: "13px", borderRadius: "6px" }} />
            <div style={{ ...shimmerBg, width: "140px", height: "13px", borderRadius: "6px" }} />
            <div style={{ ...shimmerBg, width: "80px", height: "13px", borderRadius: "6px" }} />
            <div style={{ ...shimmerBg, height: "38px", borderRadius: "10px" }} />
          </div>
        ))}
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
  const [proofModal,  setProofModal]  = useState<string | null>(null); // GCash screenshot URL

  // Drivers the cashier can pick from + the pick made on each Processing card
  const [drivers,         setDrivers]         = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({}); // orderId -> driverId

  // Cash the driver handed to the cashier, typed on each Received card
  const [remitInputs, setRemitInputs] = useState<Record<string, string>>({}); // orderId -> amount (string)

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
        .filter((o) => ACTIVE_STATUSES.includes(o.status))
        .sort(byOldestFirst); // earliest order at the top
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

  // Load the list of active drivers once
  useEffect(() => {
    api.getDrivers()
      .then((d: Driver[]) => setDrivers(Array.isArray(d) ? d : []))
      .catch((err: Error) => setError(err.message || "Failed to load drivers."));
  }, []);

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

  // Close the screenshot viewer with Escape
  useEffect(() => {
    if (!proofModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProofModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [proofModal]);

  /**
   * @param driverId       set when dispatching (Processing → Out for Delivery)
   * @param remittedAmount cash the driver handed over (Received → Completed, Cash orders)
   */
  const updateStatus = async (
    id: string,
    status: OrderStatus,
    driverId?: string,
    remittedAmount?: number
  ) => {
    const previous = orders.find((o) => o.id === id);
    setUpdatingId(id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await api.updateOrderStatus(id, backendStatus[status], driverId, remittedAmount);
      if (driverId) fetchOrders(true); // pull in the driver's name/phone
      if (status === "Completed" || status === "Cancelled") {
        setTimeout(() => setOrders((prev) => prev.filter((o) => o.id !== id)), 1500);
      }
    } catch (err) {
      // Roll back the optimistic update and show the server's message
      if (previous) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: previous.status } : o))
        );
      }
      setError((err as Error).message || "Failed to update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // `orders` is already sorted oldest → newest, and filter() keeps that order
  const filtered = activeTab === "All Orders" ? orders : orders.filter((o) => o.status === activeTab);
  const tabCount = (tab: FilterTab) =>
    tab === "All Orders" ? orders.length : orders.filter((o) => o.status === tab).length;

  const statCards = [
    { label: "All Active", count: orders.length,                                               icon: Icon.layers,      accent: GREEN,     light: GREEN_LIGHT, highlight: true  },
    { label: "Pending",    count: orders.filter((o) => o.status === "Pending").length,          icon: Icon.hourglass,   accent: "#d97706", light: "#fffbeb",   highlight: false },
    { label: "Processing", count: orders.filter((o) => o.status === "Processing").length,       icon: Icon.gear,        accent: "#2563eb", light: "#eff6ff",   highlight: false },
    { label: "In Transit", count: orders.filter((o) => o.status === "Out for Delivery").length, icon: Icon.truckLg,     accent: "#ea580c", light: "#fff7ed",   highlight: false },
    { label: "Received",   count: orders.filter((o) => o.status === "Received").length,         icon: Icon.receivedLg,  accent: PURPLE,    light: "#f5f3ff",   highlight: false },
  ];

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes livePulse { 0%{box-shadow:0 0 0 0 rgba(46,125,62,0.45)} 70%{box-shadow:0 0 0 6px rgba(46,125,62,0)} 100%{box-shadow:0 0 0 0 rgba(46,125,62,0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .btn-outline:hover { background: ${GREEN_TINT} !important; border-color: ${GREEN} !important; }
        .order-card { transition: box-shadow 0.18s, border-color 0.18s, transform 0.18s; }
        .order-card:hover { box-shadow: 0 8px 24px rgba(31,95,45,0.10); border-color: #b7dcbd !important; }
        .link-btn:hover { color: ${GREEN_DARK} !important; }
        .tab-btn:hover { color: ${GREEN_DARK} !important; }
        .act-green:hover:not(:disabled) { background: ${GREEN_DARK} !important; }
        .act-red:hover:not(:disabled) { background: #fee2e2 !important; }
        .act-amber:hover:not(:disabled) { background: #b45309 !important; }
        .proof-thumb:hover { border-color: #1d4ed8 !important; }
        .pending-page button:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
        .pending-page select:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
        .pending-page input:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }

        /* ── Horizontal order card: 4 columns on desktop ── */
        .oc-grid {
          display: grid;
          grid-template-columns: minmax(0,1.15fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,0.95fr);
        }
        .oc-col { padding: 16px 20px; min-width: 0; }
        .oc-col + .oc-col { border-left: 1px solid ${GREEN_BORDER}; }

        /* Tablet: 2 columns */
        @media (max-width: 1180px) {
          .oc-grid { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
          .oc-col + .oc-col { border-left: none; }
          .oc-col:nth-child(even) { border-left: 1px solid ${GREEN_BORDER}; }
          .oc-col:nth-child(n+3) { border-top: 1px solid ${GREEN_BORDER}; }
        }
        /* Mobile: 1 column */
        @media (max-width: 700px) {
          .oc-grid { grid-template-columns: minmax(0,1fr); }
          .oc-col:nth-child(even) { border-left: none; }
          .oc-col:nth-child(n+2) { border-top: 1px solid ${GREEN_BORDER}; }
        }
      `}</style>

      <div className="pending-page" style={{ padding: "28px 32px", width: "100%", boxSizing: "border-box" }}>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "26px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `linear-gradient(135deg, ${GREEN_MID}, ${GREEN_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(46,125,62,0.28)", flexShrink: 0 }}>
              {Icon.orders}
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: INK, margin: 0, letterSpacing: "-0.02em" }}>Active Orders</h1>
              <p style={{ fontSize: "13px", color: MUTED, margin: "2px 0 0" }}>Monitor and update the status of incoming customer orders · earliest orders first</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {lastUpdated && (
              <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12px", color: MUTED }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: GREEN, animation: "livePulse 2s infinite" }} />
                Updated {lastUpdated.toLocaleTimeString("en-PH", { timeStyle: "short" })}
              </span>
            )}
            <button onClick={() => fetchOrders()} className="btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: `1px solid ${GREEN_BORDER}`, background: "#fff", color: GREEN, transition: "all 0.15s" }}>
              <span style={{ display: "flex" }}>{Icon.refresh}</span> Refresh
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "14px", marginBottom: "24px" }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
            : statCards.map((s) => (
                <div key={s.label}
                  style={{
                    position: "relative", overflow: "hidden", borderRadius: "14px", padding: "20px 22px",
                    background: s.highlight ? `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` : "#fff",
                    border: s.highlight ? "none" : `1px solid ${GREEN_BORDER}`,
                    boxShadow: s.highlight ? "0 6px 18px rgba(46,125,62,0.25)" : "none",
                  }}>
                  {!s.highlight && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: s.accent }} />}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: s.highlight ? "rgba(255,255,255,0.8)" : MUTED, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                    <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: s.highlight ? "rgba(255,255,255,0.18)" : s.light, display: "flex", alignItems: "center", justifyContent: "center", color: s.highlight ? "#fff" : s.accent }}>{s.icon}</div>
                  </div>
                  <p style={{ fontSize: "28px", fontWeight: 800, color: s.highlight ? "#fff" : INK, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {s.count}
                  </p>
                </div>
              ))}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "2px", marginBottom: "24px", background: GREEN_LIGHT, borderRadius: "12px", padding: "4px", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
          {filterTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} className={isActive ? undefined : "tab-btn"}
                style={{ padding: "8px 16px", borderRadius: "9px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", background: isActive ? GREEN : "transparent", color: isActive ? "#fff" : MUTED, boxShadow: isActive ? "0 2px 8px rgba(46,125,62,0.3)" : "none", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "8px" }}>
                {tab}
                <span style={{ background: isActive ? "rgba(255,255,255,0.22)" : "#fff", color: isActive ? "#fff" : GREEN, padding: "1px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
                  {loading ? "…" : tabCount(tab)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", borderRadius: "12px", padding: "13px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #fecaca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c" }}>
              {Icon.warning}
              <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{error}</p>
            </div>
            <button onClick={() => fetchOrders()} style={{ background: "#b91c1c", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "64px 24px", textAlign: "center", border: `1px dashed ${GREEN_BORDER}` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {Icon.emptyState}
              </div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: INK, margin: 0 }}>You&apos;re all caught up</p>
              <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>
                {activeTab === "All Orders" ? "There are no active orders right now." : `No orders with status "${activeTab}".`}
              </p>
            </div>
          </div>
        )}

        {/* Orders List — one horizontal card per row, oldest on top */}
        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {filtered.map((order, index) => {
              const s          = statusStyle[order.status];
              const isExpanded = expandedId === order.id;
              const isUpdating = updatingId === order.id;

              const sub = order.items.reduce((acc, i) => acc + i.price * i.qty, 0);
              const vat = sub * 0.12;
              const grandTotal = sub + vat;

              // Cash: what the cashier hands back
              const change =
                order.cashReceived !== undefined
                  ? order.changeDue ?? Math.max(order.cashReceived - grandTotal, 0)
                  : undefined;
              const shortBy =
                order.cashReceived !== undefined && order.cashReceived < grandTotal - 0.005
                  ? grandTotal - order.cashReceived
                  : 0;

              // Driver picked on this card (Processing orders only)
              const pickedDriverId = selectedDrivers[order.id] ?? "";

              // Cash the driver handed over (Received orders only)
              const remitRaw    = remitInputs[order.id] ?? "";
              const remitAmount = remitRaw.trim() === "" ? NaN : Number(remitRaw);
              const remitValid  = Number.isFinite(remitAmount) && remitAmount >= 0;
              const remitDiff   = remitValid ? Math.round((remitAmount - grandTotal) * 100) / 100 : 0;
              const needsRemit  = order.paymentMethod === "Cash";

              return (
                <div key={order.id} className="order-card" style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${GREEN_BORDER}`, overflow: "hidden" }}>

                  <div className="oc-grid">

                    {/* ── Column 1: order info ─────────────────────────────── */}
                    <div className="oc-col" style={{ background: GREEN_TINT }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                        <span title={`Queue position ${index + 1}`}
                          style={{ minWidth: "28px", height: "28px", padding: "0 8px", boxSizing: "border-box", borderRadius: "8px", background: index === 0 ? GREEN : "#fff", color: index === 0 ? "#fff" : GREEN_DARK, border: `1px solid ${index === 0 ? GREEN : "#c3e0c8"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 }}>
                          #{index + 1}
                        </span>
                        <span title={order.id} style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: GREEN_DARK, background: GREEN_LIGHT, border: "1px solid #c3e0c8", padding: "3px 9px", borderRadius: "6px", display: "inline-block" }}>
                          {order.id.slice(0, 12)}…
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: FAINT, marginBottom: "10px" }}>
                        {Icon.clock}
                        <span style={{ fontSize: "12px", color: MUTED }}>{order.date}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {statusIcon[order.status]} {order.status}
                        </span>
                        {order.isOnline && (
                          <span style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "10.5px", fontWeight: 700, background: GREEN, color: "#fff", letterSpacing: "0.02em" }}>Online</span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                        {[
                          { icon: Icon.user, label: "Customer", value: order.customer },
                          { icon: Icon.pin,  label: "Address",  value: order.address },
                        ].map((row) => (
                          <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: GREEN_LIGHT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{row.icon}</div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: "11px", fontWeight: 600, color: FAINT, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</p>
                              <p style={{ fontSize: "13px", fontWeight: 500, color: INK, margin: "1px 0 0", wordBreak: "break-word" }}>{row.value}</p>
                            </div>
                          </div>
                        ))}

                        {/* Assigned driver (shown once the order is dispatched) */}
                        {order.driverName && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#fff7ed", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.truck}</div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: "11px", fontWeight: 600, color: FAINT, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Driver</p>
                              <p style={{ fontSize: "13px", fontWeight: 600, color: INK, margin: "1px 0 0" }}>
                                {order.driverName}
                                {order.driverPhone && <span style={{ fontWeight: 400, color: MUTED }}> · {order.driverPhone}</span>}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Column 2: amount breakdown ───────────────────────── */}
                    <div className="oc-col">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: GREEN, marginBottom: "12px" }}>
                        {Icon.wallet}
                        <p style={{ fontSize: "11px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount breakdown</p>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: MUTED, padding: "2px 0" }}>
                        <span>Subtotal</span>
                        <span>₱{peso(sub)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: MUTED, padding: "2px 0" }}>
                        <span>VAT (12%)</span>
                        <span>₱{peso(vat)}</span>
                      </div>
                      <div style={{ borderTop: `1px solid ${GREEN_BORDER}`, margin: "10px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: INK }}>Total</span>
                        <span style={{ fontSize: "22px", fontWeight: 800, color: GREEN, letterSpacing: "-0.02em" }}>₱{peso(grandTotal)}</span>
                      </div>

                      {/* Items toggle */}
                      <button className="link-btn" onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        style={{ background: "none", border: "none", color: GREEN, fontSize: "12.5px", fontWeight: 600, cursor: "pointer", padding: "2px 0", marginTop: "14px", display: "flex", alignItems: "center", gap: "6px", transition: "color 0.12s" }}>
                        <span style={{ display: "flex" }}>{Icon.box}</span>
                        {isExpanded ? "Hide items" : `View items (${order.items.length})`}
                        {isExpanded ? Icon.chevronUp : Icon.chevronDown}
                      </button>
                    </div>

                    {/* ── Column 3: payment ────────────────────────────────── */}
                    <div className="oc-col">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: GREEN }}>
                          {Icon.wallet}
                          <p style={{ fontSize: "11px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment</p>
                        </div>
                        {order.paymentMethod ? (
                          <span style={{
                            padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                            background: methodStyle[order.paymentMethod].bg,
                            color:      methodStyle[order.paymentMethod].color,
                            border:     `1px solid ${methodStyle[order.paymentMethod].border}`,
                          }}>
                            {order.paymentMethod}
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: FAINT }}>Not specified</span>
                        )}
                      </div>

                      {/* Cash: amount given + change to return */}
                      {order.paymentMethod === "Cash" && (
                        order.cashReceived !== undefined ? (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: MUTED, padding: "2px 0" }}>
                              <span>Customer gave</span>
                              <span style={{ fontWeight: 600, color: INK }}>₱{peso(order.cashReceived)}</span>
                            </div>
                            <div style={{ borderTop: "1px dashed #bcd7c1", margin: "10px 0" }} />
                            {shortBy > 0 ? (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", color: "#b91c1c" }}>
                                <span style={{ fontSize: "13px", fontWeight: 700 }}>Short by</span>
                                <span style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em" }}>₱{peso(shortBy)}</span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", color: GREEN }}>
                                <span style={{ fontSize: "13px", fontWeight: 700 }}>Change to give</span>
                                <span style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em" }}>₱{peso(change ?? 0)}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <p style={{ fontSize: "12.5px", color: FAINT, margin: 0 }}>No cash amount recorded.</p>
                        )
                      )}

                      {/* GCash: reference number + screenshot */}
                      {order.paymentMethod === "GCash" && (
                        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#eff6ff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.hash}</div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: FAINT, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reference no.</p>
                                <p style={{ fontSize: "14px", fontWeight: 700, fontFamily: "monospace", color: INK, margin: "1px 0 0", wordBreak: "break-all", letterSpacing: "0.02em" }}>
                                  {order.gcashRef ?? "—"}
                                </p>
                              </div>
                            </div>
                            {!order.proofUrl && (
                              <p style={{ fontSize: "12.5px", color: "#b91c1c", margin: 0 }}>No screenshot uploaded.</p>
                            )}
                          </div>

                          {order.proofUrl && (
                            <div style={{ flexShrink: 0 }}>
                              <p style={{ fontSize: "11px", fontWeight: 600, color: FAINT, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "5px" }}>
                                {Icon.image} Screenshot
                              </p>
                              <button className="proof-thumb" onClick={() => setProofModal(order.proofUrl!)}
                                title="Click to enlarge"
                                style={{ padding: 0, border: `1px solid ${GREEN_BORDER}`, borderRadius: "10px", overflow: "hidden", cursor: "zoom-in", background: GREEN_TINT, display: "block", transition: "border-color 0.15s" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={order.proofUrl} alt="GCash payment screenshot"
                                  style={{ display: "block", width: "72px", height: "96px", objectFit: "cover" }} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Column 4: actions ────────────────────────────────── */}
                    <div className="oc-col" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px" }}>
                      {order.status === "Pending" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <button className="act-green" onClick={() => updateStatus(order.id, "Processing")} disabled={isUpdating}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "11px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isUpdating ? "not-allowed" : "pointer", opacity: isUpdating ? 0.6 : 1, boxShadow: "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                            {Icon.check} Approve
                          </button>
                          <button className="act-red" onClick={() => updateStatus(order.id, "Cancelled")} disabled={isUpdating}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "11px", borderRadius: "10px", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: "13px", fontWeight: 700, cursor: isUpdating ? "not-allowed" : "pointer", opacity: isUpdating ? 0.6 : 1, transition: "background 0.15s" }}>
                            {Icon.x} Cancel
                          </button>
                        </div>
                      )}

                      {order.status === "Processing" && (
                        <>
                          {/* A driver must be picked before the order can go out */}
                          <div>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: FAINT, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Assign driver
                            </p>
                            <select
                              value={pickedDriverId}
                              onChange={(e) => setSelectedDrivers((p) => ({ ...p, [order.id]: e.target.value }))}
                              disabled={isUpdating}
                              aria-label="Select a driver"
                              style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", fontSize: "13px", color: INK, background: "#fff", border: `1px solid ${pickedDriverId ? GREEN : GREEN_BORDER}`, cursor: "pointer" }}>
                              <option value="">Select a driver…</option>
                              {drivers.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}{d.phone ? ` · ${d.phone}` : ""}</option>
                              ))}
                            </select>
                            {drivers.length === 0 && (
                              <p style={{ fontSize: "12px", color: "#b91c1c", margin: "6px 0 0" }}>No active drivers available.</p>
                            )}
                          </div>

                          <button className="act-amber"
                            onClick={() => updateStatus(order.id, "Out for Delivery", pickedDriverId)}
                            disabled={isUpdating || !pickedDriverId}
                            title={!pickedDriverId ? "Select a driver first" : undefined}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "11px", borderRadius: "10px", border: "none", background: "#d97706", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isUpdating || !pickedDriverId ? "not-allowed" : "pointer", opacity: isUpdating || !pickedDriverId ? 0.5 : 1, boxShadow: "0 4px 12px rgba(217,119,6,0.25)", transition: "background 0.15s" }}>
                            {Icon.truck} Out for Delivery
                          </button>
                        </>
                      )}

                      {order.status === "Out for Delivery" && (
                        order.isWalkIn ? (
                          // Cashier-placed order: the cashier marks it received on the customer's behalf
                          <button className="act-green" onClick={() => updateStatus(order.id, "Received")} disabled={isUpdating}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "11px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isUpdating ? "not-allowed" : "pointer", opacity: isUpdating ? 0.6 : 1, boxShadow: "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                            {Icon.received} Mark as Received
                          </button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "11px", borderRadius: "10px", background: "#fff7ed", border: "1px solid #fed7aa", fontSize: "13px", fontWeight: 600, color: "#c2410c", textAlign: "center" }}>
                            {Icon.truck} Awaiting customer confirmation
                          </div>
                        )
                      )}

                      {/* Customer has the order → settle the cash with the driver, then close it */}
                      {order.status === "Received" && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "9px 11px", borderRadius: "10px", background: "#f5f3ff", border: "1px solid #ddd6fe", fontSize: "12.5px", fontWeight: 600, color: PURPLE, textAlign: "center" }}>
                            {Icon.received} Customer received the order
                          </div>

                          {needsRemit ? (
                            <>
                              <div>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: FAINT, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Cash from driver{order.driverName ? ` (${order.driverName})` : ""}
                                </p>
                                <div style={{ position: "relative" }}>
                                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", fontWeight: 700, color: MUTED }}>₱</span>
                                  <input
                                    type="number" inputMode="decimal" min="0" step="0.01"
                                    value={remitRaw}
                                    onChange={(e) => setRemitInputs((p) => ({ ...p, [order.id]: e.target.value }))}
                                    disabled={isUpdating}
                                    placeholder="0.00"
                                    aria-label="Cash received from driver"
                                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 26px", borderRadius: "10px", fontSize: "14px", fontWeight: 700, color: INK, background: "#fff", border: `1px solid ${remitValid ? GREEN : GREEN_BORDER}` }} />
                                </div>
                                <p style={{ fontSize: "12px", color: MUTED, margin: "6px 0 0" }}>
                                  Expected: <strong style={{ color: INK }}>₱{peso(grandTotal)}</strong>
                                </p>
                                {remitValid && remitDiff < 0 && (
                                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#b91c1c", margin: "4px 0 0" }}>Short by ₱{peso(Math.abs(remitDiff))}</p>
                                )}
                                {remitValid && remitDiff > 0 && (
                                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#b45309", margin: "4px 0 0" }}>Over by ₱{peso(remitDiff)}</p>
                                )}
                                {remitValid && remitDiff === 0 && (
                                  <p style={{ fontSize: "12px", fontWeight: 700, color: GREEN, margin: "4px 0 0" }}>Exact amount ✓</p>
                                )}
                              </div>

                              <button className="act-green"
                                onClick={() => updateStatus(order.id, "Completed", undefined, remitAmount)}
                                disabled={isUpdating || !remitValid}
                                title={!remitValid ? "Enter the cash the driver handed over" : undefined}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "11px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isUpdating || !remitValid ? "not-allowed" : "pointer", opacity: isUpdating || !remitValid ? 0.5 : 1, boxShadow: "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                                {Icon.check} Transaction Done
                              </button>
                            </>
                          ) : (
                            // GCash (or unspecified): already paid, nothing to collect from the driver
                            <button className="act-green"
                              onClick={() => updateStatus(order.id, "Completed")}
                              disabled={isUpdating}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "11px", borderRadius: "10px", border: "none", background: GREEN, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: isUpdating ? "not-allowed" : "pointer", opacity: isUpdating ? 0.6 : 1, boxShadow: "0 4px 12px rgba(46,125,62,0.28)", transition: "background 0.15s" }}>
                              {Icon.check} Transaction Done
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Items list — full width under the row */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${GREEN_BORDER}`, background: "#fff" }}>
                      {order.items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", padding: "10px 20px", borderBottom: i < order.items.length - 1 ? `1px solid ${GREEN_LIGHT}` : "none", background: i % 2 === 0 ? "#fff" : GREEN_TINT }}>
                          <span style={{ fontSize: "13px", color: INK, wordBreak: "break-word" }}>
                            {item.name} <span style={{ color: FAINT }}>× {item.qty}</span>
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>₱{peso(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GCash screenshot viewer */}
      {proofModal && (
        <div onClick={() => setProofModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,25,15,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "fadeIn 0.15s" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", maxWidth: "min(92vw, 520px)", maxHeight: "90vh", background: "#fff", borderRadius: "14px", padding: "12px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <button onClick={() => setProofModal(null)} aria-label="Close"
              style={{ position: "absolute", top: "-12px", right: "-12px", width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#fff", color: INK, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
              {Icon.x}
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proofModal} alt="GCash payment screenshot"
              style={{ display: "block", maxWidth: "100%", maxHeight: "calc(90vh - 24px)", borderRadius: "8px", objectFit: "contain", margin: "0 auto" }} />
          </div>
        </div>
      )}
    </>
  );
}