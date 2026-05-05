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

/** Mirrors the Prisma Product model exactly, plus computed API fields */
type Product = {
  id:            string;
  productName:   string;
  category:      CategoryType;
  size:          string | null;
  barcode:       string | null;
  price:         number;        // Float in Prisma
  stock:         number;        // Int – computed by backend via getStock()
  reservedStock: number;        // Int
  piecesPerCase: number;        // Int
  expiryDate:    string | null; // DateTime serialised as ISO string
  image:         string | null; // Cloudinary URL
  status:        ProductStatus;
  supplierId:    string;
  createdAt:     string;
  updatedAt:     string;
  // Computed fields returned by the API
  finalPrice:    number | null;
  activePromo:   unknown | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const EMOJI_MAP: Record<CategoryType, string> = {
  SOFTDRINKS:   "🥤",
  ENERGY_DRINK: "⚡",
  BEER:         "🍺",
  JUICE:        "🍹",
  WATER:        "💧",
  OTHER:        "🛒",
};

const BG_MAP: Record<CategoryType, string> = {
  SOFTDRINKS:   "bg-red-900",
  ENERGY_DRINK: "bg-indigo-950",
  BEER:         "bg-amber-600",
  JUICE:        "bg-green-800",
  WATER:        "bg-sky-600",
  OTHER:        "bg-zinc-700",
};

const getEmoji = (category: CategoryType): string => EMOJI_MAP[category] ?? "🥤";
const getBg    = (category: CategoryType): string => BG_MAP[category]    ?? "bg-zinc-700";

const getCustomerId = (): string => {
  if (typeof window === "undefined") return "";
  try { return JSON.parse(localStorage.getItem("user") ?? "{}")?.id ?? ""; }
  catch { return ""; }
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonPill({ width }: { width: number }) {
  return (
    <div
      className="h-9 rounded-full animate-pulse bg-gray-200"
      style={{ width }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="w-full h-40 animate-pulse bg-gray-200" />
      <div className="p-4 flex flex-col gap-2.5">
        <div className="h-3.5 rounded-md bg-gray-200 animate-pulse w-2/3" />
        <div className="h-3   rounded-md bg-gray-200 animate-pulse w-5/12" />
        <div className="flex items-center justify-between mt-1">
          <div className="h-5 rounded-md bg-gray-200 animate-pulse w-2/5" />
          <div className="h-9 rounded-full bg-gray-200 animate-pulse w-1/3" />
        </div>
      </div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
type ProductCardProps = {
  product:     Product;
  onAddToCart: (product: Product) => void;
  addingId:    string | null;
  addedId:     string | null;
};

function ProductCard({ product, onAddToCart, addingId, addedId }: ProductCardProps) {
  const outOfStock = product.stock <= 0;
  const lowStock   = !outOfStock && product.stock <= 10;
  const hasPromo   = product.finalPrice != null && product.finalPrice < product.price;
  const isAdding   = addingId === product.id;
  const isAdded    = addedId  === product.id;

  return (
    <div
      className={[
        "bg-white rounded-2xl border border-gray-100 overflow-hidden",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/8",
        outOfStock ? "opacity-60" : "",
      ].join(" ")}
    >
      {/* Image / colour banner */}
      <div className={`relative w-full h-40 flex items-center justify-center ${getBg(product.category)}`}>
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl select-none">{getEmoji(product.category)}</span>
        )}

        {outOfStock && (
          <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            Out of Stock
          </span>
        )}
        {lowStock && (
          <span className="absolute top-2.5 left-2.5 bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            Low Stock
          </span>
        )}
        {hasPromo && !outOfStock && (
          <span className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            PROMO
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 mb-0.5 truncate">
          {product.productName}
          {product.size && (
            <span className="text-gray-400 font-normal ml-1">{product.size}</span>
          )}
        </p>
        <p className="text-[11.5px] text-gray-400 mb-3">{product.category}</p>

        <div className="flex items-end justify-between gap-2">
          {/* Price */}
          <div>
            {hasPromo ? (
              <>
                <p className="text-lg font-bold text-green-700 leading-none">
                  ₱{product.finalPrice!.toLocaleString()}
                </p>
                <p className="text-xs text-gray-300 line-through mt-0.5">
                  ₱{product.price.toLocaleString()}
                </p>
              </>
            ) : (
              <p className="text-xl font-bold text-green-700 leading-none">
                ₱{product.price.toLocaleString()}
              </p>
            )}
            <p className="text-[10px] text-gray-300 mt-1">
              {outOfStock ? "unavailable" : `${product.stock} in stock`}
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={outOfStock || isAdding}
            className={[
              "px-4 py-2 rounded-full text-xs font-semibold text-white whitespace-nowrap",
              "transition-all duration-200 active:scale-95",
              outOfStock
                ? "bg-gray-300 cursor-not-allowed"
                : isAdded
                  ? "bg-green-600"
                  : isAdding
                    ? "bg-violet-400 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-700",
            ].join(" ")}
          >
            {isAdding ? "Adding…" : isAdded ? "✓ Added!" : outOfStock ? "Out of Stock" : "+ Add to Cart"}
          </button>
        </div>
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

  const filtered = useMemo<Product[]>(
    () =>
      products.filter((p) => {
        const matchCat = activeCategory === "All" || p.category === activeCategory;
        const matchQ   = p.productName.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchQ;
      }),
    [products, activeCategory, search]
  );

  const handleAddToCart = useCallback(async (product: Product): Promise<void> => {
    if (product.stock <= 0) return;
    const customerId = getCustomerId();
    if (!customerId) { alert("Please log in to add items to cart."); return; }

    setAddingId(product.id);
    try {
      const result = await api.addCartItem(customerId, product.id, 1);
      if ((result?.message as string | undefined)?.toLowerCase().includes("insufficient")) {
        alert(result.message as string);
        return;
      }
      setAddedId(product.id);
      setTimeout(() => setAddedId(null), 1000);
    } catch {
      alert("Failed to add item to cart. Please try again.");
    } finally {
      setAddingId(null);
    }
  }, []);

  return (
    <div className="p-7">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-full border border-gray-200 text-sm bg-white text-gray-900 w-56 outline-none focus:border-green-500 transition-colors placeholder:text-gray-400"
          />
        </div>

        <div className="w-px h-7 bg-gray-200" />

        {/* Category pills */}
        {loading ? (
          <>
            {[80, 104, 72, 88].map((w, i) => (
              <SkeletonPill key={i} width={w} />
            ))}
          </>
        ) : (
          categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={[
                "px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-150",
                activeCategory === c
                  ? "bg-green-700 text-white font-semibold"
                  : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50",
              ].join(" ")}
            >
              {c}
            </button>
          ))
        )}

        {!loading && (
          <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Skeleton grid ── */}
      {loading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-base font-semibold text-gray-800 mb-2">No products found</p>
          <p className="text-sm text-gray-400">Try a different search or category</p>
        </div>
      )}

      {/* ── Product grid ── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
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