import React, { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";
import {
  Search,
  ListFilter,
  ArrowUpDown,
  Import,
  Plus,
  Tags,
  Trash2,
  Undo2,
  Redo2,
  Eye,
  X,
  Save,
  Copy,
  ChevronLeft,
  ChevronRight,
  Keyboard,
} from "lucide-react";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import { FilterModal, filterModalAlignRight } from "./FilterModal";
import { SortModal } from "./SortModal";
import { SortingState } from "@tanstack/react-table";
import type { CopyCellFormat } from "./copySelectedCells";

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
  onOpenShortcuts: () => void;
  onOpenManageTags: () => void;
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

const SCROLL_STEP_PX = 220;

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
  onOpenShortcuts,
  onOpenManageTags,
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
  const [filterAnchorRect, setFilterAnchorRect] =
    useState<DOMRectReadOnly | null>(null);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortModalAlignRight, setSortModalAlignRight] = useState(false);
  const [sortAnchorRect, setSortAnchorRect] = useState<DOMRectReadOnly | null>(
    null
  );
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [copyMenuAlignRight, setCopyMenuAlignRight] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const toolsScrollRef = useRef<HTMLDivElement>(null);
  const [toolsScrollHints, setToolsScrollHints] = useState({
    showLeft: false,
    showRight: false,
  });

  const updateToolsScrollHints = useCallback((): void => {
    const el = toolsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = Math.max(0, scrollWidth - clientWidth);
    setToolsScrollHints({
      showLeft: scrollLeft > 4,
      showRight: scrollLeft < max - 4,
    });
  }, []);

  useEffect(() => {
    updateToolsScrollHints();
    const el = toolsScrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateToolsScrollHints());
    ro.observe(el);
    return (): void => ro.disconnect();
  }, [updateToolsScrollHints, filters.length, sorting.length, role, hasEdits]);

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

  const scrollTools = (direction: "left" | "right"): void => {
    const el = toolsScrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "left" ? -SCROLL_STEP_PX : SCROLL_STEP_PX,
      behavior: "smooth",
    });
  };

  const handleOpenMainFilter = (e: React.MouseEvent): void => {
    if (isMainFilterOpen) {
      setIsMainFilterOpen(false);
      setFilterAnchorRect(null);
      return;
    }
    const el = e.currentTarget as HTMLElement;
    setFilterAnchorRect(el.getBoundingClientRect());
    setMainFilterAlignRight(filterModalAlignRight(el));
    setIsMainFilterOpen(true);
  };

  const neutralBtn =
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 transition-colors hover:border-purple-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2";
  const neutralBtnActive =
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-purple-300 bg-purple-100 px-3 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2";

  return (
    <div className="flex flex-col gap-3 min-w-0 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative w-full shrink-0 sm:w-auto sm:min-w-[18rem] sm:max-w-[26rem]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-800">
            <Search className="h-4 w-4 shrink-0" />
          </div>
          <input
            type="text"
            placeholder="Search volunteers..."
            aria-label="Search volunteers"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-500 transition-colors hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>

        <div className="relative min-w-0 flex-1">
          <p className="sr-only" id="toolbar-tools-label">
            Table tools — scroll horizontally if items do not fit
          </p>
          {toolsScrollHints.showLeft && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-linear-to-r from-white/95 to-transparent"
                aria-hidden
              />
              <button
                type="button"
                className="absolute left-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100/90 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-0"
                onClick={() => scrollTools("left")}
                aria-label="Scroll tools left"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </>
          )}
          {toolsScrollHints.showRight && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-linear-to-l from-white/95 to-transparent"
                aria-hidden
              />
              <button
                type="button"
                className="absolute right-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100/90 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-0"
                onClick={() => scrollTools("right")}
                aria-label="Scroll tools right"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </>
          )}

          <div
            ref={toolsScrollRef}
            role="group"
            aria-labelledby="toolbar-tools-label"
            onScroll={updateToolsScrollHints}
            className={clsx(
              "flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible py-0.5",
              "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
              "scroll-smooth",
              toolsScrollHints.showLeft && "pl-7",
              toolsScrollHints.showRight && "pr-7"
            )}
          >
            <div
              className={clsx("relative", isMainFilterOpen ? "z-50" : "z-10")}
            >
              <button
                type="button"
                onClick={handleOpenMainFilter}
                aria-label={
                  filters.length > 0
                    ? `Filter (${filters.length} active)`
                    : "Filter volunteers"
                }
                className={clsx(
                  filters.length > 0 ? neutralBtnActive : neutralBtn
                )}
              >
                <span className="relative inline-flex shrink-0">
                  <ListFilter className="h-4 w-4 shrink-0" />
                  {filters.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-purple-600 ring-2 ring-purple-100" />
                  )}
                </span>
                <span className="whitespace-nowrap">
                  {filters.length > 0 ? `Filter (${filters.length})` : "Filter"}
                </span>
              </button>
              <FilterModal
                isOpen={isMainFilterOpen}
                onClose={() => {
                  setIsMainFilterOpen(false);
                  setFilterAnchorRect(null);
                }}
                onApply={(newFilter) => {
                  if (newFilter) setFilters((prev) => [...prev, newFilter]);
                  setIsMainFilterOpen(false);
                  setFilterAnchorRect(null);
                }}
                optionsData={filterOptions}
                alignRight={mainFilterAlignRight}
                anchorRect={isMainFilterOpen ? filterAnchorRect : null}
              />
            </div>

            <div
              className={clsx("relative", isSortModalOpen ? "z-50" : "z-10")}
            >
              <button
                type="button"
                onClick={(e) => {
                  if (isSortModalOpen) {
                    setIsSortModalOpen(false);
                    setSortAnchorRect(null);
                    return;
                  }
                  const el = e.currentTarget as HTMLElement;
                  setSortAnchorRect(el.getBoundingClientRect());
                  setSortModalAlignRight(filterModalAlignRight(el));
                  setIsSortModalOpen(true);
                }}
                className={clsx(
                  sorting.length > 0 ? neutralBtnActive : neutralBtn
                )}
                aria-label={
                  sorting.length > 0
                    ? `Sort (${sorting.length} rules)`
                    : "Sort volunteers"
                }
              >
                <span className="relative inline-flex shrink-0">
                  <ArrowUpDown className="h-4 w-4 shrink-0" />
                  {sorting.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-purple-600 ring-2 ring-purple-100" />
                  )}
                </span>
                <span className="whitespace-nowrap">
                  {sorting.length > 0 ? `Sort (${sorting.length})` : "Sort"}
                </span>
              </button>
              <SortModal
                isOpen={isSortModalOpen}
                onClose={() => {
                  setIsSortModalOpen(false);
                  setSortAnchorRect(null);
                }}
                sorting={sorting}
                setSorting={setSorting}
                alignRight={sortModalAlignRight}
                anchorRect={isSortModalOpen ? sortAnchorRect : null}
              />
            </div>

            {role === "admin" && !hasEdits && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-primary-purple px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-secondary-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2"
              >
                <Keyboard className="h-4 w-4 shrink-0" />
                Shortcuts
              </button>
            )}

            {role === "admin" && !hasEdits && (
              <button
                type="button"
                onClick={onOpenAddVolunteer}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-accent-purple px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-dark-accent-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4 shrink-0" />
                New Volunteer
              </button>
            )}

            {role === "admin" && (
              <button
                type="button"
                onClick={onOpenImportCSV}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:border-purple-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2"
              >
                <Import className="h-4 w-4 shrink-0" />
                Import from CSV
              </button>
            )}

            {role === "admin" && !hasEdits && (
              <button
                type="button"
                onClick={onOpenManageTags}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-900 transition-colors hover:border-purple-400 hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2"
              >
                <Tags className="h-4 w-4 shrink-0" />
                Manage tags
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex shrink-0 flex-wrap items-center justify-end gap-2 xl:ml-auto"
        role="toolbar"
        aria-label="Editing and selection actions"
      >
        {selectedCellCount > 0 && (
          <div
            ref={copyMenuRef}
            data-volunteers-overlay={isCopyMenuOpen ? "" : undefined}
            className={clsx("relative", isCopyMenuOpen ? "z-50" : "z-10")}
          >
            <button
              type="button"
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
              aria-label={`Copy ${selectedCellCount} selected cells, choose format`}
              title={`Copy ${selectedCellCount} selected cells (opens format menu)`}
              aria-expanded={isCopyMenuOpen}
              aria-haspopup="menu"
              className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-800 transition-colors hover:border-purple-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2"
            >
              <span className="relative inline-flex">
                <Copy className="h-4 w-4 shrink-0" aria-hidden />
                <span
                  className="absolute -right-3.5 -top-3.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-purple-600 px-0.5 text-[8px] font-semibold leading-none text-white tabular-nums ring-1 ring-white"
                  aria-hidden
                >
                  {selectedCellCount > 99 ? "99+" : selectedCellCount}
                </span>
              </span>
            </button>
            {isCopyMenuOpen && (
              <div
                role="menu"
                aria-labelledby="volunteers-copy-as-heading"
                className={clsx(
                  "absolute top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg",
                  copyMenuAlignRight ? "right-0" : "left-0"
                )}
              >
                <div
                  id="volunteers-copy-as-heading"
                  className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-500"
                >
                  Copy as
                </div>
                <ul className="list-none py-1">
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => {
                        void onCopyCells("tsv");
                        setIsCopyMenuOpen(false);
                      }}
                    >
                      Tab-separated (Excel/Sheets)
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => {
                        void onCopyCells("csv");
                        setIsCopyMenuOpen(false);
                      }}
                    >
                      CSV
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => {
                        void onCopyCells("plain");
                        setIsCopyMenuOpen(false);
                      }}
                    >
                      Plain text (comma between cells)
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {(hasEdits || canUndo || canRedo) && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo || isSaving}
                title="Undo (⌘Z)"
                aria-label="Undo last change"
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Undo2 className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo || isSaving}
                title="Redo (⌘⇧Z)"
                aria-label="Redo last undone change"
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Redo2 className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            </div>
            <div
              className="hidden h-7 w-px shrink-0 bg-gray-200 sm:block"
              aria-hidden
            />
            <button
              type="button"
              onClick={onViewChanges}
              disabled={!hasEdits || isSaving}
              aria-label={`View pending changes (${pendingChangesCount})`}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-purple-100 px-3 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eye className="h-4 w-4 shrink-0" />
              View Changes ({pendingChangesCount})
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              aria-label="Cancel edits"
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4 shrink-0" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || !hasEdits}
              aria-label="Save changes"
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-green-200 px-3 text-sm font-medium text-green-900 transition-colors hover:bg-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4 shrink-0" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {role === "admin" && selectedCount > 0 && (
          <>
            <div
              className="h-7 w-px shrink-0 self-center bg-gray-300"
              aria-hidden
            />
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              aria-label={
                isDeleting
                  ? "Deleting selected volunteers"
                  : `Delete ${selectedCount} selected volunteers`
              }
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border-0 bg-red-500 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              {isDeleting ? "Deleting..." : `Delete (${selectedCount})`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
