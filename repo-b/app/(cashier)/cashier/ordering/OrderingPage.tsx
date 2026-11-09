"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Product = {
  id:            string;
  productName:   string;
  price:         number;
  category?:     string;
  size?:         string | null;
  stock?:        number;
  status?:       string;
  image?:        string | null;
  piecesPerCase?: number;
  expiryDate?:   string | null;
  finalPrice?:   number | null;
};

type Promo = {
  id: string;
  productId: string;
  promoName: string;
  alteredPrice: number;
  discountPercent: number | null;
  dateEffective: string;
  lastDate: string;
  isActive: boolean;
};

type CartItem = Product & { qty: number; finalPrice: number };

// ── Constants (same look as the customer Products page) ──────────────────────
const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  SOFTDRINKS:   { emoji: "🥤", label: "Soft Drinks",   color: "#dc2626" },
  ENERGY_DRINK: { emoji: "⚡", label: "Energy Drink",  color: "#4f46e5" },
  BEER:         { emoji: "🍺", label: "Beer",           color: "#d97706" },
  JUICE:        { emoji: "🍹", label: "Juice",          color: "#16a34a" },
  WATER:        { emoji: "💧", label: "Water",          color: "#0284c7" },
  OTHER:        { emoji: "🛒", label: "Other",          color: "#6b7280" },
};

const CATEGORY_BG: Record<string, string> = {
  SOFTDRINKS:   "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
  ENERGY_DRINK: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
  BEER:         "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
  JUICE:        "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
  WATER:        "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
  OTHER:        "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
};

const getMeta       = (category?: string) => CATEGORY_META[category || "OTHER"] ?? CATEGORY_META.OTHER;
const getCategoryBg = (category?: string) => CATEGORY_BG[category || "OTHER"]   ?? CATEGORY_BG.OTHER;

const formatExpiry = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

const formatMoney = (n: number): string =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Skeleton ──────────────────────────────────────────────────────────────────
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

// ── Small round thumbnail used in the cart panel ─────────────────────────────
function MiniThumb({ image, emoji }: { image?: string | null; emoji: string }) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        onError={() => setFailed(true)}
        className="w-full h-full object-cover block"
      />
    );
  }
  return <span className="text-xl leading-none">{emoji}</span>;
}

// ── Active Promos Banner (simple + noticeable) ────────────────────────────────
type PromoBannerProps = {
  promos:   Promo[];
  products: Product[];
  onPick:   (productName: string) => void;
};

function PromoBanner({ promos, products, onPick }: PromoBannerProps) {
  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach((p) => { map[p.id] = p; });
    return map;
  }, [products]);

  return (
    <div className="flex-shrink-0 bg-red-600 text-white flex items-center gap-3 px-7 py-2.5">
      {/* Label */}
      <span className="flex items-center gap-2 flex-shrink-0 text-sm font-extrabold">
        <span className="promo-dot w-2.5 h-2.5 rounded-full bg-yellow-300" aria-hidden="true" />
        🔥 Active Promos
      </span>

      {/* Promo pills */}
      <div className="promo-scroll flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
        {promos.map((promo) => {
          const product  = productMap[promo.productId];
          const original = product?.price;
          const percent  =
            promo.discountPercent ??
            (original && original > promo.alteredPrice
              ? Math.round(((original - promo.alteredPrice) / original) * 100)
              : null);

          return (
            <button
              key={promo.id}
              type="button"
              onClick={() => product && onPick(product.productName)}
              title={product ? `Show ${product.productName}` : promo.promoName}
              className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap rounded-full bg-white
                         pl-3.5 pr-1.5 py-1 shadow-sm hover:bg-yellow-50 active:scale-95 transition"
            >
              <span className="text-xs font-semibold text-gray-800">
                {product?.productName ?? "Product"}
              </span>
              <span className="text-xs font-extrabold text-red-600 tabular-nums">
                ₱{promo.alteredPrice.toLocaleString()}
              </span>
              {percent && percent > 0 && (
                <span className="text-[11px] font-bold bg-red-600 text-white rounded-full px-2 py-0.5">
                  −{percent}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Quantity Stepper (with a number the cashier can type directly) ───────────
type StepperProps = {
  value:        number;
  min:          number;
  max:          number;
  onChange:     (v: number) => void;
  onMaxReached: () => void;
  size?:        "md" | "sm";
};

function QuantityStepper({ value, min, max, onChange, onMaxReached, size = "md" }: StepperProps) {
  const atMax = value >= max;
  const [draft, setDraft]     = useState<string>(String(value));
  const [focused, setFocused] = useState<boolean>(false);

  // Keep the box in sync when the value changes from outside (+ / − / cart changes)
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Digits only, so the cashier can't type letters, minus signs or decimals
    const digits = e.target.value.replace(/\D/g, "").slice(0, 5);

    if (digits === "") {
      setDraft("");           // allow clearing the box so a new number can be typed
      return;
    }

    const n = parseInt(digits, 10);
    if (n > max) {
      setDraft(String(max));
      onChange(max);
      onMaxReached();
      return;
    }

    setDraft(String(n));
    if (n >= min) onChange(n);
  };

  const commit = () => {
    setFocused(false);
    const n     = parseInt(draft, 10);
    const final = isNaN(n) || n < min ? min : Math.min(n, max);
    setDraft(String(final));
    if (final !== value) onChange(final);
  };

  const btnSize   = size === "sm" ? "w-7 h-7 rounded-md"  : "w-8 h-8 rounded-lg";
  const inputSize = size === "sm" ? "w-10 h-7 text-sm"    : "w-12 h-8 text-sm";
  const wrapStyle = size === "sm"
    ? "gap-1 rounded-lg px-0.5 py-0.5"
    : "gap-1 rounded-xl px-1 py-1";

  return (
    <div className={`flex items-center bg-gray-50 border border-gray-200 ${wrapStyle}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={`${btnSize} flex items-center justify-center text-gray-500
                    hover:bg-white hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed
                    transition-all duration-150 font-bold text-base`}
      >
        −
      </button>

      {/* Type the quantity directly */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={handleType}
        onFocus={(e) => { setFocused(true); e.target.select(); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        aria-label="Quantity"
        className={`${inputSize} text-center font-semibold text-gray-800 tabular-nums
                    bg-white border border-gray-200 rounded-md outline-none
                    focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all`}
      />

      {/* Not truly disabled at max, so tapping it can still show the "max stock" popup */}
      <button
        type="button"
        onClick={() => (atMax ? onMaxReached() : onChange(value + 1))}
        aria-label="Increase quantity"
        aria-disabled={atMax}
        className={[
          btnSize,
          "flex items-center justify-center text-gray-500",
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
  product:    Product;
  unitPrice:  number;           // price after promo (if any)
  promo?:     Promo;
  inCartQty:  number;
  justAdded:  boolean;
  onAdd:      (product: Product, qty: number) => void;
};

function ProductCard({ product, unitPrice, promo, inCartQty, justAdded, onAdd }: ProductCardProps) {
  const [qty, setQty]                     = useState<number>(1);
  const [showMaxNotice, setShowMaxNotice] = useState<boolean>(false);
  const [imgFailed, setImgFailed]         = useState<boolean>(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stock       = product.stock ?? 0;
  const outOfStock  = stock <= 0;
  // How many more cases can still be added (stock minus what's already in the cart)
  const remaining   = Math.max(0, stock - inCartQty);
  const cartIsFull  = !outOfStock && remaining <= 0;
  const hasPromo    = unitPrice < product.price;
  const meta        = getMeta(product.category);
  const expiryLabel = formatExpiry(product.expiryDate);
  const discount    = hasPromo
    ? promo?.discountPercent ?? Math.round(((product.price - unitPrice) / product.price) * 100)
    : 0;

  // Keep qty within what's still available
  useEffect(() => {
    setQty((q) => (remaining <= 0 ? 1 : Math.min(q, remaining)));
  }, [remaining]);

  useEffect(() => {
    setShowMaxNotice(false);
  }, [stock]);

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
    if (outOfStock || cartIsFull) return;
    onAdd(product, qty);
    setQty(1);
    hideMaxNotice();
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
          ? `You already have ${inCartQty} case${inCartQty !== 1 ? "s" : ""} in the cart. We only have ${stock} case${stock !== 1 ? "s" : ""} of this product.`
          : `We only have ${stock} case${stock !== 1 ? "s" : ""} of this product available.`}
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
        "bg-white rounded-2xl border overflow-hidden shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        inCartQty > 0 ? "border-green-300" : "border-gray-100 hover:border-gray-200",
        outOfStock ? "opacity-60" : "",
      ].join(" ")}
    >
      {/* ── Image / thumbnail ── */}
      <div
        className="relative w-full h-44 flex items-center justify-center"
        style={{ background: getCategoryBg(product.category) }}
      >
        {product.image && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.productName}
            onError={() => setImgFailed(true)}
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
            {discount > 0 ? `−${discount}% OFF` : "PROMO"}
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
          {(product.piecesPerCase ?? 0) > 0 && (
            <span title="Pieces per case">
              📦 {product.piecesPerCase} pcs/case
            </span>
          )}
          {expiryLabel && (
            <span
              title="Expiry date"
              className={
                (new Date(product.expiryDate!).getTime() - Date.now()) / 86_400_000 < 30
                  ? "text-red-400 font-semibold"
                  : ""
              }
            >
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
                    ₱{unitPrice.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-gray-400 line-through">
                    ₱{product.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-green-600 mt-0.5">
                  per case ({promo?.promoName ?? "promo price"})
                </p>
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
          <StockBadge stock={stock} />
        </div>

        {/* Subtotal hint (when qty > 1) */}
        {!outOfStock && !cartIsFull && qty > 1 && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-green-50 border border-green-100">
            <p className="text-xs text-green-700 font-medium">
              Subtotal: ₱{(unitPrice * qty).toLocaleString()}
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
              Max stock in cart
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
              className={[
                "flex-1 py-2.5 rounded-xl text-xs font-semibold text-white",
                "transition-all duration-200 active:scale-95",
                justAdded ? "bg-green-600" : "bg-violet-600 hover:bg-violet-700",
              ].join(" ")}
            >
              {justAdded ? "✓ Added!" : `Add ${qty > 1 ? `${qty} ` : ""}to Cart`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrderingPage() {
  const router = useRouter();
  const [search,           setSearch]           = useState("");
  const [brand,            setBrand]            = useState("All");
  const [cart,             setCart]             = useState<CartItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [products,         setProducts]         = useState<Product[]>([]);
  const [promos,           setPromos]           = useState<Promo[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [addedId,          setAddedId]          = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsData, promosData] = await Promise.all([
          api.getProducts(),
          api.getActivePromos(),
        ]);
        const active = Array.isArray(productsData)
          ? productsData.filter((p: Product) => p.status !== "INACTIVE")
          : [];
        setProducts(active);
        setPromos(Array.isArray(promosData) ? promosData : []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

  const promoMap = useMemo(() => {
    const map: Record<string, Promo> = {};
    promos.forEach((p) => { map[p.productId] = p; });
    return map;
  }, [promos]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category || "OTHER")));
    return ["All", ...cats];
  }, [products]);

  const filtered = useMemo(
    () => products
      .filter((p) => {
        const matchCat    = brand === "All" || (p.category || "OTHER") === brand;
        const matchSearch = (p.productName || "").toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        const aInStock = (a.stock ?? 0) > 0 ? 0 : 1;
        const bInStock = (b.stock ?? 0) > 0 ? 0 : 1;
        return aInStock - bInStock;
      }),
    [brand, search, products],
  );

  // Promo price wins, then the product's own finalPrice, then the regular price
  const getFinalPrice = useCallback((product: Product): number => {
    const promo = promoMap[product.id];
    if (promo) return promo.alteredPrice;
    return product.finalPrice ?? product.price;
  }, [promoMap]);

  const addToCart = useCallback((product: Product, qty: number) => {
    const stock = product.stock ?? 0;
    if (stock <= 0 || qty < 1) return;
    const finalPrice = getFinalPrice(product);

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.qty + qty, stock);
        return prev.map((i) => i.id === product.id ? { ...i, qty: newQty } : i);
      }
      return [...prev, { ...product, qty: Math.min(qty, stock), finalPrice }];
    });

    setAddedId(product.id);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAddedId(null), 1200);
  }, [getFinalPrice]);

  // Set a cart line's quantity directly (kept between 1 and the stock available)
  const setCartQty = (id: string, next: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const max = i.stock ?? i.qty;
        return { ...i, qty: Math.max(1, Math.min(next, max)) };
      }),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const total     = cart.reduce((sum, i) => sum + i.finalPrice * i.qty, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const hasCart   = cart.length > 0;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    // Pass cart to payment page via sessionStorage
    sessionStorage.setItem("pendingCart", JSON.stringify(cart));
    router.push("/cashier/payment");
  };

  const handleClear = () => { setCart([]); setShowClearConfirm(false); };

  // Tapping a promo pill filters the grid down to that product
  const handlePromoPick = (productName: string) => {
    setBrand("All");
    setSearch(productName);
  };

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "calc(100vh - 56px)", overflow: "hidden" }}>
      {/* Animations */}
      <style>{`
        @keyframes maxPopIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chipIn {
          from { opacity: 0; transform: translateY(6px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cartSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes promoBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.25; }
        }
        .cart-scroll::-webkit-scrollbar { width: 4px; }
        .cart-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

        /* Promo banner */
        .promo-dot { animation: promoBlink 1.4s ease-in-out infinite; }
        .promo-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .promo-scroll::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .promo-dot { animation: none; }
        }
      `}</style>

      {/* ── Left column: promos + product list ── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        {/* ── Active Promos Banner ── */}
        {promos.length > 0 && (
          <PromoBanner promos={promos} products={products} onPick={handlePromoPick} />
        )}

        {/* ── Main Content ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/60 px-7 pt-6 pb-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-7">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#8fa596] pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-9 py-2.5 rounded-[10px] border border-[#d6e8d9] text-[13px]
                           bg-white text-[#14301b] w-64 max-w-full outline-none
                           placeholder:text-[#8fa596] transition-all
                           focus:border-[#2e7d3e] focus:ring-[3px] focus:ring-[rgba(46,125,62,0.14)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full
                             bg-[#e8f5ea] text-[#2e7d3e] hover:bg-[#2e7d3e] hover:text-white
                             flex items-center justify-center transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-0.5 bg-[#e8f5ea] rounded-xl p-1 max-w-full">
              {categories.map((c) => {
                const isActive = brand === c;
                return (
                  <button
                    key={c}
                    onClick={() => setBrand(c)}
                    className={[
                      "px-4 py-[7px] rounded-[9px] text-[13px] font-semibold transition-all duration-150",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e7d3e]",
                      isActive
                        ? "bg-[#2e7d3e] text-white shadow-[0_2px_8px_rgba(46,125,62,0.3)]"
                        : "bg-transparent text-[#5f7a66] hover:text-[#1f5f2d]",
                    ].join(" ")}
                  >
                    {c === "All" ? "All" : getMeta(c).label}
                  </button>
                );
              })}
            </div>

            {!loading && (
              <span className="ml-auto text-xs font-medium text-[#5f7a66] whitespace-nowrap">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-base font-semibold text-gray-800 mb-2">No products found</p>
              <p className="text-sm text-gray-400">Try a different search or category</p>
            </div>
          )}

          {/* Grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  unitPrice={getFinalPrice(p)}
                  promo={promoMap[p.id]}
                  inCartQty={cart.find((i) => i.id === p.id)?.qty ?? 0}
                  justAdded={addedId === p.id}
                  onAdd={addToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Cart Panel (right side — only appears once something is in the cart) ── */}
      {hasCart && (
        <aside
          className="flex-shrink-0 flex flex-col bg-white border-l border-gray-200
                     shadow-[-8px_0_24px_rgba(0,0,0,0.06)] z-30
                     w-[360px] max-w-[88vw]
                     max-lg:fixed max-lg:right-0 max-lg:top-14 max-lg:bottom-0"
          style={{ animation: "cartSlideIn 0.22s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-green-50 text-green-800 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-violet-600 text-white
                                 text-[11px] font-bold flex items-center justify-center border-2 border-white tabular-nums">
                  {itemCount}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-tight">Your Order</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {cart.length} product{cart.length !== 1 ? "s" : ""} · {itemCount} case{itemCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowClearConfirm(true)}
              aria-label="Clear cart"
              className="h-9 px-3 rounded-full border border-gray-200 bg-white text-xs font-semibold
                         inline-flex items-center gap-1.5 transition-colors flex-shrink-0
                         text-red-500 hover:bg-red-50 hover:border-red-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Clear
            </button>
          </div>

          {/* Items list */}
          <div className="cart-scroll flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 bg-gray-50/60">
            {cart.map((item) => {
              const meta      = getMeta(item.category);
              const maxQty    = item.stock ?? item.qty;
              const atMax     = item.qty >= maxQty;
              const lineTotal = item.finalPrice * item.qty;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-2xl p-3 hover:border-gray-300 transition-colors"
                  style={{ animation: "chipIn 0.18s ease-out" }}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <span
                      className="w-12 h-12 rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: getCategoryBg(item.category) }}
                    >
                      <MiniThumb image={item.image} emoji={meta.emoji} />
                    </span>

                    {/* Name + price */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">
                        {item.productName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {item.size && <span className="text-[11px] text-gray-400">{item.size}</span>}
                        {promoMap[item.id] && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 rounded-full px-1.5 py-0.5">
                            PROMO
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 tabular-nums">
                        {formatMoney(item.finalPrice)} <span className="text-gray-400">/ case</span>
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.productName} from cart`}
                      className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600
                                 flex items-center justify-center text-sm leading-none transition-colors flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>

                  {/* Qty controls + line total */}
                  <div className="flex items-center justify-between mt-2.5">
                    <QuantityStepper
                      size="sm"
                      value={item.qty}
                      min={1}
                      max={maxQty}
                      onChange={(v) => setCartQty(item.id, v)}
                      onMaxReached={() => { /* the "Max stock reached" note below already tells the cashier */ }}
                    />
                    <p className="text-sm font-bold text-gray-900 tabular-nums">{formatMoney(lineTotal)}</p>
                  </div>

                  {atMax && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1.5">Max stock reached</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer: total + checkout */}
          <div className="border-t border-gray-200 px-5 py-4 bg-white">
            <div className="flex items-end justify-between mb-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Total · {itemCount} case{itemCount !== 1 ? "s" : ""}
              </p>
              <p className="text-2xl font-extrabold leading-tight tabular-nums text-[#1a3c2e]">
                {formatMoney(total)}
              </p>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full h-12 rounded-full text-sm font-bold text-white inline-flex items-center justify-center gap-2
                         transition-all duration-150 active:scale-95
                         bg-[#1a3c2e] hover:bg-[#14301f] shadow-[0_6px_16px_rgba(26,60,46,0.3)]"
            >
              Checkout & Pay
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </aside>
      )}

      {/* ── Clear Confirm Modal ── */}
      {showClearConfirm && (
        <>
          <div onClick={() => setShowClearConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, background: "#fff", borderRadius: "16px", padding: "28px", width: "340px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Clear Cart?</p>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>All {itemCount} items will be removed.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowClearConfirm(false)}
                style={{ flex: 1, padding: "11px", borderRadius: "20px", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#555" }}>
                Cancel
              </button>
              <button onClick={handleClear}
                style={{ flex: 1, padding: "11px", borderRadius: "20px", border: "none", background: "#e53935", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}