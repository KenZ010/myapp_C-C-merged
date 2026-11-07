"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type PaymentMethod = "Cash" | "GCash";
type CustomerType = "New Customer" | "Existing Customer";

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

// ── VAT (12%), added on top of the item subtotal ─────────────────────────────
const VAT_RATE = 0.12;
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function PaymentPage() {
  const router = useRouter();
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingCart");
    if (raw) {
      try {
        setCartItems(JSON.parse(raw));
      } catch {
        setCartItems([]);
      }
    }
  }, []);

  // Same maths as the server: total = subtotal + 12% VAT, rounded to centavos
  const subtotal = cartItems.reduce((s, i) => s + i.finalPrice * i.qty, 0);
  const total = round2(subtotal + subtotal * VAT_RATE);
  const vat = round2(total - subtotal);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCust, setLoadingCust] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoadingCust(true);
        const data = await api.getCustomers();
        setCustomers(
          (Array.isArray(data) ? data : []).map((c: any) => ({
            ...c,
            customerName: c.customerName || c.name,
            contactNumber: c.contactNumber || c.phone,
          })),
        );
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoadingCust(false);
      }
    };
    fetchCustomers();
  }, []);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("GCash");
  const [customerType, setCustomerType] =
    useState<CustomerType>("Existing Customer");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [existingAddress, setExistingAddress] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newStore, setNewStore] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [nameError, setNameError] = useState("");
  const [storeError, setStoreError] = useState("");

  const [gcashRef, setGcashRef] = useState("");
  const [gcashImage, setGcashImage] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [completed, setCompleted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredCustomers = useMemo(
    () =>
      searchQuery.trim() === ""
        ? []
        : customers.filter((c) => {
            const name = c.customerName?.toLowerCase() || "";
            const store = c.storeName?.toLowerCase() || "";
            const phone = c.contactNumber || "";
            const query = searchQuery.toLowerCase();
            return (
              name.includes(query) ||
              store.includes(query) ||
              phone.includes(query)
            );
          }),
    [searchQuery, customers],
  );

  const activeCustomer =
    customerType === "Existing Customer"
      ? selectedCustomer
        ? {
            ...selectedCustomer,
            address: existingAddress.trim() || selectedCustomer.address,
          }
        : null
      : newName
        ? {
            customerName: newName,
            address: newAddress,
            storeName: newStore,
            contactNumber: "+63" + newPhone,
          }
        : null;

  const paid = parseFloat(amountPaid) || 0;
  const change = paid - total;

  const phoneValid = newPhone.trim().length === 10 && /^\d{10}$/.test(newPhone);
  const newCustomerValid =
    newName.trim() !== "" &&
    nameError === "" &&
    storeError === "" &&
    phoneValid &&
    newAddress.trim() !== "";
  const existingValid =
    selectedCustomer !== null && existingAddress.trim() !== "";
  const gcashRefValid = /^\d{13}$/.test(gcashRef.trim());

  const canComplete =
    cartItems.length > 0 &&
    (customerType === "Existing Customer" ? existingValid : newCustomerValid) &&
    (paymentMethod === "GCash"
      ? gcashRefValid && gcashImage !== null
      : paid + 0.005 >= total);

  // What's still missing — shown under the Place Order button
  const missingSteps: string[] = [];
  if (cartItems.length === 0) missingSteps.push("Add items to the cart");
  if (customerType === "Existing Customer") {
    if (!selectedCustomer) missingSteps.push("Select a customer");
    else if (existingAddress.trim() === "")
      missingSteps.push("Enter the delivery address");
  } else {
    if (!newCustomerValid)
      missingSteps.push(
        "Fill in the customer's name, phone and delivery address",
      );
  }
  if (paymentMethod === "GCash") {
    if (!gcashRefValid)
      missingSteps.push("Enter the 13-digit GCash reference no.");
    if (!gcashImage) missingSteps.push("Upload the GCash receipt");
  } else if (paid + 0.005 < total) {
    missingSteps.push("Enter the amount received");
  }

  const lettersOnlyRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s.\-']*$/;

  const handleNameChange = (val: string) => {
    setNameError(
      lettersOnlyRegex.test(val)
        ? ""
        : "Name cannot contain numbers or special characters.",
    );
    setNewName(val.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ\s.\-']/g, ""));
  };

  const handleStoreChange = (val: string) => {
    setStoreError(
      lettersOnlyRegex.test(val)
        ? ""
        : "Store name cannot contain numbers or special characters.",
    );
    setNewStore(val.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ\s.\-']/g, ""));
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setNewPhone(digits);
  };

  // GCash reference number: exactly 13 digits (also strips letters/symbols from pasted text)
  const handleGcashRefChange = (val: string) => {
    setGcashRef(val.replace(/\D/g, "").slice(0, 13));
  };

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setExistingAddress(c.address ?? "");
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

  const handleComplete = async () => {
    if (!canComplete || submitting) return;
    try {
      setSubmitting(true);
      setSubmitError(null);

      const isExisting = customerType === "Existing Customer";

      // The server recalculates prices; we only send what was bought.
      // New customer = no account (guest). Existing = linked to their account.
      const res = await api.placeWalkInOrder({
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.qty,
        })),
        paymentMethod: paymentMethod === "Cash" ? "cash" : "gcash",
        cashGiven: paymentMethod === "Cash" ? paid : undefined,
        gcashRef: paymentMethod === "GCash" ? gcashRef.trim() : undefined,
        customerId: isExisting ? selectedCustomer!.id : undefined,
        walkInName: isExisting
          ? selectedCustomer!.customerName
          : newStore.trim()
            ? `${newName.trim()} (${newStore.trim()})`
            : newName.trim(),
        walkInPhone: isExisting ? undefined : "+63" + newPhone,
        walkInAddress: isExisting ? existingAddress.trim() : newAddress.trim(),
      });

      setOrderId(res?.saleId ?? "");
      sessionStorage.removeItem("pendingCart");
      setCompleted(true);
    } catch (err: any) {
      console.error("Failed to place order:", err);
      setSubmitError(err?.message || "Failed to place the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setCompleted(false);
    setOrderId("");
    setSubmitError(null);
    setSelectedCustomer(null);
    setExistingAddress("");
    setSearchQuery("");
    setNewName("");
    setNewAddress("");
    setNewStore("");
    setNewPhone("");
    setNameError("");
    setStoreError("");
    setGcashRef("");
    setGcashImage(null);
    setAmountPaid("");
    router.push("/cashier");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    fontSize: "13px",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    color: "#1a1a1a",
    fontFamily: "sans-serif",
  };

  const errorStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#e53935",
    marginTop: "4px",
  };

  /* ── Order Placed Screen ── */
  if (completed) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          background: "linear-gradient(160deg, #f0faf2, #e8f5e9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            maxWidth: "400px",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1a3c2e, #2d7a3a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: "40px",
            }}
          >
            ✅
          </div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "#1a1a1a",
              marginBottom: "8px",
            }}
          >
            Order Placed!
          </h2>
          {orderId && (
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>
              Order No: <strong style={{ color: "#1a3c2e" }}>{orderId}</strong>
            </p>
          )}
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
            Payment received from{" "}
            <strong>{activeCustomer?.customerName}</strong>.
          </p>
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
            Subtotal:{" "}
            <strong style={{ color: "#1a3c2e" }}>
              ₱
              {subtotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </p>
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
            VAT (12%):{" "}
            <strong style={{ color: "#1a3c2e" }}>
              ₱
              {vat.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </p>
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
            Total:{" "}
            <strong style={{ color: "#1a3c2e" }}>
              ₱
              {total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </p>
          {paymentMethod === "Cash" && change > 0 && (
            <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
              Change:{" "}
              <strong style={{ color: "#1a3c2e" }}>
                ₱
                {change.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </p>
          )}
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "6px" }}>
            Payment Method: <strong>{paymentMethod}</strong>
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "#666",
              background: "#fff",
              border: "1px solid #c8e6c9",
              borderRadius: "10px",
              padding: "10px 12px",
              margin: "14px 0 24px",
              lineHeight: 1.5,
            }}
          >
            Status: <strong>Pending</strong>. Track it under Active Orders, move
            it to Out for Delivery, then mark it Completed once it arrives.
          </p>
          <button
            onClick={resetAll}
            style={{
              background: "#1a3c2e",
              color: "#fff",
              border: "none",
              borderRadius: "30px",
              padding: "13px 40px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + New Order
          </button>
        </div>
      </div>
    );
  }

  /* ── Main Page ── */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 56px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isNarrow ? "16px" : "28px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 340px",
            gap: isNarrow ? "16px" : "24px",
            maxWidth: "960px",
            margin: "0 auto",
          }}
        >
          {/* ── LEFT: Form ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "0.5px solid #e8e8e8",
              padding: isNarrow ? "18px" : "28px",
            }}
          >
            {/* Payment Method */}
            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: "10px",
                }}
              >
                Payment Method
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                {(["Cash", "GCash"] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border:
                        paymentMethod === m
                          ? "2px solid #1a3c2e"
                          : "1px solid #e0e0e0",
                      background: paymentMethod === m ? "#f0faf2" : "#fff",
                      color: paymentMethod === m ? "#1a3c2e" : "#555",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {m === "Cash" ? "💵" : "📱"} {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Type */}
            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: "4px",
                }}
              >
                Customer Type
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#888",
                  marginBottom: "10px",
                }}
              >
                New Customer = no account yet. Existing Customer = already has
                an account.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                {(["New Customer", "Existing Customer"] as CustomerType[]).map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setCustomerType(t);
                        setSelectedCustomer(null);
                        setExistingAddress("");
                        setSearchQuery("");
                        setNewName("");
                        setNewAddress("");
                        setNewStore("");
                        setNewPhone("");
                        setNameError("");
                        setStoreError("");
                        setSubmitError(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 8px",
                        borderRadius: "8px",
                        fontSize: isNarrow ? "11px" : "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        border:
                          customerType === t
                            ? "2px solid #1a3c2e"
                            : "1px solid #e0e0e0",
                        background: customerType === t ? "#f0faf2" : "#fff",
                        color: customerType === t ? "#1a3c2e" : "#555",
                      }}
                    >
                      {t === "New Customer" ? "🆕" : "👥"} {t}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* ── EXISTING CUSTOMER ── */}
            {customerType === "Existing Customer" && (
              <div style={{ marginBottom: "20px" }}>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  🔍 Search Existing Customer
                </p>
                <div style={{ position: "relative" }}>
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                      setSelectedCustomer(null);
                      setExistingAddress("");
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={
                      loadingCust
                        ? "Loading customers…"
                        : "Type name, store, or phone..."
                    }
                    disabled={loadingCust}
                    style={{ ...inputStyle, paddingLeft: "36px" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "14px",
                    }}
                  >
                    🔍
                  </span>

                  {showDropdown && filteredCustomers.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "44px",
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
                      {filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          style={{
                            padding: "12px 16px",
                            cursor: "pointer",
                            borderBottom: "0.5px solid #f5f5f5",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
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
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "#1a3c2e",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          >
                            {c.customerName.charAt(0)}
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#1a1a1a",
                              }}
                            >
                              {c.customerName}
                            </p>
                            <p style={{ fontSize: "11px", color: "#aaa" }}>
                              {c.storeName || "—"} • {c.contactNumber || "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showDropdown &&
                    searchQuery.trim() !== "" &&
                    filteredCustomers.length === 0 &&
                    !loadingCust && (
                      <div
                        style={{
                          position: "absolute",
                          top: "44px",
                          left: 0,
                          right: 0,
                          background: "#fff",
                          borderRadius: "12px",
                          border: "1px solid #e0e0e0",
                          padding: "16px",
                          textAlign: "center",
                          zIndex: 20,
                        }}
                      >
                        <p style={{ fontSize: "13px", color: "#aaa" }}>
                          No customer found for &quot;{searchQuery}&quot;
                        </p>
                      </div>
                    )}
                </div>

                {selectedCustomer && (
                  <div
                    style={{
                      marginTop: "14px",
                      background: "#f0faf2",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      border: "1.5px solid #a5d6a7",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "#1a3c2e",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "16px",
                          flexShrink: 0,
                        }}
                      >
                        {selectedCustomer.customerName.charAt(0)}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#1a1a1a",
                            marginBottom: "4px",
                          }}
                        >
                          {selectedCustomer.customerName}
                        </p>
                        {selectedCustomer.storeName && (
                          <p style={{ fontSize: "12px", color: "#666" }}>
                            🏪 {selectedCustomer.storeName}
                          </p>
                        )}
                        {selectedCustomer.contactNumber && (
                          <p style={{ fontSize: "12px", color: "#666" }}>
                            📞 {selectedCustomer.contactNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setExistingAddress("");
                        setSearchQuery("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#aaa",
                        cursor: "pointer",
                        fontSize: "16px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Delivery address (prefilled from the account, editable) */}
                {selectedCustomer && (
                  <div style={{ marginTop: "14px" }}>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        fontWeight: 500,
                        marginBottom: "6px",
                        display: "block",
                      }}
                    >
                      📍 Delivery Address{" "}
                      <span style={{ color: "#e53935" }}>*</span>
                    </label>
                    <input
                      value={existingAddress}
                      onChange={(e) => setExistingAddress(e.target.value)}
                      placeholder="Enter delivery address"
                      maxLength={200}
                      style={{
                        ...inputStyle,
                        border:
                          existingAddress.trim() === ""
                            ? "1.5px solid #e53935"
                            : "1px solid #e0e0e0",
                      }}
                    />
                    {existingAddress.trim() === "" && (
                      <p style={errorStyle}>
                        ⚠️ Delivery address is required.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── NEW CUSTOMER ── */}
            {customerType === "New Customer" && (
              <div style={{ marginBottom: "20px" }}>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    fontWeight: 600,
                    marginBottom: "12px",
                  }}
                >
                  🆕 New Customer Information
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {/* Customer Name + Store Name — stack on very narrow */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#555",
                          fontWeight: 500,
                          marginBottom: "6px",
                          display: "block",
                        }}
                      >
                        👤 Customer Name{" "}
                        <span style={{ color: "#e53935" }}>*</span>
                      </label>
                      <input
                        value={newName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Enter customer name"
                        style={{
                          ...inputStyle,
                          border: nameError
                            ? "1.5px solid #e53935"
                            : "1px solid #e0e0e0",
                        }}
                      />
                      {nameError && <p style={errorStyle}>⚠️ {nameError}</p>}
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "12px",
                          color: "#555",
                          fontWeight: 500,
                          marginBottom: "6px",
                          display: "block",
                        }}
                      >
                        🏪 Store Name
                      </label>
                      <input
                        value={newStore}
                        onChange={(e) => handleStoreChange(e.target.value)}
                        placeholder="Enter store name"
                        style={{
                          ...inputStyle,
                          border: storeError
                            ? "1.5px solid #e53935"
                            : "1px solid #e0e0e0",
                        }}
                      />
                      {storeError && <p style={errorStyle}>⚠️ {storeError}</p>}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        fontWeight: 500,
                        marginBottom: "6px",
                        display: "block",
                      }}
                    >
                      📍 Delivery Address{" "}
                      <span style={{ color: "#e53935" }}>*</span>
                    </label>
                    <input
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Enter delivery address"
                      maxLength={200}
                      style={inputStyle}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        fontWeight: 500,
                        marginBottom: "6px",
                        display: "block",
                      }}
                    >
                      📞 Phone Number{" "}
                      <span style={{ color: "#e53935" }}>*</span>
                    </label>
                    <div style={{ display: "flex" }}>
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: "8px 0 0 8px",
                          border: "1px solid #e0e0e0",
                          borderRight: "none",
                          background: "#f5f5f5",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#1a1a1a",
                          flexShrink: 0,
                          userSelect: "none",
                        }}
                      >
                        +63
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={newPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="9XX XXX XXXX"
                        maxLength={10}
                        style={{
                          ...inputStyle,
                          borderRadius: "0 8px 8px 0",
                          border:
                            newPhone.length > 0 && newPhone.length < 10
                              ? "1.5px solid #e53935"
                              : newPhone.length === 10
                                ? "1.5px solid #2e7d32"
                                : "1px solid #e0e0e0",
                          borderLeft: "none",
                          flex: 1,
                          letterSpacing: "1px",
                        }}
                      />
                    </div>
                    {newPhone.length === 0 && (
                      <p style={{ ...errorStyle, color: "#aaa" }}>
                        Phone number is required (10 digits after +63)
                      </p>
                    )}
                    {newPhone.length > 0 && newPhone.length < 10 && (
                      <p style={errorStyle}>
                        ⚠️ {10 - newPhone.length} more digit
                        {10 - newPhone.length > 1 ? "s" : ""} needed
                      </p>
                    )}
                    {newPhone.length === 10 && (
                      <p style={{ ...errorStyle, color: "#2e7d32" }}>
                        ✅ +63 {newPhone.slice(0, 3)} {newPhone.slice(3, 6)}{" "}
                        {newPhone.slice(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── GCASH ── */}
            {paymentMethod === "GCash" && (
              <div
                style={{
                  background: "#f8f0ff",
                  borderRadius: "12px",
                  padding: "18px",
                  border: "1px solid #e0c8ff",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#6a1b9a",
                    marginBottom: "14px",
                  }}
                >
                  📱 GCash Payment Details
                </p>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "14px",
                    textAlign: "center",
                    marginBottom: "14px",
                    border: "1px solid #e0c8ff",
                  }}
                >
                  <svg
                    width="100"
                    height="100"
                    viewBox="0 0 120 120"
                    style={{ margin: "0 auto", display: "block" }}
                  >
                    <rect
                      x="2"
                      y="2"
                      width="116"
                      height="116"
                      rx="8"
                      fill="white"
                      stroke="#6a1b9a"
                      strokeWidth="3"
                    />
                    <rect
                      x="10"
                      y="10"
                      width="30"
                      height="30"
                      rx="3"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="15"
                      y="15"
                      width="20"
                      height="20"
                      rx="2"
                      fill="white"
                    />
                    <rect
                      x="19"
                      y="19"
                      width="12"
                      height="12"
                      rx="1"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="80"
                      y="10"
                      width="30"
                      height="30"
                      rx="3"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="85"
                      y="15"
                      width="20"
                      height="20"
                      rx="2"
                      fill="white"
                    />
                    <rect
                      x="89"
                      y="19"
                      width="12"
                      height="12"
                      rx="1"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="10"
                      y="80"
                      width="30"
                      height="30"
                      rx="3"
                      fill="#6a1b9a"
                    />
                    <rect
                      x="15"
                      y="85"
                      width="20"
                      height="20"
                      rx="2"
                      fill="white"
                    />
                    <rect
                      x="19"
                      y="89"
                      width="12"
                      height="12"
                      rx="1"
                      fill="#6a1b9a"
                    />
                    {[
                      [50, 10],
                      [56, 10],
                      [62, 10],
                      [50, 16],
                      [62, 16],
                      [50, 22],
                      [58, 22],
                      [62, 22],
                      [10, 50],
                      [16, 50],
                      [22, 50],
                      [28, 50],
                      [10, 62],
                      [28, 62],
                      [50, 50],
                      [58, 50],
                      [66, 50],
                      [50, 58],
                      [62, 58],
                      [50, 66],
                      [58, 66],
                      [80, 50],
                      [96, 50],
                      [80, 58],
                      [96, 58],
                      [80, 66],
                      [96, 66],
                      [50, 80],
                      [58, 80],
                      [50, 88],
                      [62, 88],
                      [54, 96],
                      [66, 96],
                    ].map(([x, y], i) => (
                      <rect
                        key={i}
                        x={x}
                        y={y}
                        width="5"
                        height="5"
                        fill="#6a1b9a"
                      />
                    ))}
                  </svg>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#6a1b9a",
                      marginTop: "8px",
                    }}
                  >
                    Julieta Soft Drinks
                  </p>
                  <p style={{ fontSize: "11px", color: "#aaa" }}>
                    GCash: 0912 345 6789
                  </p>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#1a3c2e",
                      marginTop: "6px",
                    }}
                  >
                    Amount to Pay: ₱
                    {total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#6a1b9a",
                      fontWeight: 600,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    🔢 GCash Reference No.{" "}
                    <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={gcashRef}
                    onChange={(e) => handleGcashRefChange(e.target.value)}
                    placeholder="13-digit reference number"
                    style={{
                      ...inputStyle,
                      letterSpacing: "1px",
                      border: gcashRefValid
                        ? "1.5px solid #2e7d32"
                        : gcashRef
                          ? "1.5px solid #6a1b9a"
                          : "1px solid #e0c8ff",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "11px",
                      marginTop: "4px",
                      color: gcashRefValid ? "#2e7d32" : "#888",
                    }}
                  >
                    {gcashRef.length}/13 digits
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#6a1b9a",
                      fontWeight: 600,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    📸 GCash Receipt Image{" "}
                    <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  {gcashImage ? (
                    <div
                      style={{
                        position: "relative",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1.5px solid #6a1b9a",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gcashImage}
                        alt="receipt"
                        style={{
                          width: "100%",
                          height: "90px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <button
                        onClick={() => setGcashImage(null)}
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          background: "rgba(0,0,0,0.55)",
                          border: "none",
                          color: "#fff",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        ✕
                      </button>
                      <div
                        style={{
                          background: "#e8f5e9",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#2e7d32",
                            fontWeight: 600,
                          }}
                        >
                          ✅ Receipt uploaded
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: "2px dashed #c084fc",
                        borderRadius: "10px",
                        padding: "14px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: "#fff",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#6a1b9a",
                          fontWeight: 500,
                        }}
                      >
                        🖼️ Click to upload screenshot
                      </p>
                      <p style={{ fontSize: "11px", color: "#bbb" }}>
                        JPG, PNG supported
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    style={{ display: "none" }}
                  />
                </div>
                {(!gcashRefValid || !gcashImage) && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#e53935",
                      marginTop: "10px",
                    }}
                  >
                    ⚠️ A 13-digit reference number and the receipt image are
                    required.
                  </p>
                )}
              </div>
            )}

            {/* ── CASH ── */}
            {paymentMethod === "Cash" && (
              <div
                style={{
                  background: "#f0faf2",
                  borderRadius: "12px",
                  padding: "18px",
                  border: "1px solid #a5d6a7",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#2e7d32",
                    marginBottom: "14px",
                  }}
                >
                  💵 Cash Payment
                </p>
                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#555",
                      fontWeight: 600,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    Amount Received from Customer{" "}
                    <span style={{ color: "#e53935" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 700,
                        color: "#2e7d32",
                        fontSize: "14px",
                      }}
                    >
                      ₱
                    </span>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      min={0}
                      style={{
                        ...inputStyle,
                        paddingLeft: "30px",
                        fontSize: "18px",
                        fontWeight: 700,
                        border:
                          paid + 0.005 >= total
                            ? "1.5px solid #2e7d32"
                            : "1.5px solid #e0e0e0",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {[
                    [
                      "Subtotal",
                      `₱${subtotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`,
                    ],
                    [
                      "VAT (12%)",
                      `₱${vat.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`,
                    ],
                    [
                      "Total Amount Due",
                      `₱${total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`,
                    ],
                    [
                      "Amount Paid",
                      `₱${paid.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#888" }}>
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
                  <div style={{ height: "1px", background: "#f0f0f0" }} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#1a1a1a",
                      }}
                    >
                      Change
                    </span>
                    <span
                      style={{
                        fontSize: "22px",
                        fontWeight: 800,
                        color: change >= 0 ? "#2e7d32" : "#e53935",
                      }}
                    >
                      ₱
                      {change >= 0
                        ? change.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </span>
                  </div>
                  {paid > 0 && paid + 0.005 < total && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#e53935",
                        textAlign: "center",
                      }}
                    >
                      ⚠️ Amount is ₱
                      {(total - paid).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      short
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── On narrow: Order Summary (with action buttons) inline after form ── */}
            {isNarrow && (
              <div style={{ marginTop: "20px" }}>
                <OrderSummaryCard
                  cartItems={cartItems}
                  subtotal={subtotal}
                  vat={vat}
                  total={total}
                  activeCustomer={activeCustomer}
                  canComplete={canComplete}
                  submitting={submitting}
                  submitError={submitError}
                  missingSteps={missingSteps}
                  onComplete={handleComplete}
                  onOrderMore={() => router.back()}
                />
              </div>
            )}
          </div>

          {/* ── RIGHT: Summary + actions (desktop only, stays in view while scrolling) ── */}
          {!isNarrow && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                position: "sticky",
                top: 0,
                alignSelf: "start",
              }}
            >
              <OrderSummaryCard
                cartItems={cartItems}
                subtotal={subtotal}
                vat={vat}
                total={total}
                activeCustomer={activeCustomer}
                canComplete={canComplete}
                submitting={submitting}
                submitError={submitError}
                missingSteps={missingSteps}
                onComplete={handleComplete}
                onOrderMore={() => router.back()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Extracted Order Summary Card (reused in both layouts) ── */
function OrderSummaryCard({
  cartItems,
  subtotal,
  vat,
  total,
  activeCustomer,
  canComplete,
  submitting,
  submitError,
  missingSteps,
  onComplete,
  onOrderMore,
}: {
  cartItems: CartItem[];
  subtotal: number;
  vat: number;
  total: number;
  activeCustomer: {
    customerName: string;
    address?: string;
    storeName?: string;
    contactNumber?: string;
  } | null;
  canComplete: boolean;
  submitting: boolean;
  submitError: string | null;
  missingSteps: string[];
  onComplete: () => void;
  onOrderMore: () => void;
}) {
  const completeDisabled = !canComplete || submitting;
  const money = (n: number) =>
    `₱${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <>
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "0.5px solid #e8e8e8",
          padding: "20px",
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
          🛒 Order Summary
        </p>
        {cartItems.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: "#aaa",
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            No items in cart.
          </p>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "0.5px solid #f5f5f5",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#1a1a1a",
                  }}
                >
                  {item.productName}
                </p>
                <p style={{ fontSize: "11px", color: "#aaa" }}>
                  x{item.qty} × {money(item.finalPrice)}
                </p>
              </div>
              <p
                style={{ fontSize: "13px", fontWeight: 600, color: "#1a3c2e" }}
              >
                {money(item.finalPrice * item.qty)}
              </p>
            </div>
          ))
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "12px",
            paddingTop: "10px",
            borderTop: "0.5px solid #f0f0f0",
          }}
        >
          <span style={{ fontSize: "13px", color: "#888" }}>Sub Total</span>
          <span style={{ fontSize: "13px", color: "#1a1a1a" }}>
            {money(subtotal)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "6px",
          }}
        >
          <span style={{ fontSize: "13px", color: "#888" }}>VAT (12%)</span>
          <span style={{ fontSize: "13px", color: "#1a1a1a" }}>
            {money(vat)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "0.5px solid #f0f0f0",
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>
            Total
          </span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#1a3c2e" }}>
            {money(total)}
          </span>
        </div>

        {/* ── Actions ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "18px",
          }}
        >
          {/* Server error (out of stock, GCash ref already used, etc.) */}
          {submitError && (
            <div
              style={{
                background: "#ffebee",
                border: "1px solid #ef9a9a",
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "12px",
                color: "#c62828",
                lineHeight: 1.5,
              }}
            >
              ⚠️ {submitError}
            </div>
          )}

          <button
            onClick={onComplete}
            disabled={completeDisabled}
            style={{
              width: "100%",
              height: "50px",
              borderRadius: "14px",
              border: "none",
              background: completeDisabled
                ? "#d9d9d9"
                : "linear-gradient(135deg, #1a3c2e 0%, #2d7a3a 100%)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: completeDisabled ? "not-allowed" : "pointer",
              boxShadow: completeDisabled
                ? "none"
                : "0 8px 20px rgba(26,60,46,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            {submitting ? (
              "Placing order…"
            ) : (
              <>
                Place Order
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>

          <button
            onClick={onOrderMore}
            disabled={submitting}
            style={{
              width: "100%",
              height: "44px",
              borderRadius: "14px",
              border: "1.5px solid #d6e4da",
              background: "#f6fbf7",
              color: "#1a3c2e",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Order More
          </button>

          {/* What's still needed before the order can be placed */}
          {!canComplete && missingSteps.length > 0 && (
            <div
              style={{
                background: "#fff8e1",
                border: "1px solid #ffe082",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#8d6e00",
                  marginBottom: "4px",
                }}
              >
                Before you can place the order:
              </p>
              {missingSteps.map((step) => (
                <p
                  key={step}
                  style={{ fontSize: "11px", color: "#8d6e00", lineHeight: 1.5 }}
                >
                  • {step}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeCustomer && (
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "0.5px solid #e8e8e8",
            padding: "20px",
            marginTop: "16px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "12px",
            }}
          >
            👤 Customer Info
          </p>
          {(
            [
              ["Name", activeCustomer.customerName],
              activeCustomer.address
                ? ["Address", activeCustomer.address]
                : null,
              activeCustomer.storeName
                ? ["Store", activeCustomer.storeName]
                : null,
              activeCustomer.contactNumber
                ? ["Phone", activeCustomer.contactNumber]
                : null,
            ] as ([string, string] | null)[]
          )
            .filter((r): r is [string, string] => r !== null)
            .map((row) => (
              <div
                key={row[0]}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: "0.5px solid #f5f5f5",
                }}
              >
                <span style={{ fontSize: "12px", color: "#aaa" }}>
                  {row[0]}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#333",
                    textAlign: "right",
                    maxWidth: "60%",
                  }}
                >
                  {row[1]}
                </span>
              </div>
            ))}
        </div>
      )}
    </>
  );
}