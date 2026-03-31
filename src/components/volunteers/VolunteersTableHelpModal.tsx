"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import {
  getHelpVariant,
  getHelpStorageKey,
  getHelpTitleAndIntro,
  type HelpVariant,
  VolunteersHelpContent,
} from "./volunteersHelpContent";

type VolunteersTableHelpModalProps = {
  role: string | null;
};

export function VolunteersTableHelpModal({
  role,
}: VolunteersTableHelpModalProps): React.JSX.Element | null {
  const variant = useMemo((): HelpVariant => getHelpVariant(role), [role]);
  const key = useMemo((): string => getHelpStorageKey(variant), [variant]);

  const [open, setOpen] = useState(false);
  const [neverAgain, setNeverAgain] = useState(false);

  useEffect((): void => {
    try {
      if (localStorage.getItem(key) !== "1") {
        setOpen(true);
      } else {
        setOpen(false);
      }
    } catch {
      setOpen(true);
    }
  }, [key]);

  const handleDismiss = useCallback(() => {
    if (neverAgain) {
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }, [neverAgain, key]);

  useEffect((): void | (() => void) => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return (): void => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, handleDismiss]);

  const titleAndIntro = useMemo(
    (): { title: string; intro: string } => getHelpTitleAndIntro(variant),
    [variant]
  );

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-100"
        onClick={handleDismiss}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="volunteers-help-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-101 w-full max-w-lg max-h-[min(90vh,36rem)] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 shrink-0">
            <BookOpen className="w-5 h-5 text-purple-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="volunteers-help-title"
              className="text-lg font-semibold text-gray-900"
            >
              {titleAndIntro.title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{titleAndIntro.intro}</p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <VolunteersHelpContent variant={variant} />
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={neverAgain}
              onChange={(e) => setNeverAgain(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            Don&apos;t show this again
          </label>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Got it
          </button>
          <Link
            href="/volunteers/instructions"
            className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Full instructions
          </Link>
        </div>
      </div>
    </>
  );
}
