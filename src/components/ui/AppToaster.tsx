"use client";

import { Toaster } from "react-hot-toast";

export function AppToaster(): React.JSX.Element {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
        },
      }}
    />
  );
}
