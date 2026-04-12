"use client";

// ✅ Drop this file into your components folder: components/AlertModal.tsx
// Use this instead of alert() and confirm() everywhere

type AlertModalProps = {
  open: boolean;
  type?: "alert" | "confirm";
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  danger?: boolean;
};

export default function AlertModal({
  open,
  type = "alert",
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
}: AlertModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[999] px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
        {/* Icon */}
        <p className="text-3xl mb-3">
          {danger ? "⚠️" : type === "confirm" ? "🤔" : "ℹ️"}
        </p>
        {title && <h2 className="text-base font-bold text-gray-800 mb-1">{title}</h2>}
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">{message}</p>
        <div className={`flex gap-3 ${type === "alert" ? "justify-center" : ""}`}>
          {type === "confirm" && onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${
              danger ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}