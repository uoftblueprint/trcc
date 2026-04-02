import React, { useCallback, useEffect, useState } from "react";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import { ChevronDown, Plus, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { SortingState } from "@tanstack/react-table";
import clsx from "clsx";
import { FILTERABLE_COLUMNS } from "./volunteerColumns";
import { FilterModal, filterModalAlignRight } from "./FilterModal";
import { DEFAULT_OPT_IN_FILTER } from "./useVolunteersData";

function isDefaultFilter(filter: FilterTuple): boolean {
  return (
    filter.field === DEFAULT_OPT_IN_FILTER.field &&
    filter.miniOp === DEFAULT_OPT_IN_FILTER.miniOp &&
    filter.values.length === DEFAULT_OPT_IN_FILTER.values.length &&
    filter.values.every((v, i) => v === DEFAULT_OPT_IN_FILTER.values[i])
  );
}

function columnFilterCount(filters: FilterTuple[]): number {
  return filters.filter((f) => f.field !== DEFAULT_OPT_IN_FILTER.field).length;
}

type OptInWarningVariant = "remove" | "include-no";

const VARIANT_CONTENT: Record<
  OptInWarningVariant,
  { title: string; description: string; confirmLabel: string }
> = {
  remove: {
    title: "Remove the Opt-in Communication filter?",
    description:
      "If removed, you will be viewing and could accidentally copy contact information from someone who doesn\u2019t want to be contacted.",
    confirmLabel: "Remove filter",
  },
  "include-no": {
    title: "Show opted-out volunteers?",
    description:
      "You are about to include volunteers who opted out of communication. You could accidentally copy or use their contact information.",
    confirmLabel: "Show opted-out",
  },
};

function OptInWarningDialog({
  variant,
  onConfirm,
  onCancel,
}: {
  variant: OptInWarningVariant | null;
  onConfirm: () => void;
  onCancel: () => void;
}): React.JSX.Element | null {
  useEffect((): void | (() => void) => {
    if (!variant) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return (): void => {
      window.removeEventListener("keydown", onKey);
    };
  }, [variant, onCancel]);

  if (!variant) return null;

  const { title, description, confirmLabel } = VARIANT_CONTENT[variant];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-100" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-optin-title"
        aria-describedby="confirm-optin-desc"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-101 w-full max-w-md bg-white rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2
              id="confirm-optin-title"
              className="text-base font-semibold text-gray-900"
            >
              {title}
            </h2>
            <p
              id="confirm-optin-desc"
              className="mt-1 text-sm text-gray-600 leading-relaxed"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

interface FilterBarProps {
  filters: FilterTuple[];
  setFilters: React.Dispatch<React.SetStateAction<FilterTuple[]>>;
  globalOp: "AND" | "OR";
  setGlobalOp: (op: "AND" | "OR") => void;
  optionsData: Record<string, string[]>;
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
}

export const FilterBar = ({
  filters,
  setFilters,
  globalOp,
  setGlobalOp,
  optionsData,
  sorting,
  setSorting,
}: FilterBarProps): React.JSX.Element | null => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAlignRight, setEditAlignRight] = useState(false);
  const [editAnchorRect, setEditAnchorRect] = useState<DOMRectReadOnly | null>(
    null
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAlignRight, setNewAlignRight] = useState(false);
  const [newAnchorRect, setNewAnchorRect] = useState<DOMRectReadOnly | null>(
    null
  );
  const [pendingWarning, setPendingWarning] = useState<{
    variant: OptInWarningVariant;
    action: () => void;
  } | null>(null);

  const confirmWarning = useCallback(() => {
    pendingWarning?.action();
    setPendingWarning(null);
  }, [pendingWarning]);

  const cancelWarning = useCallback(() => {
    setPendingWarning(null);
  }, []);

  if (filters.length === 0 && sorting.length === 0) return null;

  const handleEditClick = (e: React.MouseEvent, index: number): void => {
    setIsAddingNew(false);
    setNewAnchorRect(null);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditAnchorRect(null);
      return;
    }
    setEditAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
    setEditAlignRight(filterModalAlignRight(e.currentTarget as HTMLElement));
    setEditingIndex(index);
  };

  const handleApplyEdit = (
    index: number,
    newFilter: FilterTuple | null
  ): void => {
    setEditingIndex(null);
    setEditAnchorRect(null);
    if (newFilter === null) {
      const existing = filters[index];
      if (existing && isDefaultFilter(existing)) {
        setPendingWarning({
          variant: "remove",
          action: () =>
            setFilters((prev) => prev.filter((_, i) => i !== index)),
        });
        return;
      }
      setFilters((prev) => prev.filter((_, i) => i !== index));
    } else {
      const existing = filters[index];
      const wasDefault = existing && isDefaultFilter(existing);
      const includesNo =
        newFilter.field === "opt_in_communication" &&
        (newFilter.values as string[]).includes("No");

      if (
        (wasDefault || newFilter.field === "opt_in_communication") &&
        includesNo
      ) {
        setPendingWarning({
          variant: "include-no",
          action: () =>
            setFilters((prev) =>
              prev.map((f, i) => (i === index ? newFilter : f))
            ),
        });
        return;
      }
      setFilters((prev) => prev.map((f, i) => (i === index ? newFilter : f)));
    }
  };

  const handleAddNewClick = (e: React.MouseEvent): void => {
    setEditingIndex(null);
    setEditAnchorRect(null);
    if (isAddingNew) {
      setIsAddingNew(false);
      setNewAnchorRect(null);
      return;
    }
    setNewAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
    setNewAlignRight(filterModalAlignRight(e.currentTarget as HTMLElement));
    setIsAddingNew(true);
  };

  const handleApplyNew = (newFilter: FilterTuple | null): void => {
    setIsAddingNew(false);
    setNewAnchorRect(null);
    if (!newFilter) return;

    const includesNo =
      newFilter.field === "opt_in_communication" &&
      (newFilter.values as string[]).includes("No");

    if (includesNo) {
      setPendingWarning({
        variant: "include-no",
        action: () => setFilters((prev) => [...prev, newFilter]),
      });
      return;
    }
    setFilters((prev) => [...prev, newFilter]);
  };

  return (
    <div className="relative min-w-0" role="toolbar" aria-label="Table filters">
      <div className="flex min-w-0 flex-nowrap items-stretch gap-2 py-0.5 sm:gap-3">
        {columnFilterCount(filters) > 1 && (
          <div
            className="flex shrink-0 items-center gap-2 ml-1 sm:gap-2.5"
            role="group"
            aria-labelledby="volunteers-filter-match-label"
          >
            <span
              id="volunteers-filter-match-label"
              className="shrink-0 self-center whitespace-nowrap text-sm font-medium text-gray-600"
            >
              Match
            </span>
            <div className="inline-flex h-9 items-stretch rounded-lg bg-gray-100 p-1 ring-1 ring-inset ring-gray-200/80">
              <button
                type="button"
                title="Every column filter must match. Opt-in communication (when present) always applies in addition."
                aria-pressed={globalOp === "AND"}
                onClick={() => setGlobalOp("AND")}
                className={clsx(
                  "inline-flex min-h-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-150 sm:px-3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100",
                  globalOp === "AND"
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/90"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <span className="whitespace-nowrap">All</span>
              </button>
              <button
                type="button"
                title="At least one column filter must match. Opt-in communication (when present) always applies in addition."
                aria-pressed={globalOp === "OR"}
                onClick={() => setGlobalOp("OR")}
                className={clsx(
                  "inline-flex min-h-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-150 sm:px-3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100",
                  globalOp === "OR"
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/90"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <span className="whitespace-nowrap">Any</span>
              </button>
            </div>
          </div>
        )}
        <span
          id="volunteers-filtered-by-label"
          className="shrink-0 self-center whitespace-nowrap text-sm ml-1 font-medium text-gray-600"
        >
          Filtered by:{" "}
        </span>

        <div
          className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible scroll-smooth [-ms-overflow-style:none] [scrollbar-width:thin] sm:gap-3"
          aria-label="Active filters and actions"
        >
          {filters.map((filter, index) => {
            const colDef = FILTERABLE_COLUMNS.find(
              (c) => c.id === filter.field
            );
            const isCurrentlyEditing = editingIndex === index;
            const Icon = colDef?.icon;
            const isDefault = isDefaultFilter(filter);

            return (
              <div
                key={`${filter.field}-${filter.miniOp}-${filter.values.join("¦")}-${index}`}
                className={clsx(
                  "relative shrink-0",
                  isCurrentlyEditing ? "z-50" : "z-10"
                )}
              >
                <button
                  type="button"
                  onClick={(e) => handleEditClick(e, index)}
                  aria-expanded={isCurrentlyEditing}
                  aria-haspopup="dialog"
                  title={
                    isDefault
                      ? "Default privacy filter — click to edit or remove"
                      : `Filter by ${colDef?.label ?? filter.field} — click to edit`
                  }
                  className={clsx(
                    "flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-sm font-medium transition-colors",
                    "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1",
                    isDefault
                      ? "border-emerald-200/90 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                      : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-white"
                  )}
                >
                  {isDefault ? (
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                  ) : (
                    Icon && (
                      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                    )
                  )}
                  <span className="max-w-48 truncate whitespace-nowrap sm:max-w-64">
                    {isDefault ? "Opt-in (default)" : colDef?.label}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                </button>

                <FilterModal
                  isOpen={isCurrentlyEditing}
                  onClose={() => {
                    setEditingIndex(null);
                    setEditAnchorRect(null);
                  }}
                  onApply={(f) => handleApplyEdit(index, f)}
                  initialFilter={filter}
                  optionsData={optionsData}
                  alignRight={editAlignRight}
                  anchorRect={isCurrentlyEditing ? editAnchorRect : null}
                />
              </div>
            );
          })}

          <div
            className="sticky right-0 z-20 flex shrink-0 flex-nowrap items-center gap-2 border-l border-gray-200 bg-white py-0.5 pl-2 shadow-[-10px_0_14px_-6px_rgba(0,0,0,0.06)] sm:gap-3 sm:pl-3"
            aria-label="Filter actions"
          >
            <div
              className={clsx(
                "relative shrink-0",
                isAddingNew ? "z-50" : "z-10"
              )}
            >
              <button
                type="button"
                onClick={handleAddNewClick}
                aria-expanded={isAddingNew}
                aria-haspopup="dialog"
                title="Add another filter"
                className={clsx(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-purple-100 px-3 text-sm font-medium text-purple-700 transition-colors",
                  "hover:bg-purple-200/80",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2",
                  isAddingNew &&
                    "bg-purple-200/90 ring-2 ring-purple-400 ring-offset-1"
                )}
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                New Filter
              </button>

              <FilterModal
                isOpen={isAddingNew}
                onClose={() => {
                  setIsAddingNew(false);
                  setNewAnchorRect(null);
                }}
                onApply={handleApplyNew}
                optionsData={optionsData}
                alignRight={newAlignRight}
                anchorRect={isAddingNew ? newAnchorRect : null}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setFilters([DEFAULT_OPT_IN_FILTER]);
                setSorting([]);
                setEditingIndex(null);
                setEditAnchorRect(null);
                setIsAddingNew(false);
                setNewAnchorRect(null);
              }}
              title="Restore default filter and clear custom sort"
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1"
            >
              <X className="h-4 w-4 shrink-0" strokeWidth={2} />
              Reset all
            </button>
          </div>
        </div>
      </div>

      <OptInWarningDialog
        variant={pendingWarning?.variant ?? null}
        onConfirm={confirmWarning}
        onCancel={cancelWarning}
      />
    </div>
  );
};
