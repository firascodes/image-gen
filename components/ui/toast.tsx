"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/components/lib/utils";

const toastVariants = cva(
  "fixed z-50 flex flex-col gap-2 p-4 w-96 max-w-full pointer-events-none",
  {
    variants: {
      position: {
        "bottom-right": "bottom-4 right-4 items-end",
        "bottom-left": "bottom-4 left-4 items-start",
        "top-right": "top-4 right-4 items-end",
        "top-left": "top-4 left-4 items-start",
      },
    },
    defaultVariants: {
      position: "bottom-right",
    },
  }
);

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  open: boolean;
  onClose: () => void;
  variant?: "default" | "error";
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export function Toast({
  message,
  open,
  onClose,
  variant = "default",
  position = "bottom-right",
  className,
  ...props
}: ToastProps) {
  React.useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(onClose, 4000);
    return () => clearTimeout(timeout);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        toastVariants({ position }),
        "pointer-events-auto",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "rounded-lg shadow-lg px-4 py-3 text-sm font-medium",
          variant === "error"
            ? "bg-red-600 text-white"
            : "bg-gray-900 text-white"
        )}
        role="alert"
      >
        {message}
      </div>
    </div>
  );
}
