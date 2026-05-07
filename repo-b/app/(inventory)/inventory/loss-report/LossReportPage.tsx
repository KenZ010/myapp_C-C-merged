"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type LossReason = "EXPIRED" | "DAMAGED" | "THEFT" | "COUNT_ERROR" | "OTHER";

type LossRecord = {
  id: string;
  productId: string;
  productName: string;
  category: string;
  size?: string;
  image?: string;
  quantity: number;       // pieces lost
  lossReason: LossReason;
  reason?: string;        // free-text note from employee
  createdAt: string;
  employeeId: string;
  employeeName?: string;
};

type SummaryItem = {
  lossReason: LossReason;
  _count: { id: number };
  _sum: { quantity: number };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });

const REASON_LABELS: Record<LossReason, string> = {
  EXPIRED:     "Expired",
  DAMAGED:     "Damaged",
  THEFT:       "Theft",
  COUNT_ERROR: "Count Error",
  OTHER:       "Other",
};

const REASON_CLASSES: Record<LossReason, { badge: string; header: string }> = {
  EXPIRED:     { badge: "bg-yellow-50 text-yellow-800",  header: "bg-yellow-900"  },
  DAMAGED:     { badge: "bg-orange-50 text-orange-700",  header: "bg-orange-900"  },
  THEFT:       { badge: "bg-red-50    text-red-700",     header: "bg-red-900"     },
  COUNT_ERROR: { badge: "bg-purple-50 text-purple-700",  header: "bg-purple-900"  },
  OTHER:       { badge: "bg-slate-50  text-slate-600",   header: "bg-slate-800"   },
};

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const f = (x: Date) =>
    x.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  return `${f(mon)} – ${f(sun)}, ${sun.getFullYear()}`;
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

/** Pull productName / size / category / image out of the raw API shape */
function normalizeLossRecord(raw: Record<string, unknown>): LossRecord {
  const product = raw.product as Record<string, unknown> | null;
  return {
    id:           String(raw.id ?? ""),
    productId:    String(raw.productId ?? product?.id ?? ""),
    productName:  String(product?.productName ?? raw.productName ?? "Unknown Product"),
    category:     String(product?.category ?? raw.category ?? ""),
    size:         product?.size ? String(product.size) : undefined,
    image:        product?.image ? String(product.image) : undefined,
    quantity:     Number(raw.quantity ?? 0),
    lossReason:   String(raw.lossReason ?? "OTHER") as LossReason,
    reason:       raw.reason ? String(raw.reason) : undefined,
    createdAt:    String(raw.createdAt ?? raw.date ?? ""),
    employeeId:   String(raw.employeeId ?? ""),
    employeeName: (raw.employee as Record<string, unknown> | null)?.name
                    ? String((raw.employee as Record<string, unknown>).name)
                    : undefined,
  };
}

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
};

// ─────────────────────────────────────────────────────────────────────────────
export default function LossReportPage() {
  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [records,  setRecords]  = useState<LossRecord[]>([]);
  const [summary,  setSummary]  = useState<SummaryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [search,    setSearch]    = useState("");
  const [reasonFil, setReasonFil] = useState<"ALL" | LossReason>("ALL");
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [viewItem,  setViewItem]  = useState<LossRecord | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rawReports, rawSummary] = await Promise.all([
        api.getLossReports({ limit: 200 }),
        api.getLossReportSummary(),
      ]);

      console.log("[LossReport] raw reports:", rawReports);
      console.log("[LossReport] raw summary:", rawSummary);

      // Normalise reports — handle { data: [...] }, plain array, or { lossReports: [...] }
      let arr: Record<string, unknown>[] = [];
      if (Array.isArray(rawReports))            arr = rawReports;
      else if (Array.isArray(rawReports?.data)) arr = rawReports.data;
      else if (Array.isArray(rawReports?.lossReports)) arr = rawReports.lossReports;
      else if (Array.isArray(rawReports?.reports))     arr = rawReports.reports;

      setRecords(arr.map(normalizeLossRecord));

      // Normalise summary
      let sumArr: SummaryItem[] = [];
      if (Array.isArray(rawSummary))           sumArr = rawSummary;
      else if (Array.isArray(rawSummary?.data)) sumArr = rawSummary.data;
      setSummary(sumArr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load loss reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Tab date labels ───────────────────────────────────────────────────────
  const tabDates = useMemo(() => {
    const dailyDate = today.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    const ws = new Date(today);
    ws.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const f = (x: Date) => x.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    const weeklyDate  = `${f(ws)} – ${f(we)}`;
    const monthlyDate = today.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    return { dailyDate, weeklyDate, monthlyDate };
  }, []);

  // ── Filter base ───────────────────────────────────────────────────────────
  const baseFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) =>
      (reasonFil === "ALL" || r.lossReason === reasonFil) &&
      (!q ||
        r.productName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.employeeName ?? "").toLowerCase().includes(q) ||
        (r.reason ?? "").toLowerCase().includes(q))
    );
  }, [records, search, reasonFil]);

  // ── Period filter ─────────────────────────────────────────────────────────
  const periodData = useMemo(() => {
    if (activeTab === "daily") {
      return baseFiltered.filter((r) => r.createdAt.startsWith(todayStr));
    }
    if (activeTab === "weekly") {
      const ws = new Date(today);
      ws.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
      ws.setHours(0, 0, 0, 0);
      const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23, 59, 59, 999);
      return baseFiltered.filter((r) => {
        const d = new Date(r.createdAt);
        return d >= ws && d <= we;
      });
    }
    const month = today.toISOString().slice(0, 7);
    return baseFiltered.filter((r) => r.createdAt.startsWith(month));
  }, [baseFiltered, activeTab, todayStr]);

  // ── Overall stats from summary ────────────────────────────────────────────
  const totalRecords  = records.length;
  const totalQty      = summary.reduce((s, i) => s + (i._sum?.quantity ?? 0), 0);
  const bySummary     = (reason: LossReason) =>
    summary.find((s) => s.lossReason === reason);

  // ── Period stats ──────────────────────────────────────────────────────────
  const periodQty     = periodData.reduce((s, r) => s + r.quantity, 0);

  // ── Group period data ─────────────────────────────────────────────────────
  const groupedData = useMemo(() => {
    let keyFn:   (r: LossRecord) => string;
    let labelFn: (k: string, rows: LossRecord[]) => string;

    if (activeTab === "daily") {
      keyFn   = (r) => r.createdAt.slice(0, 10);
      labelFn = (k) => new Date(k).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } else if (activeTab === "weekly") {
      keyFn   = (r) => getWeekKey(r.createdAt);
      labelFn = (_k, rows) => getWeekRange(rows[0].createdAt);
    } else {
      keyFn   = (r) => r.createdAt.slice(0, 7);
      labelFn = (_k, rows) => new Date(rows[0].createdAt).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    }

    const map    = groupBy(periodData, keyFn);
    const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.map(([k, rows]) => ({ key: k, label: labelFn(k, rows), rows }));
  }, [periodData, activeTab]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-8 py-7 bg-slate-50 min-h-screen">
        <div className="h-20 rounded-2xl mb-5 animate-pulse bg-slate-200" />
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-slate-200" />)}
        </div>
        {[1,2].map(i => <div key={i} className="h-48 rounded-xl animate-pulse bg-slate-200 mb-4" />)}
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <p className="text-base font-bold text-red-600">⚠️ {error}</p>
        <button onClick={fetchData} className="bg-red-600 text-white border-0 rounded-full px-6 py-2.5 text-sm font-semibold cursor-pointer hover:bg-red-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .spin { animation: spin 0.8s linear infinite; display:inline-block; }
        .loss-row:hover { background:#fafbff !important; }
      `}</style>

      <div className="px-8 py-7 bg-slate-50 min-h-screen">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-7 flex-wrap gap-3" style={{ animation: "fadeUp 0.4s ease" }}>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                {Icons.report}
              </div>
              <h1 className="text-[21px] font-extrabold text-slate-900 tracking-tight m-0">
                Loss Report
              </h1>
            </div>
            <p className="text-[13px] text-slate-400 m-0 pl-[46px]">
              Records of all damaged, expired, stolen, and miscounted inventory losses
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-[18px] py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {Icons.refresh} Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", animation: "fadeUp 0.45s ease" }}>
          {[
            { label: "Total Records",   value: String(totalRecords),                                    icon: Icons.box,     accent: "text-indigo-600",  bg: "bg-indigo-50"  },
            { label: "Total Qty Lost",  value: String(totalQty),                                        icon: Icons.warning, accent: "text-amber-600",   bg: "bg-amber-50"   },
            { label: "Expired",         value: String(bySummary("EXPIRED")?._count?.id ?? 0),           icon: Icons.warning, accent: "text-yellow-700",  bg: "bg-yellow-50"  },
            { label: "Damaged",         value: String(bySummary("DAMAGED")?._count?.id ?? 0),           icon: Icons.box,     accent: "text-orange-600",  bg: "bg-orange-50"  },
            { label: "Theft",           value: String(bySummary("THEFT")?._count?.id ?? 0),             icon: Icons.warning, accent: "text-red-600",     bg: "bg-red-50"     },
            { label: "Count Error",     value: String(bySummary("COUNT_ERROR")?._count?.id ?? 0),       icon: Icons.box,     accent: "text-purple-600",  bg: "bg-purple-50"  },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-[17px] flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center ${s.accent} flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[10.5px] font-semibold text-slate-400 m-0 uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-extrabold text-slate-900 m-0 mt-0.5 leading-none tracking-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Period Tabs */}
        <div className="mb-4" style={{ animation: "fadeUp 0.5s ease" }}>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">View by Period</p>
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "daily",   label: "Daily",   date: tabDates.dailyDate,   icon: Icons.sun   },
              { key: "weekly",  label: "Weekly",  date: tabDates.weeklyDate,  icon: Icons.week  },
              { key: "monthly", label: "Monthly", date: tabDates.monthlyDate, icon: Icons.month },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-[18px] py-2 rounded-xl text-[13px] font-semibold cursor-pointer border transition-all ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white border-transparent"
                    : "bg-white text-slate-500 border-slate-200 hover:text-slate-800"
                }`}
              >
                {tab.icon} {tab.label}
                <span className="text-[11px] opacity-60 font-normal">{tab.date}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Period Summary Strip */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label: "Records This Period", value: String(periodData.length), red: false },
            { label: "Units Lost",          value: String(periodQty),          red: false },
            { label: "Period Records",      value: `${periodData.length} entries`, red: false },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
              <p className="text-[11px] text-slate-400 m-0">{s.label}</p>
              <p className={`text-[18px] font-extrabold m-0 mt-0.5 ${s.red ? "text-red-600" : "text-slate-900"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 mb-4 flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, ID, employee..."
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-[13px] w-[240px] outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Reason filter */}
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            {(["ALL", "EXPIRED", "DAMAGED", "THEFT", "COUNT_ERROR", "OTHER"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setReasonFil(r)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold cursor-pointer border-0 transition-all whitespace-nowrap ${
                  reasonFil === r
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {r === "ALL" ? "All" : REASON_LABELS[r]}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[12px] text-slate-400 font-medium">
            {periodData.length} record{periodData.length !== 1 ? "s" : ""} in this period
          </span>
        </div>

        {/* Grouped Tables */}
        {groupedData.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
            <div className="flex justify-center text-slate-300 mb-3">{Icons.report}</div>
            <p className="text-[15px] font-semibold text-slate-500 m-0">No records for this period</p>
            <p className="text-[13px] text-slate-400 m-0 mt-1.5">
              Try switching to a different period or adjusting your filters.
            </p>
          </div>
        ) : (
          groupedData.map(({ key, label, rows }) => {
            const groupQty      = rows.reduce((s, r) => s + r.quantity, 0);
            const byReason      = (reason: LossReason) => rows.filter((r) => r.lossReason === reason).length;

            return (
              <div key={key} className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-4" style={{ animation: "fadeUp 0.4s ease" }}>

                {/* Group Header */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900">
                    {Icons.calendar} {label}
                  </span>
                  <span className="flex gap-4 items-center">
                    {(["EXPIRED","DAMAGED","THEFT","COUNT_ERROR","OTHER"] as LossReason[])
                      .filter(r => byReason(r) > 0)
                      .map(r => (
                        <span key={r} className={`text-[11px] font-semibold px-2 py-0.5 rounded ${REASON_CLASSES[r].badge}`}>
                          {byReason(r)} {REASON_LABELS[r]}
                        </span>
                      ))
                    }
                    <span className="text-[12px] font-bold text-slate-700">{groupQty} units</span>
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ minWidth: 760 }}>
                    <thead>
                      <tr>
                        {["Report ID", "Product", "Qty Lost", "Reason", "Note", "Reported By", "Date", ""].map((h) => (
                          <th key={h} className="px-3.5 py-[11px] text-left text-[10.5px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="loss-row transition-colors">
                          {/* ID */}
                          <td className="px-3.5 py-[13px] text-[13px] text-slate-700 border-b border-slate-50 align-middle">
                            <span className="font-mono text-[11.5px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {r.id.slice(0, 8).toUpperCase()}…
                            </span>
                          </td>

                          {/* Product */}
                          <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                            <div className="flex items-center gap-2">
                              {r.image ? (
                                <img src={r.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                  {Icons.box}
                                </div>
                              )}
                              <div>
                                <p className="text-[13px] font-semibold text-slate-900 m-0">{r.productName}</p>
                                <p className="text-[11px] text-slate-400 m-0">
                                  {[r.size, r.category].filter(Boolean).join(" · ") || "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Qty */}
                          <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle text-center">
                            <span className="text-[15px] font-extrabold text-red-600">{r.quantity}</span>
                            <p className="text-[10px] text-slate-400 m-0">pcs</p>
                          </td>

                          {/* Reason */}
                          <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                            <span className={`px-2 py-0.5 rounded text-[11.5px] font-bold ${REASON_CLASSES[r.lossReason]?.badge ?? "bg-slate-50 text-slate-600"}`}>
                              {REASON_LABELS[r.lossReason] ?? r.lossReason}
                            </span>
                          </td>

                          {/* Note */}
                          <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle max-w-[180px]">
                            <p className="text-[12px] text-slate-500 m-0 truncate">{r.reason || "—"}</p>
                          </td>

                          {/* Reported By */}
                          <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                            <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                              <span className="text-slate-300">{Icons.user}</span>
                              {r.employeeName ?? "—"}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle text-[12px] text-slate-500">
                            {fmtDate(r.createdAt)}
                          </td>

                          {/* Action */}
                          <td className="px-3.5 py-[13px] border-b border-slate-50 align-middle">
                            <button
                              onClick={() => setViewItem(r)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[12px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
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
                <div className="px-4 py-2.5 border-t border-slate-100 flex justify-between items-center">
                  <p className="text-[12px] text-slate-400 m-0">
                    <strong className="text-slate-900">{rows.length}</strong> record{rows.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[12px] font-bold text-red-600 m-0">
                    {groupQty} units lost
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════════════════════
          VIEW DETAILS MODAL
      ═══════════════════════════════════ */}
      {viewItem && (
        <>
          <div
            onClick={() => setViewItem(null)}
            className="fixed inset-0 bg-slate-900/55 z-40 backdrop-blur-sm"
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl overflow-hidden shadow-2xl overflow-y-auto"
            style={{ width: "min(96vw,500px)", maxHeight: "92vh", animation: "fadeUp 0.25s ease" }}
          >
            {/* Header */}
            <div className={`${REASON_CLASSES[viewItem.lossReason]?.header ?? "bg-slate-800"} px-6 py-[22px]`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="font-mono text-[11.5px] font-bold text-white/70 bg-white/10 px-2.5 py-0.5 rounded">
                      {viewItem.id.slice(0, 8).toUpperCase()}…
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
                <button
                  onClick={() => setViewItem(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 border-0 text-white/70 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                >
                  {Icons.close}
                </button>
              </div>

              {/* Value summary */}
              <div className="mt-4 bg-black/20 rounded-xl px-[18px] py-3.5 flex justify-between items-center">
                <div>
                  <p className="text-[10.5px] text-white/45 uppercase tracking-wide m-0">Units Lost</p>
                  <p className="text-[28px] font-black text-white m-0 mt-1 tracking-tight">{viewItem.quantity}</p>
                  <p className="text-[11px] text-white/35 m-0">pieces</p>
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

              {/* Details */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Record Details</p>
                <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                  {[
                    ["Product",     viewItem.productName],
                    ["Category",    viewItem.category || "—"],
                    ["Size",        viewItem.size || "—"],
                    ["Qty Lost",    `${viewItem.quantity} pcs`],
                    ["Loss Reason", REASON_LABELS[viewItem.lossReason] ?? viewItem.lossReason],
                    ["Date",        fmtDate(viewItem.createdAt)],
                    ["Reported By", viewItem.employeeName ?? "—"],
                  ].map(([l, v], i, arr) => (
                    <div key={l} className={`flex justify-between items-center px-3.5 py-2.5 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <span className="text-[12px] text-slate-400">{l}</span>
                      <span className={`text-[13px] font-semibold text-slate-900 ${l === "Qty Lost" ? "text-red-600" : ""}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              {viewItem.reason && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide m-0 mb-1.5">Note</p>
                  <p className="text-[13px] text-slate-600 m-0 leading-relaxed">{viewItem.reason}</p>
                </div>
              )}
              

              <button
                onClick={() => setViewItem(null)}
                className="w-full py-[11px] rounded-lg border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}