"use client";

import React from "react";
import clsx from "clsx";
import { CheckCircle2, XCircle } from "lucide-react";

export type ColumnChangeLogEntry = {
  description: string;
  success: boolean;
  error?: string;
};

interface ColumnChangeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ColumnChangeLogEntry[];
}

export const ColumnChangeLogModal = ({
  isOpen,
  onClose,
  entries,
}: ColumnChangeLogModalProps): React.JSX.Element | null => {
  if (!isOpen) return null;

  const ok = entries.filter((e) => e.success).length;
  const total = entries.length;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="column-change-log-title"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col max-h-[min(80vh,520px)]">
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <h2
            id="column-change-log-title"
            className="text-lg font-semibold text-gray-900"
          >
            Column changes
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {ok} of {total} operation{total === 1 ? "" : "s"} succeeded
          </p>
        </div>
        <ul className="overflow-y-auto flex-1 px-3 py-2 space-y-2 min-h-0">
          {entries.map((e, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm"
            >
              {e.success ? (
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-green-600 mt-0.5"
                  aria-hidden
                />
              ) : (
                <XCircle
                  className="h-5 w-5 shrink-0 text-red-600 mt-0.5"
                  aria-hidden
                />
              )}
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{e.description}</p>
                {!e.success && e.error && (
                  <p className="text-red-700 text-xs mt-1 break-words">
                    {e.error}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-gray-100 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium",
              "bg-purple-600 text-white hover:bg-purple-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
