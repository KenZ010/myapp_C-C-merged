"use client";
import { useState, useMemo, useEffect } from "react";

type POStatus = "Draft" | "Sent" | "Receiving" | "Completed" | "Cancelled";
type POStep = "create" | "receiving" | "history";

type Supplier = {
  id: number;
  name: string;
  contact: string;
  address: string;
  products: {
    id: number;
    name: string;
    unit: string;
    unitCost: number;
    stock: number;
    minStock: number;
  }[];
};

type POItem = {
  id: number;
  name: string;
  unit: string;
  unitCost: number;
  orderedQty: number;
  receivedQty: number;
};

type PurchaseOrder = {
  id: number;
  batchNo: string;
  supplier: string;
  date: string;
  status: POStatus;
  items: POItem[];
  totalAmount: number;
};

const suppliers: Supplier[] = [
  {
    id: 1,
    name: "Cola Distributors Inc.",
    contact: "09171234567",
    address: "123 Rizal St, Manila",
    products: [
      {
        id: 1,
        name: "Coca Cola 1.5L",
        unit: "Case",
        unitCost: 480,
        stock: 4,
        minStock: 10,
      },
      {
        id: 2,
        name: "Sprite 1.5L",
        unit: "Case",
        unitCost: 450,
        stock: 0,
        minStock: 10,
      },
      {
        id: 3,
        name: "Royal 500ml",
        unit: "Case",
        unitCost: 300,
        stock: 15,
        minStock: 10,
      },
      {
        id: 4,
        name: "Coke Zero 1.5L",
        unit: "Case",
        unitCost: 480,
        stock: 7,
        minStock: 10,
      },
    ],
  },
  {
    id: 2,
    name: "PepsiCo Philippines",
    contact: "09281234567",
    address: "456 EDSA, Quezon City",
    products: [
      {
        id: 5,
        name: "Pepsi 1.5L",
        unit: "Case",
        unitCost: 450,
        stock: 2,
        minStock: 10,
      },
      {
        id: 6,
        name: "Mountain Dew 1.5L",
        unit: "Case",
        unitCost: 480,
        stock: 12,
        minStock: 10,
      },
      {
        id: 7,
        name: "7UP 1.5L",
        unit: "Case",
        unitCost: 450,
        stock: 0,
        minStock: 10,
      },
      {
        id: 8,
        name: "Mirinda 500ml",
        unit: "Case",
        unitCost: 300,
        stock: 8,
        minStock: 10,
      },
    ],
  },
  {
    id: 3,
    name: "Asia Brewery Corp.",
    contact: "09991234567",
    address: "789 Ayala Ave, Makati",
    products: [
      {
        id: 9,
        name: "Cobra Energy",
        unit: "Case",
        unitCost: 600,
        stock: 0,
        minStock: 8,
      },
      {
        id: 10,
        name: "Summit Water",
        unit: "Case",
        unitCost: 250,
        stock: 20,
        minStock: 8,
      },
      {
        id: 11,
        name: "Absolute Juice",
        unit: "Case",
        unitCost: 550,
        stock: 3,
        minStock: 8,
      },
    ],
  },
];

const statusStyle: Record<POStatus, React.CSSProperties> = {
  Draft: { background: "#f5f5f5", color: "#757575" },
  Sent: { background: "#e3f2fd", color: "#1565c0" },
  Receiving: { background: "#fff9c4", color: "#f57f17" },
  Completed: { background: "#e8f5e9", color: "#2e7d32" },
  Cancelled: { background: "#ffebee", color: "#c62828" },
};

let batchCounter = 4;

const initialHistory: PurchaseOrder[] = [
  {
    id: 1,
    batchNo: "PO-2026-001",
    supplier: "Cola Distributors Inc.",
    date: "2026-03-01",
    status: "Completed",
    totalAmount: 9600,
    items: [
      {
        id: 1,
        name: "Coca Cola 1.5L",
        unit: "Case",
        unitCost: 480,
        orderedQty: 10,
        receivedQty: 10,
      },
      {
        id: 2,
        name: "Sprite 1.5L",
        unit: "Case",
        unitCost: 450,
        orderedQty: 10,
        receivedQty: 9,
      },
    ],
  },
  {
    id: 2,
    batchNo: "PO-2026-002",
    supplier: "PepsiCo Philippines",
    date: "2026-03-05",
    status: "Completed",
    totalAmount: 4500,
    items: [
      {
        id: 5,
        name: "Pepsi 1.5L",
        unit: "Case",
        unitCost: 450,
        orderedQty: 5,
        receivedQty: 5,
      },
      {
        id: 6,
        name: "Mountain Dew 1.5L",
        unit: "Case",
        unitCost: 480,
        orderedQty: 5,
        receivedQty: 5,
      },
    ],
  },
  {
    id: 3,
    batchNo: "PO-2026-003",
    supplier: "Asia Brewery Corp.",
    date: "2026-03-10",
    status: "Receiving",
    totalAmount: 3600,
    items: [
      {
        id: 9,
        name: "Cobra Energy",
        unit: "Case",
        unitCost: 600,
        orderedQty: 6,
        receivedQty: 0,
      },
    ],
  },
];

// ── Shared stock helpers ──────────────────────────────────────────────────────
function getStockLevel(stock: number, minStock: number): "out" | "low" | "ok" {
  if (stock === 0) return "out";
  if (stock < minStock) return "low";
  return "ok";
}

const stockTheme = {
  out: {
    dot: "#e53935",
    bar: "#e53935",
    badge: { bg: "#ffebee", color: "#c62828", label: "Out of Stock" },
    row: { bg: "#fff8f8", border: "1px solid #ffcdd2" },
    addBtn: { bg: "#e53935" },
  },
  low: {
    dot: "#ff9800",
    bar: "#ff9800",
    badge: { bg: "#fff3e0", color: "#e65100", label: "Low Stock" },
    row: { bg: "#fffdf5", border: "1px solid #ffe0b2" },
    addBtn: { bg: "#ff9800" },
  },
  ok: {
    dot: "#2e7d32",
    bar: "#2e7d32",
    badge: { bg: "#e8f5e9", color: "#2e7d32", label: "In Stock" },
    row: { bg: "#f9f9f9", border: "1px solid #f0f0f0" },
    addBtn: { bg: "#1a3c2e" },
  },
};

export default function PurchaseOrderPage() {
  const [isNarrow, setIsNarrow] = useState(false);
  const [step, setStep] = useState<POStep>("create");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [orderItems, setOrderItems] = useState<POItem[]>([]);
  const [history, setHistory] = useState<PurchaseOrder[]>(initialHistory);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receivingItems, setReceivingItems] = useState<POItem[]>([]);
  const [searchHistory, setSearchHistory] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const total = orderItems.reduce((s, i) => s + i.unitCost * i.orderedQty, 0);

  const lowStockProducts = useMemo(() => {
    if (!selectedSupplier) return [];
    return selectedSupplier.products.filter((p) => p.stock < p.minStock);
  }, [selectedSupplier]);

  const outOfStockProducts = useMemo(
    () => lowStockProducts.filter((p) => p.stock === 0),
    [lowStockProducts],
  );
  const criticalProducts = useMemo(
    () => lowStockProducts.filter((p) => p.stock > 0 && p.stock < p.minStock),
    [lowStockProducts],
  );

  const addProduct = (p: {
    id: number;
    name: string;
    unit: string;
    unitCost: number;
    stock: number;
    minStock: number;
  }) => {
    setOrderItems((prev) => {
      if (prev.find((i) => i.id === p.id)) return prev;
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          unit: p.unit,
          unitCost: p.unitCost,
          orderedQty: 1,
          receivedQty: 0,
        },
      ];
    });
  };

  const updateQty = (id: number, qty: number) =>
    setOrderItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, orderedQty: Math.max(1, qty) } : i,
      ),
    );

  const removeItem = (id: number) =>
    setOrderItems((prev) => prev.filter((i) => i.id !== id));

  const handleSubmitPO = () => {
    if (!selectedSupplier || orderItems.length === 0) return;
    const newPO: PurchaseOrder = {
      id: Date.now(),
      batchNo: `PO-2026-00${batchCounter++}`,
      supplier: selectedSupplier.name,
      date: new Date().toISOString().split("T")[0],
      status: "Sent",
      items: orderItems,
      totalAmount: total,
    };
    setHistory((prev) => [newPO, ...prev]);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setOrderItems([]);
      setSelectedSupplier(null);
      setStep("history");
    }, 2000);
  };

  const openReceiving = (po: PurchaseOrder) => {
    setReceivingPO(po);
    setReceivingItems(po.items.map((i) => ({ ...i })));
    setStep("receiving");
  };

  const updateReceivedQty = (id: number, qty: number) =>
    setReceivingItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, receivedQty: Math.max(0, qty) } : i,
      ),
    );

  const confirmReceiving = () => {
    if (!receivingPO) return;
    setHistory((prev) =>
      prev.map((po) =>
        po.id === receivingPO.id
          ? { ...po, status: "Completed" as POStatus, items: receivingItems }
          : po,
      ),
    );
    setStep("history");
    setReceivingPO(null);
  };

  const filteredHistory = useMemo(
    () =>
      history.filter(
        (po) =>
          po.batchNo.toLowerCase().includes(searchHistory.toLowerCase()) ||
          po.supplier.toLowerCase().includes(searchHistory.toLowerCase()),
      ),
    [history, searchHistory],
  );

  return (
    <div style={{ padding: "28px" }}>
      {/* Step Tabs */}
      <div
        style={{
          display: "flex",
          marginBottom: "24px",
          background: "#fff",
          borderRadius: "14px",
          border: "0.5px solid #e8e8e8",
          overflow: "hidden",
          flexWrap: "wrap",
        }}
      >
        {(
          [
            { key: "create", label: "📋 Create Order" },
            { key: "receiving", label: "📦 Receiving" },
            { key: "history", label: "🕐 PO History" },
          ] as { key: POStep; label: string }[]
        ).map((t, i) => (
          <button
            key={t.key}
            onClick={() => setStep(t.key)}
            style={{
              padding: "12px 28px",
              fontSize: "13px",
              fontWeight: step === t.key ? 700 : 400,
              cursor: "pointer",
              border: "none",
              borderRight: i < 2 ? "1px solid #e8e8e8" : "none",
              background: step === t.key ? "#1a3c2e" : "#fff",
              color: step === t.key ? "#fff" : "#555",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CREATE ORDER ── */}
      {step === "create" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow
              ? "1fr"
              : "minmax(0,1fr) minmax(320px,380px)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Supplier Selector */}
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "0.5px solid #e8e8e8",
                padding: "22px 24px",
              }}
            >
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: "14px",
                }}
              >
                🏢 Select Supplier / Company
              </p>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowSupplierDrop(!showSupplierDrop)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1.5px solid #e0e0e0",
                    background: "#fff",
                    fontSize: "14px",
                    fontWeight: selectedSupplier ? 600 : 400,
                    color: selectedSupplier ? "#1a1a1a" : "#aaa",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {selectedSupplier
                    ? selectedSupplier.name
                    : "Select a supplier..."}
                  <span style={{ fontSize: "12px", color: "#aaa" }}>
                    {showSupplierDrop ? "▲" : "▼"}
                  </span>
                </button>

                {showSupplierDrop && (
                  <div
                    style={{
                      position: "absolute",
                      top: "48px",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e0e0e0",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                      zIndex: 20,
                      overflow: "hidden",
                    }}
                  >
                    {suppliers.map((s) => {
                      const outCount = s.products.filter(
                        (p) => p.stock === 0,
                      ).length;
                      const lowCount = s.products.filter(
                        (p) => p.stock > 0 && p.stock < p.minStock,
                      ).length;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSupplier(s);
                            setShowSupplierDrop(false);
                            setOrderItems([]);
                          }}
                          style={{
                            padding: "14px 18px",
                            cursor: "pointer",
                            borderBottom: "0.5px solid #f5f5f5",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) =>
                            ((
                              e.currentTarget as HTMLDivElement
                            ).style.background = "#f0faf2")
                          }
                          onMouseLeave={(e) =>
                            ((
                              e.currentTarget as HTMLDivElement
                            ).style.background = "#fff")
                          }
                        >
                          <div>
                            <p
                              style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "#1a1a1a",
                              }}
                            >
                              {s.name}
                            </p>
                            <p style={{ fontSize: "12px", color: "#aaa" }}>
                              📞 {s.contact} • 📍 {s.address}
                            </p>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexShrink: 0,
                              marginLeft: "10px",
                            }}
                          >
                            {outCount > 0 && (
                              <span
                                style={{
                                  background: "#ffebee",
                                  color: "#c62828",
                                  padding: "3px 10px",
                                  borderRadius: "20px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                🔴 {outCount} out
                              </span>
                            )}
                            {lowCount > 0 && (
                              <span
                                style={{
                                  background: "#fff3e0",
                                  color: "#e65100",
                                  padding: "3px 10px",
                                  borderRadius: "20px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                🟠 {lowCount} low
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSupplier && (
                <div
                  style={{
                    marginTop: "14px",
                    background: "#f0faf2",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    border: "1px solid #a5d6a7",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1a3c2e",
                      marginBottom: "4px",
                    }}
                  >
                    {selectedSupplier.name}
                  </p>
                  <p style={{ fontSize: "12px", color: "#1a1a1a" }}>
                    📞 {selectedSupplier.contact}
                  </p>
                  <p style={{ fontSize: "12px", color: "#1a1a1a" }}>
                    📍 {selectedSupplier.address}
                  </p>
                </div>
              )}
            </div>

            {/* ── LOW STOCK ALERT ── */}
            {selectedSupplier && lowStockProducts.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "1.5px solid #ffcc80",
                  padding: "20px 24px",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "10px",
                        background: "#fff3e0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                      }}
                    >
                      ⚠️
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#1a1a1a",
                        }}
                      >
                        Low Stock Alert
                      </p>
                      <p style={{ fontSize: "12px", color: "#e65100" }}>
                        {selectedSupplier.name} — {lowStockProducts.length} item
                        {lowStockProducts.length > 1 ? "s" : ""} need restocking
                      </p>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    {outOfStockProducts.length > 0 && (
                      <span
                        style={{
                          background: "#ffebee",
                          color: "#c62828",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        🔴 {outOfStockProducts.length} Out of Stock
                      </span>
                    )}
                    {criticalProducts.length > 0 && (
                      <span
                        style={{
                          background: "#fff3e0",
                          color: "#e65100",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        🟠 {criticalProducts.length} Low Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Low stock items */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {lowStockProducts.map((p) => {
                    const inOrder = orderItems.find((i) => i.id === p.id);
                    const level = getStockLevel(p.stock, p.minStock);
                    const theme = stockTheme[level];
                    const stockPct = Math.min(
                      100,
                      Math.round((p.stock / p.minStock) * 100),
                    );
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          padding: "14px 16px",
                          borderRadius: "12px",
                          background: theme.row.bg,
                          border: theme.row.border,
                        }}
                      >
                        {/* Status dot */}
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: theme.dot,
                            flexShrink: 0,
                          }}
                        />

                        {/* Info + bar */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "6px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#1a1a1a",
                              }}
                            >
                              {p.name}
                            </p>
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: theme.dot,
                              }}
                            >
                              {level === "out"
                                ? "Out of Stock"
                                : `${p.stock} / ${p.minStock} ${p.unit}s`}
                            </span>
                          </div>
                          <div
                            style={{
                              height: "6px",
                              borderRadius: "20px",
                              background: "#f0f0f0",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${stockPct}%`,
                                borderRadius: "20px",
                                background: theme.bar,
                              }}
                            />
                          </div>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#aaa",
                              marginTop: "4px",
                            }}
                          >
                            Min. required: {p.minStock} {p.unit}s • ₱
                            {p.unitCost.toLocaleString()} per {p.unit}
                          </p>
                        </div>

                        {/* Add button */}
                        {inOrder ? (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#2e7d32",
                              background: "#e8f5e9",
                              padding: "5px 12px",
                              borderRadius: "20px",
                              flexShrink: 0,
                            }}
                          >
                            ✓ Added
                          </span>
                        ) : (
                          <button
                            onClick={() => addProduct(p)}
                            style={{
                              padding: "7px 16px",
                              borderRadius: "20px",
                              border: "none",
                              background: theme.addBtn.bg,
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All stocks OK */}
            {selectedSupplier && lowStockProducts.length === 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "1.5px solid #a5d6a7",
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "10px",
                    background: "#e8f5e9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  ✅
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#2e7d32",
                    }}
                  >
                    All Stocks OK
                  </p>
                  <p style={{ fontSize: "12px", color: "#555" }}>
                    All products from {selectedSupplier.name} are within stock
                    levels.
                  </p>
                </div>
              </div>
            )}

            {/* ── AVAILABLE PRODUCTS — with same stock color system ── */}
            {selectedSupplier && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "0.5px solid #e8e8e8",
                  padding: "22px 24px",
                }}
              >
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                    marginBottom: "14px",
                  }}
                >
                  🥤 Available Products from {selectedSupplier.name}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {selectedSupplier.products.map((p) => {
                    const inOrder = orderItems.find((i) => i.id === p.id);
                    const level = getStockLevel(p.stock, p.minStock);
                    const theme = stockTheme[level];
                    const stockPct = Math.min(
                      100,
                      Math.round((p.stock / p.minStock) * 100),
                    );
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          padding: "14px 16px",
                          borderRadius: "12px",
                          background: inOrder ? "#f0faf2" : theme.row.bg,
                          border: inOrder
                            ? "1.5px solid #a5d6a7"
                            : theme.row.border,
                          transition: "border 0.2s",
                        }}
                      >
                        {/* Colored icon circle */}
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "12px",
                            background:
                              level === "out"
                                ? "#ffebee"
                                : level === "low"
                                  ? "#fff3e0"
                                  : "#e8f5e9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            flexShrink: 0,
                            border: `2px solid ${theme.dot}`,
                          }}
                        >
                          🥤
                        </div>

                        {/* Product info + stock bar */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "4px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#1a1a1a",
                              }}
                            >
                              {p.name}
                            </p>
                            {/* Stock badge */}
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "20px",
                                background: theme.badge.bg,
                                color: theme.badge.color,
                                flexShrink: 0,
                              }}
                            >
                              {theme.badge.label}
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#1a1a1a",
                              marginBottom: "6px",
                            }}
                          >
                            {p.unit} • ₱{p.unitCost.toLocaleString()} per case
                          </p>
                          {/* Stock bar */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: "5px",
                                borderRadius: "20px",
                                background: "#f0f0f0",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${stockPct}%`,
                                  borderRadius: "20px",
                                  background: theme.bar,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: theme.dot,
                                flexShrink: 0,
                              }}
                            >
                              {level === "out" ? "0" : p.stock}/{p.minStock}
                            </span>
                          </div>
                        </div>

                        {/* Add / Added button */}
                        {inOrder ? (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#2e7d32",
                              background: "#e8f5e9",
                              padding: "6px 14px",
                              borderRadius: "20px",
                              flexShrink: 0,
                            }}
                          >
                            ✓ Added
                          </span>
                        ) : (
                          <button
                            onClick={() => addProduct(p)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "20px",
                              border: "none",
                              background: theme.addBtn.bg,
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right — Order Summary */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "0.5px solid #e8e8e8",
              padding: "24px",
              position: "sticky",
              top: "20px",
              alignSelf: "start",
            }}
          >
            <p
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: "16px",
              }}
            >
              📋 Order List
            </p>

            {orderItems.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 20px",
                  color: "#aaa",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
                <p style={{ fontSize: "13px" }}>
                  No items yet. Select a supplier and add products.
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: "#f9f9f9",
                        borderRadius: "10px",
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#1a1a1a",
                            }}
                          >
                            {item.name}
                          </p>
                          <p style={{ fontSize: "11px", color: "#1a1a1a" }}>
                            ₱{item.unitCost.toLocaleString()} / {item.unit}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#e53935",
                            cursor: "pointer",
                            fontSize: "16px",
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() =>
                              updateQty(item.id, item.orderedQty - 1)
                            }
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              border: "1.5px solid #e0e0e0",
                              background: "#fff",
                              fontSize: "16px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#1a3c2e",
                              fontWeight: 700,
                            }}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={item.orderedQty}
                            onChange={(e) =>
                              updateQty(item.id, Number(e.target.value))
                            }
                            style={{
                              width: "50px",
                              textAlign: "center",
                              padding: "4px",
                              borderRadius: "6px",
                              border: "1.5px solid #1a3c2e",
                              fontSize: "14px",
                              fontWeight: 800,
                              outline: "none",
                              color: "#1a1a1a",
                              background: "#fff",
                            }}
                          />
                          <button
                            onClick={() =>
                              updateQty(item.id, item.orderedQty + 1)
                            }
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              border: "none",
                              background: "#1a3c2e",
                              fontSize: "16px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontWeight: 700,
                            }}
                          >
                            +
                          </button>
                        </div>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#1a3c2e",
                          }}
                        >
                          ₱{(item.unitCost * item.orderedQty).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    height: "1px",
                    background: "#f0f0f0",
                    margin: "14px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 700 }}>
                    Total Amount
                  </span>
                  <span
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#1a3c2e",
                    }}
                  >
                    ₱{total.toLocaleString()}
                  </span>
                </div>
              </>
            )}

            <button
              onClick={handleSubmitPO}
              disabled={
                orderItems.length === 0 || !selectedSupplier || submitted
              }
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "20px",
                border: "none",
                background: submitted
                  ? "#4caf50"
                  : orderItems.length === 0
                    ? "#ccc"
                    : "#1a3c2e",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: orderItems.length === 0 ? "not-allowed" : "pointer",
                boxShadow:
                  orderItems.length > 0
                    ? "0 4px 14px rgba(26,60,46,0.3)"
                    : "none",
                transition: "background 0.3s",
              }}
            >
              {submitted ? "✅ Order Submitted!" : "📤 Submit Purchase Order"}
            </button>
          </div>
        </div>
      )}

      {/* ── RECEIVING ── */}
      {step === "receiving" && (
        <div>
          {!receivingPO ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <p
                style={{ fontSize: "14px", color: "#888", marginBottom: "4px" }}
              >
                Select a Purchase Order to process receiving:
              </p>
              {history.filter(
                (po) => po.status === "Sent" || po.status === "Receiving",
              ).length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    border: "0.5px solid #e8e8e8",
                    padding: "48px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                    📦
                  </div>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#1a1a1a",
                    }}
                  >
                    No pending deliveries
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#aaa",
                      marginTop: "6px",
                    }}
                  >
                    Submit a purchase order first
                  </p>
                </div>
              ) : (
                history
                  .filter(
                    (po) => po.status === "Sent" || po.status === "Receiving",
                  )
                  .map((po) => (
                    <div
                      key={po.id}
                      style={{
                        background: "#fff",
                        borderRadius: "16px",
                        border: "0.5px solid #e8e8e8",
                        padding: "20px 24px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "16px",
                              fontWeight: 800,
                              color: "#1a3c2e",
                            }}
                          >
                            {po.batchNo}
                          </p>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: 600,
                              ...statusStyle[po.status],
                            }}
                          >
                            {po.status}
                          </span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#1a1a1a" }}>
                          🏢 {po.supplier}
                        </p>
                        <p style={{ fontSize: "13px", color: "#1a1a1a" }}>
                          📅 {po.date} • {po.items.length} item
                          {po.items.length > 1 ? "s" : ""} • ₱
                          {po.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => openReceiving(po)}
                        style={{
                          padding: "10px 24px",
                          borderRadius: "20px",
                          border: "none",
                          background: "#1a3c2e",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        📦 Start Receiving
                      </button>
                    </div>
                  ))
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isNarrow
                  ? "1fr"
                  : "minmax(0,1fr) minmax(280px,340px)",
                gap: "20px",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "0.5px solid #e8e8e8",
                  padding: "24px",
                }}
              >
                <div style={{ marginBottom: "20px" }}>
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#1a3c2e",
                    }}
                  >
                    {receivingPO.batchNo}
                  </p>
                  <p style={{ fontSize: "13px", color: "#1a1a1a" }}>
                    🏢 {receivingPO.supplier} • 📅 {receivingPO.date}
                  </p>
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1a1a1a",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Enter Received Quantities
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {receivingItems.map((item) => {
                    const diff = item.receivedQty - item.orderedQty;
                    return (
                      <div
                        key={item.id}
                        style={{
                          background: "#f9f9f9",
                          borderRadius: "12px",
                          padding: "16px",
                          border:
                            diff < 0
                              ? "1.5px solid #ffcc80"
                              : "1px solid #f0f0f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "#1a1a1a",
                              }}
                            >
                              {item.name}
                            </p>
                            <p style={{ fontSize: "12px", color: "#1a1a1a" }}>
                              Ordered: <strong>{item.orderedQty}</strong>{" "}
                              {item.unit}
                            </p>
                          </div>
                          {diff < 0 && (
                            <span
                              style={{
                                background: "#fff3e0",
                                color: "#e65100",
                                padding: "3px 10px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}
                            >
                              ⚠️ {Math.abs(diff)} short
                            </span>
                          )}
                          {diff === 0 && item.receivedQty > 0 && (
                            <span
                              style={{
                                background: "#e8f5e9",
                                color: "#2e7d32",
                                padding: "3px 10px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}
                            >
                              ✅ Complete
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#1a1a1a",
                              flexShrink: 0,
                            }}
                          >
                            Received Qty:
                          </p>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <button
                              onClick={() =>
                                updateReceivedQty(item.id, item.receivedQty - 1)
                              }
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                border: "1.5px solid #e0e0e0",
                                background: "#fff",
                                fontSize: "16px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                color: "#1a3c2e",
                              }}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={item.receivedQty}
                              onChange={(e) =>
                                updateReceivedQty(
                                  item.id,
                                  Number(e.target.value),
                                )
                              }
                              style={{
                                width: "60px",
                                textAlign: "center",
                                padding: "6px",
                                borderRadius: "8px",
                                border: "1.5px solid #1a3c2e",
                                fontSize: "14px",
                                fontWeight: 700,
                                outline: "none",
                              }}
                            />
                            <button
                              onClick={() =>
                                updateReceivedQty(item.id, item.receivedQty + 1)
                              }
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                border: "none",
                                background: "#1a3c2e",
                                fontSize: "16px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "0.5px solid #e8e8e8",
                  padding: "24px",
                  position: "sticky",
                  top: "20px",
                }}
              >
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                    marginBottom: "16px",
                  }}
                >
                  📦 Receiving Summary
                </p>
                {receivingItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "0.5px solid #f5f5f5",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#1a1a1a" }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color:
                          item.receivedQty < item.orderedQty
                            ? "#e65100"
                            : "#2e7d32",
                      }}
                    >
                      {item.receivedQty}/{item.orderedQty}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    height: "1px",
                    background: "#f0f0f0",
                    margin: "14px 0",
                  }}
                />
                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#1a1a1a" }}>
                      Total Ordered
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>
                      {receivingItems.reduce((s, i) => s + i.orderedQty, 0)}{" "}
                      units
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "13px", color: "#1a1a1a" }}>
                      Total Received
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1a3c2e",
                      }}
                    >
                      {receivingItems.reduce((s, i) => s + i.receivedQty, 0)}{" "}
                      units
                    </span>
                  </div>
                </div>
                {receivingItems.some((i) => i.receivedQty < i.orderedQty) && (
                  <div
                    style={{
                      background: "#fff3e0",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      marginBottom: "14px",
                      border: "1px solid #ffcc80",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#e65100",
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ Some items are short. This will be recorded as a
                      discrepancy.
                    </p>
                  </div>
                )}
                <button
                  onClick={confirmReceiving}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: "20px",
                    border: "none",
                    background: "#1a3c2e",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    marginBottom: "10px",
                  }}
                >
                  ✅ Confirm Receiving
                </button>
                <button
                  onClick={() => {
                    setReceivingPO(null);
                    setReceivingItems([]);
                  }}
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: "20px",
                    border: "1.5px solid #e0e0e0",
                    background: "#fff",
                    color: "#555",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PO HISTORY ── */}
      {step === "history" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            {(
              ["Sent", "Receiving", "Completed", "Cancelled"] as POStatus[]
            ).map((s) => (
              <div
                key={s}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "0.5px solid #e8e8e8",
                  padding: "14px 18px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    ...statusStyle[s],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  {s === "Sent"
                    ? "📤"
                    : s === "Receiving"
                      ? "📦"
                      : s === "Completed"
                        ? "✅"
                        : "✕"}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: (statusStyle[s] as { color: string }).color,
                    }}
                  >
                    {history.filter((po) => po.status === s).length}
                  </p>
                  <p style={{ fontSize: "11px", color: "#888" }}>{s}</p>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "0.5px solid #e8e8e8",
              padding: "14px 20px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "13px",
                }}
              >
                🔍
              </span>
              <input
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Search batch no. or supplier..."
                style={{
                  padding: "8px 14px 8px 32px",
                  borderRadius: "20px",
                  border: "1.5px solid #ddd",
                  fontSize: "13px",
                  outline: "none",
                  width: "260px",
                  color: "#1a1a1a",
                }}
              />
            </div>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "12px",
                color: "#888",
                fontWeight: 500,
              }}
            >
              {filteredHistory.length} purchase orders
            </span>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "0.5px solid #e8e8e8",
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1a3c2e" }}>
                  {[
                    "Batch No.",
                    "Supplier",
                    "Date",
                    "Items",
                    "Total Amount",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        color: "#fff",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((po, idx) => (
                  <tr
                    key={po.id}
                    style={{
                      borderBottom: "0.5px solid #f0f0f0",
                      background: idx % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    <td
                      style={{
                        padding: "13px 16px",
                        fontSize: "14px",
                        fontWeight: 800,
                        color: "#1a3c2e",
                      }}
                    >
                      {po.batchNo}
                    </td>
                    <td
                      style={{
                        padding: "13px 16px",
                        fontSize: "13px",
                        color: "#1a1a1a",
                      }}
                    >
                      {po.supplier}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span
                        style={{
                          background: "#e8f0fe",
                          color: "#1a237e",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                        }}
                      >
                        📅 {po.date}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "13px 16px",
                        fontSize: "13px",
                        color: "#555",
                      }}
                    >
                      {po.items.length} item{po.items.length > 1 ? "s" : ""}
                    </td>
                    <td
                      style={{
                        padding: "13px 16px",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#1a1a1a",
                      }}
                    >
                      ₱{po.totalAmount.toLocaleString()}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          ...statusStyle[po.status],
                        }}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => setViewPO(po)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            border: "none",
                            background: "#e8f0fe",
                            color: "#1565c0",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          👁 View
                        </button>
                        {(po.status === "Sent" ||
                          po.status === "Receiving") && (
                          <button
                            onClick={() => {
                              openReceiving(po);
                              setStep("receiving");
                            }}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "20px",
                              border: "none",
                              background: "#e8f5e9",
                              color: "#1a3c2e",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            📦 Receive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0" }}
            >
              <p style={{ fontSize: "12px", color: "#888" }}>
                Showing {filteredHistory.length} of {history.length} purchase
                orders
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {viewPO && (
        <>
          <div
            onClick={() => setViewPO(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 50,
              background: "#fff",
              borderRadius: "20px",
              width: "min(92vw, 480px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                background: "#1a3c2e",
                padding: "20px 24px",
                borderRadius: "20px 20px 0 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>
                  {viewPO.batchNo}
                </p>
                <p
                  style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)" }}
                >
                  Purchase Order Details
                </p>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    ...statusStyle[viewPO.status],
                  }}
                >
                  {viewPO.status}
                </span>
                <button
                  onClick={() => setViewPO(null)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer",
                    color: "#fff",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  background: "#f9f9f9",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "18px",
                }}
              >
                {[
                  ["Batch No.", viewPO.batchNo],
                  ["Supplier", viewPO.supplier],
                  ["Date", viewPO.date],
                  ["Total", `₱${viewPO.totalAmount.toLocaleString()}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      flexWrap: "wrap",
                      rowGap: "4px",
                      borderBottom: "0.5px solid #f0f0f0",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#888" }}>
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1a1a1a",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: "12px",
                }}
              >
                📦 Items Ordered
              </p>
              <div
                style={{
                  borderRadius: "12px",
                  overflowX: "auto",
                  border: "0.5px solid #e8e8e8",
                  marginBottom: "20px",
                }}
              >
                <table
                  style={{
                    minWidth: "400px",
                    borderCollapse: "collapse",
                    width: "100%",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#1a3c2e" }}>
                      {[
                        "Product",
                        "Unit",
                        "Unit Cost",
                        "Ordered",
                        "Received",
                        "Status",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            fontSize: "11px",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewPO.items.map((item, i) => {
                      const diff = item.receivedQty - item.orderedQty;
                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "0.5px solid #f0f0f0",
                            background: i % 2 === 0 ? "#fff" : "#fafafa",
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "#1a1a1a",
                            }}
                          >
                            {item.name}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                              color: "#1a1a1a",
                            }}
                          >
                            {item.unit}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                              color: "#1a1a1a",
                            }}
                          >
                            ₱{item.unitCost.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#1a1a1a",
                              textAlign: "center",
                            }}
                          >
                            {item.orderedQty}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "13px",
                              fontWeight: 600,
                              textAlign: "center",
                              color:
                                item.receivedQty === 0
                                  ? "#aaa"
                                  : item.receivedQty < item.orderedQty
                                    ? "#e65100"
                                    : "#2e7d32",
                            }}
                          >
                            {item.receivedQty === 0 ? "—" : item.receivedQty}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {item.receivedQty === 0 ? (
                              <span style={{ fontSize: "11px", color: "#aaa" }}>
                                Pending
                              </span>
                            ) : diff < 0 ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#e65100",
                                  background: "#fff3e0",
                                  padding: "2px 8px",
                                  borderRadius: "20px",
                                }}
                              >
                                -{Math.abs(diff)} short
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#2e7d32",
                                  background: "#e8f5e9",
                                  padding: "2px 8px",
                                  borderRadius: "20px",
                                }}
                              >
                                Complete
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div
                style={{
                  background: "#f0faf2",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  rowGap: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#1a1a1a",
                  }}
                >
                  Total Amount
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#1a3c2e",
                  }}
                >
                  ₱{viewPO.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
