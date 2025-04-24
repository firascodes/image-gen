"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast } from "./toast";

interface ToastContextProps {
  showToast: (message: string, options?: { variant?: "default" | "error"; position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" }) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<"default" | "error">("default");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");

  const showToast = useCallback((msg: string, options?: { variant?: "default" | "error"; position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" }) => {
    setMessage(msg);
    setVariant(options?.variant || "default");
    setPosition(options?.position || "bottom-right");
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={message}
        open={open}
        onClose={handleClose}
        variant={variant}
        position={position}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
