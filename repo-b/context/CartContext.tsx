"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type CartItem = {
  id: number;
  name: string;
  desc: string;
  price: number;
  qty: number;
  emoji: string;
  bg: string;
};

export type Transaction = {
  txId: string;
  orderId: string;
  date: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  paymentMethod: string;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Omit<CartItem, "qty">) => void;
  updateQty: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalCount: number;
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addToCart = (product: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing)
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i,
      ),
    );

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const clearCart = () => setItems([]);

  const addTransaction = (t: Transaction) =>
    setTransactions((prev) => [t, ...prev]);

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        totalCount,
        transactions,
        addTransaction,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
