import React, { useState } from "react";
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
} from "lucide-react";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import { FilterModal, filterModalAlignRight } from "./FilterModal";
import { SortModal } from "./SortModal";
import { SortingState } from "@tanstack/react-table";

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
}: TableToolbarProps): React.JSX.Element => {
  const [isMainFilterOpen, setIsMainFilterOpen] = useState(false);
  const [mainFilterAlignRight, setMainFilterAlignRight] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortModalAlignRight, setSortModalAlignRight] = useState(false);

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

  return (
    <div className="flex items-center justify-start gap-3 mb-2">
      <div className="relative w-full max-w-72">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-800">
          <Search className="w-4 h-4 shrink-0" />
        </div>
        <input
          type="text"
          placeholder="Search volunteers..."
          aria-label="Search volunteers"
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full pl-10 px-3 py-2 bg-purple-200 hover:bg-purple-300 transition-colors rounded-lg text-sm text-gray-900 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      <div className={clsx("relative", isMainFilterOpen ? "z-50" : "z-10")}>
        <button
          onClick={handleOpenMainFilter}
          className={clsx(
            "group flex items-center justify-start gap-2 w-10 hover:w-30 focus-visible:w-30 overflow-hidden px-3 py-2 transition-all duration-200 rounded-lg text-sm font-medium cursor-pointer",
            filters.length > 0
              ? "bg-secondary-purple text-accent-purple"
              : "bg-primary-purple hover:bg-secondary-purple text-gray-900"
          )}
        >
          <ListFilter className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            Filter {filters.length > 0 && `(${filters.length})`}
          </span>
        </button>

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
        <button
          onClick={(e) => {
            setSortModalAlignRight(
              filterModalAlignRight(e.currentTarget as HTMLElement)
            );
            setIsSortModalOpen(!isSortModalOpen);
          }}
          className={clsx(
            "group flex items-center justify-start gap-2 w-10 hover:w-28 focus-visible:w-28 overflow-hidden px-3 py-2 transition-all duration-200 rounded-lg text-sm font-medium cursor-pointer",
            sorting.length > 0
              ? "bg-secondary-purple text-accent-purple"
              : "bg-primary-purple hover:bg-secondary-purple text-gray-900"
          )}
        >
          <ArrowUpDown className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            Sort {sorting.length > 0 && `(${sorting.length})`}
          </span>
        </button>

        <SortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sorting={sorting}
          setSorting={setSorting}
          alignRight={sortModalAlignRight}
        />
      </div>

      {role === "admin" && (
        <button
          onClick={onOpenAddVolunteer}
          className="group flex items-center justify-start gap-2 w-10 hover:w-36 focus-visible:w-36 overflow-hidden px-3 py-2 bg-accent-purple hover:bg-dark-accent-purple transition-all duration-200 rounded-lg text-sm font-medium text-white shadow-sm"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            New Volunteer
          </span>
        </button>
      )}

      {role === "admin" && (
        <button
          onClick={onOpenImportCSV}
          className="group flex items-center justify-start gap-2 w-10 hover:w-40 focus-visible:w-40 overflow-hidden px-3 py-2 bg-primary-purple hover:bg-secondary-purple transition-all duration-200 rounded-lg text-sm font-medium text-gray-900"
        >
          <Import className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            Import from CSV
          </span>
        </button>
      )}

      {(role === "admin" && selectedCount > 0) ||
      hasEdits ||
      canUndo ||
      canRedo ? (
        <div className="flex items-center gap-2 ml-auto animate-in fade-in slide-in-from-right-2 duration-200">
          {role === "admin" && selectedCount > 0 && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="group flex items-center justify-start gap-2 w-10 hover:w-34 focus-visible:w-34 overflow-hidden px-3 py-2 bg-red-500 hover:bg-red-600 transition-all duration-200 rounded-lg text-sm font-medium text-white shadow-sm disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                {isDeleting ? "Deleting..." : `Delete (${selectedCount})`}
              </span>
            </button>
          )}

          <div className="flex items-center gap-1 mr-1">
            <button
              onClick={onUndo}
              disabled={!canUndo || isSaving}
              title="Undo (⌘Z)"
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo || isSaving}
              title="Redo (⌘⇧Z)"
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onViewChanges}
            disabled={!hasEdits || isSaving}
            className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            View Changes ({pendingChangesCount})
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || !hasEdits}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : null}
    </div>
  );
};
