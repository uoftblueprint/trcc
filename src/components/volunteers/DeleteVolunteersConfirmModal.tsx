"use client";

import React, { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

type VolunteerToDelete = {
  id: number;
  name: string;
};

type DeleteVolunteersConfirmModalProps = {
  isOpen: boolean;
  volunteers: VolunteerToDelete[];
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteVolunteersConfirmModal({
  isOpen,
  volunteers,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteVolunteersConfirmModalProps): React.JSX.Element | null {
  useEffect((): void | (() => void) => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !isDeleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return (): void => {
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || volunteers.length === 0) return null;

  const count = volunteers.length;
  const title =
    count === 1 ? "Remove this volunteer?" : `Remove ${count} volunteers?`;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-100"
        onClick={isDeleting ? undefined : onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-volunteers-title"
        aria-describedby="delete-volunteers-desc"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-101 w-full max-w-lg max-h-[min(85vh,32rem)] bg-white rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-0">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <h2
                id="delete-volunteers-title"
                className="text-base font-semibold text-gray-900"
              >
                {title}
              </h2>
              <p
                id="delete-volunteers-desc"
                className="mt-1 text-sm text-gray-600 leading-relaxed"
              >
                This cannot be undone. The volunteer
                {count !== 1 && "s"} will be permanently removed from the
                database.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 mt-4 border-t border-gray-100 pt-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {count === 1 ? "Volunteer" : `Selected (${count})`}
          </p>
          <ul className="text-sm text-gray-800 space-y-1.5 list-disc pl-5">
            {volunteers.map((v) => (
              <li key={v.id} className="wrap-break-word">
                {v.name || `Volunteer #${v.id}`}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 pt-4 mt-auto flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </>
  );
}
