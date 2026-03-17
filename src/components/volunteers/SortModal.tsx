// src/components/volunteers/SortModal.tsx
import React, { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import clsx from "clsx";
import { COLUMNS_CONFIG } from "./volunteerColumns";
import { SortingState } from "@tanstack/react-table";
import { ColumnSelector } from "./ColumnSelector";

interface SortModalProps {
  isOpen: boolean;
  onClose: () => void;
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  alignRight?: boolean;
}

export const SortModal = ({
  isOpen,
  onClose,
  sorting,
  setSorting,
  alignRight = false,
}: SortModalProps): React.JSX.Element | null => {
  const [editingIndex, setEditingIndex] = useState<number | "NEW" | null>(null);

  useEffect(() => {
    if (isOpen) setEditingIndex(sorting.length === 0 ? "NEW" : null);
  }, [isOpen, sorting.length]);

  if (!isOpen) return null;

  const handleRemoveSort = (index: number): void => {
    const newSorting = [...sorting];
    newSorting.splice(index, 1);
    setSorting(newSorting);
    if (newSorting.length === 0) {
      setEditingIndex("NEW");
    }
  };

  const handleUpdateSort = (index: number, desc: boolean): void => {
    const newSorting = [...sorting];
    if (newSorting[index]) {
      newSorting[index] = { ...newSorting[index], desc };
      setSorting(newSorting);
    }
  };

  const handleSelectColumn = (colId: string): void => {
    if (editingIndex === "NEW") {
      if (!sorting.find((s) => s.id === colId)) {
        setSorting([...sorting, { id: colId, desc: false }]);
      }
    } else if (typeof editingIndex === "number") {
      const newSorting = [...sorting];
      if (newSorting[editingIndex]) {
        newSorting[editingIndex] = {
          id: colId,
          desc: newSorting[editingIndex].desc,
        };
        setSorting(newSorting);
      }
    }
    setEditingIndex(null);
  };

  const availableColumns = COLUMNS_CONFIG.filter((col) => {
    const existingSortIndex = sorting.findIndex((s) => s.id === col.id);
    if (existingSortIndex === -1) return true;
    if (editingIndex !== "NEW" && existingSortIndex === editingIndex)
      return true;
    return false;
  }).map((c) => ({ id: c.id as string, label: c.label, icon: c.icon }));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25" onMouseDown={onClose} />
      <div
        className={clsx(
          "absolute top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 flex flex-col gap-3 z-50",
          alignRight ? "right-0" : "left-0"
        )}
      >
        {editingIndex !== null ? (
          <ColumnSelector
            columns={availableColumns}
            onSelect={handleSelectColumn}
            placeholder="Sort by..."
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {sorting.map((sort, index) => {
                const colDef = COLUMNS_CONFIG.find((c) => c.id === sort.id);
                const Icon = colDef?.icon;
                return (
                  <div key={sort.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingIndex(index)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors truncate cursor-pointer text-left"
                    >
                      {Icon && (
                        <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <span className="truncate">
                        {colDef?.label || sort.id}
                      </span>
                    </button>

                    <select
                      value={sort.desc ? "desc" : "asc"}
                      onChange={(e) =>
                        handleUpdateSort(index, e.target.value === "desc")
                      }
                      className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-1.5 outline-none cursor-pointer text-gray-700"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                    <button
                      onClick={() => handleRemoveSort(index)}
                      aria-label={`Remove sort on ${sorting[index]?.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                );
              })}
            </div>
            {availableColumns.length > 0 && (
              <button
                onClick={() => setEditingIndex("NEW")}
                className="flex items-center gap-2 text-sm font-medium text-accent-purple hover:text-dark-accent-purple mt-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Sort
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
};
