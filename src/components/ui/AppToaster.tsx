"use client";

import type { JSX } from "react";
import { Toaster } from "react-hot-toast";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const iconClass = "h-5 w-5 shrink-0";

export function AppToaster(): JSX.Element {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
        },
        success: {
          icon: (
            <CheckCircle2
              className={`${iconClass} text-emerald-600`}
              aria-hidden
            />
          ),
        },
        error: {
          icon: (
            <AlertCircle className={`${iconClass} text-red-600`} aria-hidden />
          ),
        },
        loading: {
          icon: (
            <Loader2
              className={`${iconClass} animate-spin text-gray-600`}
              aria-hidden
            />
          ),
        },
      }}
    />
  );
}
