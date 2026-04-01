"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const QUERY_KEY = "already_logged_in";

const TOAST_ID = "already-logged-in-redirect";

/**
 * Shows a toast when middleware redirects from /login with ?already_logged_in=1,
 * then removes the query param from the URL.
 */
export function AlreadyLoggedInNotice(): null {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get(QUERY_KEY) !== "1") return;

    toast("You are already logged in.", { id: TOAST_ID, icon: "ℹ️" });

    const next = new URLSearchParams(searchParams.toString());
    next.delete(QUERY_KEY);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
