"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type PaymentMethod = "Cash" | "GCash";
type CustomerType = "New Customer" | "Existing Customer";
type RefStatus = "idle" | "checking" | "ok" | "used" | "error";

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

type ActiveCustomer = {
  customerName: string;
  address?: string;
  storeName?: string;
  contactNumber?: string;
  email?: string;
};

// ── VAT (12%), added on top of the item subtotal ─────────────────────────────
const VAT_RATE = 0.12;

// ── GCash QR settings (same as the customer cart page) ───────────────────────
const GCASH_QR_SRC = "/images/julietaqr.png";
const GCASH_NUMBER = "0936 960 2913";
const GCASH_NAME = "Julieta Soft Drinks";

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) =>
  `₱${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const lettersOnlyRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s.\-']*$/;

// Shared input styling (border colour/width is added per field so classes never conflict)
const inputBase =
  "w-full box-border rounded-lg bg-white px-3.5 py-2.5 text-[13px] text-[#1a1a1a] outline-none font-sans";
const labelCls = "mb-1.5 block text-xs font-medium text-[#555]";
const errorCls = "mt-1 text-[11px] text-[#e53935]";

// ── Placeholder QR (shown only if the QR image file is missing) ──────────────
function PlaceholderQr({ size = 100 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className="mx-auto block"
    >
      <rect x="2" y="2" width="116" height="116" rx="8" fill="white" stroke="#6a1b9a" strokeWidth="3" />
      {[[10, 10], [80, 10], [10, 80]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="30" height="30" rx="3" fill="#6a1b9a" />
          <rect x={x + 5} y={y + 5} width="20" height="20" rx="2" fill="white" />
          <rect x={x + 9} y={y + 9} width="12" height="12" rx="1" fill="#6a1b9a" />
        </g>
      ))}
      {[
        [50, 10], [56, 10], [62, 10], [50, 16], [62, 16], [50, 22], [58, 22], [62, 22],
        [10, 50], [16, 50], [22, 50], [28, 50], [10, 62], [28, 62],
        [50, 50], [58, 50], [66, 50], [50, 58], [62, 58], [50, 66], [58, 66],
        [80, 50], [96, 50], [80, 58], [96, 58], [80, 66], [96, 66],
        [50, 80], [58, 80], [50, 88], [62, 88], [54, 96], [66, 96],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="5" height="5" fill="#6a1b9a" />
      ))}
    </svg>
  );
}

export default function PaymentPage() {
  const router = useRouter();

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
            email: c.email || undefined,
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [existingAddress, setExistingAddress] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newStore, setNewStore] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [nameError, setNameError] = useState("");
  const [storeError, setStoreError] = useState("");

  // GCash
  const [gcashRef, setGcashRef] = useState("");
  const [refStatus, setRefStatus] = useState<RefStatus>("idle");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);

  const [amountPaid, setAmountPaid] = useState("");
  const [completed, setCompleted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [placedAsExisting, setPlacedAsExisting] = useState(false);
  const [placedName, setPlacedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Live duplicate check: runs once the reference number reaches 13 digits
  useEffect(() => {
    if (gcashRef.length !== 13) {
      setRefStatus("idle");
      return;
    }
    let cancelled = false;
    setRefStatus("checking");
    api
      .checkGcashRef(gcashRef)
      .then((r: any) => {
        if (!cancelled) setRefStatus(r?.exists ? "used" : "ok");
      })
      .catch(() => {
        // Network problem: don't block; the server still rejects duplicates
        if (!cancelled) setRefStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [gcashRef]);

  const filteredCustomers = useMemo(
    () =>
      searchQuery.trim() === ""
        ? []
        : customers.filter((c) => {
            const query = searchQuery.toLowerCase();
            return (
              (c.customerName?.toLowerCase() || "").includes(query) ||
              (c.storeName?.toLowerCase() || "").includes(query) ||
              (c.email?.toLowerCase() || "").includes(query) ||
              (c.contactNumber || "").includes(searchQuery)
            );
          }),
    [searchQuery, customers],
  );

  const activeCustomer: ActiveCustomer | null =
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

  const phoneValid = /^\d{10}$/.test(newPhone);
  const newCustomerValid =
    newName.trim() !== "" &&
    nameError === "" &&
    storeError === "" &&
    phoneValid &&
    newAddress.trim() !== "";
  const selectedHasEmail = !!selectedCustomer?.email;
  const existingValid =
    selectedCustomer !== null &&
    selectedHasEmail &&
    existingAddress.trim() !== "";

  const gcashRefValid = /^\d{13}$/.test(gcashRef);
  const gcashRefOk =
    gcashRefValid && refStatus !== "used" && refStatus !== "checking";
  const receiptReady = receiptUrl !== null && !uploadingReceipt;

  const canComplete =
    cartItems.length > 0 &&
    (customerType === "Existing Customer" ? existingValid : newCustomerValid) &&
    (paymentMethod === "GCash"
      ? gcashRefOk && receiptReady
      : paid + 0.005 >= total);

  // What's still missing — shown under the Place Order button
  const missingSteps: string[] = [];
  if (cartItems.length === 0) missingSteps.push("Add items to the cart");
  if (customerType === "Existing Customer") {
    if (!selectedCustomer) missingSteps.push("Select a customer");
    else if (!selectedHasEmail)
      missingSteps.push("This customer has no email on file. Add one first");
    else if (existingAddress.trim() === "")
      missingSteps.push("Enter the delivery address");
  } else if (!newCustomerValid) {
    missingSteps.push("Fill in the customer's name, phone and delivery address");
  }
  if (paymentMethod === "GCash") {
    if (!gcashRefValid) missingSteps.push("Enter the 13-digit GCash reference no.");
    else if (refStatus === "used")
      missingSteps.push("That reference no. was already used");
    else if (refStatus === "checking")
      missingSteps.push("Checking the reference no.…");
    if (uploadingReceipt) missingSteps.push("Wait for the receipt to finish uploading");
    else if (!receiptUrl) missingSteps.push("Upload the GCash receipt");
  } else if (paid + 0.005 < total) {
    missingSteps.push("Enter the amount received");
  }

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
    setNewPhone(val.replace(/\D/g, "").slice(0, 10));
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

  const clearReceipt = () => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
    setReceiptUrl(null);
    setReceiptError(null);
  };

  // Upload the screenshot right away; Place Order sends the returned URL
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setReceiptError("Only JPG or PNG images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setReceiptError("Receipt must be 5MB or smaller.");
      return;
    }

    clearReceipt();
    setReceiptPreview(URL.createObjectURL(file));
    setUploadingReceipt(true);
    try {
      const res = await api.uploadReceipt(file);
      if (!res?.receiptImage) throw new Error("Upload failed.");
      setReceiptUrl(res.receiptImage);
    } catch (err: any) {
      setReceiptPreview(null);
      setReceiptUrl(null);
      setReceiptError(err?.message || "Failed to upload receipt. Please try again.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const resetCustomerFields = () => {
    setSelectedCustomer(null);
    setExistingAddress("");
    setSearchQuery("");
    setNewName("");
    setNewAddress("");
    setNewStore("");
    setNewPhone("");
    setNameError("");
    setStoreError("");
  };

  const handleComplete = async () => {
    if (!canComplete || submitting) return;
    try {
      setSubmitting(true);
      setSubmitError(null);

      const isExisting = customerType === "Existing Customer";

      // The server recalculates prices and re-checks everything; we only send what was bought.
      // New customer = no account (guest). Existing = linked to their account.
      const res = await api.placeWalkInOrder({
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.qty,
        })),
        paymentMethod: paymentMethod === "Cash" ? "cash" : "gcash",
        cashGiven: paymentMethod === "Cash" ? paid : undefined,
        gcashRef: paymentMethod === "GCash" ? gcashRef : undefined,
        receiptImage: paymentMethod === "GCash" ? (receiptUrl ?? undefined) : undefined,
        customerId: isExisting ? selectedCustomer!.id : undefined,
        walkInName: isExisting ? selectedCustomer!.customerName : newName.trim(),
        walkInStoreName: isExisting ? undefined : newStore.trim() || undefined,
        walkInPhone: isExisting ? undefined : "+63" + newPhone,
        walkInAddress: isExisting ? existingAddress.trim() : newAddress.trim(),
      });

      setPlacedAsExisting(isExisting);
      setPlacedName(isExisting ? selectedCustomer!.customerName : newName.trim());
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
    resetCustomerFields();
    setGcashRef("");
    setRefStatus("idle");
    clearReceipt();
    setAmountPaid("");
    router.push("/cashier");
  };

  /* ── Order Placed Screen ── */
  if (completed) {
    const summaryRow = "mb-1.5 text-sm text-[#888]";
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-gradient-to-b from-[#f0faf2] to-[#e8f5e9] p-5">
        <div className="w-full max-w-[400px] p-10 text-center">
          <div className="mx-auto mb-5 flex h-[90px] w-[90px] items-center justify-center rounded-full bg-gradient-to-br from-[#1a3c2e] to-[#2d7a3a] text-[40px]">
            ✅
          </div>
          <h2 className="mb-2 text-2xl font-extrabold text-[#1a1a1a]">
            Order Placed!
          </h2>
          {orderId && (
            <p className="mb-1.5 text-[13px] text-[#888]">
              Order No: <strong className="text-[#1a3c2e]">{orderId}</strong>
            </p>
          )}
          <p className={summaryRow}>
            Payment received from <strong>{placedName}</strong>.
          </p>
          <p className={summaryRow}>
            Subtotal: <strong className="text-[#1a3c2e]">{money(subtotal)}</strong>
          </p>
          <p className={summaryRow}>
            VAT (12%): <strong className="text-[#1a3c2e]">{money(vat)}</strong>
          </p>
          <p className={summaryRow}>
            Total: <strong className="text-[#1a3c2e]">{money(total)}</strong>
          </p>
          {paymentMethod === "Cash" && change > 0 && (
            <p className={summaryRow}>
              Change: <strong className="text-[#1a3c2e]">{money(change)}</strong>
            </p>
          )}
          <p className={summaryRow}>
            Payment Method: <strong>{paymentMethod}</strong>
          </p>
          <p className="mb-6 mt-3.5 rounded-[10px] border border-[#c8e6c9] bg-white px-3 py-2.5 text-xs leading-normal text-[#666]">
            Status: <strong>Pending</strong>.{" "}
            {placedAsExisting
              ? "Move it to Processing, then Out for Delivery. The customer confirms receipt in their account (or it completes automatically 24 hours after dispatch)."
              : "Move it to Processing, then Out for Delivery, then mark it Completed once it arrives."}
          </p>
          <button
            onClick={resetAll}
            className="cursor-pointer rounded-full border-none bg-[#1a3c2e] px-10 py-[13px] text-sm font-bold text-white"
          >
            + New Order
          </button>
        </div>
      </div>
    );
  }

  const choiceBtn = (active: boolean) =>
    `flex-1 cursor-pointer rounded-lg px-2 py-2.5 text-[11px] font-semibold min-[900px]:text-[13px] ${
      active
        ? "border-2 border-[#1a3c2e] bg-[#f0faf2] text-[#1a3c2e]"
        : "border border-[#e0e0e0] bg-white text-[#555]"
    }`;

  /* ── Main Page ── */
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 min-[900px]:p-7">
        <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-4 min-[900px]:grid-cols-[1fr_340px] min-[900px]:gap-6">
          {/* ── LEFT: Form ── */}
          <div className="rounded-2xl border border-[#e8e8e8] bg-white p-[18px] min-[900px]:p-7">
            {/* Payment Method */}
            <div className="mb-5">
              <p className="mb-2.5 text-[13px] font-bold text-[#1a1a1a]">
                Payment Method
              </p>
              <div className="flex gap-2.5">
                {(["Cash", "GCash"] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`${choiceBtn(paymentMethod === m)} flex items-center justify-center gap-1.5 !text-[13px]`}
                  >
                    {m === "Cash" ? "💵" : "📱"} {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Type */}
            <div className="mb-5">
              <p className="mb-1 text-[13px] font-bold text-[#1a1a1a]">
                Customer Type
              </p>
              <p className="mb-2.5 text-[11px] text-[#888]">
                New Customer = no account yet. Existing Customer = already has
                an account.
              </p>
              <div className="flex gap-2.5">
                {(["New Customer", "Existing Customer"] as CustomerType[]).map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setCustomerType(t);
                        resetCustomerFields();
                        setSubmitError(null);
                      }}
                      className={choiceBtn(customerType === t)}
                    >
                      {t === "New Customer" ? "🆕" : "👥"} {t}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* ── EXISTING CUSTOMER ── */}
            {customerType === "Existing Customer" && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold text-[#555]">
                  🔍 Search Existing Customer
                </p>
                <div className="relative">
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
                        : "Type name, email, store, or phone..."
                    }
                    disabled={loadingCust}
                    className={`${inputBase} border border-[#e0e0e0] pl-9`}
                  />
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                    🔍
                  </span>

                  {showDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute inset-x-0 top-11 z-20 max-h-72 overflow-y-auto rounded-xl border border-[#e0e0e0] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                      {filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="flex cursor-pointer items-center gap-3 border-b border-[#f5f5f5] bg-white px-4 py-3 hover:bg-[#f0faf2]"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a3c2e] text-sm font-bold text-white">
                            {c.customerName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#1a1a1a]">
                              {c.customerName}
                            </p>
                            <p className="truncate text-[11px] text-[#aaa]">
                              {c.storeName || "—"} • {c.contactNumber || "—"}
                            </p>
                            <p
                              className={`truncate text-[11px] ${
                                c.email ? "text-[#aaa]" : "font-semibold text-[#e53935]"
                              }`}
                            >
                              {c.email ? `✉️ ${c.email}` : "⚠️ No email on file"}
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
                      <div className="absolute inset-x-0 top-11 z-20 rounded-xl border border-[#e0e0e0] bg-white p-4 text-center">
                        <p className="text-[13px] text-[#aaa]">
                          No customer found for &quot;{searchQuery}&quot;
                        </p>
                      </div>
                    )}
                </div>

                {selectedCustomer && (
                  <div className="mt-3.5 flex items-start justify-between rounded-xl border-[1.5px] border-[#a5d6a7] bg-[#f0faf2] px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a3c2e] text-base font-bold text-white">
                        {selectedCustomer.customerName.charAt(0)}
                      </div>
                      <div>
                        <p className="mb-1 text-sm font-bold text-[#1a1a1a]">
                          {selectedCustomer.customerName}
                        </p>
                        {selectedCustomer.storeName && (
                          <p className="text-xs text-[#666]">
                            🏪 {selectedCustomer.storeName}
                          </p>
                        )}
                        {selectedCustomer.contactNumber && (
                          <p className="text-xs text-[#666]">
                            📞 {selectedCustomer.contactNumber}
                          </p>
                        )}
                        {selectedCustomer.email && (
                          <p className="text-xs text-[#666]">
                            ✉️ {selectedCustomer.email}
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
                      className="cursor-pointer border-none bg-transparent text-base text-[#aaa]"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* An account without an email can't log in to confirm delivery */}
                {selectedCustomer && !selectedHasEmail && (
                  <div className="mt-3 rounded-[10px] border border-[#ef9a9a] bg-[#ffebee] px-3 py-2.5 text-xs leading-normal text-[#c62828]">
                    ⚠️ This customer has no email on file, so they can&apos;t log
                    in to confirm delivery. Please add an email to their account
                    first.
                  </div>
                )}

                {/* Delivery address (prefilled from the account, editable) */}
                {selectedCustomer && (
                  <div className="mt-3.5">
                    <label className={labelCls}>
                      📍 Delivery Address{" "}
                      <span className="text-[#e53935]">*</span>
                    </label>
                    <input
                      value={existingAddress}
                      onChange={(e) => setExistingAddress(e.target.value)}
                      placeholder="Enter delivery address"
                      maxLength={200}
                      className={`${inputBase} ${
                        existingAddress.trim() === ""
                          ? "border-[1.5px] border-[#e53935]"
                          : "border border-[#e0e0e0]"
                      }`}
                    />
                    {existingAddress.trim() === "" && (
                      <p className={errorCls}>⚠️ Delivery address is required.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── NEW CUSTOMER ── */}
            {customerType === "New Customer" && (
              <div className="mb-5">
                <p className="mb-3 text-xs font-semibold text-[#555]">
                  🆕 New Customer Information
                </p>
                <div className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
                    <div>
                      <label className={labelCls}>
                        👤 Customer Name <span className="text-[#e53935]">*</span>
                      </label>
                      <input
                        value={newName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Enter customer name"
                        className={`${inputBase} ${
                          nameError
                            ? "border-[1.5px] border-[#e53935]"
                            : "border border-[#e0e0e0]"
                        }`}
                      />
                      {nameError && <p className={errorCls}>⚠️ {nameError}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>🏪 Store Name</label>
                      <input
                        value={newStore}
                        onChange={(e) => handleStoreChange(e.target.value)}
                        placeholder="Enter store name"
                        className={`${inputBase} ${
                          storeError
                            ? "border-[1.5px] border-[#e53935]"
                            : "border border-[#e0e0e0]"
                        }`}
                      />
                      {storeError && <p className={errorCls}>⚠️ {storeError}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>
                      📍 Delivery Address{" "}
                      <span className="text-[#e53935]">*</span>
                    </label>
                    <input
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="Enter delivery address"
                      maxLength={200}
                      className={`${inputBase} border border-[#e0e0e0]`}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      📞 Phone Number <span className="text-[#e53935]">*</span>
                    </label>
                    <div className="flex">
                      <div className="shrink-0 select-none rounded-l-lg border border-r-0 border-[#e0e0e0] bg-[#f5f5f5] px-3 py-2.5 text-[13px] font-bold text-[#1a1a1a]">
                        +63
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={newPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="9XX XXX XXXX"
                        maxLength={10}
                        className={`${inputBase} min-w-0 flex-1 rounded-l-none border border-l-0 tracking-[1px] ${
                          newPhone.length > 0 && newPhone.length < 10
                            ? "border-[#e53935]"
                            : newPhone.length === 10
                              ? "border-[#2e7d32]"
                              : "border-[#e0e0e0]"
                        }`}
                      />
                    </div>
                    {newPhone.length === 0 && (
                      <p className={`${errorCls} !text-[#aaa]`}>
                        Phone number is required (10 digits after +63)
                      </p>
                    )}
                    {newPhone.length > 0 && newPhone.length < 10 && (
                      <p className={errorCls}>
                        ⚠️ {10 - newPhone.length} more digit
                        {10 - newPhone.length > 1 ? "s" : ""} needed
                      </p>
                    )}
                    {newPhone.length === 10 && (
                      <p className={`${errorCls} !text-[#2e7d32]`}>
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
              <div className="rounded-xl border border-[#e0c8ff] bg-[#f8f0ff] p-[18px]">
                <p className="mb-3.5 text-[13px] font-bold text-[#6a1b9a]">
                  📱 GCash Payment Details
                </p>
                <div className="mb-3.5 rounded-xl border border-[#e0c8ff] bg-white p-3.5 text-center">
                  {qrFailed ? (
                    <PlaceholderQr size={100} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={GCASH_QR_SRC}
                      alt="GCash QR code"
                      onError={() => setQrFailed(true)}
                      className="mx-auto block h-[180px] w-[180px] object-contain"
                    />
                  )}
                  <p className="mt-2 text-xs font-bold text-[#6a1b9a]">
                    {GCASH_NAME}
                  </p>
                  <p className="text-[11px] text-[#aaa]">GCash: {GCASH_NUMBER}</p>
                  <p className="mt-1.5 text-base font-bold text-[#1a3c2e]">
                    Amount to Pay: {money(total)}
                  </p>
                </div>

                {/* Reference number */}
                <div className="mb-3">
                  <label className="mb-1.5 block text-xs font-semibold text-[#6a1b9a]">
                    🔢 GCash Reference No. <span className="text-[#e53935]">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={gcashRef}
                    onChange={(e) => handleGcashRefChange(e.target.value)}
                    placeholder="13-digit reference number"
                    className={`${inputBase} tracking-[1px] ${
                      refStatus === "used"
                        ? "border-[1.5px] border-[#e53935]"
                        : gcashRefValid
                          ? "border-[1.5px] border-[#2e7d32]"
                          : gcashRef
                            ? "border-[1.5px] border-[#6a1b9a]"
                            : "border border-[#e0c8ff]"
                    }`}
                  />
                  <p
                    className={`mt-1 text-[11px] ${
                      refStatus === "used"
                        ? "font-semibold text-[#e53935]"
                        : gcashRefValid
                          ? "text-[#2e7d32]"
                          : "text-[#888]"
                    }`}
                  >
                    {refStatus === "used"
                      ? "⚠️ This reference no. was already used."
                      : refStatus === "checking"
                        ? "Checking…"
                        : refStatus === "ok"
                          ? "✅ 13/13 digits, reference no. is available"
                          : `${gcashRef.length}/13 digits`}
                  </p>
                </div>

                {/* Receipt */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#6a1b9a]">
                    📸 GCash Receipt Image <span className="text-[#e53935]">*</span>
                  </label>
                  {receiptPreview ? (
                    <div className="relative overflow-hidden rounded-[10px] border-[1.5px] border-[#6a1b9a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receiptPreview}
                        alt="receipt"
                        className="block h-[90px] w-full object-cover"
                      />
                      <button
                        onClick={clearReceipt}
                        disabled={uploadingReceipt}
                        className="absolute right-1.5 top-1.5 h-6 w-6 cursor-pointer rounded-full border-none bg-black/55 text-xs text-white disabled:cursor-not-allowed"
                      >
                        ✕
                      </button>
                      <div
                        className={`p-[5px] text-center ${
                          uploadingReceipt ? "bg-[#fff8e1]" : "bg-[#e8f5e9]"
                        }`}
                      >
                        <span
                          className={`text-[11px] font-semibold ${
                            uploadingReceipt ? "text-[#8d6e00]" : "text-[#2e7d32]"
                          }`}
                        >
                          {uploadingReceipt ? "⏳ Uploading…" : "✅ Receipt uploaded"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="cursor-pointer rounded-[10px] border-2 border-dashed border-[#c084fc] bg-white p-3.5 text-center"
                    >
                      <p className="text-[13px] font-medium text-[#6a1b9a]">
                        🖼️ Click to upload screenshot
                      </p>
                      <p className="text-[11px] text-[#bbb]">JPG, PNG supported</p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImage}
                    className="hidden"
                  />
                  {receiptError && <p className={errorCls}>⚠️ {receiptError}</p>}
                </div>

                {(!gcashRefValid || !receiptUrl) && (
                  <p className="mt-2.5 text-[11px] text-[#e53935]">
                    ⚠️ A 13-digit reference number and the receipt image are
                    required.
                  </p>
                )}
              </div>
            )}

            {/* ── CASH ── */}
            {paymentMethod === "Cash" && (
              <div className="rounded-xl border border-[#a5d6a7] bg-[#f0faf2] p-[18px]">
                <p className="mb-3.5 text-[13px] font-bold text-[#2e7d32]">
                  💵 Cash Payment
                </p>
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-[#555]">
                    Amount Received from Customer{" "}
                    <span className="text-[#e53935]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#2e7d32]">
                      ₱
                    </span>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      min={0}
                      className={`${inputBase} pl-[30px] text-lg font-bold ${
                        paid + 0.005 >= total
                          ? "border-[1.5px] border-[#2e7d32]"
                          : "border-[1.5px] border-[#e0e0e0]"
                      }`}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-[10px] bg-white px-4 py-3">
                  {[
                    ["Subtotal", money(subtotal)],
                    ["VAT (12%)", money(vat)],
                    ["Total Amount Due", money(total)],
                    ["Amount Paid", money(paid)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[13px] text-[#888]">{label}</span>
                      <span className="text-[13px] font-semibold text-[#1a1a1a]">
                        {value}
                      </span>
                    </div>
                  ))}
                  <div className="h-px bg-[#f0f0f0]" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1a1a1a]">Change</span>
                    <span
                      className={`text-[22px] font-extrabold ${
                        change >= 0 ? "text-[#2e7d32]" : "text-[#e53935]"
                      }`}
                    >
                      {change >= 0 ? money(change) : "₱0.00"}
                    </span>
                  </div>
                  {paid > 0 && paid + 0.005 < total && (
                    <p className="text-center text-[11px] text-[#e53935]">
                      ⚠️ Amount is {money(total - paid)} short
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT (below the form on narrow screens): Summary + actions ── */}
          <div className="flex flex-col gap-4 min-[900px]:sticky min-[900px]:top-0 min-[900px]:self-start">
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
        </div>
      </div>
    </div>
  );
}

/* ── Order Summary Card ── */
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
  activeCustomer: ActiveCustomer | null;
  canComplete: boolean;
  submitting: boolean;
  submitError: string | null;
  missingSteps: string[];
  onComplete: () => void;
  onOrderMore: () => void;
}) {
  const completeDisabled = !canComplete || submitting;

  const infoRows = (
    [
      ["Name", activeCustomer?.customerName],
      ["Address", activeCustomer?.address],
      ["Store", activeCustomer?.storeName],
      ["Phone", activeCustomer?.contactNumber],
      ["Email", activeCustomer?.email],
    ] as [string, string | undefined][]
  ).filter((r): r is [string, string] => !!r[1]);

  return (
    <>
      <div className="rounded-2xl border border-[#e8e8e8] bg-white p-5">
        <p className="mb-4 text-[15px] font-bold text-[#1a1a1a]">🛒 Order Summary</p>

        {cartItems.length === 0 ? (
          <p className="py-5 text-center text-[13px] text-[#aaa]">
            No items in cart.
          </p>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between border-b border-[#f5f5f5] py-2.5"
            >
              <div>
                <p className="text-[13px] font-medium text-[#1a1a1a]">
                  {item.productName}
                </p>
                <p className="text-[11px] text-[#aaa]">
                  x{item.qty} × {money(item.finalPrice)}
                </p>
              </div>
              <p className="text-[13px] font-semibold text-[#1a3c2e]">
                {money(item.finalPrice * item.qty)}
              </p>
            </div>
          ))
        )}

        <div className="mt-3 flex justify-between border-t border-[#f0f0f0] pt-2.5">
          <span className="text-[13px] text-[#888]">Sub Total</span>
          <span className="text-[13px] text-[#1a1a1a]">{money(subtotal)}</span>
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="text-[13px] text-[#888]">VAT (12%)</span>
          <span className="text-[13px] text-[#1a1a1a]">{money(vat)}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#f0f0f0] pt-2.5">
          <span className="text-lg font-bold text-[#1a1a1a]">Total</span>
          <span className="text-[28px] font-extrabold text-[#1a3c2e]">
            {money(total)}
          </span>
        </div>

        {/* ── Actions ── */}
        <div className="mt-[18px] flex flex-col gap-2.5">
          {/* Server error (out of stock, GCash ref already used, etc.) */}
          {submitError && (
            <div className="rounded-[10px] border border-[#ef9a9a] bg-[#ffebee] px-3 py-2.5 text-xs leading-normal text-[#c62828]">
              ⚠️ {submitError}
            </div>
          )}

          <button
            onClick={onComplete}
            disabled={completeDisabled}
            className={`flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border-none text-sm font-bold text-white transition-all duration-150 ${
              completeDisabled
                ? "cursor-not-allowed bg-[#d9d9d9]"
                : "cursor-pointer bg-gradient-to-br from-[#1a3c2e] to-[#2d7a3a] shadow-[0_8px_20px_rgba(26,60,46,0.28)]"
            }`}
          >
            {submitting ? (
              "Placing order…"
            ) : (
              <>
                Place Order
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>

          <button
            onClick={onOrderMore}
            disabled={submitting}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#d6e4da] bg-[#f6fbf7] text-[13px] font-semibold text-[#1a3c2e] transition-all duration-150 ${
              submitting ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Order More
          </button>

          {/* What's still needed before the order can be placed */}
          {!canComplete && missingSteps.length > 0 && (
            <div className="rounded-[10px] border border-[#ffe082] bg-[#fff8e1] px-3 py-2.5">
              <p className="mb-1 text-[11px] font-bold text-[#8d6e00]">
                Before you can place the order:
              </p>
              {missingSteps.map((step) => (
                <p key={step} className="text-[11px] leading-normal text-[#8d6e00]">
                  • {step}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {infoRows.length > 0 && (
        <div className="rounded-2xl border border-[#e8e8e8] bg-white p-5">
          <p className="mb-3 text-[13px] font-bold text-[#1a1a1a]">👤 Customer Info</p>
          {infoRows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between border-b border-[#f5f5f5] py-[7px]"
            >
              <span className="text-xs text-[#aaa]">{label}</span>
              <span className="max-w-[60%] break-words text-right text-xs font-semibold text-[#333]">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}