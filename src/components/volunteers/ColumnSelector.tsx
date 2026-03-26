import React, { useState, useRef, useEffect } from "react";

export interface SelectorColumn {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface ColumnSelectorProps {
  columns: SelectorColumn[];
  onSelect: (colId: string) => void;
  placeholder?: string;
}

export const ColumnSelector = ({
  columns,
  onSelect,
  placeholder = "Select column...",
}: ColumnSelectorProps): React.JSX.Element => {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const visibleColumns = columns.filter((col) =>
    col.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (visibleColumns.length > 0 && visibleColumns[0]) {
              onSelect(visibleColumns[0].id);
            }
          }
        }}
        className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
      />
      <div className="flex flex-col max-h-60 overflow-y-auto mt-2">
        {visibleColumns.length > 0 ? (
          visibleColumns.map((col) => {
            const Icon = col.icon;
            return (
              <button
                key={col.id}
                onClick={() => onSelect(col.id)}
                className="text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
              >
                <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{col.label}</span>
              </button>
            );
          })
        ) : (
          <p className="text-xs text-gray-500 italic p-2 text-center">
            No available columns
          </p>
        )}
      </div>
    </>
  );
};
