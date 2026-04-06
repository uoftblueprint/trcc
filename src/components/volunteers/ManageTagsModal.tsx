"use client";

import React, { useEffect } from "react";
import { Tags, X } from "lucide-react";
import { ManageTagsContent } from "@/components/settings/ManageTagsContent";
import type { CustomColumnRow } from "@/lib/api/customColumns";
import type { CohortRow, RoleRow } from "./types";

interface ManageTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: RoleRow[];
  cohorts: CohortRow[];
  onRefresh: () => void;
  customColumns?: CustomColumnRow[];
}

export function ManageTagsModal({
  isOpen,
  onClose,
  roles,
  cohorts,
  onRefresh,
  customColumns = [],
}: ManageTagsModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return (): void => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 pointer-events-none sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-tags-modal-title"
          aria-describedby="manage-tags-modal-desc"
          className="bg-white rounded-2xl shadow-2xl shadow-purple-950/10 ring-1 ring-gray-200/80 w-full max-w-4xl max-h-[min(92vh,52rem)] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="relative shrink-0 px-5 pt-6 pb-5 sm:px-6 border-b border-purple-100/90 bg-linear-to-r from-purple-50/95 via-white to-white">
            <div className="flex items-start gap-4 pr-12">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-purple text-white shadow-md shadow-purple-900/15">
                <Tags className="h-6 w-6" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2
                  id="manage-tags-modal-title"
                  className="text-lg font-semibold text-gray-900 tracking-tight"
                >
                  Volunteer tags
                </h2>
                <p
                  id="manage-tags-modal-desc"
                  className="text-sm text-gray-600 mt-1.5 leading-relaxed max-w-xl"
                >
                  Edit role names, cohort terms, and custom tag column options
                  used in filters, imports, and the spreadsheet editor.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-xl p-2 text-gray-500 hover:bg-white/80 hover:text-gray-800 transition-colors ring-1 ring-transparent hover:ring-gray-200/80"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 bg-linear-to-b from-gray-50/90 to-white">
            <ManageTagsContent
              initialRoles={roles}
              initialCohorts={cohorts}
              initialCustomTagColumns={customColumns}
              loadError={null}
              onRefresh={onRefresh}
              embedded
              defaultCollapsed
            />
          </div>
        </div>
      </div>
    </>
  );
}
