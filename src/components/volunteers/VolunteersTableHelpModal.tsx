"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, X } from "lucide-react";

type HelpVariant = "admin" | "staff" | "viewer";

function helpVariant(role: string | null): HelpVariant {
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  return "viewer";
}

function storageKey(variant: HelpVariant): string {
  return `trcc_volunteers_table_help_dismissed_${variant}`;
}

const Kbd = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <kbd className="px-1 py-0.5 rounded bg-gray-100 text-xs font-mono">
    {children}
  </kbd>
);

function SharedSelectingCopyingFilters(): React.JSX.Element {
  return (
    <>
      <section>
        <h3 className="font-semibold text-gray-900 mb-1.5">Selecting cells</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Click and drag to select a rectangle of cells (like a spreadsheet).
          </li>
          <li>
            Hold <Kbd>Shift</Kbd> and click another cell to extend the
            selection.
          </li>
          <li>
            Hold <Kbd>⌘</Kbd> (Mac) or <Kbd>Ctrl</Kbd> (Windows) and click to
            add or remove cells from the selection.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-1.5">Copying</h3>
        <p>
          With cells selected, press <Kbd>⌘C</Kbd> or <Kbd>Ctrl+C</Kbd> to copy
          values as tab-separated text—handy for emails or pasting into a sheet.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900 mb-1.5">
          Filters & privacy
        </h3>
        <p>
          Use <strong>Filter</strong> and <strong>Sort</strong> above the table.
          The default opt-in filter limits who appears until you change it—check
          warnings before removing it.
        </p>
      </section>
    </>
  );
}

type VolunteersTableHelpModalProps = {
  role: string | null;
};

export function VolunteersTableHelpModal({
  role,
}: VolunteersTableHelpModalProps): React.JSX.Element | null {
  const variant = useMemo((): HelpVariant => helpVariant(role), [role]);
  const key = useMemo((): string => storageKey(variant), [variant]);

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

  const titleAndIntro = useMemo((): { title: string; intro: string } => {
    if (variant === "admin") {
      return {
        title: "Using the volunteers table (admin)",
        intro:
          "You can edit data, import, and manage volunteers. Here’s how selection and editing work.",
      };
    }
    if (variant === "staff") {
      return {
        title: "Using the volunteers table (staff)",
        intro:
          "You can browse and copy data. Editing is limited to admins—your view is read-only.",
      };
    }
    return {
      title: "Using the volunteers table",
      intro:
        "Browse and filter volunteer information. Contact an admin if you need changes to the data.",
    };
  }, [variant]);

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

        <div className="px-5 py-4 overflow-y-auto text-sm text-gray-700 space-y-4 leading-relaxed">
          <SharedSelectingCopyingFilters />

          {variant === "admin" && (
            <>
              <section>
                <h3 className="font-semibold text-gray-900 mb-1.5">Editing</h3>
                <p>
                  A single click only selects a cell. To edit:{" "}
                  <strong>double-click</strong> the cell, or select it and press{" "}
                  <Kbd>Enter</Kbd> or <Kbd>F2</Kbd>. Use{" "}
                  <strong>Save Changes</strong> when you’re done; undo/redo is
                  in the toolbar (<Kbd>⌘Z</Kbd> / <Kbd>Ctrl+Z</Kbd>).
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-gray-900 mb-1.5">
                  Admin tools
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>New Volunteer</strong> and{" "}
                    <strong>Import from CSV</strong> add rows to the table.
                  </li>
                  <li>
                    Select rows with the checkboxes, then{" "}
                    <strong>Delete</strong> to remove volunteers (you’ll confirm
                    in a dialog).
                  </li>
                  <li>
                    New tags (roles, cohorts) can be typed in the cell editor;
                    save to persist them.
                  </li>
                </ul>
              </section>
            </>
          )}

          {(variant === "staff" || variant === "viewer") && (
            <section>
              <h3 className="font-semibold text-gray-900 mb-1.5">View only</h3>
              <p>
                {variant === "staff"
                  ? "As staff, you can search, filter, sort, and copy from the table, but you cannot change volunteer data here. Ask an admin to update records."
                  : "You can search, filter, sort, and copy from the table. To update volunteer records, ask an admin."}
              </p>
            </section>
          )}
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
        </div>
      </div>
    </>
  );
}
