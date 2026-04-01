import React, { useCallback, useEffect, useState } from "react";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import {
  ChevronDown,
  Plus,
  ArrowUpDown,
  X,
  ShieldCheck,
  AlertTriangle,
  ListFilter,
} from "lucide-react";
import { SortingState } from "@tanstack/react-table";
import clsx from "clsx";
import { FILTERABLE_COLUMNS } from "./volunteerColumns";
import { FilterModal, filterModalAlignRight } from "./FilterModal";
import { SortModal } from "./SortModal";
import { DEFAULT_OPT_IN_FILTER } from "./useVolunteersData";

function isDefaultFilter(filter: FilterTuple): boolean {
  return (
    filter.field === DEFAULT_OPT_IN_FILTER.field &&
    filter.miniOp === DEFAULT_OPT_IN_FILTER.miniOp &&
    filter.values.length === DEFAULT_OPT_IN_FILTER.values.length &&
    filter.values.every((v, i) => v === DEFAULT_OPT_IN_FILTER.values[i])
  );
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
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortAlignRight, setSortAlignRight] = useState(false);
  const [pendingWarning, setPendingWarning] = useState<{
    variant: OptInWarningVariant;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    if (sorting.length === 0) {
      setIsSortModalOpen(false);
    }
  }, [sorting.length]);

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
    <div
      className="flex flex-wrap items-center gap-3 min-w-0 py-1 relative sm:flex-nowrap"
      role="toolbar"
      aria-label="Table filters and sort"
    >
      {sorting.length > 0 && (
        <>
          <div
            className={clsx(
              "relative shrink-0",
              isSortModalOpen ? "z-50" : "z-10"
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                setSortAlignRight(
                  filterModalAlignRight(e.currentTarget as HTMLElement)
                );
                setIsSortModalOpen(!isSortModalOpen);
              }}
              aria-expanded={isSortModalOpen}
              aria-haspopup="dialog"
              className={clsx(
                "h-9 inline-flex items-center gap-2 rounded-lg px-3 text-sm font-semibold shadow-sm transition-colors cursor-pointer",
                "bg-purple-700 text-white border border-purple-800/20 hover:bg-purple-800",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2"
              )}
            >
              <ArrowUpDown className="w-4 h-4 shrink-0 opacity-90" />
              <span>Sort ({sorting.length})</span>
              <ChevronDown
                className={clsx(
                  "w-4 h-4 shrink-0 opacity-80 transition-transform",
                  isSortModalOpen && "rotate-180"
                )}
              />
            </button>

            <SortModal
              isOpen={isSortModalOpen}
              onClose={() => setIsSortModalOpen(false)}
              sorting={sorting}
              setSorting={setSorting}
              alignRight={sortAlignRight}
            />
          </div>
          <div
            className="hidden sm:block w-px h-7 bg-linear-to-b from-transparent via-gray-200 to-transparent shrink-0"
            aria-hidden
          />
        </>
      )}

      {filters.length > 1 && (
        <div
          className="flex flex-col gap-0.5 shrink-0 sm:flex-row sm:items-center sm:gap-2"
          role="group"
          aria-label="How rows are matched to filters"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
            Match
          </span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              title="Show only rows that match every active filter"
              aria-pressed={globalOp === "AND"}
              onClick={() => setGlobalOp("AND")}
              className={clsx(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-1",
                globalOp === "AND"
                  ? "bg-purple-100 text-purple-900 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              All filters
            </button>
            <button
              type="button"
              title="Show rows that match at least one active filter"
              aria-pressed={globalOp === "OR"}
              onClick={() => setGlobalOp("OR")}
              className={clsx(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-1",
                globalOp === "OR"
                  ? "bg-purple-100 text-purple-900 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Any filter
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-stretch gap-2 basis-full sm:basis-auto">
        <div
          className={clsx(
            "flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain rounded-xl border px-2 py-1.5",
            "border-purple-100 bg-linear-to-r from-purple-50/90 to-gray-50/80",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          )}
          aria-label="Active filters"
        >
          <ListFilter
            className="w-4 h-4 shrink-0 text-purple-500 opacity-80 hidden sm:block"
            aria-hidden
          />
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
                    "h-8 rounded-lg px-2.5 text-sm font-medium flex items-center gap-2 border shadow-sm transition-all cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2",
                    isCurrentlyEditing &&
                      "ring-2 ring-purple-500 ring-offset-1",
                    isDefault
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100"
                      : "bg-white text-gray-900 border-purple-200/80 hover:border-purple-300 hover:bg-purple-50/80"
                  )}
                >
                  {isDefault ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    Icon && (
                      <Icon className="w-3.5 h-3.5 text-purple-600 shrink-0 opacity-90" />
                    )
                  )}
                  <span className="whitespace-nowrap max-w-48 sm:max-w-64 truncate">
                    {isDefault ? "Opt-in (default)" : colDef?.label}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-500" />
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
        </div>

        <div
          className={clsx(
            "relative shrink-0 self-center",
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
              "h-9 inline-flex items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all cursor-pointer",
              "border-2 border-dashed border-purple-300 bg-white text-purple-800",
              "hover:border-purple-500 hover:bg-purple-50 hover:text-purple-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2",
              isAddingNew &&
                "border-solid border-purple-500 bg-purple-50 shadow-sm"
            )}
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            Add filter
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
      </div>

      <div className="flex shrink-0 items-center gap-2 self-center">
        <div
          className="hidden sm:block w-px h-7 bg-linear-to-b from-transparent via-gray-200 to-transparent"
          aria-hidden
        />
        <button
          type="button"
          onClick={() => {
            setFilters([DEFAULT_OPT_IN_FILTER]);
            setSorting([]);
            setEditingIndex(null);
            setEditAnchorRect(null);
            setIsAddingNew(false);
            setNewAnchorRect(null);
            setIsSortModalOpen(false);
          }}
          title="Restore default filter and clear custom sort"
          className={clsx(
            "h-9 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium",
            "text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2"
          )}
        >
          <X className="w-4 h-4 shrink-0" />
          Clear & reset
        </button>
      </div>

      <OptInWarningDialog
        variant={pendingWarning?.variant ?? null}
        onConfirm={confirmWarning}
        onCancel={cancelWarning}
      />
    </div>
  );
};
