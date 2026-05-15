"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type CategoryType =
  | "SOFTDRINKS"
  | "ENERGY_DRINK"
  | "BEER"
  | "JUICE"
  | "WATER"
  | "OTHER";

type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";

type Product = {
  id:            string;
  productName:   string;
  category:      CategoryType;
  size:          string | null;
  barcode:       string | null;
  price:         number;
  stock:         number;
  reservedStock: number;
  piecesPerCase: number;
  expiryDate:    string | null;
  image:         string | null;
  status:        ProductStatus;
  supplierId:    string;
  createdAt:     string;
  updatedAt:     string;
  finalPrice:    number | null;
  activePromo:   unknown | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<CategoryType, { emoji: string; label: string; color: string }> = {
  SOFTDRINKS:   { emoji: "🥤", label: "Soft Drinks",   color: "#dc2626" },
  ENERGY_DRINK: { emoji: "⚡", label: "Energy Drink",  color: "#4f46e5" },
  BEER:         { emoji: "🍺", label: "Beer",           color: "#d97706" },
  JUICE:        { emoji: "🍹", label: "Juice",          color: "#16a34a" },
  WATER:        { emoji: "💧", label: "Water",          color: "#0284c7" },
  OTHER:        { emoji: "🛒", label: "Other",          color: "#6b7280" },
};

const CATEGORY_BG: Record<CategoryType, string> = {
  SOFTDRINKS:   "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
  ENERGY_DRINK: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
  BEER:         "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
  JUICE:        "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
  WATER:        "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
  OTHER:        "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
};

const getMeta = (category: CategoryType) => CATEGORY_META[category] ?? CATEGORY_META.OTHER;
const getCategoryBg = (category: CategoryType) => CATEGORY_BG[category] ?? CATEGORY_BG.OTHER;

const getCustomerId = (): string => {
  if (typeof window === "undefined") return "";
  try { return JSON.parse(localStorage.getItem("user") ?? "{}")?.id ?? ""; }
  catch { return ""; }
};

const formatExpiry = (dateStr: string | null): string | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonPill({ width }: { width: number }) {
  return (
    <div
      className="h-9 rounded-full animate-pulse bg-gray-100"
      style={{ width }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="w-full h-44 animate-pulse bg-gray-100" />
      <div className="p-5 flex flex-col gap-3">
        <div className="h-4 rounded-lg bg-gray-100 animate-pulse w-3/4" />
        <div className="h-3 rounded-lg bg-gray-100 animate-pulse w-1/3" />
        <div className="h-px bg-gray-100 my-1" />
        <div className="flex justify-between">
          <div className="h-6 rounded-lg bg-gray-100 animate-pulse w-2/5" />
          <div className="h-6 rounded-lg bg-gray-100 animate-pulse w-1/4" />
        </div>
        <div className="flex gap-2 mt-1">
          <div className="h-10 rounded-xl bg-gray-100 animate-pulse flex-1" />
          <div className="h-10 rounded-xl bg-gray-100 animate-pulse w-28" />
        </div>
      </div>
    </div>
  );
}

// ── Quantity Stepper ──────────────────────────────────────────────────────────
type StepperProps = {
  value:    number;
  min:      number;
  max:      number;
  onChange: (v: number) => void;
};

function QuantityStepper({ value, min, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-1 py-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500
                   hover:bg-white hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed
                   transition-all duration-150 font-bold text-base"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold text-gray-800 tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500
                   hover:bg-white hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed
                   transition-all duration-150 font-bold text-base"
      >
        +
      </button>
    </div>
  );
}

// ── Stock Badge ───────────────────────────────────────────────────────────────
function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold
                       bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Out of stock
      </span>
    );
  }
  if (stock <= 10) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold
                       bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Only {stock} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium
                     text-gray-400 rounded-full px-2 py-0.5">
      {stock} cases in stock
    </span>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
type ProductCardProps = {
  product:     Product;
  onAddToCart: (product: Product, qty: number) => Promise<void>;
  addingId:    string | null;
  addedId:     string | null;
};

function ProductCard({ product, onAddToCart, addingId, addedId }: ProductCardProps) {
  const [qty, setQty]               = useState<number>(1);
  const [atMaxStock, setAtMaxStock] = useState<boolean>(false);

  const outOfStock  = product.stock <= 0;
  const lowStock    = !outOfStock && product.stock <= 10;
  const hasPromo    = product.finalPrice != null && product.finalPrice < product.price;
  const isAdding    = addingId === product.id;
  const isAdded     = addedId  === product.id;
  const meta        = getMeta(product.category);
  const expiryLabel = formatExpiry(product.expiryDate);
  const discount    = hasPromo
    ? Math.round(((product.price - product.finalPrice!) / product.price) * 100)
    : 0;

  // Reset qty if stock changes and clamp
  useEffect(() => {
    if (product.stock > 0 && qty > product.stock) setQty(product.stock);
    if (product.stock <= 0) setQty(1);
    setAtMaxStock(false);
  }, [product.stock, qty]);

  const handleQtyChange = (next: number) => {
    const clamped = Math.min(next, product.stock);
    setQty(clamped);
    setAtMaxStock(clamped >= product.stock);
  };

  const handleAdd = () => {
    if (outOfStock || isAdding) return;
    onAddToCart(product, qty);
  };

  return (
    <div
      className={[
        "bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-gray-200",
        outOfStock ? "opacity-60" : "",
      ].join(" ")}
    >
      {/* ── Image / thumbnail ── */}
      <div
        className="relative w-full h-44 flex items-center justify-center"
        style={{ background: getCategoryBg(product.category) }}
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-7xl select-none drop-shadow-sm">{meta.emoji}</span>
        )}

        {/* Category chip */}
        <span
          className="absolute bottom-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full
                     bg-white/80 backdrop-blur-sm border border-white/60"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>

        {/* Promo badge */}
        {hasPromo && !outOfStock && (
          <span className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[10px]
                           font-bold px-2.5 py-0.5 rounded-full shadow-sm">
            −{discount}% OFF
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-5">
        {/* Name + size */}
        <div className="mb-1">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1">
            {product.productName}
          </h3>
          {product.size && (
            <p className="text-xs text-gray-400 mt-0.5">{product.size}</p>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 mb-3">
          {product.piecesPerCase > 0 && (
            <span title="Pieces per case">
              📦 {product.piecesPerCase} pcs/case
            </span>
          )}
          {expiryLabel && (
            <span title="Expiry date" className={
              (() => {
                const d = new Date(product.expiryDate!);
                const daysLeft = (d.getTime() - Date.now()) / 86_400_000;
                return daysLeft < 30 ? "text-red-400 font-semibold" : "";
              })()
            }>
              📅 Expires {expiryLabel}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mb-3" />

        {/* Price + stock */}
        <div className="flex items-end justify-between gap-2 mb-3">
          <div>
            {hasPromo ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold text-green-700 leading-none">
                    ₱{product.finalPrice!.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-gray-400 line-through">
                    ₱{product.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-green-600 mt-0.5">per case (promo price)</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900 leading-none">
                  ₱{product.price.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">per case</p>
              </>
            )}
          </div>
          <StockBadge stock={product.stock} />
        </div>

        {/* Subtotal hint (when qty > 1) */}
        {!outOfStock && qty > 1 && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-green-50 border border-green-100">
            <p className="text-xs text-green-700 font-medium">
              Subtotal: ₱{((product.finalPrice ?? product.price) * qty).toLocaleString()}
              <span className="font-normal text-green-500 ml-1">for {qty} case{qty !== 1 ? "s" : ""}</span>
            </p>
          </div>
        )}

        {/* Controls */}
        {outOfStock ? (
          <button
            disabled
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400
                       text-xs font-semibold cursor-not-allowed"
          >
            Out of Stock
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <QuantityStepper
              value={qty}
              min={1}
              max={product.stock}
              onChange={setQty}
            />
            <button
              onClick={handleAdd}
              disabled={isAdding}
              className={[
                "flex-1 py-2.5 rounded-xl text-xs font-semibold text-white",
                "transition-all duration-200 active:scale-95",
                isAdded
                  ? "bg-green-600"
                  : isAdding
                    ? "bg-violet-400 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-700",
              ].join(" ")}
            >
              {isAdding
                ? "Adding…"
                : isAdded
                  ? "✓ Added!"
                  : `Add ${qty > 1 ? `${qty} ` : ""}to Cart`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products,       setProducts]       = useState<Product[]>([]);
  const [loading,        setLoading]        = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<CategoryType | "All">("All");
  const [search,         setSearch]         = useState<string>("");
  const [addingId,       setAddingId]       = useState<string | null>(null);
  const [addedId,        setAddedId]        = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data: Product[] = await api.getProducts();
        setProducts(
          Array.isArray(data) ? data.filter((p) => p.status === "ACTIVE") : []
        );
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo<Array<CategoryType | "All">>(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const filtered = useMemo<Product[]>(() => {
    const stockPriority = (p: Product): number => {
      if (p.stock <= 0)  return 2;
      if (p.stock <= 10) return 1;
      return 0;
    };
    return products
      .filter((p) => {
        const matchCat = activeCategory === "All" || p.category === activeCategory;
        const matchQ   = p.productName.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchQ;
      })
      .sort((a, b) => {
        const priorityDiff = stockPriority(a) - stockPriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return b.stock - a.stock;
      });
  }, [products, activeCategory, search]);

  const handleAddToCart = useCallback(async (product: Product, qty: number): Promise<void> => {
    if (product.stock <= 0) return;

    const customerId = getCustomerId();
    if (!customerId) { alert("Please log in to add items to cart."); return; }

    // Guard: qty must not exceed available stock
    const safeQty = Math.min(qty, product.stock);
    if (safeQty < 1) return;

    setAddingId(product.id);
    try {
      const result = await api.addCartItem(customerId, product.id, safeQty);
      if ((result?.message as string | undefined)?.toLowerCase().includes("insufficient")) {
        alert(result.message as string);
        return;
      }
      setAddedId(product.id);
      setTimeout(() => setAddedId(null), 1200);
    } catch {
      alert("Failed to add item to cart. Please try again.");
    } finally {
      setAddingId(null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/60 px-6 py-7">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2.5 mb-7">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-full border border-gray-200 text-sm
                       bg-white text-gray-900 w-60 outline-none shadow-sm
                       focus:border-violet-400 focus:ring-2 focus:ring-violet-100
                       transition-all placeholder:text-gray-400"
          />
        </div>

        <div className="w-px h-7 bg-gray-200" />

        {/* Category pills */}
        {loading ? (
          [80, 104, 72, 88, 64].map((w, i) => <SkeletonPill key={i} width={w} />)
        ) : (
          categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={[
                "px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-150",
                activeCategory === c
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-200"
                  : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300",
              ].join(" ")}
            >
              {c === "All" ? "All" : getMeta(c as CategoryType).label}
            </button>
          ))
        )}

        {!loading && (
          <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Grid ── */}
      {loading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-base font-semibold text-gray-800 mb-2">No products found</p>
          <p className="text-sm text-gray-400">Try a different search or category</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAddToCart={handleAddToCart}
              addingId={addingId}
              addedId={addedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}