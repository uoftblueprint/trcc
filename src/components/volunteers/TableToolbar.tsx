import React, { useState } from "react";
import clsx from "clsx";
import {
  Search,
  ListFilter,
  ArrowUpDown,
  Import,
  Plus,
  Trash2,
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
    <div className="flex items-center justify-end gap-3 mb-2">
      <div className="relative w-full max-w-96">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-800">
          <Search className="w-4 h-4 shrink-0" />
        </div>
        <input
          type="text"
          placeholder="Search volunteers..."
          aria-label="Search volunteers"
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full pl-10 px-4 py-2 bg-purple-200 hover:bg-purple-300 transition-colors rounded-lg text-sm text-gray-900 placeholder-gray-500 border-none focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      <div className={clsx("relative", isMainFilterOpen ? "z-50" : "z-10")}>
        <button
          onClick={handleOpenMainFilter}
          className={clsx(
            "flex items-center justify-center gap-2 w-28 py-2 transition-colors rounded-lg text-sm font-medium cursor-pointer",
            filters.length > 0
              ? "bg-secondary-purple text-accent-purple"
              : "bg-primary-purple hover:bg-secondary-purple text-gray-900"
          )}
        >
          <ListFilter className="w-4 h-4 shrink-0" />
          <span>Filter {filters.length > 0 && `(${filters.length})`}</span>
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
            "flex items-center justify-center gap-2 w-24 py-2 transition-colors rounded-lg text-sm font-medium cursor-pointer",
            sorting.length > 0
              ? "bg-secondary-purple text-accent-purple"
              : "bg-primary-purple hover:bg-secondary-purple text-gray-900"
          )}
        >
          <ArrowUpDown className="w-4 h-4 shrink-0" />
          <span>Sort {sorting.length > 0 && `(${sorting.length})`}</span>
        </button>

        <SortModal
          isOpen={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          sorting={sorting}
          setSorting={setSorting}
          alignRight={sortModalAlignRight}
        />
      </div>

      {role === "admin" && selectedCount > 0 && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 transition-colors rounded-lg text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>
            {isDeleting ? "Deleting..." : `Delete (${selectedCount})`}
          </span>
        </button>
      )}

      {role === "admin" && (
        <button
          onClick={onOpenAddVolunteer}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-dark-accent-purple transition-colors rounded-lg text-sm font-medium text-white shadow-sm"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Volunteer</span>
        </button>
      )}

      {role === "admin" && (
        <button
          onClick={onOpenImportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary-purple hover:bg-secondary-purple transition-colors rounded-lg text-sm font-medium text-gray-900"
        >
          <Import className="w-4 h-4 shrink-0" />
          <span>Import from CSV</span>
        </button>
      )}
    </div>
  );
};
