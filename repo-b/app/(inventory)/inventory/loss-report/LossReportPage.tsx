"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Theme (same green design as the other pages) ──────────────────────────────
// GREEN #2e7d3e · DARK #1f5f2d · MID #3f9a52 · LIGHT #e8f5ea · TINT #f4faf5
// BORDER #d6e8d9 · INK #14301b · MUTED #5f7a66 · FAINT #8fa596

// ── Types ─────────────────────────────────────────────────────────────────────
type LossReason = "EXPIRED" | "DAMAGED" | "THEFT" | "COUNT_ERROR" ;

type LossRecord = {
  id: string;
  productId: string;
  productName: string;
  category: string;
  size?: string;
  image?: string;
  quantity: number; // always positive (bottles / pieces lost)
  lossReason: LossReason;
  reason?: string;
  createdAt: string;
  employeeId: string;
  employeeName?: string;
};

type SummaryItem = {
  lossReason: LossReason;
  _count: { id: number };
  _sum: { quantity: number };
};

// Loss quantities are recorded in bottles/pieces, but product.price is the price of
// one stock unit (e.g. a whole 24-bottle case). Divide by this to get a per-bottle price.
const BOTTLES_PER_UNIT: Record<string, number> = {
  case_24: 24, case_12: 12, case_6: 6, btl: 1, pcs: 1,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD in the viewer's LOCAL time zone (not UTC), so late-night/early-morning
 *  records land on the correct local day. */
const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const localDay = (iso: string) => toLocalDateStr(new Date(iso));

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });

const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });

const fmtFull = (d: Date) =>
  d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

const fmtPeso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Returns Monday of the week containing `d` */
function getMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

/** Returns Sunday of the week containing `d` */
function getSunday(d: Date): Date {
  const mon = getMonday(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

/** Week key = local date of that week's Monday (sorts correctly, never splits a week) */
function getWeekKey(dateStr: string) {
  return toLocalDateStr(getMonday(new Date(dateStr)));
}

function getWeekRange(dateStr: string) {
  const d   = new Date(dateStr);
  const mon = getMonday(d);
  const sun = getSunday(d);
  return `${fmtShort(mon)} – ${fmtShort(sun)}, ${sun.getFullYear()}`;
}

function groupBy<T>(arr: T[], keyFn: (i: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  arr.forEach((item) => {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  });
  return map;
}

function normalizeLossRecord(raw: Record<string, unknown>): LossRecord {
  const product  = raw.product  as Record<string, unknown> | null;
  const employee = raw.employee as Record<string, unknown> | null;
  return {
    id:           String(raw.id ?? ""),
    productId:    String(raw.productId ?? ""),
    productName:  String(product?.productName ?? "Unknown Product"),
    category:     String(product?.category ?? ""),
    size:         product?.size ? String(product.size) : undefined,
    image:        product?.image ? String(product.image) : undefined,
    // The API stores losses as negative numbers (e.g. -2). Always work with the positive amount here.
    quantity:     Math.abs(Number(raw.quantity ?? 0)),
    lossReason:   String(raw.lossReason ?? "OTHER") as LossReason,
    reason:       raw.reason ? String(raw.reason) : undefined,
    createdAt:    String(raw.createdAt ?? ""),
    employeeId:   String(raw.employeeId ?? ""),
    employeeName: employee?.name ? String(employee.name) : undefined,
  };
}

/** The API caps each page at 50 rows, so fetch every page (up to a safety limit). */
async function fetchAllLossReports(): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await api.getLossReports({ page, limit: 50 });
    if (Array.isArray(res?.logs)) all.push(...res.logs);
    totalPages = Number(res?.totalPages ?? 1);
    page++;
  } while (page <= totalPages && page <= 20);
  return all;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const REASON_LABELS: Record<LossReason, string> = {
  EXPIRED:     "Expired",
  DAMAGED:     "Damaged",
  THEFT:       "Theft",
  COUNT_ERROR: "Count Error",
};

// Green family — reasons are told apart by shade. Theft stays red on purpose.
const REASON_CLASSES: Record<LossReason, { badge: string; header: string }> = {
  EXPIRED:     { badge: "bg-[#eef6dc] text-[#476b1c]", header: "bg-[#476b1c]" },
  DAMAGED:     { badge: "bg-[#e8f5ea] text-[#1f5f2d]", header: "bg-[#1f5f2d]" },
  THEFT:       { badge: "bg-[#fef2f2] text-[#b91c1c]", header: "bg-[#b91c1c]" },
  COUNT_ERROR: { badge: "bg-[#e0f2ee] text-[#0f6b5e]", header: "bg-[#0f6b5e]" },
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  warning:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  box:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  search:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  close:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  eye:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  user:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  report:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
  refresh:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  sun:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>,
  week:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>,
  month:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  year:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="14" x2="7" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="17" y1="14" x2="17" y2="14"/></svg>,
  custom:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 12 13 15 16"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function LossReportPage() {
  const today    = new Date();
  const todayStr = toLocalDateStr(today);

  const [records,     setRecords]     = useState<LossRecord[]>([]);
  const [summary,     setSummary]     = useState<SummaryItem[]>([]);
  const [priceMap,    setPriceMap]    = useState<Record<string, number>>({}); // price PER BOTTLE
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const [search,      setSearch]      = useState("");
  const [reasonFil,   setReasonFil]   = useState<"ALL" | LossReason>("ALL");
  const [activeTab,   setActiveTab]   = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("daily");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const [viewItem,    setViewItem]    = useState<LossRecord | null>(null);

  // ── Pre-compute week boundaries for today ────────────────────────────────
  const weekStart = useMemo(() => getMonday(today), []);
  const weekEnd   = useMemo(() => getSunday(today), []);

  // Estimated value of a loss record = bottles lost × price per bottle
  const valueOf = useCallback(
    (r: LossRecord) => r.quantity * (priceMap[r.productId] || 0),
    [priceMap],
  );

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, summaryRes, productsRes] = await Promise.allSettled([
        fetchAllLossReports(),
        api.getLossReportSummary(),
        api.getProducts(),
      ]);

      if (reportsRes.status === "rejected") throw reportsRes.reason;
      setRecords(reportsRes.value.map(normalizeLossRecord));

      const rawSummary = summaryRes.status === "fulfilled" ? summaryRes.value : null;
      const rawSum: Array<{ lossReason: LossReason; totalIncidents: number; totalPiecesLost: number }> =
        Array.isArray(rawSummary?.summary) ? rawSummary.summary : [];
      setSummary(rawSum.map((s) => ({
        lossReason: s.lossReason,
        _count:     { id: s.totalIncidents },
        _sum:       { quantity: s.totalPiecesLost },
      })));

      // Price per bottle = product price (per stock unit) ÷ bottles in that unit
      const products = productsRes.status === "fulfilled" && Array.isArray(productsRes.value)
        ? productsRes.value
        : [];
      const map: Record<string, number> = {};
      products.forEach((p: { id?: string; price?: number; stockUnit?: string }) => {
        if (!p.id) return;
        const perUnit = BOTTLES_PER_UNIT[p.stockUnit ?? "case_24"] ?? 1; // default matches the purchase-order page
        map[p.id] = (Number(p.price) || 0) / perUnit;
      });
      setPriceMap(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load loss reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Tab date labels ───────────────────────────────────────────────────────
  const tabDates = useMemo(() => ({
    dailyDate:   fmtFull(today),
    weeklyDate:  `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`,   // Mon – Sun
    monthlyDate: today.toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
    yearlyDate:  String(today.getFullYear()),
  }), [weekStart, weekEnd]);

  // ── Custom date label ─────────────────────────────────────────────────────
  const customLabel = useMemo(() => {
    if (customFrom && customTo)
      return `${fmtFull(new Date(customFrom + "T00:00"))} – ${fmtFull(new Date(customTo + "T00:00"))}`;
    if (customFrom) return `From ${fmtFull(new Date(customFrom + "T00:00"))}`;
    return "Pick dates";
  }, [customFrom, customTo]);

  // ── Base filter (search + reason) ────────────────────────────────────────
  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) =>
      (reasonFil === "ALL" || r.lossReason === reasonFil) &&
      (!q ||
        r.productName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.employeeName ?? "").toLowerCase().includes(q) ||
        (r.reason ?? "").toLowerCase().includes(q)),
    );
  }, [records, search, reasonFil]);

  // ── Period filter (all comparisons use LOCAL dates) ──────────────────────
  const periodData = useMemo(() => {
    if (activeTab === "daily") {
      return baseFiltered.filter((r) => localDay(r.createdAt) === todayStr);
    }
    if (activeTab === "weekly") {
      return baseFiltered.filter((r) => {
        const d = new Date(r.createdAt);
        return d >= weekStart && d <= weekEnd;
      });
    }
    if (activeTab === "monthly") {
      const month = todayStr.slice(0, 7);
      return baseFiltered.filter((r) => localDay(r.createdAt).startsWith(month));
    }
    if (activeTab === "yearly") {
      const year = todayStr.slice(0, 4);
      return baseFiltered.filter((r) => localDay(r.createdAt).startsWith(year));
    }
    // custom
    const start = customFrom ? new Date(customFrom + "T00:00:00") : new Date(0);
    const end   = customTo   ? new Date(customTo   + "T23:59:59") : new Date();
    return baseFiltered.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= start && d <= end;
    });
  }, [baseFiltered, activeTab, todayStr, weekStart, weekEnd, customFrom, customTo]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalRecords = records.length;
  const totalQty     = summary.reduce((s, i) => s + (i._sum?.quantity ?? 0), 0);
  const bySummary    = (reason: LossReason) => summary.find((s) => s.lossReason === reason);
  const periodQty    = periodData.reduce((s, r) => s + r.quantity, 0);
  const periodValue  = periodData.reduce((s, r) => s + valueOf(r), 0);

  // ── Grouped table data ────────────────────────────────────────────────────
  const groupedData = useMemo(() => {
    let keyFn:   (r: LossRecord) => string;
    let labelFn: (k: string, rows: LossRecord[]) => string;

    const dayLabel = (k: string) =>
      new Date(k + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    if (activeTab === "daily" || activeTab === "custom") {
      keyFn   = (r) => localDay(r.createdAt);
      labelFn = (k) => dayLabel(k);
    } else if (activeTab === "weekly") {
      keyFn   = (r) => getWeekKey(r.createdAt);
      labelFn = (_k, rows) => getWeekRange(rows[0].createdAt);
    } else {
      // monthly / yearly: group by YYYY-MM
      keyFn   = (r) => localDay(r.createdAt).slice(0, 7);
      labelFn = (_k, rows) => new Date(rows[0].createdAt).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    }

    const map    = groupBy(periodData, keyFn);
    const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.map(([k, rows]) => ({ key: k, label: labelFn(k, rows), rows }));
  }, [periodData, activeTab]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-8 py-7 bg-[#f6faf7] min-h-screen">
        <div className="h-20 rounded-2xl mb-5 animate-pulse bg-[#d6e8d9]" />
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-xl animate-pulse bg-[#d6e8d9]" />)}
        </div>
        {[1,2].map((i) => <div key={i} className="h-48 rounded-xl animate-pulse bg-[#d6e8d9] mb-4" />)}
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#f6faf7] flex flex-col items-center justify-center gap-3">
        <p className="text-base font-bold text-red-600">⚠️ {error}</p>
        <button onClick={fetchData} className="bg-red-600 text-white border-0 rounded-full px-6 py-2.5 text-sm font-semibold cursor-pointer hover:bg-red-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  // ── Tab config ────────────────────────────────────────────────────────────
  const TABS = [
    { key: "daily"   as const, label: "Daily",   date: tabDates.dailyDate,   icon: Icons.sun    },
    { key: "weekly"  as const, label: "Weekly",  date: tabDates.weeklyDate,  icon: Icons.week   },
    { key: "monthly" as const, label: "Monthly", date: tabDates.monthlyDate, icon: Icons.month  },
    { key: "yearly"  as const, label: "Yearly",  date: tabDates.yearlyDate,  icon: Icons.year   },
    { key: "custom"  as const, label: "Custom",  date: activeTab === "custom" ? customLabel : "Pick range", icon: Icons.custom },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .loss-row:hover { background:#f4faf5 !important; }
        .date-inp { font-family:inherit; font-size:12px; border:1px solid #d6e8d9; border-radius:8px; padding:6px 10px; color:#14301b; background:#fff; outline:none; cursor:pointer; }
        .date-inp:focus { border-color:#2e7d3e; box-shadow:0 0 0 2px rgba(46,125,62,0.14); }
      `}</style>

      <div className="px-8 py-7 bg-[#f6faf7] min-h-screen">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-7 flex-wrap gap-3" style={{ animation:"fadeUp 0.4s ease" }}>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#e8f5ea] flex items-center justify-center text-[#2e7d3e]">
                {Icons.report}
              </div>
              <h1 className="text-[21px] font-extrabold text-[#14301b] tracking-tight m-0">Loss Report</h1>
            </div>
            <p className="text-[13px] text-[#8fa596] m-0 pl-[46px]">
              Records of all damaged, expired, stolen, and miscounted inventory losses
            </p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-[18px] py-2.5 rounded-xl border border-[#d6e8d9] bg-white text-[#2e7d3e] text-[13px] font-semibold cursor-pointer hover:bg-[#f4faf5] hover:border-[#2e7d3e] transition-colors">
            {Icons.refresh} Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", animation:"fadeUp 0.45s ease" }}>
          {[
            { label:"Total Records",   value:String(totalRecords),                              icon:Icons.box,     accent:"text-[#2e7d3e]", bg:"bg-[#e8f5ea]" },
            { label:"Total Qty Lost",  value:String(totalQty),                                  icon:Icons.warning, accent:"text-[#3f9a52]", bg:"bg-[#e8f5ea]" },
            { label:"Expired",         value:String(bySummary("EXPIRED")?._count?.id ?? 0),     icon:Icons.warning, accent:"text-[#476b1c]", bg:"bg-[#eef6dc]" },
            { label:"Damaged",         value:String(bySummary("DAMAGED")?._count?.id ?? 0),     icon:Icons.box,     accent:"text-[#1f5f2d]", bg:"bg-[#e8f5ea]" },
            { label:"Theft",           value:String(bySummary("THEFT")?._count?.id ?? 0),       icon:Icons.warning, accent:"text-[#dc2626]", bg:"bg-[#fef2f2]" },
            { label:"Count Error",     value:String(bySummary("COUNT_ERROR")?._count?.id ?? 0), icon:Icons.box,     accent:"text-[#0f6b5e]", bg:"bg-[#e0f2ee]" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-[#e3efe6] p-[17px] flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center ${s.accent} flex-shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-[10.5px] font-semibold text-[#8fa596] m-0 uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-extrabold text-[#14301b] m-0 mt-0.5 leading-none tracking-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Period Tabs */}
        <div className="mb-4" style={{ animation:"fadeUp 0.5s ease" }}>
          <p className="text-[11px] font-bold text-[#5f7a66] uppercase tracking-wider mb-2.5">View by Period</p>
          <div className="flex gap-2 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-[18px] py-2 rounded-xl text-[13px] font-semibold cursor-pointer border transition-all ${
                  activeTab === tab.key
                    ? "bg-[#2e7d3e] text-white border-transparent shadow-[0_2px_8px_rgba(46,125,62,0.3)]"
                    : "bg-white text-[#5f7a66] border-[#d6e8d9] hover:text-[#1f5f2d]"
                }`}
              >
                {tab.icon} {tab.label}
                <span className="text-[11px] opacity-60 font-normal">{tab.date}</span>
              </button>
            ))}
          </div>

          {/* Custom date picker — only visible when Custom tab is active */}
          {activeTab === "custom" && (
            <div
              className="mt-3 bg-white rounded-xl border border-[#d6e8d9] px-4 py-3 flex flex-wrap items-center gap-3"
              style={{ width:"fit-content", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", animation:"fadeUp 0.2s ease" }}
            >
              <span className="text-[12px] font-semibold text-[#5f7a66]">From</span>
              <input
                type="date"
                className="date-inp"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-[12px] font-semibold text-[#5f7a66]">To</span>
              <input
                type="date"
                className="date-inp"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
              />
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                  className="text-[11px] text-[#8fa596] border border-[#d6e8d9] rounded-lg px-2.5 py-1.5 bg-white cursor-pointer hover:bg-[#f4faf5] transition-colors"
                >
                  Clear
                </button>
              )}
              {customFrom && customTo && (
                <span className="text-[12px] font-semibold text-[#1f5f2d] bg-[#e8f5ea] border border-[#c3e0c8] rounded-full px-3 py-1">
                  📅 {customLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Period Summary Strip */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label:"Records This Period", value:String(periodData.length) },
            { label:"Units Lost",          value:String(periodQty)         },
            { label:"Est. Loss Value",     value:fmtPeso(periodValue)      },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-[#e3efe6] px-4 py-3">
              <p className="text-[11px] text-[#8fa596] m-0">{s.label}</p>
              <p className="text-[18px] font-extrabold m-0 mt-0.5 text-[#14301b]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-[#e3efe6] px-4 py-3 mb-4 flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa596]">{Icons.search}</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, ID, employee..."
              className="pl-8 pr-3 py-2 rounded-lg border border-[#d6e8d9] text-[13px] w-[240px] outline-none focus:border-[#2e7d3e] transition-colors text-[#14301b] placeholder:text-[#8fa596]"
            />
          </div>

          <div className="flex gap-0.5 bg-[#e8f5ea] rounded-lg p-0.5">
            {(["ALL","EXPIRED","DAMAGED","THEFT","COUNT_ERROR"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setReasonFil(r)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold cursor-pointer border-0 transition-all whitespace-nowrap ${
                  reasonFil === r
                    ? "bg-white text-[#14301b] shadow-sm"
                    : "bg-transparent text-[#5f7a66] hover:text-[#2f4a37]"
                }`}
              >
                {r === "ALL" ? "All" : REASON_LABELS[r]}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[12px] text-[#8fa596] font-medium">
            {periodData.length} record{periodData.length !== 1 ? "s" : ""} in this period
          </span>
        </div>

        {/* Grouped Tables */}
        {groupedData.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e3efe6] py-16 text-center">
            <div className="flex justify-center text-[#b7cfbd] mb-3">{Icons.report}</div>
            <p className="text-[15px] font-semibold text-[#5f7a66] m-0">No records for this period</p>
            <p className="text-[13px] text-[#8fa596] m-0 mt-1.5">
              {activeTab === "custom" && !customFrom
                ? "Select a date range above to get started."
                : "Try switching to a different period or adjusting your filters."}
            </p>
          </div>
        ) : (
          groupedData.map(({ key, label, rows }) => {
            const groupQty   = rows.reduce((s, r) => s + r.quantity, 0);
            const groupValue = rows.reduce((s, r) => s + valueOf(r), 0);
            const byReason   = (reason: LossReason) => rows.filter((r) => r.lossReason === reason).length;

            return (
              <div key={key} className="bg-white rounded-xl border border-[#e3efe6] overflow-hidden mb-4" style={{ animation:"fadeUp 0.4s ease" }}>

                {/* Group Header */}
                <div className="px-4 py-2.5 bg-[#f4faf5] border-b border-[#e3efe6] flex justify-between items-center flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#14301b]">
                    {Icons.calendar} {label}
                  </span>
                  <span className="flex gap-4 items-center">
                    {(["EXPIRED","DAMAGED","THEFT","COUNT_ERROR"] as LossReason[])
                      .filter((r) => byReason(r) > 0)
                      .map((r) => (
                        <span key={r} className={`text-[11px] font-semibold px-2 py-0.5 rounded ${REASON_CLASSES[r].badge}`}>
                          {byReason(r)} {REASON_LABELS[r]}
                        </span>
                      ))}
                    <span className="text-[12px] font-bold text-[#2f4a37]">{groupQty} units</span>
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ minWidth:760 }}>
                    <thead>
                      <tr>
                        {["Report ID","Product","Qty Lost","Est. Value","Reason","Note","Reported By","Date",""].map((h) => (
                          <th key={h} className="px-3.5 py-[11px] text-left text-[10.5px] font-bold text-[#1f5f2d] uppercase tracking-wider bg-[#f4faf5] border-b border-[#d6e8d9] whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="loss-row transition-colors">
                          <td className="px-3.5 py-[13px] text-[13px] text-[#2f4a37] border-b border-[#f4faf5] align-middle">
                            <span className="font-mono text-[11.5px] font-bold text-[#1f5f2d] bg-[#e8f5ea] px-2 py-0.5 rounded">
                              {r.id.slice(0,8).toUpperCase()}…
                            </span>
                          </td>
                          <td className="px-3.5 py-[13px] border-b border-[#f4faf5] align-middle">
                            <div className="flex items-center gap-2">
                              {r.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#e8f5ea] flex items-center justify-center text-[#8fa596] flex-shrink-0">{Icons.box}</div>
                              )}
                              <div>
                                <p className="text-[13px] font-semibold text-[#14301b] m-0">{r.productName}</p>
                                <p className="text-[11px] text-[#8fa596] m-0">{[r.size, r.category].filter(Boolean).join(" · ") || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3.5 py-[13px] border-b border-[#f4faf5] align-middle text-center">
                            <span className="text-[15px] font-extrabold text-red-600">{r.quantity}</span>
                            <p className="text-[10px] text-[#8fa596] m-0">pcs</p>
                          </td>
                          <td className="px-3.5 py-[13px] border-b border-[#f4faf5] align-middle text-[13px] font-semibold text-[#2f4a37] whitespace-nowrap">
                            {fmtPeso(valueOf(r))}
                          </td>
                          <td className="px-3.5 py-[13px] border-b border-[#f4faf5] align-middle">
                            <span className={`px-2 py-0.5 rounded text-[11.5px] font-bold ${REASON_CLASSES[r.lossReason]?.badge ?? "bg-[#f1f5f2] text-[#4a6652]"}`}>
                              {REASON_LABELS[r.lossReason] ?? r.lossReason}
                            </span>
                          </td>
                          <td className="px-3.5 py-[13px] border-b border-[#f4faf5] align-middle max-w-[180px]">
                            <p className="text-[12px] text-[#5f7a66] m-0 truncate">{r.reason || "—"}</p>
                          </td>
                          <td className="px-3.5 py-[13px] border-b border-[#f4faf5] align-middle">
                            <div className="flex items-center gap-1.5 text-[12px] text-[#5f7a66]">
                              <span className="text-[#b7cfbd]">{Icons.user}</span>
                              {r.employeeName ?? "—"}
                            </div>
                          </td>
                          <td className="px-3.5 py-[13px] border-b border-[#f4faf5] align-middle text-[12px] text-[#5f7a66]">
                            {fmtDate(r.createdAt)}
                          </td>
                          <td className="px-3.5 py-[13px] border-b border-[#f4faf5] align-middle">
                            <button
                              onClick={() => setViewItem(r)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d6e8d9] bg-white text-[#2e7d3e] text-[12px] font-semibold cursor-pointer hover:bg-[#2e7d3e] hover:text-white hover:border-[#2e7d3e] transition-all"
                            >
                              {Icons.eye} View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Group Footer */}
                <div className="px-4 py-2.5 border-t border-[#e3efe6] flex justify-between items-center">
                  <p className="text-[12px] text-[#8fa596] m-0">
                    <strong className="text-[#14301b]">{rows.length}</strong> record{rows.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[12px] font-bold text-red-600 m-0">
                    {groupQty} units lost · {fmtPeso(groupValue)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Details Modal */}
      {viewItem && (
        <>
          <div onClick={() => setViewItem(null)} className="fixed inset-0 bg-[rgba(10,30,15,0.55)] z-40 backdrop-blur-sm" />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl overflow-hidden shadow-2xl overflow-y-auto"
            style={{ width:"min(96vw,500px)", maxHeight:"92vh", animation:"fadeUp 0.25s ease" }}
          >
            <div className={`${REASON_CLASSES[viewItem.lossReason]?.header ?? "bg-[#3f5a47]"} px-6 py-[22px]`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="font-mono text-[11.5px] font-bold text-white/70 bg-white/10 px-2.5 py-0.5 rounded">
                      {viewItem.id.slice(0,8).toUpperCase()}…
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[11.5px] font-bold ${REASON_CLASSES[viewItem.lossReason]?.badge}`}>
                      {REASON_LABELS[viewItem.lossReason] ?? viewItem.lossReason}
                    </span>
                  </div>
                  <p className="text-[20px] font-extrabold text-white m-0">{viewItem.productName}</p>
                  <p className="text-[13px] text-white/55 m-0 mt-0.5">
                    {[viewItem.size, viewItem.category].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <button onClick={() => setViewItem(null)} className="w-8 h-8 rounded-lg bg-white/10 border-0 text-white/70 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                  {Icons.close}
                </button>
              </div>

              <div className="mt-4 bg-black/20 rounded-xl px-[18px] py-3.5 flex justify-between items-center">
                <div>
                  <p className="text-[10.5px] text-white/45 uppercase tracking-wide m-0">Units Lost</p>
                  <p className="text-[28px] font-black text-white m-0 mt-1 tracking-tight">{viewItem.quantity}</p>
                  <p className="text-[11px] text-white/35 m-0">pieces · {fmtPeso(valueOf(viewItem))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] text-white/45 uppercase tracking-wide m-0">Reported</p>
                  <p className="text-[15px] font-bold text-white/85 m-0 mt-1">{fmtDate(viewItem.createdAt)}</p>
                  {viewItem.employeeName && (
                    <p className="text-[12px] text-white/50 m-0 mt-0.5">by {viewItem.employeeName}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-[22px] flex flex-col gap-[18px]">
              <div>
                <p className="text-[11px] font-bold text-[#5f7a66] uppercase tracking-wider mb-1.5">Record Details</p>
                <div className="bg-[#f4faf5] rounded-xl overflow-hidden border border-[#e3efe6]">
                  {[
                    ["Product",     viewItem.productName],
                    ["Category",    viewItem.category || "—"],
                    ["Size",        viewItem.size || "—"],
                    ["Qty Lost",    `${viewItem.quantity} pcs`],
                    ["Est. Value",  fmtPeso(valueOf(viewItem))],
                    ["Loss Reason", REASON_LABELS[viewItem.lossReason] ?? viewItem.lossReason],
                    ["Date",        fmtDate(viewItem.createdAt)],
                    ["Reported By", viewItem.employeeName ?? "—"],
                  ].map(([l, v], i, arr) => (
                    <div key={l} className={`flex justify-between items-center px-3.5 py-2.5 ${i < arr.length - 1 ? "border-b border-[#e3efe6]" : ""}`}>
                      <span className="text-[12px] text-[#8fa596]">{l}</span>
                      <span className={`text-[13px] font-semibold text-[#14301b] ${l === "Qty Lost" ? "text-red-600" : ""}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {viewItem.reason && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide m-0 mb-1.5">Note</p>
                  <p className="text-[13px] text-[#4a6652] m-0 leading-relaxed">{viewItem.reason}</p>
                </div>
              )}

              <button onClick={() => setViewItem(null)} className="w-full py-[11px] rounded-lg border border-[#d6e8d9] bg-white text-[#4a6652] text-[13px] font-semibold cursor-pointer hover:bg-[#f4faf5] hover:border-[#2e7d3e] hover:text-[#1f5f2d] transition-colors">
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}