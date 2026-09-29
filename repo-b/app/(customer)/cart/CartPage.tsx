"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
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
  value:        number;
  min:          number;
  max:          number;
  onChange:     (v: number) => void;
  onMaxReached: () => void;
};

function QuantityStepper({ value, min, max, onChange, onMaxReached }: StepperProps) {
  const atMax = value >= max;

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
      {/* Not truly disabled at max, so tapping it can still show the "max stock" popup */}
      <button
        onClick={() => (atMax ? onMaxReached() : onChange(value + 1))}
        aria-label="Increase quantity"
        aria-disabled={atMax}
        className={[
          "w-8 h-8 rounded-lg flex items-center justify-center text-gray-500",
          "transition-all duration-150 font-bold text-base",
          atMax
            ? "opacity-30 cursor-not-allowed"
            : "hover:bg-white hover:text-gray-800",
        ].join(" ")}
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
  inCartQty:   number;
};

function ProductCard({ product, onAddToCart, addingId, addedId, inCartQty }: ProductCardProps) {
  const [qty, setQty]                     = useState<number>(1);
  const [showMaxNotice, setShowMaxNotice] = useState<boolean>(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outOfStock  = product.stock <= 0;
  // How many more cases the customer can still add (stock minus what's already in the cart)
  const remaining   = Math.max(0, product.stock - inCartQty);
  const cartIsFull  = !outOfStock && remaining <= 0;
  const hasPromo    = product.finalPrice != null && product.finalPrice < product.price;
  const isAdding    = addingId === product.id;
  const isAdded     = addedId  === product.id;
  const meta        = getMeta(product.category);
  const expiryLabel = formatExpiry(product.expiryDate);
  const discount    = hasPromo
    ? Math.round(((product.price - product.finalPrice!) / product.price) * 100)
    : 0;

  // Keep qty within what's still available
  useEffect(() => {
    setQty((q) => (remaining <= 0 ? 1 : Math.min(q, remaining)));
  }, [remaining]);

  useEffect(() => {
    setShowMaxNotice(false);
  }, [product.stock]);

  // Clean up the popup timer on unmount
  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const flashMaxNotice = useCallback(() => {
    setShowMaxNotice(true);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setShowMaxNotice(false), 2800);
  }, []);

  const hideMaxNotice = () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setShowMaxNotice(false);
  };

  const handleQtyChange = (next: number) => {
    const clamped = Math.max(1, Math.min(next, remaining));
    setQty(clamped);
    if (clamped >= remaining) flashMaxNotice();
    else hideMaxNotice();
  };

  const handleAdd = () => {
    if (outOfStock || cartIsFull || isAdding) return;
    onAddToCart(product, qty);
  };

  const maxNotice = (
    <div
      role="status"
      onClick={hideMaxNotice}
      className="absolute bottom-full left-0 right-0 mb-2.5 z-10 cursor-pointer
                 bg-amber-50 border border-amber-200 text-amber-800
                 rounded-xl px-3 py-2 shadow-lg"
      style={{ animation: "maxPopIn 0.18s ease-out" }}
    >
      <p className="text-xs font-bold">⚠️ Maximum stock reached</p>
      <p className="text-[11px] mt-0.5">
        {inCartQty > 0
          ? `You already have ${inCartQty} case${inCartQty !== 1 ? "s" : ""} in your cart. We only have ${product.stock} case${product.stock !== 1 ? "s" : ""} of this product.`
          : `We only have ${product.stock} case${product.stock !== 1 ? "s" : ""} of this product available.`}
      </p>
      <span
        className="absolute -bottom-1.5 left-6 w-3 h-3 rotate-45 bg-amber-50
                   border-r border-b border-amber-200"
      />
    </div>
  );

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

        {/* In-cart indicator */}
        {inCartQty > 0 && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-green-600 text-white
                           text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
            🛒 {inCartQty} in cart
          </span>
        )}

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
        {!outOfStock && !cartIsFull && qty > 1 && (
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
        ) : cartIsFull ? (
          <div className="relative">
            {showMaxNotice && maxNotice}
            <button
              onClick={flashMaxNotice}
              className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700
                         text-xs font-semibold cursor-not-allowed"
            >
              Max stock in your cart
            </button>
          </div>
        ) : (
          <div className="relative flex items-center gap-2">
            {showMaxNotice && maxNotice}

            <QuantityStepper
              value={qty}
              min={1}
              max={remaining}
              onChange={handleQtyChange}
              onMaxReached={flashMaxNotice}
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

  // productId -> number of cases currently in the customer's cart (from the server)
  const [cartQty, setCartQty] = useState<Record<string, number>>({});

  const cartTotalCases    = useMemo(() => Object.values(cartQty).reduce((sum, n) => sum + n, 0), [cartQty]);
  const cartProductsCount = Object.keys(cartQty).length;

  // Load the real cart so counts include items added earlier
  const refreshCart = useCallback(async (): Promise<void> => {
    const customerId = getCustomerId();
    if (!customerId) { setCartQty({}); return; }
    try {
      const data = await api.getCart(customerId);
      const items: Array<{ productId: string; quantity: number }> =
        Array.isArray(data?.items) ? data.items : [];
      const map: Record<string, number> = {};
      for (const it of items) {
        map[it.productId] = (map[it.productId] ?? 0) + it.quantity;
      }
      setCartQty(map);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    }
  }, []);

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
    refreshCart();
  }, [refreshCart]);

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

    // Guard: qty must not exceed what's still available
    const alreadyInCart = cartQty[product.id] ?? 0;
    const safeQty = Math.min(qty, product.stock - alreadyInCart);
    if (safeQty < 1) return;

    setAddingId(product.id);
    try {
      const result = await api.addCartItem(customerId, product.id, safeQty);
      if ((result?.message as string | undefined)?.toLowerCase().includes("insufficient")) {
        alert(result.message as string);
        return;
      }
      // Re-read the cart so the counts always match the server
      await refreshCart();

      setAddedId(product.id);
      setTimeout(() => setAddedId(null), 1200);
    } catch {
      alert("Failed to add item to cart. Please try again.");
    } finally {
      setAddingId(null);
    }
  }, [cartQty, refreshCart]);

  return (
    <div className="min-h-screen bg-gray-50/60 px-6 py-7">
      {/* Animations */}
      <style>{`
        @keyframes maxPopIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cartBump {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
      `}</style>

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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 pb-20">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAddToCart={handleAddToCart}
              addingId={addingId}
              addedId={addedId}
              inCartQty={cartQty[p.id] ?? 0}
            />
          ))}
        </div>
      )}

      {/* ── Floating cart indicator ── */}
      {cartTotalCases > 0 && (
        <Link
          href="/cart"
          key={cartTotalCases}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-3 bg-violet-600 hover:bg-violet-700
                     text-white rounded-full pl-4 pr-5 py-3 shadow-xl shadow-violet-200 transition-colors"
          style={{ animation: "cartBump 0.3s ease-out" }}
        >
          <span className="relative text-lg leading-none">
            🛒
            <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400
                             text-violet-900 text-[10px] font-bold flex items-center justify-center">
              {cartTotalCases}
            </span>
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold">View Cart</span>
            <span className="block text-[10px] text-violet-100">
              {cartProductsCount} product{cartProductsCount !== 1 ? "s" : ""} · {cartTotalCases} case{cartTotalCases !== 1 ? "s" : ""}
            </span>
          </span>
        </Link>
      )}
    </div>
  );
}