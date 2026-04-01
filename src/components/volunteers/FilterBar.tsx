import React, { useCallback, useEffect, useState } from "react";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import {
  ChevronDown,
  Plus,
  ArrowUpDown,
  X,
  ShieldCheck,
  AlertTriangle,
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
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAlignRight, setNewAlignRight] = useState(false);
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
    if (editingIndex === index) {
      setEditingIndex(null);
      return;
    }
    setEditAlignRight(filterModalAlignRight(e.currentTarget as HTMLElement));
    setEditingIndex(index);
  };

  const handleApplyEdit = (
    index: number,
    newFilter: FilterTuple | null
  ): void => {
    setEditingIndex(null);
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
    if (isAddingNew) {
      setIsAddingNew(false);
      return;
    }
    setNewAlignRight(filterModalAlignRight(e.currentTarget as HTMLElement));
    setIsAddingNew(true);
  };

  const handleApplyNew = (newFilter: FilterTuple | null): void => {
    setIsAddingNew(false);
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
    <div className="flex flex-wrap items-center gap-2 py-2 relative">
      {sorting.length > 0 && (
        <>
          <div className={clsx("relative", isSortModalOpen ? "z-50" : "z-10")}>
            <button
              onClick={(e) => {
                setSortAlignRight(
                  filterModalAlignRight(e.currentTarget as HTMLElement)
                );
                setIsSortModalOpen(!isSortModalOpen);
              }}
              className="bg-primary-purple text-accent-purple hover:bg-secondary-purple rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sorting.length} Sort{sorting.length !== 1 && "s"}
            </button>

            <SortModal
              isOpen={isSortModalOpen}
              onClose={() => setIsSortModalOpen(false)}
              sorting={sorting}
              setSorting={setSorting}
              alignRight={sortAlignRight}
            />
          </div>
          <div className="w-px h-5 bg-gray-300 mx-1" />
        </>
      )}

      {filters.length > 1 && (
        <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-2 text-gray-800 relative z-10">
          Matches
          <select
            className="bg-transparent outline-none cursor-pointer"
            value={globalOp}
            onChange={(e) => setGlobalOp(e.target.value as "AND" | "OR")}
          >
            <option value="AND">All</option>
            <option value="OR">Any</option>
          </select>
        </div>
      )}

      {/* Filters List */}
      {filters.map((filter, index) => {
        const colDef = FILTERABLE_COLUMNS.find((c) => c.id === filter.field);
        const isCurrentlyEditing = editingIndex === index;
        const Icon = colDef?.icon;
        const isDefault = isDefaultFilter(filter);

        return (
          <div
            key={`${filter.field}-${filter.miniOp}-${filter.values.join("¦")}-${index}`}
            className={clsx(
              "relative group/filter",
              isCurrentlyEditing ? "z-50" : "z-10"
            )}
          >
            <button
              onClick={(e) => handleEditClick(e, index)}
              className={clsx(
                "rounded-lg px-2 py-1.5 text-sm font-medium flex items-center gap-0 group-hover/filter:gap-2 group-hover/filter:px-3 transition-all duration-200 cursor-pointer",
                isDefault
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-purple-200 text-gray-900 hover:bg-purple-300"
              )}
            >
              {isDefault ? (
                <ShieldCheck className="w-3.5 h-3.5 opacity-70 shrink-0" />
              ) : (
                Icon && <Icon className="w-3.5 h-3.5 opacity-70 shrink-0" />
              )}
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/filter:max-w-40 group-hover/filter:opacity-100 transition-all duration-200">
                {isDefault ? "Opt-in (default)" : colDef?.label}
              </span>
              <ChevronDown className="w-3 h-3 shrink-0 max-w-0 overflow-hidden opacity-0 group-hover/filter:max-w-4 group-hover/filter:opacity-100 transition-all duration-200" />
            </button>

            <FilterModal
              isOpen={isCurrentlyEditing}
              onClose={() => setEditingIndex(null)}
              onApply={(f) => handleApplyEdit(index, f)}
              initialFilter={filter}
              optionsData={optionsData}
              alignRight={editAlignRight}
            />
          </div>
        );
      })}

      {/* New Filter Button */}
      <div className={clsx("relative", isAddingNew ? "z-50" : "z-10")}>
        <button
          onClick={handleAddNewClick}
          className="bg-purple-200 hover:bg-purple-300 text-gray-900 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Filter
        </button>

        <FilterModal
          isOpen={isAddingNew}
          onClose={() => setIsAddingNew(false)}
          onApply={handleApplyNew}
          optionsData={optionsData}
          alignRight={newAlignRight}
        />
      </div>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      <button
        onClick={() => {
          setFilters([DEFAULT_OPT_IN_FILTER]);
          setSorting([]);
          setEditingIndex(null);
          setIsAddingNew(false);
          setIsSortModalOpen(false);
        }}
        className="text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
        Reset all
      </button>

      <OptInWarningDialog
        variant={pendingWarning?.variant ?? null}
        onConfirm={confirmWarning}
        onCancel={cancelWarning}
      />
    </div>
  );
};
