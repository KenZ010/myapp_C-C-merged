"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api"; // adjust path if needed

type Transaction = {
  txId: string;
  orderId: string;
  date: string;
  total: number;
  paymentMethod: string;
  items: {
    name: string;
    qty: number;
    price: number;
  }[];
};

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ FETCH FROM BACKEND
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const customerId = localStorage.getItem("customerId");
        if (!customerId) return;

        const orders = await api.getCustomerOrders(customerId);

        // ✅ only COMPLETED
        const completed = orders.filter((o: any) => o.status === "COMPLETED");

        // ✅ transform to UI format
        const formatted = completed.map((o: any) => ({
          txId: o.id,
          orderId: o.id,
          date: new Date(o.createdAt).toLocaleString(),
          total: o.totalAmount,
          paymentMethod: o.payment?.method ?? "CASH",
          items: o.orderLines.map((ol: any) => ({
            name: ol.product.productName,
            qty: ol.quantity,
            price: ol.price,
          })),
        }));

        setTransactions(formatted);
      } catch (err) {
        console.error("Failed to fetch transactions", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // ✅ LOADING STATE
  if (loading) {
    return <p style={{ padding: "20px" }}>Loading transactions...</p>;
  }

  // ✅ EMPTY STATE
  if (transactions.length === 0) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "linear-gradient(160deg, #e8f5f0, #dff0ea)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2>No transactions yet</h2>
        <Link href="/products">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px", background: "#f5f5f5" }}>
      {/* SUMMARY */}
      <div
        style={{
          background: "linear-gradient(135deg, #2d7a3a, #56ab6e)",
          borderRadius: "16px",
          padding: "20px 28px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ color: "#fff" }}>Orders</p>
          <h2 style={{ color: "#fff" }}>{transactions.length}</h2>
        </div>
        <div>
          <p style={{ color: "#fff" }}>Total Spent</p>
          <h2 style={{ color: "#f5c842" }}>
            ₱
            {transactions
              .reduce((sum, t) => sum + t.total, 0)
              .toLocaleString()}
          </h2>
        </div>
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
        }}
      >
        {transactions.map((tx) => (
          <div
            key={tx.txId}
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "16px",
            }}
          >
            <p><b>{tx.txId}</b></p>
            <p>{tx.date}</p>

            {tx.items.slice(0, 2).map((item, i) => (
              <p key={i}>
                {item.name} x{item.qty}
              </p>
            ))}

            <p>₱{tx.total.toLocaleString()}</p>

            <button onClick={() => setSelected(tx)}>
              View Receipt
            </button>
          </div>
        ))}
      </div>

      {/* RECEIPT MODAL */}
      {selected && (
        <div>
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              zIndex: 10,
            }}
          >
            <h3>Receipt</h3>
            <p>{selected.txId}</p>

            {selected.items.map((item, i) => (
              <p key={i}>
                {item.name} x{item.qty} = ₱
                {(item.price * item.qty).toLocaleString()}
              </p>
            ))}

            <h2>₱{selected.total.toLocaleString()}</h2>

            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}