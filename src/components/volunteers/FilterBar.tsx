import React, { useEffect, useState } from "react";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import { ChevronDown, Plus, ArrowUpDown, X } from "lucide-react";
import { SortingState } from "@tanstack/react-table";
import clsx from "clsx";
import { FILTERABLE_COLUMNS } from "./volunteerColumns";
import { FilterModal, filterModalAlignRight } from "./FilterModal";
import { SortModal } from "./SortModal";

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

  useEffect(() => {
    if (sorting.length === 0) {
      setIsSortModalOpen(false);
    }
  }, [sorting.length]);

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
      setFilters((prev) => prev.filter((_, i) => i !== index));
    } else {
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
    if (newFilter) {
      setFilters((prev) => [...prev, newFilter]);
    }
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

      {/* Filters List */}
      {filters.map((filter, index) => {
        const colDef = FILTERABLE_COLUMNS.find((c) => c.id === filter.field);
        const isCurrentlyEditing = editingIndex === index;
        const Icon = colDef?.icon;

        return (
          <div
            key={index}
            className={clsx(
              "relative group/filter",
              isCurrentlyEditing ? "z-50" : "z-10"
            )}
          >
            <button
              onClick={(e) => handleEditClick(e, index)}
              className="bg-purple-200 text-gray-900 hover:bg-purple-300 rounded-lg px-2 py-1.5 text-sm font-medium flex items-center gap-0 group-hover/filter:gap-2 group-hover/filter:px-3 transition-all duration-200 cursor-pointer"
            >
              {Icon && <Icon className="w-3.5 h-3.5 opacity-70 shrink-0" />}
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover/filter:max-w-40 group-hover/filter:opacity-100 transition-all duration-200">
                {colDef?.label}
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
          setFilters([]);
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
    </div>
  );
};
