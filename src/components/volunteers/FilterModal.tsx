import React, { useState, useRef, useEffect } from "react";
import { ColumnSelector } from "./ColumnSelector";
import { FilterTuple } from "@/lib/api/getVolunteersByMultipleColumns";
import { Trash2 } from "lucide-react";
import { VolunteerTag } from "./VolunteerTag";
import clsx from "clsx";
import {
  FILTERABLE_COLUMNS,
  type FilterableColumnDesc,
} from "./volunteerColumns";

const MODAL_WIDTH_PX = 288;
const SCREEN_BUFFER_PX = 24;

export const filterModalAlignRight = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return window.innerWidth - rect.left < MODAL_WIDTH_PX + SCREEN_BUFFER_PX;
};

export function fixedPanelLeftPx(
  anchor: DOMRectReadOnly,
  alignRight: boolean
): number {
  const buf = SCREEN_BUFFER_PX;
  const w = MODAL_WIDTH_PX;
  if (alignRight) {
    const left = anchor.right - w;
    return Math.max(buf, Math.min(left, window.innerWidth - w - buf));
  }
  const left = anchor.left;
  return Math.max(buf, Math.min(left, window.innerWidth - w - buf));
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: FilterTuple | null) => void;
  optionsData: Record<string, string[]>;
  /** When omitted, built-in filterable columns are used. */
  filterableColumns?: FilterableColumnDesc[];
  initialFilter?: FilterTuple;
  alignRight?: boolean;
  /** When set, the panel is `position:fixed` so it is not clipped by horizontal scroll parents. */
  anchorRect?: DOMRectReadOnly | null;
}

export const FilterModal = ({
  isOpen,
  onClose,
  onApply,
  optionsData,
  filterableColumns: filterableColumnsProp,
  initialFilter,
  alignRight = false,
  anchorRect = null,
}: FilterModalProps): React.JSX.Element | null => {
  const filterableColumns = filterableColumnsProp ?? FILTERABLE_COLUMNS;
  const [activeStep, setActiveStep] = useState<
    "SELECT_COLUMN" | "SELECT_VALUES"
  >("SELECT_COLUMN");
  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [miniOp, setMiniOp] = useState<"AND" | "OR">("OR");

  const colDef = filterableColumns.find((c) => c.id === selectedCol);
  const availableOptions = selectedCol ? optionsData[selectedCol] || [] : [];
  const visibleColumns = filterableColumns.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
  }));

  const valueInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialFilter) {
        setSelectedCol(initialFilter.field);
        setMiniOp(initialFilter.miniOp || "OR");
        const initialColDef = filterableColumns.find(
          (c) => c.id === initialFilter.field
        );
        if (initialColDef?.type === "text") {
          setInputValue(initialFilter.values[0] as string);
          setSelectedOptions([]);
        } else {
          setSelectedOptions(initialFilter.values as string[]);
          setInputValue("");
        }
        setActiveStep("SELECT_VALUES");
      } else {
        setActiveStep("SELECT_COLUMN");
        setSelectedCol(null);
        setInputValue("");
        setSelectedOptions([]);
        setMiniOp("OR");
      }
    }
  }, [isOpen, initialFilter, filterableColumns]);

  useEffect(() => {
    if (isOpen) {
      if (activeStep === "SELECT_VALUES") {
        setTimeout(() => valueInputRef.current?.focus(), 0);
      }
    }
  }, [isOpen, activeStep]);

  const compareArrays = (a: string[], b: string[]): boolean => {
    if (!a || !b) return a === b;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  };

  const handleApplyFilter = (): void => {
    if (!selectedCol) {
      onClose();
      return;
    }

    const valuesToApply =
      colDef?.type === "text" ? [inputValue.trim()] : selectedOptions;
    const isEmpty = valuesToApply.length === 0 || valuesToApply[0] === "";
    if (isEmpty) {
      onApply(null);
      return;
    }

    const newFilter: FilterTuple = {
      field: selectedCol,
      miniOp: miniOp,
      values: valuesToApply,
    };

    if (initialFilter) {
      if (
        initialFilter.field === newFilter.field &&
        initialFilter.miniOp === newFilter.miniOp &&
        compareArrays(
          initialFilter.values as string[],
          newFilter.values as string[]
        )
      ) {
        onClose();
        return;
      }
    }
    onApply(newFilter);
  };

  const handleCloseAllRef = useRef(handleApplyFilter);
  useEffect(() => {
    handleCloseAllRef.current = handleApplyFilter;
  });

  if (!isOpen) return null;

  const useFixedPanel = anchorRect != null;

  return (
    <>
      {/* 25% Dim to background */}
      <div
        className="fixed inset-0 bg-black/25 z-40 transition-opacity"
        aria-hidden="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) handleCloseAllRef.current();
        }}
      />

      <div
        data-volunteers-overlay
        className={clsx(
          "w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 flex flex-col gap-3 z-50",
          useFixedPanel
            ? "fixed"
            : clsx("absolute top-full mt-2", alignRight ? "right-0" : "left-0")
        )}
        style={
          useFixedPanel
            ? {
                top: anchorRect.bottom + 8,
                left: fixedPanelLeftPx(anchorRect, alignRight),
              }
            : undefined
        }
      >
        {activeStep === "SELECT_COLUMN" ? (
          <ColumnSelector
            columns={visibleColumns}
            placeholder="Filter by..."
            onSelect={(colId) => {
              setSelectedCol(colId);
              setActiveStep("SELECT_VALUES");
              setInputValue("");
              setMiniOp("OR");
            }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 mr-2 overflow-hidden">
                {colDef?.icon && (
                  <colDef.icon className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-600 truncate">
                  {colDef?.label}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {colDef?.type === "options" && colDef.isMulti && (
                  <select
                    value={miniOp}
                    onChange={(e) => setMiniOp(e.target.value as "AND" | "OR")}
                    className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-1 outline-none cursor-pointer text-gray-700"
                  >
                    <option value="OR">Any</option>
                    <option value="AND">All</option>
                  </select>
                )}

                <button onClick={() => onApply(null)}>
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                </button>
              </div>
            </div>

            {colDef?.type === "text" ? (
              <input
                ref={valueInputRef}
                type="text"
                placeholder={`Type ${colDef.label}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyFilter();
                  }
                }}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            ) : (
              <>
                <input
                  ref={valueInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyFilter();
                    }
                  }}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mt-2">
                  {availableOptions
                    .filter((opt) =>
                      opt.toLowerCase().includes(inputValue.toLowerCase())
                    )
                    .map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOptions.includes(opt)}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedOptions((p) => [...p, opt]);
                            else
                              setSelectedOptions((p) =>
                                p.filter((o) => o !== opt)
                              );
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-600 cursor-pointer"
                        />
                        <VolunteerTag label={opt} />
                      </label>
                    ))}
                  {availableOptions.length === 0 && (
                    <p className="text-xs text-gray-500 italic p-1">
                      No options available
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};
