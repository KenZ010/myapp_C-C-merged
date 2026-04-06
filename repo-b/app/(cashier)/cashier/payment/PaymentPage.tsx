"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type PaymentMethod = "Cash" | "GCash";
type CustomerType  = "New Customer" | "Existing Customer";

type CartItem = {
  id: string;
  productName: string;
  qty: number;
  finalPrice: number;
  price: number;
  category?: string;
};

type Customer = {
  id: string;
  customerName: string;
  address?: string;
  storeName?: string;
  contactNumber?: string;
  email?: string;
};

export default function PaymentPage() {
  const router = useRouter();

  // ── Cart from ordering page ──────────────────────────────────────────────
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingCart");
    if (raw) {
      try { setCartItems(JSON.parse(raw)); }
      catch { setCartItems([]); }
    }
  }, []);

  const subtotal = cartItems.reduce((s, i) => s + i.finalPrice * i.qty, 0);

  // ── Customers from backend ───────────────────────────────────────────────
  const [customers,     setCustomers]     = useState<Customer[]>([]);
  const [loadingCust,   setLoadingCust]   = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoadingCust(true);
        const data = await api.getCustomers();
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoadingCust(false);
      }
    };
    fetchCustomers();
  }, []);

  // ── Form state ───────────────────────────────────────────────────────────
  const [paymentMethod,     setPaymentMethod]     = useState<PaymentMethod>("GCash");
  const [customerType,      setCustomerType]      = useState<CustomerType>("Existing Customer");
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedCustomer,  setSelectedCustomer]  = useState<Customer | null>(null);
  const [showDropdown,      setShowDropdown]      = useState(false);
  const [newName,           setNewName]           = useState("");
  const [newAddress,        setNewAddress]        = useState("");
  const [newStore,          setNewStore]          = useState("");
  const [newPhone,          setNewPhone]          = useState("");
  const [newEmail,          setNewEmail]          = useState("");
  const [gcashRef,          setGcashRef]          = useState("");
  const [gcashImage,        setGcashImage]        = useState<string | null>(null);
  const [amountPaid,        setAmountPaid]        = useState("");
  const [completed,         setCompleted]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredCustomers = useMemo(
    () => searchQuery.trim() === "" ? [] : customers.filter((c) =>
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.storeName  || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactNumber || "").includes(searchQuery)
    ),
    [searchQuery, customers],
  );

  const activeCustomer =
    customerType === "Existing Customer"
      ? selectedCustomer
      : newName
        ? { customerName: newName, address: newAddress, storeName: newStore, contactNumber: newPhone, email: newEmail }
        : null;

  const paid   = parseFloat(amountPaid) || 0;
  const change = paid - subtotal;

  const canComplete =
    cartItems.length > 0 &&
    (customerType === "Existing Customer" ? selectedCustomer !== null : newName.trim() !== "") &&
    (paymentMethod === "GCash" ? gcashRef.trim() !== "" && gcashImage !== null : paid >= subtotal);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setSearchQuery(c.customerName);
    setShowDropdown(false);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setGcashImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleComplete = () => {
    if (!canComplete) return;
    sessionStorage.removeItem("pendingCart"); // ✅ clear cart after payment
    setCompleted(true);
  };

  const resetAll = () => {
    setCompleted(false);
    setSelectedCustomer(null);
    setSearchQuery("");
    setNewName(""); setNewAddress(""); setNewStore(""); setNewPhone(""); setNewEmail("");
    setGcashRef(""); setGcashImage(null); setAmountPaid("");
    router.push("/cashier"); // ✅ go back to ordering page
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #e0e0e0", fontSize: "13px", outline: "none",
    background: "#fff", boxSizing: "border-box", color: "#1a1a1a", fontFamily: "sans-serif",
  };

  /* ── Completed Screen ── */
  if (completed) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", background: "linear-gradient(160deg, #f0faf2, #e8f5e9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "linear-gradient(135deg, #1a3c2e, #2d7a3a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "40px" }}>✅</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#1a1a1a", marginBottom: "8px" }}>Order Completed!</h2>
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
            Payment received from <strong>{activeCustomer?.customerName}</strong>.
          </p>
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
            Total: <strong style={{ color: "#1a3c2e" }}>₱{subtotal.toLocaleString()}.00</strong>
          </p>
          {paymentMethod === "Cash" && change > 0 && (
            <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
              Change: <strong style={{ color: "#1a3c2e" }}>₱{change.toLocaleString()}.00</strong>
            </p>
          )}
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "28px" }}>
            Payment Method: <strong>{paymentMethod}</strong>
          </p>
          <button onClick={resetAll}
            style={{ background: "#1a3c2e", color: "#fff", border: "none", borderRadius: "30px", padding: "13px 40px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
            + New Order
          </button>
        </div>
      </div>
    );
  }

  /* ── Main Page ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", maxWidth: "960px", margin: "0 auto" }}>

          {/* ── LEFT: Form ── */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "28px" }}>

            {/* Payment Method */}
            <div style={{ marginBottom: "22px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px" }}>Payment Method</p>
              <div style={{ display: "flex", gap: "10px" }}>
                {(["Cash", "GCash"] as PaymentMethod[]).map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    style={{ flex: 1, padding: "11px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: paymentMethod === m ? "2px solid #1a3c2e" : "1px solid #e0e0e0", background: paymentMethod === m ? "#f0faf2" : "#fff", color: paymentMethod === m ? "#1a3c2e" : "#555", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    {m === "Cash" ? "💵" : "📱"} {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Type */}
            <div style={{ marginBottom: "22px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "10px" }}>Customer Type</p>
              <div style={{ display: "flex", gap: "10px" }}>
                {(["New Customer", "Existing Customer"] as CustomerType[]).map((t) => (
                  <button key={t} onClick={() => { setCustomerType(t); setSelectedCustomer(null); setSearchQuery(""); }}
                    style={{ flex: 1, padding: "11px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: customerType === t ? "2px solid #1a3c2e" : "1px solid #e0e0e0", background: customerType === t ? "#f0faf2" : "#fff", color: customerType === t ? "#1a3c2e" : "#555" }}>
                    {t === "New Customer" ? "🆕" : "👥"} {t}
                  </button>
                ))}
              </div>
            </div>

            {/* ── EXISTING CUSTOMER ── */}
            {customerType === "Existing Customer" && (
              <div style={{ marginBottom: "22px" }}>
                <p style={{ fontSize: "12px", color: "#555", fontWeight: 600, marginBottom: "8px" }}>🔍 Search Existing Customer</p>
                <div style={{ position: "relative" }}>
                  <input value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedCustomer(null); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={loadingCust ? "Loading customers…" : "Type customer name, store, or phone..."}
                    disabled={loadingCust}
                    style={{ ...inputStyle, paddingLeft: "36px" }} />
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>🔍</span>

                  {showDropdown && filteredCustomers.length > 0 && (
                    <div style={{ position: "absolute", top: "44px", left: 0, right: 0, background: "#fff", borderRadius: "12px", border: "1px solid #e0e0e0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 20, overflow: "hidden" }}>
                      {filteredCustomers.map((c) => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)}
                          style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "0.5px solid #f5f5f5", display: "flex", alignItems: "center", gap: "12px" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#f0faf2")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fff")}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1a3c2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
                            {c.customerName.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{c.customerName}</p>
                            <p style={{ fontSize: "11px", color: "#aaa" }}>{c.storeName || "—"} • {c.contactNumber || "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showDropdown && searchQuery.trim() !== "" && filteredCustomers.length === 0 && !loadingCust && (
                    <div style={{ position: "absolute", top: "44px", left: 0, right: 0, background: "#fff", borderRadius: "12px", border: "1px solid #e0e0e0", padding: "16px", textAlign: "center", zIndex: 20 }}>
                      <p style={{ fontSize: "13px", color: "#aaa" }}>No customer found for &quot;{searchQuery}&quot;</p>
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div style={{ marginTop: "14px", background: "#f0faf2", borderRadius: "12px", padding: "14px 16px", border: "1.5px solid #a5d6a7", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#1a3c2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>
                        {selectedCustomer.customerName.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>{selectedCustomer.customerName}</p>
                        {selectedCustomer.storeName    && <p style={{ fontSize: "12px", color: "#666" }}>🏪 {selectedCustomer.storeName}</p>}
                        {selectedCustomer.address      && <p style={{ fontSize: "12px", color: "#666" }}>📍 {selectedCustomer.address}</p>}
                        {selectedCustomer.contactNumber && <p style={{ fontSize: "12px", color: "#666" }}>📞 {selectedCustomer.contactNumber}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setSelectedCustomer(null); setSearchQuery(""); }}
                      style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "16px" }}>✕</button>
                  </div>
                )}
              </div>
            )}

            {/* ── NEW CUSTOMER ── */}
            {customerType === "New Customer" && (
              <div style={{ marginBottom: "22px" }}>
                <p style={{ fontSize: "12px", color: "#555", fontWeight: 600, marginBottom: "12px" }}>🆕 New Customer Information</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {[
                    { label: "👤 Customer Name", required: true,  value: newName,    setter: setNewName,    placeholder: "Enter customer name" },
                    { label: "📍 Address",        required: false, value: newAddress, setter: setNewAddress, placeholder: "Enter address" },
                    { label: "🏪 Store Name",     required: false, value: newStore,   setter: setNewStore,   placeholder: "Enter store name" },
                    { label: "📞 Phone No.",      required: false, value: newPhone,   setter: setNewPhone,   placeholder: "Enter phone number" },
                  ].map(({ label, required, value, setter, placeholder }) => (
                    <div key={label}>
                      <label style={{ fontSize: "12px", color: "#555", fontWeight: 500, marginBottom: "6px", display: "block" }}>
                        {label} {required && <span style={{ color: "#e53935" }}>*</span>}
                      </label>
                      <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} style={inputStyle} />
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "12px", color: "#555", fontWeight: 500, marginBottom: "6px", display: "block" }}>✉️ Email</label>
                    <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter email" style={inputStyle} />
                  </div>
                </div>
              </div>
            )}

            {/* ── GCASH ── */}
            {paymentMethod === "GCash" && (
              <div style={{ background: "#f8f0ff", borderRadius: "12px", padding: "18px", border: "1px solid #e0c8ff" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#6a1b9a", marginBottom: "14px" }}>📱 GCash Payment Details</p>
                <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", textAlign: "center", marginBottom: "14px", border: "1px solid #e0c8ff" }}>
                  <svg width="100" height="100" viewBox="0 0 120 120" style={{ margin: "0 auto", display: "block" }}>
                    <rect x="2" y="2" width="116" height="116" rx="8" fill="white" stroke="#6a1b9a" strokeWidth="3"/>
                    <rect x="10" y="10" width="30" height="30" rx="3" fill="#6a1b9a"/>
                    <rect x="15" y="15" width="20" height="20" rx="2" fill="white"/>
                    <rect x="19" y="19" width="12" height="12" rx="1" fill="#6a1b9a"/>
                    <rect x="80" y="10" width="30" height="30" rx="3" fill="#6a1b9a"/>
                    <rect x="85" y="15" width="20" height="20" rx="2" fill="white"/>
                    <rect x="89" y="19" width="12" height="12" rx="1" fill="#6a1b9a"/>
                    <rect x="10" y="80" width="30" height="30" rx="3" fill="#6a1b9a"/>
                    <rect x="15" y="85" width="20" height="20" rx="2" fill="white"/>
                    <rect x="19" y="89" width="12" height="12" rx="1" fill="#6a1b9a"/>
                    {[[50,10],[56,10],[62,10],[50,16],[62,16],[50,22],[58,22],[62,22],[10,50],[16,50],[22,50],[28,50],[10,62],[28,62],[50,50],[58,50],[66,50],[50,58],[62,58],[50,66],[58,66],[80,50],[96,50],[80,58],[96,58],[80,66],[96,66],[50,80],[58,80],[50,88],[62,88],[54,96],[66,96]].map(([x,y],i) => (
                      <rect key={i} x={x} y={y} width="5" height="5" fill="#6a1b9a"/>
                    ))}
                  </svg>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#6a1b9a", marginTop: "8px" }}>Julieta Soft Drinks</p>
                  <p style={{ fontSize: "11px", color: "#aaa" }}>GCash: 0912 345 6789</p>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", color: "#6a1b9a", fontWeight: 600, marginBottom: "6px", display: "block" }}>
                    🔢 GCash Reference No. <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  <input value={gcashRef} onChange={(e) => setGcashRef(e.target.value)} placeholder="Enter GCash reference number"
                    style={{ ...inputStyle, border: gcashRef ? "1.5px solid #6a1b9a" : "1px solid #e0c8ff" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#6a1b9a", fontWeight: 600, marginBottom: "6px", display: "block" }}>
                    📸 GCash Receipt Image <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  {gcashImage ? (
                    <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1.5px solid #6a1b9a" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gcashImage} alt="receipt" style={{ width: "100%", height: "90px", objectFit: "cover", display: "block" }} />
                      <button onClick={() => setGcashImage(null)}
                        style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "12px" }}>✕</button>
                      <div style={{ background: "#e8f5e9", padding: "5px", textAlign: "center" }}>
                        <span style={{ fontSize: "11px", color: "#2e7d32", fontWeight: 600 }}>✅ Receipt uploaded</span>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => fileRef.current?.click()}
                      style={{ border: "2px dashed #c084fc", borderRadius: "10px", padding: "14px", textAlign: "center", cursor: "pointer", background: "#fff" }}>
                      <p style={{ fontSize: "13px", color: "#6a1b9a", fontWeight: 500 }}>🖼️ Click to upload screenshot</p>
                      <p style={{ fontSize: "11px", color: "#bbb" }}>JPG, PNG supported</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
                </div>
                {(!gcashRef || !gcashImage) && (
                  <p style={{ fontSize: "11px", color: "#e53935", marginTop: "10px" }}>⚠️ Reference number and receipt image are required.</p>
                )}
              </div>
            )}

            {/* ── CASH ── */}
            {paymentMethod === "Cash" && (
              <div style={{ background: "#f0faf2", borderRadius: "12px", padding: "18px", border: "1px solid #a5d6a7" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#2e7d32", marginBottom: "14px" }}>💵 Cash Payment</p>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", color: "#555", fontWeight: 600, marginBottom: "6px", display: "block" }}>
                    Amount Received from Customer <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#2e7d32", fontSize: "14px" }}>₱</span>
                    <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0.00" min={0}
                      style={{ ...inputStyle, paddingLeft: "30px", fontSize: "18px", fontWeight: 700, border: paid >= subtotal ? "1.5px solid #2e7d32" : "1.5px solid #e0e0e0" }} />
                  </div>
                </div>
                <div style={{ background: "#fff", borderRadius: "10px", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[["Total Amount", `₱${subtotal.toLocaleString()}.00`], ["Amount Paid", `₱${paid > 0 ? paid.toLocaleString() : "0"}.00`]].map(([label, value]) => (
                    <div key={String(label)} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px", color: "#888" }}>{label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ height: "1px", background: "#f0f0f0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a" }}>Change</span>
                    <span style={{ fontSize: "22px", fontWeight: 800, color: change >= 0 ? "#2e7d32" : "#e53935" }}>
                      ₱{change >= 0 ? change.toLocaleString() : "0"}.00
                    </span>
                  </div>
                  {paid > 0 && paid < subtotal && (
                    <p style={{ fontSize: "11px", color: "#e53935", textAlign: "center" }}>⚠️ Amount is ₱{(subtotal - paid).toLocaleString()} short</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Summary ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "24px" }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>🛒 Order Summary</p>
              {cartItems.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "20px 0" }}>No items in cart.</p>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{item.productName}</p>
                      <p style={{ fontSize: "11px", color: "#aaa" }}>x{item.qty} × ₱{item.finalPrice.toLocaleString()}.00</p>
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a3c2e" }}>₱{(item.finalPrice * item.qty).toLocaleString()}.00</p>
                  </div>
                ))
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "10px", borderTop: "0.5px solid #f0f0f0" }}>
                <span style={{ fontSize: "13px", color: "#888" }}>Sub Total</span>
                <span style={{ fontSize: "13px" }}>₱{subtotal.toLocaleString()}.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                <span style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>Total</span>
                <span style={{ fontSize: "28px", fontWeight: 800, color: "#1a3c2e" }}>₱{subtotal.toLocaleString()}.00</span>
              </div>
            </div>

            {activeCustomer && (
              <div style={{ background: "#fff", borderRadius: "16px", border: "0.5px solid #e8e8e8", padding: "20px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}>👤 Customer Info</p>
                {([
                  ["Name",    activeCustomer.customerName],
                  activeCustomer.address       ? ["Address", activeCustomer.address]       : null,
                  activeCustomer.storeName     ? ["Store",   activeCustomer.storeName]     : null,
                  activeCustomer.contactNumber ? ["Phone",   activeCustomer.contactNumber] : null,
                ] as ([string, string] | null)[])
                  .filter((r): r is [string, string] => r !== null)
                  .map((row) => (
                    <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #f5f5f5" }}>
                      <span style={{ fontSize: "12px", color: "#aaa" }}>{row[0]}</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}>{row[1]}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div style={{ background: "#fff", borderTop: "1px solid #e8e8e8", padding: "14px 28px", display: "flex", gap: "12px", justifyContent: "flex-end", boxShadow: "0 -4px 16px rgba(0,0,0,0.06)" }}>
        <button onClick={() => router.back()}
          style={{ padding: "12px 32px", borderRadius: "20px", border: "1.5px solid #e0e0e0", background: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#555" }}>
          ← Order More
        </button>
        <button onClick={handleComplete} disabled={!canComplete}
          style={{ padding: "12px 40px", borderRadius: "20px", border: "none", background: canComplete ? "#1a3c2e" : "#ccc", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: canComplete ? "pointer" : "not-allowed", boxShadow: canComplete ? "0 4px 14px rgba(26,60,46,0.3)" : "none" }}>
          Complete Order →
        </button>
      </div>
    </div>
  );
}
