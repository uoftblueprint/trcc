import React, { useState } from "react";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import { ChevronDown, Plus } from "lucide-react";
import clsx from "clsx";
import { FILTERABLE_COLUMNS } from "./volunteerColumns";
import { FilterModal, filterModalAlignRight } from "./FilterModal";

interface FilterBarProps {
  filters: FilterTuple[];
  setFilters: React.Dispatch<React.SetStateAction<FilterTuple[]>>;
  globalOp: "AND" | "OR";
  setGlobalOp: (op: "AND" | "OR") => void;
  optionsData: Record<string, string[]>;
}

export const FilterBar = ({
  filters,
  setFilters,
  globalOp,
  setGlobalOp,
  optionsData,
}: FilterBarProps): React.JSX.Element | null => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAlignRight, setEditAlignRight] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAlignRight, setNewAlignRight] = useState(false);

  if (filters.length === 0) return null;

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
            className={clsx("relative", isCurrentlyEditing ? "z-50" : "z-10")}
          >
            <button
              onClick={(e) => handleEditClick(e, index)}
              className="bg-primary-purple text-gray-900 hover:bg-secondary-purple rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              {Icon && <Icon className="w-3.5 h-3.5 opacity-70" />}
              {colDef?.label}
              <ChevronDown className="w-3 h-3" />
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
          className="bg-primary-purple hover:bg-secondary-purple text-gray-900 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
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
    </div>
  );
};
