// ✅ Drop this file at: hooks/useAppModal.ts
// Use this hook in every page to replace alert() and confirm()
// Usage:
//   const { modal, showAlert, showConfirm } = useAppModal();
//   ...
//   <AlertModal {...modal} />

import { useState } from "react";

type ModalState = {
  open: boolean;
  type?: "alert" | "confirm";
  title?: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

const defaultState: ModalState = {
  open: false,
  message: "",
  onConfirm: () => {},
};

export function useAppModal() {
  const [modal, setModal] = useState<ModalState>(defaultState);

  const close = () => setModal((m) => ({ ...m, open: false }));

  // ✅ Replaces alert("message")
  const showAlert = (message: string, title?: string) => {
    setModal({
      open: true,
      type: "alert",
      title,
      message,
      onConfirm: close,
    });
  };

  // ✅ Replaces confirm("message") — pass callback for what to do on OK
  const showConfirm = (
    message: string,
    onConfirm: () => void,
    options?: { title?: string; danger?: boolean; confirmLabel?: string; cancelLabel?: string }
  ) => {
    setModal({
      open: true,
      type: "confirm",
      title: options?.title,
      message,
      danger: options?.danger,
      confirmLabel: options?.confirmLabel || "OK",
      cancelLabel: options?.cancelLabel || "Cancel",
      onConfirm: () => { close(); onConfirm(); },
      onCancel: close,
    });
  };

  return { modal, showAlert, showConfirm };
}