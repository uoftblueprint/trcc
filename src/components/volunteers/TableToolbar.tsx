import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import {
  Search,
  ListFilter,
  ArrowUpDown,
  Import,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Eye,
  X,
  Save,
  Copy,
  ChevronDown,
} from "lucide-react";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import { FilterModal, filterModalAlignRight } from "./FilterModal";
import { SortModal } from "./SortModal";
import { SortingState } from "@tanstack/react-table";
import type { CopyCellFormat } from "./copySelectedCells";

/** Icon-only by default; label expands on hover / focus-visible. */
function ExpandableToolButton({
  icon,
  children,
  className,
  forceExpanded = false,
  "aria-label": ariaLabel,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  forceExpanded?: boolean;
}): React.JSX.Element {
  const { disabled } = props;
  const expanded = forceExpanded;
  return (
    <button
      {...props}
      type="button"
      aria-label={ariaLabel}
      className={clsx(
        "group relative inline-flex items-center justify-center h-9 shrink-0 overflow-hidden rounded-lg text-sm font-medium cursor-pointer transition-[padding,gap,background-color,border-color] duration-300 ease-out motion-reduce:transition-none",
        expanded
          ? "gap-2 px-3"
          : "gap-0 px-2 hover:gap-2 hover:px-3 focus-visible:gap-2 focus-visible:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2",
        disabled && "cursor-default",
        className
      )}
    >
      <span className="inline-flex shrink-0 pointer-events-none">{icon}</span>
      <span
        className={clsx(
          "pointer-events-none overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out motion-reduce:transition-none",
          expanded
            ? "max-w-[min(100vw,18rem)] opacity-100"
            : "max-w-0 opacity-0 group-hover:max-w-[min(100vw,18rem)] group-hover:opacity-100 group-focus-visible:max-w-[min(100vw,18rem)] group-focus-visible:opacity-100"
        )}
      >
        {children}
      </span>
    </button>
  );
}

interface TableToolbarProps {
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  filters: FilterTuple[];
  setFilters: React.Dispatch<React.SetStateAction<FilterTuple[]>>;
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  filterOptions: Record<string, string[]>;
  role: string | null;
  selectedCount: number;
  isDeleting: boolean;
  onDelete: () => void;
  onOpenAddVolunteer: () => void;
  onOpenImportCSV: () => void;
  hasEdits: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  pendingChangesCount: number;
  onViewChanges: () => void;
  selectedCellCount: number;
  onCopyCells: (format: CopyCellFormat) => void | Promise<void>;
}

export const TableToolbar = ({
  globalFilter,
  setGlobalFilter,
  filters,
  setFilters,
  sorting,
  setSorting,
  filterOptions,
  role,
  selectedCount,
  isDeleting,
  onDelete,
  onOpenAddVolunteer,
  onOpenImportCSV,
  hasEdits,
  isSaving,
  onSave,
  onCancel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  pendingChangesCount,
  onViewChanges,
  selectedCellCount,
  onCopyCells,
}: TableToolbarProps): React.JSX.Element => {
  const [isMainFilterOpen, setIsMainFilterOpen] = useState(false);
  const [mainFilterAlignRight, setMainFilterAlignRight] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortModalAlignRight, setSortModalAlignRight] = useState(false);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [copyMenuAlignRight, setCopyMenuAlignRight] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCopyMenuOpen) return;
    const close = (e: MouseEvent): void => {
      if (!copyMenuRef.current?.contains(e.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return (): void => document.removeEventListener("mousedown", close);
  }, [isCopyMenuOpen]);

  const handleOpenMainFilter = (e: React.MouseEvent): void => {
    if (isMainFilterOpen) {
      setIsMainFilterOpen(false);
      return;
    }
    setMainFilterAlignRight(
      filterModalAlignRight(e.currentTarget as HTMLElement)
    );
    setIsMainFilterOpen(true);
  };

  const neutralExpandable =
    "border bg-white border-gray-300 text-gray-800 hover:border-purple-300 hover:bg-gray-50";
  const neutralActiveExpandable =
    "border bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full md:w-auto md:min-w-[20rem] md:max-w-[26rem]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-800">
          <Search className="w-4 h-4 shrink-0" />
        </div>
        <input
          type="text"
          placeholder="Search volunteers..."
          aria-label="Search volunteers"
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 hover:border-purple-300 transition-colors rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className={clsx("relative", isMainFilterOpen ? "z-50" : "z-10")}>
          <ExpandableToolButton
            onClick={handleOpenMainFilter}
            aria-label={
              filters.length > 0
                ? `Filter (${filters.length} active)`
                : "Filter volunteers"
            }
            className={clsx(
              filters.length > 0 ? neutralActiveExpandable : neutralExpandable
            )}
            icon={
              <span className="relative inline-flex">
                <ListFilter className="w-4 h-4 shrink-0" />
                {filters.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-600 ring-2 ring-purple-100" />
                )}
              </span>
            }
          >
            Filter {filters.length > 0 && `(${filters.length})`}
          </ExpandableToolButton>

          <FilterModal
            isOpen={isMainFilterOpen}
            onClose={() => setIsMainFilterOpen(false)}
            onApply={(newFilter) => {
              if (newFilter) setFilters((prev) => [...prev, newFilter]);
              setIsMainFilterOpen(false);
            }}
            optionsData={filterOptions}
            alignRight={mainFilterAlignRight}
          />
        </div>

        <div className={clsx("relative", isSortModalOpen ? "z-50" : "z-10")}>
          <ExpandableToolButton
            onClick={(e) => {
              setSortModalAlignRight(
                filterModalAlignRight(e.currentTarget as HTMLElement)
              );
              setIsSortModalOpen(!isSortModalOpen);
            }}
            aria-label={
              sorting.length > 0
                ? `Sort (${sorting.length} rules)`
                : "Sort volunteers"
            }
            className={clsx(
              sorting.length > 0 ? neutralActiveExpandable : neutralExpandable
            )}
            icon={
              <span className="relative inline-flex">
                <ArrowUpDown className="w-4 h-4 shrink-0" />
                {sorting.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-600 ring-2 ring-purple-100" />
                )}
              </span>
            }
          >
            Sort {sorting.length > 0 && `(${sorting.length})`}
          </ExpandableToolButton>

          <SortModal
            isOpen={isSortModalOpen}
            onClose={() => setIsSortModalOpen(false)}
            sorting={sorting}
            setSorting={setSorting}
            alignRight={sortModalAlignRight}
          />
        </div>

        {role === "admin" && (
          <ExpandableToolButton
            onClick={onOpenAddVolunteer}
            aria-label="Add new volunteer"
            className="border-0 bg-purple-700 font-semibold text-white shadow-sm hover:bg-purple-800"
            icon={<Plus className="w-4 h-4 shrink-0" />}
          >
            New Volunteer
          </ExpandableToolButton>
        )}

        {role === "admin" && (
          <ExpandableToolButton
            onClick={onOpenImportCSV}
            aria-label="Import volunteers from CSV"
            className="border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100"
            icon={<Import className="w-4 h-4 shrink-0" />}
          >
            Import CSV
          </ExpandableToolButton>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 ml-auto justify-end">
        {selectedCellCount > 0 && (
          <div
            ref={copyMenuRef}
            data-volunteers-overlay={isCopyMenuOpen ? "" : undefined}
            className={clsx("relative", isCopyMenuOpen ? "z-50" : "z-10")}
          >
            <ExpandableToolButton
              onClick={(e) => {
                if (isCopyMenuOpen) {
                  setIsCopyMenuOpen(false);
                  return;
                }
                setCopyMenuAlignRight(
                  filterModalAlignRight(e.currentTarget as HTMLElement)
                );
                setIsCopyMenuOpen(true);
              }}
              forceExpanded={isCopyMenuOpen}
              aria-label={`Copy ${selectedCellCount} selected cells, choose format`}
              aria-expanded={isCopyMenuOpen}
              aria-haspopup="menu"
              className={neutralExpandable}
              icon={<Copy className="w-4 h-4 shrink-0" />}
            >
              <span className="inline-flex items-center gap-1">
                Copy ({selectedCellCount})
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
              </span>
            </ExpandableToolButton>
            {isCopyMenuOpen && (
              <div
                role="menu"
                className={clsx(
                  "absolute top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg",
                  copyMenuAlignRight ? "right-0" : "left-0"
                )}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    void onCopyCells("tsv");
                    setIsCopyMenuOpen(false);
                  }}
                >
                  Tab-separated (Excel/Sheets)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    void onCopyCells("csv");
                    setIsCopyMenuOpen(false);
                  }}
                >
                  CSV
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    void onCopyCells("plain");
                    setIsCopyMenuOpen(false);
                  }}
                >
                  Plain text (comma between cells)
                </button>
              </div>
            )}
          </div>
        )}

        {role === "admin" && selectedCount > 0 && (
          <ExpandableToolButton
            onClick={onDelete}
            disabled={isDeleting}
            forceExpanded={isDeleting}
            aria-label={
              isDeleting
                ? "Deleting selected volunteers"
                : `Delete ${selectedCount} selected volunteers`
            }
            className="border-0 bg-red-500 font-medium text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
            icon={<Trash2 className="w-4 h-4 shrink-0" />}
          >
            {isDeleting ? "Deleting..." : `Delete (${selectedCount})`}
          </ExpandableToolButton>
        )}

        {(hasEdits || canUndo || canRedo) && (
          <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200 bg-amber-50 border border-amber-200 rounded-lg p-1.5">
            <div className="flex items-center gap-1 mr-1">
              <ExpandableToolButton
                onClick={onUndo}
                disabled={!canUndo || isSaving}
                title="Undo (⌘Z)"
                aria-label="Undo last change"
                className="border-0 bg-transparent p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30"
                icon={<Undo2 className="w-4 h-4 shrink-0" />}
              >
                Undo
              </ExpandableToolButton>
              <ExpandableToolButton
                onClick={onRedo}
                disabled={!canRedo || isSaving}
                title="Redo (⌘⇧Z)"
                aria-label="Redo last undone change"
                className="border-0 bg-transparent p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30"
                icon={<Redo2 className="w-4 h-4 shrink-0" />}
              >
                Redo
              </ExpandableToolButton>
            </div>
            <ExpandableToolButton
              onClick={onViewChanges}
              disabled={!hasEdits || isSaving}
              aria-label={`View pending changes (${pendingChangesCount})`}
              className="border border-purple-200/80 bg-purple-100 text-purple-700 hover:bg-purple-200"
              icon={<Eye className="w-4 h-4 shrink-0" />}
            >
              View Changes ({pendingChangesCount})
            </ExpandableToolButton>
            <ExpandableToolButton
              onClick={onCancel}
              disabled={isSaving}
              aria-label="Cancel edits"
              className="border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
              icon={<X className="w-4 h-4 shrink-0" />}
            >
              Cancel
            </ExpandableToolButton>
            <ExpandableToolButton
              onClick={onSave}
              disabled={isSaving || !hasEdits}
              aria-label="Save changes"
              forceExpanded={isSaving}
              className="border-0 bg-green-200 font-medium text-green-900 hover:bg-green-300 disabled:opacity-50"
              icon={<Save className="w-4 h-4 shrink-0" />}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </ExpandableToolButton>
          </div>
        )}
      </div>
    </div>
  );
};
